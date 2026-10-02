package com.expensetracker.mobile

import android.content.Intent
import android.provider.Settings
import com.expensetracker.companion.notification.NotificationAccess
import com.expensetracker.companion.notification.NotificationQueue
import com.expensetracker.companion.notification.NotificationQueueEvents
import com.expensetracker.companion.parser.NotificationInput
import com.expensetracker.companion.parser.NotificationParser
import com.expensetracker.companion.parser.TransactionNormalizer
import com.expensetracker.companion.sync.SessionStore
import com.expensetracker.companion.sync.SyncManager
import com.expensetracker.companion.sync.TransactionSyncScheduler
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "com.expensetracker.mobile/notifications"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "accessGranted" -> result.success(NotificationAccess.isGranted(this))
                "openAccessSettings" -> {
                    startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                    result.success(null)
                }
                "pendingCount" -> result.success(NotificationQueue(this).peekAll().size)
                "syncStatus" -> result.success(SyncManager(this).lastStatus().message)
                "queueMockNotification" -> queueMockNotification(result)
                "configureSession" -> configureSession(call, result)
                "clearSession" -> {
                    SessionStore(this).clear()
                    result.success(null)
                }
                "enqueueSync" -> {
                    TransactionSyncScheduler.enqueue(this)
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun queueMockNotification(result: MethodChannel.Result) {
        val mock = NotificationInput(
            packageName = "com.phonepe.app",
            title = "Payment successful",
            text = "Payment successful ₹500 to Swiggy",
            postedAtMillis = System.currentTimeMillis(),
        )
        val parsed = NotificationParser().parse(mock)
        if (parsed == null) {
            result.error("mock_parse_failed", "The PhonePe mock was not recognized.", null)
            return
        }
        val transaction = TransactionNormalizer().normalize(parsed)
        NotificationQueue(this).enqueue(transaction)
        NotificationQueueEvents.notifyChanged()
        TransactionSyncScheduler.enqueue(this)
        result.success(
            mapOf(
                "amount" to transaction.amount,
                "merchant" to transaction.merchant,
                "type" to transaction.type,
                "paymentMethod" to transaction.paymentMethod,
                "sourceApplication" to transaction.sourceApplication,
                "status" to transaction.status,
            ),
        )
    }

    private fun configureSession(call: MethodCall, result: MethodChannel.Result) {
        val apiBaseUrl = call.argument<String>("apiBaseUrl")
        val token = call.argument<String>("token")
        val accountUserId = call.argument<String>("accountUserId")
        if (apiBaseUrl.isNullOrBlank() || token.isNullOrBlank() || accountUserId.isNullOrBlank()) {
            result.error("invalid_session", "An API URL, session token, and account are required.", null)
            return
        }
        try {
            val queue = NotificationQueue(this)
            if (queue.ownerUserIds().any { it != accountUserId }) {
                result.error("pending_account_mismatch", "Pending notifications belong to another account.", null)
                return
            }
            queue.assignUnownedItems(accountUserId)
            SessionStore(this).save(apiBaseUrl, token, accountUserId)
            TransactionSyncScheduler.enqueue(this)
            result.success(null)
        } catch (error: Exception) {
            result.error("session_save_failed", error.message, null)
        }
    }
}