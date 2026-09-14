package com.imolive.paymentbridge

import android.content.Context
import java.util.UUID

object Config {
    private const val PREF = "payment_bridge"
    private fun p(c: Context) = c.getSharedPreferences(PREF, Context.MODE_PRIVATE)
    var serverUrl: String get() = p(App.ctx).getString("serverUrl", "") ?: ""; set(v) = p(App.ctx).edit().putString("serverUrl", v.trim().removeSuffix("/")).apply()
    var deviceToken: String get() = p(App.ctx).getString("deviceToken", "") ?: ""; set(v) = p(App.ctx).edit().putString("deviceToken", v.trim()).apply()
    var deviceId: String get() { val x=p(App.ctx).getString("deviceId",""); if(!x.isNullOrBlank()) return x; val n=UUID.randomUUID().toString(); p(App.ctx).edit().putString("deviceId",n).apply(); return n }; private set(v) = p(App.ctx).edit().putString("deviceId",v).apply()
    var bkashSender: String get() = p(App.ctx).getString("bkashSender", "") ?: ""; set(v) = p(App.ctx).edit().putString("bkashSender", v.trim()).apply()
    var nagadSender: String get() = p(App.ctx).getString("nagadSender", "") ?: ""; set(v) = p(App.ctx).edit().putString("nagadSender", v.trim()).apply()
    var enabled: Boolean get() = p(App.ctx).getBoolean("enabled", true); set(v) = p(App.ctx).edit().putBoolean("enabled", v).apply()
    var lastSync: String get() = p(App.ctx).getString("lastSync", "Never") ?: "Never"; set(v) = p(App.ctx).edit().putString("lastSync",v).apply()
    var lastResult: String get() = p(App.ctx).getString("lastResult", "Not tested") ?: "Not tested"; set(v) = p(App.ctx).edit().putString("lastResult",v).apply()
    var lastSms: String get() = p(App.ctx).getString("lastSms", "None") ?: "None"; set(v) = p(App.ctx).edit().putString("lastSms",v).apply()
}
