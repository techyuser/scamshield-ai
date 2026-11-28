package com.scamshield.ai

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationProcessorTest {

    @Test
    fun `redacts OTP patterns from notification text`() {
        val input = "Your OTP is 123456. Verify now at https://fake-bank.com"
        val result = NotificationProcessor.sanitizeContent(input)
        assertTrue("Should contain redacted placeholder", result.contains("*****"))
        assertFalse("Should not contain original OTP", result.contains("123456"))
    }

    @Test
    fun `redacts verification code patterns`() {
        val input = "Your verification code is 789012. Do not share."
        val result = NotificationProcessor.sanitizeContent(input)
        assertTrue("Should contain redacted placeholder", result.contains("*****"))
        assertFalse("Should not contain original code", result.contains("789012"))
    }

    @Test
    fun `redacts PIN patterns`() {
        val input = "Your PIN is 1234. Please enter to verify."
        val result = NotificationProcessor.sanitizeContent(input)
        assertTrue("Should contain redacted placeholder", result.contains("*****"))
        assertFalse("Should not contain original PIN", result.contains("1234"))
    }

    @Test
    fun `deduplicates identical content within 30s window`() {
        val processor = NotificationProcessor()
        val hash1 = processor.contentHash("Test message")
        val hash2 = processor.contentHash("Test message")
        assertTrue("First occurrence should be processed", processor.shouldProcess(hash1))
        assertFalse("Second occurrence within window should be deduplicated", processor.shouldProcess(hash2))
    }

    @Test
    fun `allows different content`() {
        val processor = NotificationProcessor()
        val hash1 = processor.contentHash("Message one")
        val hash2 = processor.contentHash("Message two")
        assertTrue("First message should be processed", processor.shouldProcess(hash1))
        assertTrue("Different message should be processed", processor.shouldProcess(hash2))
    }

    @Test
    fun `sanitizes content without OTPs unchanged`() {
        val input = "Hello, this is a normal message without sensitive data."
        val result = NotificationProcessor.sanitizeContent(input)
        assertTrue("Normal message should pass through", result == input)
    }

    @Test
    fun `does not flag casual personal chat messages above 25 percent`() {
        val processor = NotificationProcessor()
        val casualMessages = listOf(
            "Sister: Hey call me urgent when you get free",
            "Sister: Drop me your location pin on WhatsApp",
            "Bro: We won the match today! Check https://youtube.com/watch?v=123",
            "Mom: Did you get your refund for the Amazon order?"
        )
        for (msg in casualMessages) {
            val assessment = processor.assessRisk(msg, "com.whatsapp")
            assertFalse("Casual chat should not exceed 25%: $msg (score=${assessment.riskScore})", assessment.isScam)
            assertTrue("Casual chat score should be <= 25: ${assessment.riskScore}", assessment.riskScore <= 25)
        }
    }

    @Test
    fun `flags genuine and multiline prize scam notifications strongly`() {
        val processor = NotificationProcessor()
        val scam = "AD-SBIALR: URGENT: Your SBI KYC is expired. Account will be blocked tonight. Update at http://sbi-kyc.top"
        val assessment = processor.assessRisk(scam, "com.google.android.apps.messaging")
        assertTrue("Scam should be flagged > 25% (score=${assessment.riskScore})", assessment.isScam && assessment.riskScore > 25)

        val multilinePrize = "Congratulations you won cash\nprize of Rs. 25000 click this link\nto claim- bit.ly/claim"
        val prizeAssessment = processor.assessRisk(multilinePrize, "com.whatsapp")
        assertTrue("Multiline prize scam should score >= 65 (score=${prizeAssessment.riskScore})", prizeAssessment.isScam && prizeAssessment.riskScore >= 65)
    }
}