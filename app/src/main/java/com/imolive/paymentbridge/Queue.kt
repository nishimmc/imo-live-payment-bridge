package com.imolive.paymentbridge

import android.content.Context
import androidx.work.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import android.provider.Telephony
import java.security.MessageDigest
import android.content.ContentResolver
import android.net.Uri

object Queue {
    private const val NAME = "payment-sync"
    private fun key(p: PaymentParser.Parsed, receivedAt: Long)=MessageDigest.getInstance("SHA-256").digest((p.provider+"|"+p.source+"|"+p.amount+"|"+receivedAt+"|"+p.raw).toByteArray()).joinToString(""){"%02x".format(it)}
    private fun seen(k:String):Boolean { val q=App.ctx.getSharedPreferences("queued_sms",Context.MODE_PRIVATE); if(q.getBoolean(k,false)) return true; q.edit().putBoolean(k,true).apply(); return false }
    fun enqueue(context: Context, p: PaymentParser.Parsed, receivedAt: Long) {
        val k=key(p,receivedAt); if(seen(k)) return
        val data = workDataOf("provider" to p.provider, "source" to p.source, "amount" to p.amount, "sender" to p.sender, "raw" to p.raw, "receivedAt" to receivedAt)
        val req = OneTimeWorkRequestBuilder<SyncWorker>().setInputData(data).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS).build()
        WorkManager.getInstance(context).enqueue(req)
    }
}

class SyncWorker(ctx: Context, params: WorkerParameters): CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val p = PaymentParser.Parsed(inputData.getString("provider") ?: return Result.failure(), inputData.getString("source") ?: return Result.failure(), inputData.getDouble("amount", 0.0), inputData.getString("sender") ?: "", inputData.getString("raw") ?: "")
        return if (ApiClient.send(p, inputData.getLong("receivedAt", System.currentTimeMillis()))) Result.success() else Result.retry()
    }
}


class HeartbeatWorker(ctx: Context, params: WorkerParameters): CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val r=ApiClient.testConnection()
        Config.lastResult=r
        return if(r.startsWith("CONNECTED")) Result.success() else Result.retry()
    }
}

class InboxScanWorker(ctx: Context, params: WorkerParameters): CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        if (!Config.enabled) return Result.success()
        val since = System.currentTimeMillis() - 30 * 60 * 1000L
        val uri = Uri.parse("content://sms/inbox")
        val projection = arrayOf("address", "body", "date")
        return try {
            applicationContext.contentResolver.query(uri, projection, "date >= ?", arrayOf(since.toString()), "date ASC")?.use { c ->
                val ai=c.getColumnIndex("address"); val bi=c.getColumnIndex("body"); val di=c.getColumnIndex("date")
                while(c.moveToNext()) {
                    val sender=c.getString(ai) ?: continue; val raw=c.getString(bi) ?: continue; val ts=c.getLong(di)
                    val parsed=PaymentParser.parse(sender, raw) ?: continue
                    Config.lastSms=java.time.Instant.ofEpochMilli(ts).toString()
                    Queue.enqueue(applicationContext, parsed, ts)
                }
            }
            Result.success()
        } catch (e: SecurityException) { Result.failure() } catch (e: Exception) { Result.retry() }
    }
}

object PeriodicSync {
    fun schedule(context: Context) {
        val req=PeriodicWorkRequestBuilder<InboxScanWorker>(15, TimeUnit.MINUTES).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("payment-inbox-scan", ExistingPeriodicWorkPolicy.UPDATE, req)
        val hb=PeriodicWorkRequestBuilder<HeartbeatWorker>(15, TimeUnit.MINUTES).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("payment-bridge-heartbeat", ExistingPeriodicWorkPolicy.UPDATE, hb)
    }
}
