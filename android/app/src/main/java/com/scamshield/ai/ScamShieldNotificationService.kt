package com.scamshield.ai

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import java.security.MessageDigest

class ScamShieldNotificationService : NotificationListenerService() {

    private val processor = NotificationProcessor()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName ?: return
        // Ignore own notifications to prevent loops
        if (packageName == "com.scamshield.ai") return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val fullContent = "$title $text".trim()

        if (fullContent.isEmpty()) return

        val sanitized = processor.sanitizeContent(fullContent)
        val hash = processor.contentHash(sanitized)

        if (!processor.shouldProcess(hash)) return

        // Evaluate via heuristics / simulate scam detection check for high risk keywords
        if (isPotentialScam(sanitized)) {
            triggerWarningNotification(applicationContext, sanitized)
            ScamShieldBridgePlugin.emitScamAlert(85, sanitized.take(140), packageName)
        }
    }

    private fun isPotentialScam(text: String): kotlin.Boolean {
        val lower = text.lowercase()
        val scamKeywords = listOf("kyc", "block", "suspend", "lottery", "won", "click", "verify", "urgent", "account", "expire")
        return scamKeywords.any { lower.contains(it) }
    }

    private fun triggerWarningNotification(context: Context, preview: String) {
        val channelId = "scam_alerts_channel"
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Scam Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Alerts for potential scam messages detected in notifications"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = context.packageManager.getLaunchIntentForPackage("com.scamshield.ai")?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("⚠️ Potential Scam Detected")
            .setContentText("Suspicious content: ${preview.take(60)}...")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    }

    companion object {
        fun isEnabled(context: Context): kotlin.Boolean {
            val packageName = context.packageName
            val enabledListeners = android.provider.Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            )
            return enabledListeners != null && enabledListeners.contains(packageName)
        }

        fun requestAccess(context: Context) {
            val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
    }
}
