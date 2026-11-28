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
import org.json.JSONArray
import org.json.JSONObject

class ScamShieldNotificationService : NotificationListenerService() {

    private val processor = NotificationProcessor()

    @Volatile
    private var listenerConnectedAtMs: Long = System.currentTimeMillis()

    override fun onListenerConnected() {
        super.onListenerConnected()
        listenerConnectedAtMs = System.currentTimeMillis()
        val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.contains(KEY_MONITORING_ENABLED_AT)) {
            prefs.edit().putLong(KEY_MONITORING_ENABLED_AT, listenerConnectedAtMs).apply()
        }
        // Snapshot pre-existing active notifications so we never alert on old notifications
        try {
            val active = activeNotifications ?: return
            for (sbn in active) {
                val pkg = sbn.packageName ?: continue
                val content = extractNotificationText(sbn, 0L)
                if (content.length >= 4) {
                    val sanitized = processor.sanitizeContent(content)
                    val hash = processor.contentHash("$pkg:$sanitized")
                    markHashSeen(prefs, hash)
                }
                sbn.key?.let { key ->
                    val notifWhen = sbn.notification?.`when` ?: 0L
                    markHashSeen(prefs, processor.contentHash("sbn:$key:$notifWhen"))
                }
            }
        } catch (_: Exception) {
            // Ignore if system temporarily denies activeNotifications during bind
        }
    }

    private fun extractNotificationText(sbn: StatusBarNotification, cutoffMs: Long): String {
        val notification = sbn.notification ?: return ""
        val extras = notification.extras ?: return ""
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim()
        val mainText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim()
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim()

        val messageBundleText = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            @Suppress("DEPRECATION")
            val msgs = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
                ?.mapNotNull { it as? android.os.Bundle }
                ?: emptyList()
            val recentMsgs = if (cutoffMs > 0L) {
                msgs.filter { msg ->
                    val msgTime = msg.getLong("time", 0L)
                    msgTime == 0L || msgTime >= cutoffMs
                }
            } else {
                msgs
            }
            val targetMsgs = if (recentMsgs.isEmpty() && cutoffMs == 0L) msgs else recentMsgs
            targetMsgs.mapNotNull { it.getCharSequence("text")?.toString()?.trim() }
                .filter { it.isNotEmpty() }
                .lastOrNull()
        } else null

        val inboxLinesText = if (cutoffMs == 0L) {
            extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
                ?.mapNotNull { it?.toString()?.trim() }
                ?.filter { it.isNotEmpty() }
                ?.lastOrNull()
        } else null

        val body = listOfNotNull(
            messageBundleText?.takeIf { it.isNotEmpty() },
            bigText?.takeIf { it.isNotEmpty() },
            mainText?.takeIf { it.isNotEmpty() },
            inboxLinesText?.takeIf { it.isNotEmpty() },
            subText?.takeIf { it.isNotEmpty() }
        ).firstOrNull() ?: ""

        return listOf(title, body).filter { it.isNotEmpty() }.joinToString(": ").trim()
    }

    private fun isHashSeenRecently(prefs: android.content.SharedPreferences, hash: String, now: Long): Boolean {
        val raw = prefs.getString(KEY_SEEN_HASHES_JSON, "{}") ?: "{}"
        val obj = try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
        val prevTs = obj.optLong(hash, -1L)
        return prevTs > 0L && (now - prevTs) < SEEN_TTL_MS
    }

    private fun markHashSeen(prefs: android.content.SharedPreferences, hash: String) {
        val now = System.currentTimeMillis()
        val raw = prefs.getString(KEY_SEEN_HASHES_JSON, "{}") ?: "{}"
        val obj = try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
        obj.put(hash, now)
        // Prune expired or oversized cache
        val keys = obj.keys().asSequence().toList()
        if (keys.size > 200) {
            for (k in keys) {
                if (now - obj.optLong(k, 0L) >= SEEN_TTL_MS) {
                    obj.remove(k)
                }
            }
            val remaining = obj.keys().asSequence().toList()
            if (remaining.size > 200) {
                remaining.sortedBy { obj.optLong(it, 0L) }
                    .take(remaining.size - 200)
                    .forEach { obj.remove(it) }
            }
        }
        prefs.edit().putString(KEY_SEEN_HASHES_JSON, obj.toString()).apply()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName ?: return
        // Ignore own notifications & system/ongoing/group-summary notifications
        if (packageName == "com.scamshield.ai" || packageName == "android" || packageName == "com.android.systemui") return
        val notification = sbn.notification ?: return
        if ((notification.flags and Notification.FLAG_ONGOING_EVENT) != 0) return
        if ((notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return
        if (notification.category == Notification.CATEGORY_TRANSPORT || notification.category == Notification.CATEGORY_SYSTEM) return

        val prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_MONITORING_ENABLED, true)) return

        val now = System.currentTimeMillis()
        val enabledAt = prefs.getLong(KEY_MONITORING_ENABLED_AT, listenerConnectedAtMs)
        val cutoffMs = maxOf(listenerConnectedAtMs - 1500L, enabledAt - 1500L)

        // Ignore pre-existing or stale notifications
        if (sbn.postTime < cutoffMs || (now - sbn.postTime) > 90_000L) return
        val notifWhen = notification.`when`
        if (notifWhen > 0L && notifWhen < cutoffMs) return

        val allowedAppsRaw = prefs.getString(KEY_MONITORED_APPS, "all") ?: "all"
        if (allowedAppsRaw != "all") {
            val allowedSet = allowedAppsRaw.split(",").map { it.trim() }.filter { it.isNotEmpty() }.toSet()
            if (allowedSet.isNotEmpty() && !allowedSet.contains(packageName)) return
        }

        val fullContent = extractNotificationText(sbn, cutoffMs)
        if (fullContent.length < 4) return

        // Skip personal 1-on-1 contact chats & group chats unless there is an explicit >70% scam trap
        val extras = notification.extras
        val title = extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val isGroupChat = extras?.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION, false) == true
        val isPersonalContact = isLikelyPersonalContactTitle(title)

        val sanitized = processor.sanitizeContent(fullContent)
        val assessment = processor.assessRisk(sanitized, packageName)

        if (isGroupChat && assessment.riskScore < 70) return
        if (isPersonalContact && assessment.riskScore < 70) return

        val hash = processor.contentHash("$packageName:$sanitized")
        val sbnEventHash = sbn.key?.let { processor.contentHash("sbn:$it:$notifWhen") }

        if (!processor.shouldProcess(hash) || isHashSeenRecently(prefs, hash, now)) return
        if (sbnEventHash != null && isHashSeenRecently(prefs, sbnEventHash, now)) return

        markHashSeen(prefs, hash)
        if (sbnEventHash != null) markHashSeen(prefs, sbnEventHash)

        val minScore = maxOf(26, prefs.getInt(KEY_ALERT_THRESHOLD, 26))
        if (assessment.isScam && assessment.riskScore > 25 && assessment.riskScore >= minScore) {
            val inspected = prefs.getInt(KEY_INSPECTED_COUNT, 0) + 1
            val timestamp = System.currentTimeMillis()
            val preview = sanitized.take(220)
            val scamsCount = prefs.getInt(KEY_SCAMS_DETECTED, 0) + 1
            prefs.edit().putInt(KEY_INSPECTED_COUNT, inspected).apply()
            saveAlertToPrefs(prefs, assessment.riskScore, preview, packageName, timestamp, assessment.category, scamsCount)
            triggerWarningNotification(applicationContext, assessment.riskScore, assessment.category, preview, packageName, timestamp)
            ScamShieldBridgePlugin.emitScamAlert(assessment.riskScore, preview, packageName, timestamp, assessment.category)
        }
    }

    private fun isLikelyPersonalContactTitle(title: String): Boolean {
        if (title.isEmpty()) return false
        val lower = title.lowercase()
        // Phone numbers, SMS sender codes (AD-SBIALR), or service/brand titles are NOT personal contacts
        if (Regex("\\d{4,}").containsMatchIn(title)) return false
        if (title.startsWith("+")) return false
        if (Regex("^[A-Z]{2}-[A-Z0-9]+$").matches(title)) return false
        if (Regex("\\b(bank|sbi|hdfc|icici|axis|kotak|paytm|phonepe|gpay|amazon|flipkart|kyc|alert|verify|cbi|police|customs|support|service|delivery|hr|team|offer|lottery|reward)\\b").containsMatchIn(lower)) {
            return false
        }
        // Regular contact names (e.g. "Sister", "Mom", "Rahul Sharma")
        return true
    }

    private fun saveAlertToPrefs(
        prefs: android.content.SharedPreferences,
        riskScore: Int,
        preview: String,
        packageName: String,
        timestamp: Long,
        category: String,
        scamsCount: Int
    ) {
        val existingRaw = prefs.getString(KEY_ALERTS_JSON, "[]") ?: "[]"
        val arr = try { JSONArray(existingRaw) } catch (_: Exception) { JSONArray() }
        val item = JSONObject().apply {
            put("riskScore", riskScore)
            put("preview", preview)
            put("packageName", packageName)
            put("timestamp", timestamp)
            put("category", category)
        }
        val next = JSONArray()
        next.put(item)
        for (i in 0 until minOf(arr.length(), 49)) {
            next.put(arr.get(i))
        }
        prefs.edit()
            .putInt(KEY_SCAMS_DETECTED, scamsCount)
            .putString(KEY_ALERTS_JSON, next.toString())
            .apply()
    }

    companion object {
        const val PREFS_NAME = "scamshield_prefs"
        const val KEY_MONITORING_ENABLED = "monitoring_enabled"
        const val KEY_INSPECTED_COUNT = "inspected_count"
        const val KEY_SCAMS_DETECTED = "scams_detected"
        const val KEY_ALERTS_JSON = "alerts_json"
        const val KEY_ALERT_THRESHOLD = "alert_threshold"
        const val KEY_MONITORED_APPS = "monitored_apps"
        const val KEY_MONITORING_ENABLED_AT = "monitoring_enabled_at"
        const val KEY_SEEN_HASHES_JSON = "seen_hashes_json"
        const val SEEN_TTL_MS = 24L * 60L * 60L * 1000L

        const val EXTRA_RISK_SCORE = "scam_alert_risk_score"
        const val EXTRA_PREVIEW = "scam_alert_preview"
        const val EXTRA_PACKAGE = "scam_alert_package"
        const val EXTRA_TIMESTAMP = "scam_alert_timestamp"
        const val EXTRA_CATEGORY = "scam_alert_category"

        fun isEnabled(context: Context): Boolean {
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

        fun triggerWarningNotification(
            context: Context,
            riskScore: Int,
            category: String,
            preview: String,
            packageName: String,
            timestamp: Long
        ) {
            val channelId = "scam_alerts_channel"
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(channelId, "Scam Alerts", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "High-priority alerts when ScamShield AI detects a potential scam notification"
                    enableVibration(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(EXTRA_RISK_SCORE, riskScore)
                putExtra(EXTRA_PREVIEW, preview)
                putExtra(EXTRA_PACKAGE, packageName)
                putExtra(EXTRA_TIMESTAMP, timestamp)
                putExtra(EXTRA_CATEGORY, category)
            }

            val reqCode = (timestamp % Int.MAX_VALUE).toInt()
            val pendingIntent = PendingIntent.getActivity(
                context,
                reqCode,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val shortBody = "Risk $riskScore/100 ($category) • Tap to view full report & stats"
            val bigBody = "Risk Score: $riskScore/100 ($category)\nSource: $packageName\n\"${preview.take(120)}\"\nTap to open full analysis & safety plan."

            val smallIconRes = context.resources.getIdentifier("ic_stat_scamshield", "drawable", context.packageName)
                .takeIf { it != 0 } ?: android.R.drawable.ic_dialog_alert

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(smallIconRes)
                .setContentTitle("⚠️ Scam Detected · Risk $riskScore/100")
                .setContentText(shortBody)
                .setStyle(NotificationCompat.BigTextStyle().bigText(bigBody))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            notificationManager.notify(reqCode, notification)
        }
    }
}
