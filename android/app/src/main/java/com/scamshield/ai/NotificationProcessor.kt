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

    private fun cleanupOldEntries(now: Long) {
        val cutoff = now - DEDUP_WINDOW_MS
        processedHashes.entries.removeIf { it.value < cutoff }
    }
}