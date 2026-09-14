package com.imolive.paymentbridge

import java.util.Locale

object PaymentParser {
    data class Parsed(val provider: String, val source: String, val amount: Double, val sender: String, val raw: String)

    fun parse(sender: String, raw: String): Parsed? {
        val s = raw.trim()
        if (s.isEmpty() || s.length > 4000) return null
        val lower = (sender + " " + s).lowercase(Locale.US)
        val provider = when {
            lower.contains("bkash") -> "bkash"
            lower.contains("nagad") -> "nagad"
            else -> return null
        }
        val allowedSender = if (provider == "bkash") Config.bkashSender else Config.nagadSender
        if (allowedSender.isNotBlank() && !sender.equals(allowedSender, ignoreCase = true)) return null

        // Generic parser. Exact provider templates can be tightened in one place after testing real SMS samples.
        val amountRegexes = listOf(
            Regex("(?i)(?:tk|bdt|৳)\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)"),
            Regex("(?i)(?:amount|payment)\\s*[:=-]?\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)")
        )
        val amount = amountRegexes.asSequence().mapNotNull { it.find(s)?.groupValues?.getOrNull(1) }.firstOrNull()?.replace(",", "")?.toDoubleOrNull() ?: return null

        val phoneRegexes = listOf(
            Regex("(?i)(?:from|sender|mobile|phone|customer)\\s*[:=-]?\\s*(01\\d{9})"),
            Regex("\\b(01\\d{9})\\b")
        )
        val source = phoneRegexes.asSequence().mapNotNull { it.find(s)?.groupValues?.lastOrNull() }.firstOrNull() ?: return null
        return Parsed(provider, source, amount, sender, s)
    }
}
