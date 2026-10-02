package com.expensetracker.companion.model

import org.json.JSONObject

data class NormalizedTransaction(
    val type: String,
    val amount: Double,
    val currency: String = "INR",
    val description: String,
    val merchant: String = "",
    val paymentMethod: String = "UPI",
    val source: String = "Android Notification",
    val sourceApplication: String,
    val transactionDate: String,
    val transactionTime: String,
    val referenceId: String = "",
    val sourceTransactionId: String,
    val status: String = "completed",
) {
    fun toJson(): JSONObject = JSONObject()
        .put("type", type)
        .put("amount", amount)
        .put("currency", currency)
        .put("description", description)
        .put("merchant", merchant)
        .put("paymentMethod", paymentMethod)
        .put("source", source)
        .put("sourceApplication", sourceApplication)
        .put("transactionDate", transactionDate)
        .put("transactionTime", transactionTime)
        .put("referenceId", referenceId)
        .put("sourceTransactionId", sourceTransactionId)
        .put("status", status)
}