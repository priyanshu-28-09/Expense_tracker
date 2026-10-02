package com.expensetracker.companion.ui

import android.app.Application
import android.content.Intent
import android.provider.Settings
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.expensetracker.companion.notification.NotificationAccess
import com.expensetracker.companion.notification.NotificationQueue
import com.expensetracker.companion.notification.NotificationQueueEvents
import com.expensetracker.companion.network.ApiClient
import com.expensetracker.companion.parser.NotificationInput
import com.expensetracker.companion.parser.NotificationParser
import com.expensetracker.companion.parser.TransactionNormalizer
import com.expensetracker.companion.sync.SessionStore
import com.expensetracker.companion.sync.SyncManager
import com.expensetracker.companion.sync.TransactionSyncScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class CompanionUiState(
    val isLoggedIn: Boolean = false,
    val backendUrl: String = "",
    val queuedCount: Int = 0,
    val notificationAccessGranted: Boolean = false,
    val loading: Boolean = false,
    val message: String = "",
    val lastSyncMessage: String = "No sync yet",
    val lastSyncedAt: String? = null,
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val sessionStore = SessionStore(application)
    private val notificationQueue = NotificationQueue(application)
    private val notificationParser = NotificationParser()
    private val transactionNormalizer = TransactionNormalizer()
    private val syncManager = SyncManager(application)
    private val _state = MutableStateFlow(CompanionUiState())
    val state = _state.asStateFlow()

    init {
        refresh()
        viewModelScope.launch {
            NotificationQueueEvents.updates.collect { refresh() }
        }
    }

    fun refresh() {
        val syncStatus = syncManager.lastStatus()
        _state.update {
            it.copy(
                isLoggedIn = sessionStore.token() != null,
                backendUrl = sessionStore.baseUrl() ?: it.backendUrl,
                queuedCount = notificationQueue.peekAll().size,
                notificationAccessGranted = NotificationAccess.isGranted(getApplication()),
                lastSyncMessage = syncStatus.message,
                lastSyncedAt = syncStatus.syncedAt,
            )
        }
    }

    fun login(backendUrl: String, email: String, password: String) {
        if (backendUrl.isBlank() || email.isBlank() || password.isBlank()) {
            _state.update { it.copy(message = "Enter your Expense Tracker account and backend URL.") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(loading = true, message = "Connecting…") }
            runCatching {
                withContext(Dispatchers.IO) {
                    val token = ApiClient(backendUrl.trim()).login(email.trim(), password)
                    sessionStore.save(backendUrl, token)
                }
            }.onSuccess {
                _state.update { it.copy(isLoggedIn = true, backendUrl = backendUrl.trim(), loading = false, message = "Connected") }
                TransactionSyncScheduler.enqueue(getApplication())
                refresh()
            }.onFailure { error ->
                _state.update { it.copy(loading = false, message = error.message ?: "Login failed.") }
            }
        }
    }

    fun parseMockNotification() {
        val input = NotificationInput(
            packageName = "com.phonepe.app",
            title = "Payment successful",
            text = "You paid ₹245.50 to Green Basket. UPI Ref 812345678901",
            postedAtMillis = System.currentTimeMillis(),
        )
        val parsed = notificationParser.parse(input)
        if (parsed == null) {
            _state.update { it.copy(message = "The PhonePe mock was not recognized.") }
            return
        }
        notificationQueue.enqueue(transactionNormalizer.normalize(parsed))
        TransactionSyncScheduler.enqueue(getApplication())
        _state.update {
            it.copy(
                queuedCount = notificationQueue.peekAll().size,
                message = "Mock parsed on-device. Original notification text was discarded.",
            )
        }
    }

    fun openNotificationAccessSettings() {
        getApplication<Application>().startActivity(
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    fun syncNow() {
        TransactionSyncScheduler.enqueue(getApplication())
        _state.update {
            it.copy(message = if (notificationQueue.peekAll().isEmpty()) "No pending transactions." else "Sync queued; waiting for network.")
        }
    }

    fun updateBackendUrl(value: String) {
        val token = sessionStore.token() ?: return
        runCatching { sessionStore.save(value, token) }
            .onSuccess { _state.update { it.copy(backendUrl = value.trim(), message = "Backend URL saved.") } }
            .onFailure { error -> _state.update { it.copy(message = error.message ?: "Could not save backend URL.") } }
    }

    fun signOut() {
        sessionStore.clear()
        _state.update { CompanionUiState(backendUrl = sessionStore.baseUrl().orEmpty()) }
        refresh()
    }
}