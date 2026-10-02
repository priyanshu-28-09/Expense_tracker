package com.expensetracker.companion.parser

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PaymentParserTest {
    private val parser = NotificationParser()
    private val normalizer = TransactionNormalizer()

    @Test
    fun parsesSupportedMockNotificationIntoNormalizedFields() {
        val parsed = parser.parse(
            NotificationInput(
                packageName = "com.phonepe.app",
                title = "Payment successful",
                text = "You paid ₹245.50 to Green Basket. UPI Ref 812345678901",
                postedAtMillis = 1_759_395_000_000,
            ),
        )

        assertNotNull(parsed)
        val transaction = normalizer.normalize(parsed!!)
        assertEquals("expense", transaction.type)
        assertEquals(245.50, transaction.amount, 0.001)
        assertEquals("Green Basket", transaction.merchant)
        assertEquals("UPI", transaction.paymentMethod)
        assertEquals("812345678901", transaction.referenceId)
        assertEquals("PhonePe", transaction.sourceApplication)
        assertEquals("completed", transaction.status)
        assertFalse(transaction.toJson().has("category"))
        assertTrue(transaction.transactionDate.isNotBlank())
        assertTrue(transaction.transactionTime.matches(Regex("\\d{2}:\\d{2}")))
        assertFalse(transaction.toJson().toString().contains("You paid"))
    }

    @Test
    fun parsesBankCreditAsIncomeWhenPackageIsRecognized() {
        val parsed = parser.parse(
            NotificationInput(
                packageName = "com.sbi.lotusintouch",
                title = "Account credited",
                text = "₹35,000 credited to your account",
                postedAtMillis = 1_759_395_000_000,
            ),
        )

        assertEquals("income", parsed?.type)
        assertEquals(35000.0, parsed?.amount ?: 0.0, 0.001)
        assertEquals("completed", parsed?.status)
        assertEquals("Bank notification", parsed?.sourceApplication)
        assertEquals("Bank Transfer", parsed?.paymentMethod)
    }

    @Test
    fun failedPaymentIsNotNormalizedAsACompletedExpense() {
        val parsed = parser.parse(
            NotificationInput("com.phonepe.app", "Payment failed", "Payment failed ₹500", 1L),
        )

        assertNotNull(parsed)
        val transaction = normalizer.normalize(parsed!!)
        assertEquals("expense", transaction.type)
        assertEquals(500.0, transaction.amount, 0.001)
        assertEquals("failed", transaction.status)
    }

    @Test
    fun pendingPaymentKeepsPendingStatus() {
        val parsed = parser.parse(
            NotificationInput("net.one97.paytm", "Payment pending", "Payment pending ₹500", 1L),
        )

        assertEquals("pending", parsed?.status)
    }

    @Test
    fun ignoresUnknownAppsAndSensitiveOrUnrecognizedMessages() {
        assertNull(parser.parse(NotificationInput("unknown.app", "Paid", "Paid Rs. 20", 1L)))
        assertNull(parser.parse(NotificationInput("net.one97.paytm", "OTP", "OTP 123456 for payment of Rs. 20", 1L)))
        assertNull(parser.parse(NotificationInput("com.phonepe.app", "Hello", "Your account is ready", 1L)))
        assertNull(parser.parse(NotificationInput("com.phonepe.app", "Payment alert", "₹500 in your account", 1L)))
    }

    @Test
    fun recognizesTheSeparatePaymentAppParsers() {
        val samples = listOf(
            Triple("com.phonepe.app", "Payment successful", "You paid ₹500 to Swiggy. UPI Ref 123456789012") to ("PhonePe" to "Swiggy"),
            Triple("com.google.android.apps.nbu.paisa.user", "Transaction update", "Payment of INR 125 to North Cafe successful") to ("Google Pay" to "North Cafe"),
            Triple("net.one97.paytm", "Paid successfully", "Rs. 80 paid to Green Store") to ("Paytm" to "Green Store"),
            Triple("in.org.npci.upiapp", "UPI transaction successful", "₹40 sent to vendor@upi") to ("BHIM" to "vendor@upi"),
        )

        samples.forEach { (input, expected) ->
            val result = parser.parse(NotificationInput(input.first, input.second, input.third, 1L))
            assertEquals(expected.first, result?.sourceApplication)
            assertEquals(expected.second, result?.merchant)
            assertEquals("UPI", result?.paymentMethod)
        }
    }

    @Test
    fun normalizedTransactionContainsNoOriginalNotificationText() {
        val rawMessage = "Paid Rs. 20 to Sample Shop. Payment note for groceries"
        val parsed = parser.parse(NotificationInput("net.one97.paytm", "Payment successful", rawMessage, 1L))

        assertNotNull(parsed)
        val normalizedJson = normalizer.normalize(parsed!!).toJson().toString()
        assertTrue(normalizedJson.contains("Sample Shop"))
        assertFalse(normalizedJson.contains(rawMessage))
        assertFalse(normalizedJson.contains("groceries"))
    }

    @Test
    fun repeatedNotificationInTheSameMinuteKeepsTheSameIdempotencyKey() {
        val first = parser.parse(
            NotificationInput("com.phonepe.app", "Payment successful", "You paid ₹500 to Swiggy", 1_759_395_000_000),
        )
        val repeated = parser.parse(
            NotificationInput("com.phonepe.app", "Payment successful", "You paid ₹500 to Swiggy", 1_759_395_025_000),
        )

        assertNotNull(first)
        assertNotNull(repeated)
        assertEquals(
            normalizer.normalize(first!!).sourceTransactionId,
            normalizer.normalize(repeated!!).sourceTransactionId,
        )
    }
}