package com.expensetracker.companion.sync

import android.content.Context
import com.expensetracker.companion.network.ApiClient
import com.expensetracker.companion.notification.NotificationQueue
import com.expensetracker.companion.notification.NotificationQueueEvents
import java.time.Instant
import java.util.UUID

data class SyncStatus(val message: String, val syncedAt: String? = null)

class SyncManager(context: Context) {
    private val appContext = context.applicationContext
    private val queue = NotificationQueue(appContext)
    private val session = SessionStore(appContext)
    private val devicePreferences = appContext.getSharedPreferences("device", Context.MODE_PRIVATE)
    private val statusPreferences = appContext.getSharedPreferences("sync_status", Context.MODE_PRIVATE)

    fun lastStatus(): SyncStatus = SyncStatus(
        message = statusPreferences.getString("message", "No sync yet") ?: "No sync yet",
        syncedAt = statusPreferences.getString("synced_at", null),
    )

    fun recordFailure(message: String) {
        statusPreferences.edit().putString("message", message).apply()
        NotificationQueueEvents.notifyChanged()
    }

    fun recordMessage(message: String) {
        statusPreferences.edit().putString("message", message).apply()
        NotificationQueueEvents.notifyChanged()
    }

    fun sync(): SyncStatus {
        val baseUrl = session.baseUrl() ?: throw IllegalStateException("Connect your Expense Tracker account first.")
        val token = session.token() ?: throw IllegalStateException("Your session expired. Sign in again.")
        val transactions = queue.peekAll()
        if (transactions.isEmpty()) {
            recordMessage("Nothing to sync")
            return SyncStatus("Nothing to sync", lastStatus().syncedAt)
        }
        val accountUserId = session.accountUserId()
        if (accountUserId != null) {
            if (queue.ownerUserIds().any { it != accountUserId }) {
                throw IllegalStateException("Pending notifications belong to another Expense Tracker account.")
            }
            queue.assignUnownedItems(accountUserId)
        }

        val deviceId = devicePreferences.getString("id", null) ?: UUID.randomUUID().toString().also {
            devicePreferences.edit().putString("id", it).apply()
        }
        val apiClient = ApiClient(baseUrl)
        var inserted = 0
        var duplicates = 0
        transactions.forEach { transaction ->
            val result = apiClient.uploadTransaction(token, deviceId, transaction)
            if (result.duplicate) duplicates++ else inserted++
            queue.remove(transaction.sourceTransactionId)
            NotificationQueueEvents.notifyChanged()
        }
        val syncedAt = Instant.now().toString()
        val message = "Added $inserted, duplicate $duplicates, rejected 0"
        statusPreferences.edit().putString("message", message).putString("synced_at", syncedAt).apply()
        NotificationQueueEvents.notifyChanged()
        return SyncStatus(message, syncedAt)
    }
}