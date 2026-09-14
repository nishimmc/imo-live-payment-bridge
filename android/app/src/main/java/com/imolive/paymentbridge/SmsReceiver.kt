package com.imolive.paymentbridge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

class SmsReceiver: BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION || !Config.enabled) return
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isEmpty()) return
        val sender = messages.first().originatingAddress ?: return
        val raw = messages.joinToString("") { it.messageBody ?: "" }
        val parsed = PaymentParser.parse(sender, raw) ?: return
        Queue.enqueue(context.applicationContext, parsed, messages.first().timestampMillis)
    }
}
