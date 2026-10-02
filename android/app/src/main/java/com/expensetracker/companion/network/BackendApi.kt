package com.expensetracker.companion.network

import com.expensetracker.companion.model.NormalizedTransaction
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

data class TransactionUploadResult(val duplicate: Boolean, val transactionId: String)

class ApiClient(private val baseUrl: String) {
    fun login(email: String, password: String): String {
        val response = request(
            path = "/api/user/login",
            method = "POST",
            body = JSONObject().put("email", email).put("password", password),
        )
        return response.getString("token")
    }

    fun uploadTransaction(
        token: String,
        deviceId: String,
        transaction: NormalizedTransaction,
    ): TransactionUploadResult {
        val response = request(
            path = "/api/mobile/transactions",
            method = "POST",
            body = transaction.toJson(),
            token = token,
            headers = mapOf(
                "X-Device-ID" to deviceId,
                "X-Device-Name" to "Expense Tracker Android",
            ),
        )
        if (!response.optBoolean("success") || response.optString("transactionId").isBlank()) {
            throw BackendException("Backend returned an invalid transaction response.")
        }
        return TransactionUploadResult(
            duplicate = response.optBoolean("duplicate"),
            transactionId = response.getString("transactionId"),
        )
    }

    private fun request(
        path: String,
        method: String,
        body: JSONObject,
        token: String? = null,
        headers: Map<String, String> = emptyMap(),
    ): JSONObject {
        val uri = URI(baseUrl.trimEnd('/') + path)
        require(
            uri.scheme.equals("https", ignoreCase = true) &&
                !uri.host.isNullOrBlank() &&
                uri.userInfo == null &&
                uri.rawQuery == null &&
                uri.rawFragment == null,
        ) {
            "Use an HTTPS backend URL without embedded credentials or query parameters."
        }
        val url = URL(uri.toASCIIString())
        val connection = url.openConnection() as HttpURLConnection
        connection.instanceFollowRedirects = false
        connection.requestMethod = method
        connection.connectTimeout = 10_000
        connection.readTimeout = 15_000
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
        if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
        headers.forEach { (name, value) -> connection.setRequestProperty(name, value) }
        connection.doOutput = true

        return try {
            connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val responseText = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val response = runCatching { JSONObject(responseText) }.getOrDefault(JSONObject())
            if (status !in 200..299) {
                throw BackendException(
                    response.optString("message").ifBlank { "Backend request failed ($status)." },
                    status,
                )
            }
            response
        } finally {
            connection.disconnect()
        }
    }
}

class BackendException(message: String, val statusCode: Int? = null) : Exception(message)