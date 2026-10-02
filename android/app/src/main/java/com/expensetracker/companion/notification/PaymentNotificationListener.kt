package com.expensetracker.companion.notification

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.util.Log
import com.expensetracker.companion.parser.NotificationInput
import com.expensetracker.companion.parser.NotificationParser
import com.expensetracker.companion.parser.TransactionNormalizer
import com.expensetracker.companion.sync.SessionStore
import com.expensetracker.companion.sync.TransactionSyncScheduler

class PaymentNotificationListener : NotificationListenerService() {
    private val notificationParser = NotificationParser()
    private val transactionNormalizer = TransactionNormalizer()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val extras = sbn.notification.extras ?: return
        val title = extras.getCharSequence("android.title")?.toString().orEmpty()
        val text = sequenceOf(
            extras.getCharSequence("android.text")?.toString(),
            extras.getCharSequence("android.bigText")?.toString(),
            extras.getCharSequence("android.subText")?.toString(),
        ).filterNotNull().filter(String::isNotBlank).distinct().joinToString(" ")
        if (title.isBlank() && text.isBlank()) {
            Log.d(TAG, "Ignored notification without parseable transaction content.")
            return
        }

        val parsed = notificationParser.parse(
            NotificationInput(sbn.packageName, title, text, sbn.postTime),
        )
        if (parsed == null) {
            Log.d(TAG, "Ignored unsupported or ambiguous payment notification.")
            return
        }
        val sessionStore = SessionStore(applicationContext)
        NotificationQueue(applicationContext).enqueue(transactionNormalizer.normalize(parsed), sessionStore.accountUserId())
        NotificationQueueEvents.notifyChanged()
        TransactionSyncScheduler.enqueue(applicationContext)
    }

    private companion object {
        const val TAG = "PaymentNotificationListener"
    }
}

object NotificationAccess {
    fun isGranted(context: Context): Boolean {
        val service = ComponentName(context, PaymentNotificationListener::class.java)
        return Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
            .orEmpty()
            .split(':')
            .any { ComponentName.unflattenFromString(it) == service }
    }
}