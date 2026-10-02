package com.expensetracker.companion.sync

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.expensetracker.companion.network.BackendException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.util.concurrent.TimeUnit

class TransactionSyncWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result {
        val syncManager = SyncManager(applicationContext)
        return try {
            syncManager.recordMessage("Syncing pending transactions.")
            withContext(Dispatchers.IO) { syncManager.sync() }
            Result.success()
        } catch (error: BackendException) {
            val statusCode = error.statusCode ?: 0
            val retryable = statusCode == 408 || statusCode == 429 || statusCode >= 500
            if (retryable) {
                syncManager.recordFailure("Sync temporarily unavailable. Pending transactions will retry.")
                Result.retry()
            } else {
                syncManager.recordFailure("Sync needs attention. Check your account or pending transaction data.")
                Result.failure()
            }
        } catch (_: IOException) {
            syncManager.recordFailure("Offline. Pending transactions will sync when internet returns.")
            Result.retry()
        } catch (_: IllegalStateException) {
            syncManager.recordFailure("Sign in to resume automatic sync.")
            Result.failure()
        } catch (_: Exception) {
            syncManager.recordFailure("Sync failed. Pending transactions were kept locally.")
            Result.failure()
        }
    }
}

object TransactionSyncScheduler {
    private const val UNIQUE_WORK_NAME = "expense-transaction-sync"

    fun enqueue(context: Context) {
        SyncManager(context).recordMessage("Pending sync; waiting for a network connection.")
        val request = OneTimeWorkRequestBuilder<TransactionSyncWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build(),
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()

        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            UNIQUE_WORK_NAME,
            ExistingWorkPolicy.APPEND_OR_REPLACE,
            request,
        )
    }
}