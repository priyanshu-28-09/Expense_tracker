package com.expensetracker.companion.parser

import com.expensetracker.companion.model.NormalizedTransaction
import java.util.Locale

data class NotificationInput(
    val packageName: String,
    val title: String,
    val text: String,
    val postedAtMillis: Long,
)

interface PaymentNotificationParser {
    val id: String
    val packageNames: Set<String>
    fun parse(input: NotificationInput): ParsedPayment?
}

data class ParsedPayment(
    val type: String,
    val amount: Double,
    val merchant: String,
    val sourceApplication: String,
    val sourcePackageName: String,
    val referenceId: String,
    val postedAtMillis: Long,
    val paymentMethod: String,
    val status: String,
}

class NotificationParser(
    private val parsers: List<PaymentNotificationParser> = listOf(
        PhonePeParser(),
        GooglePayParser(),
        PaytmParser(),
        BHIMParser(),
        BankNotificationParser(),
    ),
) {
    fun parse(input: NotificationInput): ParsedPayment? = parsers
        .firstOrNull { input.packageName in it.packageNames }
        ?.parse(input)
}

data class ParserPatterns(
    val amountPatterns: List<Regex>,
    val merchantPatterns: List<Regex>,
    val referencePatterns: List<Regex>,
    val incomePatterns: List<Regex>,
    val expensePatterns: List<Regex>,
    val failurePatterns: List<Regex>,
    val pendingPatterns: List<Regex>,
    val completedPatterns: List<Regex>,
    val paymentMethod: String,
)

abstract class RegexPaymentParser(
    final override val id: String,
    final override val packageNames: Set<String>,
    private val patterns: ParserPatterns,
) : PaymentNotificationParser {
    private val sensitivePattern = Regex("\\b(?:otp|one[- ]time password|password|passcode|cvv|card pin|upi pin|pin)\\b", RegexOption.IGNORE_CASE)

    override fun parse(input: NotificationInput): ParsedPayment? {
        if (input.packageName !in packageNames) return null
        val combined = "${input.title} ${input.text}".trim()
        if (combined.isEmpty() || sensitivePattern.containsMatchIn(combined)) return null

        val lower = combined.lowercase(Locale.ROOT)
        val amount = patterns.amountPatterns.firstNotNullOfOrNull { pattern ->
            pattern.find(combined)?.groupValues?.getOrNull(1)
        }
            ?.replace(",", "")?.toDoubleOrNull()
            ?.takeIf { it > 0.0 } ?: return null
        val isIncome = patterns.incomePatterns.any { it.containsMatchIn(lower) }
        val isExpense = patterns.expensePatterns.any { it.containsMatchIn(lower) }
        val failed = patterns.failurePatterns.any { it.containsMatchIn(lower) }
        val pending = patterns.pendingPatterns.any { it.containsMatchIn(lower) }
        val status = when {
            failed -> "failed"
            pending -> "pending"
            patterns.completedPatterns.any { it.containsMatchIn(lower) } -> "completed"
            else -> return null
        }
        val type = when {
            isIncome && !isExpense -> "income"
            isExpense && !isIncome -> "expense"
            status != "completed" && !isIncome && lower.contains("payment") -> "expense"
            else -> return null
        }
        val referenceId = patterns.referencePatterns.firstNotNullOfOrNull { pattern ->
            pattern.find(combined)?.groupValues?.getOrNull(1)
        }.orEmpty()
        val merchant = patterns.merchantPatterns.firstNotNullOfOrNull { pattern ->
            pattern.find(combined)?.groupValues?.getOrNull(1)?.trim()?.takeIf(String::isNotBlank)
        }.orEmpty().takeUnless { it.equals("account", ignoreCase = true) || it.equals("your account", ignoreCase = true) }.orEmpty()
        val paymentMethod = if (id == "Bank notification" && Regex("\\bcard\\b", RegexOption.IGNORE_CASE).containsMatchIn(lower)) {
            "Card"
        } else {
            patterns.paymentMethod
        }

        return ParsedPayment(
            type = type,
            amount = amount,
            merchant = merchant,
            sourceApplication = id,
            sourcePackageName = input.packageName,
            referenceId = referenceId,
            postedAtMillis = input.postedAtMillis,
            paymentMethod = paymentMethod,
            status = status,
        )
    }
}