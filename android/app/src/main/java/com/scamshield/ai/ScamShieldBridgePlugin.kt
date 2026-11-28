package com.scamshield.ai

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Base64
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONArray
import java.lang.ref.WeakReference

@CapacitorPlugin(name = "ScamShieldBridge")
class ScamShieldBridgePlugin : Plugin() {

    override fun load() {
        super.load()
        activeInstance = WeakReference(this)
        activity?.intent?.let { handleAlertIntent(it, storePending = true) }
    }

    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        handleAlertIntent(intent, storePending = false)
    }

    private fun handleAlertIntent(intent: Intent, storePending: Boolean) {
        val preview = intent.getStringExtra(ScamShieldNotificationService.EXTRA_PREVIEW) ?: return
        val riskScore = intent.getIntExtra(ScamShieldNotificationService.EXTRA_RISK_SCORE, 75)
        val packageName = intent.getStringExtra(ScamShieldNotificationService.EXTRA_PACKAGE) ?: "external.app"
        val timestamp = intent.getLongExtra(ScamShieldNotificationService.EXTRA_TIMESTAMP, System.currentTimeMillis())
        val category = intent.getStringExtra(ScamShieldNotificationService.EXTRA_CATEGORY) ?: "Suspicious Message"

        val data = JSObject().apply {
            put("riskScore", riskScore)
            put("preview", preview)
            put("packageName", packageName)
            put("timestamp", timestamp)
            put("category", category)
        }
        intent.removeExtra(ScamShieldNotificationService.EXTRA_PREVIEW)

        if (storePending) {
            pendingLaunchAlert = data
        } else {
            notifyListeners("openScamAlert", data, true)
        }
    }

    private fun hasPostNotificationsPermission(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) return false
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    @PluginMethod
    fun getNotificationStatus(call: PluginCall) {
        val context = bridge.context
        val isEnabled = ScamShieldNotificationService.isEnabled(context)
        val prefs = context.getSharedPreferences(ScamShieldNotificationService.PREFS_NAME, Context.MODE_PRIVATE)
        val prefMonitoring = prefs.getBoolean(ScamShieldNotificationService.KEY_MONITORING_ENABLED, true)
        val data = JSObject().apply {
            put("enabled", isEnabled)
            put("monitoring", isEnabled && prefMonitoring)
            put("notificationsAllowed", hasPostNotificationsPermission(context))
        }
        call.resolve(data)
    }

    @PluginMethod
    fun requestNotificationAccess(call: PluginCall) {
        val context = bridge.context
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            activity?.let {
                ActivityCompat.requestPermissions(it, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
            }
        }
        ScamShieldNotificationService.requestAccess(context)
        call.resolve()
    }

    @PluginMethod
    fun requestPostNotificationsPermission(call: PluginCall) {
        val context = bridge.context
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            activity?.let {
                ActivityCompat.requestPermissions(it, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
            }
        }
        call.resolve(JSObject().apply {
            put("notificationsAllowed", hasPostNotificationsPermission(context))
        })
    }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        ScamShieldNotificationService.requestAccess(bridge.context)
        call.resolve()
    }

    @PluginMethod
    fun setMonitoringEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        val editor = bridge.context.getSharedPreferences(ScamShieldNotificationService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(ScamShieldNotificationService.KEY_MONITORING_ENABLED, enabled)
        if (enabled) {
            editor.putLong(ScamShieldNotificationService.KEY_MONITORING_ENABLED_AT, System.currentTimeMillis())
        }
        editor.apply()
        call.resolve(JSObject().apply {
            put("monitoring", enabled)
        })
    }

    @PluginMethod
    fun setShieldConfig(call: PluginCall) {
        val threshold = call.getInt("threshold", 26) ?: 26
        val apps = call.getString("monitoredApps", "all") ?: "all"
        bridge.context.getSharedPreferences(ScamShieldNotificationService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(ScamShieldNotificationService.KEY_ALERT_THRESHOLD, threshold)
            .putString(ScamShieldNotificationService.KEY_MONITORED_APPS, apps)
            .apply()
        call.resolve()
    }

    @PluginMethod
    fun setAppTheme(call: PluginCall) {
        val theme = call.getString("theme", "dark") ?: "dark"
        bridge.context.getSharedPreferences(ScamShieldNotificationService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString("app_theme", theme)
            .apply()
        activity?.runOnUiThread {
            MainActivity.applySystemBarAppearance(activity, theme, true)
        }
        call.resolve()
    }

    @PluginMethod
    fun getShieldData(call: PluginCall) {
        val prefs = bridge.context.getSharedPreferences(ScamShieldNotificationService.PREFS_NAME, Context.MODE_PRIVATE)
        val inspectedCount = prefs.getInt(ScamShieldNotificationService.KEY_INSPECTED_COUNT, 0)
        val scamsDetected = prefs.getInt(ScamShieldNotificationService.KEY_SCAMS_DETECTED, 0)
        val rawAlerts = prefs.getString(ScamShieldNotificationService.KEY_ALERTS_JSON, "[]") ?: "[]"
        val alerts = try {
            JSArray(JSONArray(rawAlerts).toString())
        } catch (_: Exception) {
            JSArray()
        }
        val res = JSObject().apply {
            put("inspectedCount", inspectedCount)
            put("scamsDetected", scamsDetected)
            put("alerts", alerts)
            pendingLaunchAlert?.let {
                put("pendingAlert", it)
                pendingLaunchAlert = null
            }
        }
        call.resolve(res)
    }

    @PluginMethod
    fun clearShieldData(call: PluginCall) {
        bridge.context.getSharedPreferences(ScamShieldNotificationService.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(ScamShieldNotificationService.KEY_INSPECTED_COUNT, 0)
            .putInt(ScamShieldNotificationService.KEY_SCAMS_DETECTED, 0)
            .putString(ScamShieldNotificationService.KEY_ALERTS_JSON, "[]")
            .putLong(ScamShieldNotificationService.KEY_MONITORING_ENABLED_AT, System.currentTimeMillis())
            .apply()
        call.resolve()
    }

    @PluginMethod
    fun sendTestAlert(call: PluginCall) {
        val preview = "URGENT: Your SBI KYC has expired. Update PAN immediately at http://sbi-kyc-verify.top or account will be blocked tonight!"
        val riskScore = 92
        val pkg = "com.whatsapp"
        val ts = System.currentTimeMillis()
        val category = "Bank / KYC Phishing"

        val prefs = bridge.context.getSharedPreferences(ScamShieldNotificationService.PREFS_NAME, Context.MODE_PRIVATE)
        val inspected = prefs.getInt(ScamShieldNotificationService.KEY_INSPECTED_COUNT, 0) + 1
        val scams = prefs.getInt(ScamShieldNotificationService.KEY_SCAMS_DETECTED, 0) + 1
        val existingRaw = prefs.getString(ScamShieldNotificationService.KEY_ALERTS_JSON, "[]") ?: "[]"
        val arr = try { JSONArray(existingRaw) } catch (_: Exception) { JSONArray() }
        val item = org.json.JSONObject().apply {
            put("riskScore", riskScore)
            put("preview", preview)
            put("packageName", pkg)
            put("timestamp", ts)
            put("category", category)
        }
        val next = JSONArray()
        next.put(item)
        for (i in 0 until minOf(arr.length(), 49)) next.put(arr.get(i))
        prefs.edit()
            .putInt(ScamShieldNotificationService.KEY_INSPECTED_COUNT, inspected)
            .putInt(ScamShieldNotificationService.KEY_SCAMS_DETECTED, scams)
            .putString(ScamShieldNotificationService.KEY_ALERTS_JSON, next.toString())
            .apply()

        ScamShieldNotificationService.triggerWarningNotification(
            bridge.context,
            riskScore,
            category,
            preview,
            pkg,
            ts
        )
        notifyScamAlert(riskScore, preview, pkg, ts, category)
        call.resolve()
    }

    @PluginMethod
    fun extractTextFromImage(call: PluginCall) {
        val base64Str = call.getString("base64") ?: ""
        if (base64Str.isEmpty()) {
            call.resolve(JSObject().apply { put("text", "") })
            return
        }
        try {
            val cleanBase64 = base64Str.substringAfter("base64,", base64Str)
            val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            if (bitmap == null) {
                call.resolve(JSObject().apply { put("text", "") })
                return
            }
            val image = InputImage.fromBitmap(bitmap, 0)
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    call.resolve(JSObject().apply { put("text", visionText.text ?: "") })
                }
                .addOnFailureListener {
                    call.resolve(JSObject().apply { put("text", "") })
                }
        } catch (_: Exception) {
            call.resolve(JSObject().apply { put("text", "") })
        }
    }

    fun notifyScamAlert(
        riskScore: Int,
        preview: String,
        packageName: String,
        timestamp: Long = System.currentTimeMillis(),
        category: String = "Suspicious Message"
    ) {
        val data = JSObject().apply {
            put("riskScore", riskScore)
            put("preview", preview)
            put("packageName", packageName)
            put("timestamp", timestamp)
            put("category", category)
        }
        notifyListeners("scamAlert", data, true)
    }

    companion object {
        @Volatile
        private var activeInstance: WeakReference<ScamShieldBridgePlugin>? = null

        @Volatile
        private var pendingLaunchAlert: JSObject? = null

        fun emitScamAlert(
            riskScore: Int,
            preview: String,
            packageName: String,
            timestamp: Long = System.currentTimeMillis(),
            category: String = "Suspicious Message"
        ) {
            activeInstance?.get()?.notifyScamAlert(riskScore, preview, packageName, timestamp, category)
        }
    }
}
