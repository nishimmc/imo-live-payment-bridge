package com.imolive.paymentbridge

import android.os.Build
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.time.Instant
import java.util.concurrent.TimeUnit

object ApiClient {
    private val client = OkHttpClient.Builder().connectTimeout(12, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS).writeTimeout(15, TimeUnit.SECONDS).build()
    private fun base(): String = Config.serverUrl.trim().removeSuffix("/")
    private fun common(): Request.Builder = Request.Builder().header("X-Payment-Device-Token", Config.deviceToken).header("X-Bridge-Device-ID", Config.deviceId)
    fun testConnection(): String {
        if (!base().startsWith("https://")) return "Server URL must use HTTPS"
        if (Config.deviceToken.isBlank()) return "Payment device token is missing"
        return try {
            val body=JSONObject().put("deviceId",Config.deviceId).put("appVersion","1.1.0").put("deviceModel",Build.MANUFACTURER+" "+Build.MODEL).toString()
            val req=common().url(base()+"/api/payments/device/health").post(body.toRequestBody("application/json".toMediaType())).build()
            client.newCall(req).execute().use { r -> if(r.code==200) "CONNECTED • DEVICE AUTHORIZED" else if(r.code==401) "SERVER REACHED • TOKEN REJECTED" else "SERVER ERROR • HTTP ${r.code}" }
        } catch(e: Exception) { Log.e("PaymentBridge","health failed",e); "SERVER UNREACHABLE • ${e.javaClass.simpleName}" }
    }
    fun send(p: PaymentParser.Parsed, receivedAt: Long): Boolean {
        val url = base() + "/api/payments/sms"
        if (!url.startsWith("https://") || Config.deviceToken.isBlank()) return false
        val body = JSONObject().apply { put("deviceId",Config.deviceId); put("appVersion","1.1.0"); put("deviceModel",Build.MANUFACTURER+" "+Build.MODEL); put("provider", p.provider); put("paymentSource", p.source); put("amount", p.amount); put("receivedAt", Instant.ofEpochMilli(receivedAt).toString()); put("sms", p.raw); put("smsSender", p.sender) }.toString()
        val req = common().url(url).post(body.toRequestBody("application/json".toMediaType())).build()
        return try { client.newCall(req).execute().use { r -> Config.lastSync=Instant.now().toString(); Config.lastResult="HTTP ${r.code}"; r.isSuccessful } } catch (e: Exception) { Config.lastResult="UPLOAD FAILED: ${e.javaClass.simpleName}"; Log.e("PaymentBridge", "send failed", e); false }
    }
}
