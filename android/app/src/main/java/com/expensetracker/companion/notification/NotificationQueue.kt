package com.expensetracker.companion.notification

import android.content.Context
import com.expensetracker.companion.model.NormalizedTransaction
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import org.json.JSONArray

object NotificationQueueEvents {
    private val mutableUpdates = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val updates = mutableUpdates.asSharedFlow()

    fun notifyChanged() {
        mutableUpdates.tryEmit(Unit)
    }
}

class NotificationQueue(context: Context) {
    private val preferences = context.getSharedPreferences("normalized_queue", Context.MODE_PRIVATE)

    @Synchronized
    fun enqueue(transaction: NormalizedTransaction, ownerUserId: String? = null) {
        val current = read()
        if ((0 until current.length()).any { current.optJSONObject(it)?.optString("sourceTransactionId") == transaction.sourceTransactionId }) return
        if (current.length() >= MAX_QUEUE_SIZE) current.remove(0)
        current.put(transaction.toJson().put(OWNER_USER_ID_KEY, ownerUserId))
        preferences.edit().putString(QUEUE_KEY, current.toString()).apply()
    }

    @Synchronized
    fun peekAll(): List<NormalizedTransaction> {
        val current = read()
        return (0 until current.length()).mapNotNull { index ->
            val item = current.optJSONObject(index) ?: return@mapNotNull null
            runCatching {
                NormalizedTransaction(
                    type = item.getString("type"),
                    amount = item.getDouble("amount"),
                    currency = item.getString("currency"),
                    description = item.getString("description"),
                    merchant = item.getString("merchant"),
                    paymentMethod = item.getString("paymentMethod"),
                    source = item.getString("source"),
                    sourceApplication = item.getString("sourceApplication"),
                    transactionDate = item.getString("transactionDate"),
                    transactionTime = item.getString("transactionTime"),
                    referenceId = item.getString("referenceId"),
                    sourceTransactionId = item.getString("sourceTransactionId"),
                    status = item.getString("status"),
                )
            }.getOrNull()
        }
    }

    @Synchronized
    fun clear() {
        preferences.edit().remove(QUEUE_KEY).apply()
    }

    @Synchronized
    fun remove(sourceTransactionId: String): Boolean {
        val current = read()
        val remaining = JSONArray()
        var removed = false
        for (index in 0 until current.length()) {
            val item = current.optJSONObject(index) ?: continue
            if (item.optString("sourceTransactionId") == sourceTransactionId) {
                removed = true
            } else {
                remaining.put(item)
            }
        }
        if (removed) preferences.edit().putString(QUEUE_KEY, remaining.toString()).apply()
        return removed
    }

    @Synchronized
    fun ownerUserIds(): Set<String> {
        val current = read()
        return (0 until current.length()).mapNotNull { index ->
            current.optJSONObject(index)?.optString(OWNER_USER_ID_KEY)?.takeIf(String::isNotBlank)
        }.toSet()
    }

    @Synchronized
    fun assignUnownedItems(ownerUserId: String) {
        val current = read()
        var changed = false
        for (index in 0 until current.length()) {
            val item = current.optJSONObject(index) ?: continue
            if (item.isNull(OWNER_USER_ID_KEY)) {
                item.put(OWNER_USER_ID_KEY, ownerUserId)
                changed = true
            }
        }
        if (changed) preferences.edit().putString(QUEUE_KEY, current.toString()).apply()
    }

    private fun read(): JSONArray = runCatching {
        JSONArray(preferences.getString(QUEUE_KEY, "[]"))
    }.getOrDefault(JSONArray())

    private companion object {
        const val QUEUE_KEY = "transactions"
        const val OWNER_USER_ID_KEY = "queueOwnerUserId"
        const val MAX_QUEUE_SIZE = 500
    }
}