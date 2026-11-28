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
}