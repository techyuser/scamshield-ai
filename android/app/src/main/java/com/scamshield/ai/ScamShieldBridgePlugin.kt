package com.scamshield.ai

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.lang.ref.WeakReference

@CapacitorPlugin(name = "ScamShieldBridge")
class ScamShieldBridgePlugin : Plugin() {

    override fun load() {
        super.load()
        activeInstance = WeakReference(this)
    }

    @PluginMethod
    fun getNotificationStatus(call: PluginCall) {
        val context = bridge.context
        val isEnabled = ScamShieldNotificationService.isEnabled(context)
        val data = JSObject().apply {
            put("enabled", isEnabled)
            put("monitoring", isEnabled)
        }
        call.resolve(data)
    }

    @PluginMethod
    fun requestNotificationAccess(call: PluginCall) {
        val context = bridge.context
        ScamShieldNotificationService.requestAccess(context)
        call.resolve()
    }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val context = bridge.context
        ScamShieldNotificationService.requestAccess(context)
        call.resolve()
    }

    @PluginMethod
    fun setMonitoringEnabled(call: PluginCall) {
        // Monitoring is tied to NotificationListenerService system permission
        val enabled = call.getBoolean("enabled", false) ?: false
        val data = JSObject().apply {
            put("monitoring", enabled)
        }
        call.resolve(data)
    }

    fun notifyScamAlert(riskScore: Int, preview: String, packageName: String) {
        val data = JSObject().apply {
            put("riskScore", riskScore)
            put("preview", preview)
            put("packageName", packageName)
            put("timestamp", System.currentTimeMillis())
        }
        notifyListeners("scamAlert", data, true)
    }

    companion object {
        @Volatile
        private var activeInstance: WeakReference<ScamShieldBridgePlugin>? = null

        fun emitScamAlert(riskScore: Int, preview: String, packageName: String) {
            activeInstance?.get()?.notifyScamAlert(riskScore, preview, packageName)
        }
    }
}
