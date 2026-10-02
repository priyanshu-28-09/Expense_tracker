package com.expensetracker.companion.parser

import com.expensetracker.companion.model.NormalizedTransaction
import java.security.MessageDigest
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class TransactionNormalizer {
    fun normalize(payment: ParsedPayment): NormalizedTransaction {
        val localDateTime = Instant.ofEpochMilli(payment.postedAtMillis).atZone(ZoneId.systemDefault())
        val identity = payment.referenceId.ifBlank {
            val minuteBucket = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm").format(localDateTime)
            "${payment.type}|${payment.amount}|${payment.merchant.lowercase(Locale.ROOT)}|$minuteBucket"
        }
        val sourceId = "android-notification:${sha256("${payment.sourcePackageName}|$identity") }"

        return NormalizedTransaction(
            type = payment.type,
            amount = payment.amount,
            description = if (payment.merchant.isBlank()) "Payment notification" else "Payment to ${payment.merchant}",
            merchant = payment.merchant,
            paymentMethod = payment.paymentMethod,
            sourceApplication = payment.sourceApplication,
            transactionDate = DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(localDateTime),
            transactionTime = DateTimeFormatter.ofPattern("HH:mm").format(localDateTime),
            referenceId = payment.referenceId,
            sourceTransactionId = sourceId,
            status = payment.status,
        )
    }

    private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8))
        .joinToString("") { byte -> "%02x".format(byte) }
}