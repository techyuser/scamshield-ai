package com.scamshield.ai

import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * Processes notification content for security and deduplication.
 * Handles OTP/sensitive data redaction and content deduplication.
 */
class NotificationProcessor {

    // Cache for deduplication: content hash -> timestamp
    private val processedHashes = ConcurrentHashMap<String, Long>()
    private val DEDUP_WINDOW_MS = TimeUnit.SECONDS.toMillis(30)

    fun sanitizeContent(text: String): String = Companion.sanitizeContent(text)

    companion object {
        /**
         * Sanitizes notification content by redacting OTPs, verification codes, PINs, and other sensitive patterns.
         */
        fun sanitizeContent(text: String): String {
            var result = text

            // Pattern 1: OTP/Verification code patterns (4-8 digits, often preceded by keywords)
            val otpPatterns = listOf(
                // "OTP is 123456", "OTP: 123456", "otp 123456"
                Regex("(?i)\\b(otp|one.time.password|verification.code|verification.code.is|code.is|passcode|pin)\\b\\s*[:=]?\\s*\\d{4,8}"),
                // "Your OTP is 123456", "Your code is 123456"
                Regex("(?i)\\b(your|the)\\s+(otp|code|verification.code|passcode|pin)\\s+(is|:)\\s*\\d{4,8}"),
                // "Enter OTP 123456", "Enter code 123456"
                Regex("(?i)\\b(enter|provide|input)\\s+(otp|code|verification.code|passcode|pin)\\s*\\d{4,8}"),
                // Standalone 6-digit codes that look like OTPs (but be careful not to over-redact)
                Regex("(?i)\\b\\d{6}\\b(?=\\s*(verify|confirm|validate|authenticate|login|sign.in))"),
            )

            for (pattern in otpPatterns) {
                result = pattern.replace(result) { matchResult ->
                    val matched = matchResult.value
                    // Replace only the digits with *****
                    val digitPattern = Regex("\\d{4,8}")
                    digitPattern.replace(matched, "*****")
                }
            }

            // Pattern 2: Credit card / UPI ID patterns (basic)
            val financialPatterns = listOf(
                Regex("\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b"), // Credit card
                Regex("(?i)\\b[\\w.-]+@[\\w.-]+\\.(upi|paytm|phonepe|gpay|okaxis|oksbi|okicici|okhdfc)\\b"), // UPI IDs
            )

            for (pattern in financialPatterns) {
                result = pattern.replace(result, "*****")
            }

            return result
        }
    }

    /**
     * Generates a content hash for deduplication.
     */
    fun contentHash(text: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(text.toByteArray())
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Checks if content should be processed (not a duplicate within the time window).
     * Returns true if content should be processed, false if it's a duplicate.
     */
    fun shouldProcess(hash: String): Boolean {
        val now = System.currentTimeMillis()
        val previousTimestamp = processedHashes[hash]

        if (previousTimestamp != null) {
            val elapsed = now - previousTimestamp
            if (elapsed < DEDUP_WINDOW_MS) {
                return false // Duplicate within window
            }
        }

        // Update timestamp and allow processing
        processedHashes[hash] = now

        // Cleanup old entries periodically
        if (processedHashes.size > 1000) {
            cleanupOldEntries(now)
        }

        return true
    }

    fun cleanupOldEntries(now: Long) {
        val cutoff = now - DEDUP_WINDOW_MS
        processedHashes.entries.removeIf { it.value < cutoff }
    }

    data class NotificationAssessment(
        val riskScore: Int,
        val category: String,
        val isScam: Boolean,
        val matchedTriggers: List<String>
    )

    fun assessRisk(text: String, packageName: String = ""): NotificationAssessment {
        val lower = text.lowercase()
        var score = 8
        val triggers = mutableListOf<String>()

        if (Regex("\\b(kyc|pan card|aadhaar|account.*(block|suspend|freeze|close)|re-?verify)\\b").containsMatchIn(lower)) {
            score += 36
            triggers.add("Bank / KYC Threat")
        }
        if (Regex("\\b(share.*otp|tell.*otp|send.*otp|cvv|atm pin|mpin|upi pin|enter.*pin|share.*password|share.*code)\\b").containsMatchIn(lower)) {
            score += 38
            triggers.add("Credential / PIN Request")
        }
        if (Regex("(your (code|otp) is \\d{4,8}|didn'?t request this|did not request this)").containsMatchIn(lower) &&
            Regex("(click here|tap here|https?://)").containsMatchIn(lower)
        ) {
            score += 56
            triggers.add("Unsolicited OTP Link Bait")
        }
        if (Regex("\\b(scan.*qr|enter.*upi|upi.*pin|collect request|registration fee|processing fee|security deposit|claim.*refund)\\b").containsMatchIn(lower)) {
            score += 36
            triggers.add("UPI / Fee Trap")
        }
        if (Regex("\\b(lottery|jackpot|lucky draw)\\b|won[\\s\\S]{0,40}?(prize|cash|lottery|crore|lakh|rs|₹)|congratulations[\\s\\S]{0,50}?won|claim[\\s\\S]{0,35}?(prize|reward|bonus|cash)|(?:click|tap)[\\s\\S]{0,35}?link[\\s\\S]{0,35}?claim").containsMatchIn(lower)) {
            score += 40
            triggers.add("Lottery / Prize Bait")
        }
        if (Regex("\\b(digital arrest|cbi|ncb|enforcement directorate|cyber cell|customs parcel|arrest warrant|money laundering)\\b").containsMatchIn(lower)) {
            score += 46
            triggers.add("Digital Arrest / Extortion")
        }
        if (Regex("(http://|bit\\.ly|tinyurl|rb\\.gy|ngrok|\\.top\\b|\\.xyz\\b|\\.click\\b|\\.site\\b|\\.online\\b|\\.tk\\b)").containsMatchIn(lower)) {
            score += 26
            triggers.add("Suspicious Link")
        }
        if (Regex("\\b(urgent|immediately|right now|within \\d+ hours?|expire|tonight|last warning)\\b").containsMatchIn(lower)) {
            score += 14
            triggers.add("Urgency Pressure")
        }
        if (Regex("(telegram.*@|part[- ]time.*earn|work from home.*earn|earn.*daily|liking youtube|vip.*task)").containsMatchIn(lower)) {
            score += 36
            triggers.add("Task / Job Bait")
        }

        val clamped = score.coerceIn(5, 98)
        val category = when {
            triggers.contains("Digital Arrest / Extortion") -> "Digital Arrest / Extortion"
            triggers.contains("UPI / Fee Trap") -> "UPI / Payment Fraud"
            triggers.contains("Bank / KYC Threat") -> "Bank / KYC Phishing"
            triggers.contains("Lottery / Prize Bait") -> "Lottery / Reward Scam"
            triggers.contains("Task / Job Bait") -> "Fake Job / Task Scam"
            triggers.isNotEmpty() -> "Suspicious Message"
            else -> "Verified Notice"
        }

        return NotificationAssessment(
            riskScore = clamped,
            category = category,
            isScam = clamped > 25,
            matchedTriggers = triggers
        )
    }
}