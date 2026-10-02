package com.expensetracker.companion.parser

private val rupeeAmounts = listOf(
    Regex("(?:₹|INR\\s*|Rs\\.?\\s*)([0-9][0-9,]*(?:\\.[0-9]{1,2})?)", RegexOption.IGNORE_CASE),
    Regex("\\b([0-9][0-9,]*(?:\\.[0-9]{1,2})?)\\s*(?:INR|rupees?)\\b", RegexOption.IGNORE_CASE),
)
private val references = listOf(
    Regex("\\b(?:UPI\\s*)?(?:ref(?:erence)?|txn|transaction)\\s*(?:no\\.?|id)?\\s*[:#-]?\\s*([A-Z0-9-]{6,})", RegexOption.IGNORE_CASE),
)
private val incomeCues = listOf(Regex("\\b(?:credited|received|deposited)\\b", RegexOption.IGNORE_CASE))
private val expenseCues = listOf(
    Regex("\\b(?:paid|sent|debited|spent|withdrawn|transferred|purchase)\\b", RegexOption.IGNORE_CASE),
    Regex("\\bpayment\\s+(?:successful|failed|of|for)\\b", RegexOption.IGNORE_CASE),
)
private val failureCues = listOf(Regex("\\b(?:failed|declined|unsuccessful)\\b", RegexOption.IGNORE_CASE))
private val pendingCues = listOf(Regex("\\b(?:pending|processing|initiated)\\b", RegexOption.IGNORE_CASE))
private val completedCues = listOf(
    Regex("\\b(?:successful|successfully|completed|paid|sent|debited|credited|received|deposited)\\b", RegexOption.IGNORE_CASE),
)

private fun merchantPatterns(vararg prefixes: String): List<Regex> = prefixes.map { prefix ->
    Regex("\\b$prefix\\s+([A-Za-z0-9][A-Za-z0-9 .&'@_-]{1,48}?)(?=\\s+(?:on|via|using|ref|txn|upi|successful|successfully|completed|paid|failed|declined|pending|processing)\\b|[.,;]|$)", RegexOption.IGNORE_CASE)
}

private fun patterns(
    merchants: List<Regex>,
    paymentMethod: String = "UPI",
    expensePatterns: List<Regex> = expenseCues,
    amountPatterns: List<Regex> = rupeeAmounts,
) = ParserPatterns(
    amountPatterns = amountPatterns,
    merchantPatterns = merchants,
    referencePatterns = references,
    incomePatterns = incomeCues,
    expensePatterns = expensePatterns,
    failurePatterns = failureCues,
    pendingPatterns = pendingCues,
    completedPatterns = completedCues,
    paymentMethod = paymentMethod,
)

class PhonePeParser : RegexPaymentParser(
    "PhonePe",
    setOf("com.phonepe.app"),
    patterns(merchantPatterns("to", "at")),
)

class GooglePayParser : RegexPaymentParser(
    "Google Pay",
    setOf("com.google.android.apps.nbu.paisa.user"),
    patterns(
        merchantPatterns("to", "at"),
        expensePatterns = expenseCues + Regex("\\bpayment\\s+(?:of|for)\\b", RegexOption.IGNORE_CASE),
    ),
)

class PaytmParser : RegexPaymentParser(
    "Paytm",
    setOf("net.one97.paytm"),
    patterns(
        merchantPatterns("to", "at", "payment to"),
        amountPatterns = listOf(
            Regex("(?:₹|Rs\\.?\\s*|INR\\s*)([0-9][0-9,]*(?:\\.[0-9]{1,2})?)", RegexOption.IGNORE_CASE),
        ),
    ),
)

class BHIMParser : RegexPaymentParser(
    "BHIM",
    setOf("in.org.npci.upiapp"),
    patterns(merchantPatterns("sent to", "paid to", "to")),
)

class BankNotificationParser : RegexPaymentParser(
    "Bank notification",
    setOf(
        "com.sbi.lotusintouch",
        "com.csam.icici.bank.imobile",
        "com.axis.mobile",
        "com.hdfcbank.android.now",
        "com.bankofbaroda.mconnect",
        "com.kotak.bank.mobilebanking",
    ),
    patterns(
        merchantPatterns("to", "at", "towards"),
        paymentMethod = "Bank Transfer",
        expensePatterns = expenseCues + Regex("\\b(?:a/c|account)\\s+debited\\b", RegexOption.IGNORE_CASE),
    ),
)

