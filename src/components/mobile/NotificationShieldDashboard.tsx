"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, ShieldAlert, Activity, AlertTriangle, BellRing, ChevronRight } from "lucide-react";
import { ScamShieldBridge, type ScamAlert } from "@/plugins/scamshield-bridge";
import { appendMobileHistory } from "@/lib/mobile-storage";
import { getFriendlyAppInfo } from "@/lib/app-metadata";

interface NotificationShieldDashboardProps {
  isActive?: boolean;
  onInspectAlert?: (alert: ScamAlert) => void;
}

export function NotificationShieldDashboard({
  isActive = true,
  onInspectAlert,
}: NotificationShieldDashboardProps) {
  const [enabled, setEnabled] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(true);
  const [inspectedCount, setInspectedCount] = useState(0);
  const [scamsDetected, setScamsDetected] = useState(0);
  const [alerts, setAlerts] = useState<ScamAlert[]>([]);

  const syncFromNative = useCallback(async () => {
    try {
      const [status, shieldData] = await Promise.all([
        ScamShieldBridge.getNotificationStatus(),
        ScamShieldBridge.getShieldData(),
      ]);
      setEnabled(status.enabled);
      setMonitoring(status.monitoring);
      if (typeof status.notificationsAllowed === "boolean") {
        setNotificationsAllowed(status.notificationsAllowed);
      }
      setInspectedCount(shieldData.inspectedCount);
      const rawAlerts = Array.isArray(shieldData.alerts) ? shieldData.alerts : [];
      const highConfidenceAlerts = rawAlerts.filter((a) => a.riskScore > 25);
      setScamsDetected(highConfidenceAlerts.length);
      setAlerts(highConfidenceAlerts);
    } catch (err) {
      console.error("Failed to sync notification shield:", err);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    void syncFromNative();
  }, [isActive, syncFromNative]);

  useEffect(() => {
    void syncFromNative();

    const onReturn = () => {
      if (document.visibilityState === "visible") {
        void syncFromNative();
      }
    };
    window.addEventListener("focus", syncFromNative);
    document.addEventListener("visibilitychange", onReturn);

    let listener: { remove: () => Promise<void> } | undefined;
    ScamShieldBridge.addListener("scamAlert", (alert) => {
      setInspectedCount((c) => c + 1);
      if (alert.riskScore <= 25) return;
      setAlerts((prev) => [alert, ...prev.filter((a) => a.timestamp !== alert.timestamp)].slice(0, 50));
      setScamsDetected((c) => c + 1);
      appendMobileHistory({
        riskScore: alert.riskScore,
        preview: alert.preview,
        source: `${alert.packageName} (Notification Shield)`,
        timestamp: alert.timestamp,
        category: alert.category,
      });
    }).then((l) => {
      listener = l;
    });

    return () => {
      window.removeEventListener("focus", syncFromNative);
      document.removeEventListener("visibilitychange", onReturn);
      listener?.remove();
    };
  }, [syncFromNative]);

  const handleRequestAccess = async () => {
    try {
      await ScamShieldBridge.requestNotificationAccess();
      setTimeout(() => void syncFromNative(), 1500);
    } catch (err) {
      console.error("Failed to request access:", err);
    }
  };

  const handleRequestPushPermission = async () => {
    try {
      const res = await ScamShieldBridge.requestPostNotificationsPermission();
      setNotificationsAllowed(res.notificationsAllowed);
      setTimeout(() => void syncFromNative(), 1000);
    } catch (err) {
      console.error("Failed to request post notifications:", err);
    }
  };

  const handleToggleMonitoring = async () => {
    const nextState = !monitoring;
    try {
      await ScamShieldBridge.setMonitoringEnabled({ enabled: nextState });
      setMonitoring(nextState);
    } catch (err) {
      console.error("Failed to toggle monitoring:", err);
    }
  };

  const handleSendTestAlert = async () => {
    try {
      await ScamShieldBridge.sendTestAlert();
      setTimeout(() => void syncFromNative(), 300);
    } catch (err) {
      console.error("Failed to trigger test alert:", err);
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-md mx-auto text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Notification Shield
          </h1>
          <p className="text-xs text-slate-400">Real-time scam detection for messages & alerts</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSendTestAlert}
            className="px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/35 text-purple-200 text-[11px] font-medium hover:bg-purple-500/30 whitespace-nowrap"
          >
            Test Alert
          </button>
          <div className={`p-2 rounded-2xl ${monitoring ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
            {monitoring ? <Shield className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {!notificationsAllowed && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BellRing className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-xs font-semibold text-amber-200">Enable Warning Alerts</h2>
              <p className="text-[11px] text-slate-300">Allow push alerts so ScamShield can warn you with the Risk Score.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRequestPushPermission}
            className="shrink-0 whitespace-nowrap px-3.5 py-2 rounded-full bg-amber-500/25 border border-amber-400/40 text-amber-100 text-xs font-semibold"
          >
            Allow
          </button>
        </div>
      )}

      {/* Permission Card */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-3 h-3 shrink-0 rounded-full ${enabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-200">Android Notification Access</h2>
              <p className="text-xs text-slate-400">{enabled ? "Permission granted & active" : "Permission required for auto-scanning"}</p>
            </div>
          </div>
          {!enabled && (
            <button
              type="button"
              onClick={handleRequestAccess}
              className="shrink-0 whitespace-nowrap px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-medium rounded-full shadow-lg shadow-purple-900/30 hover:from-purple-500 hover:to-indigo-500 transition-all"
            >
              Grant Access
            </button>
          )}
        </div>

        {enabled && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
            <span className="text-xs text-slate-300 font-medium">Auto-Monitor Incoming Messages</span>
            <button
              type="button"
              onClick={handleToggleMonitoring}
              aria-label="Toggle auto-monitor incoming messages"
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                monitoring ? "bg-purple-600" : "bg-slate-800"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  monitoring ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-1">
          <div className="flex items-center gap-2 text-cyan-400">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium text-slate-400">Inspected</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{inspectedCount}</p>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-1">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium text-slate-400">Scams Blocked</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{scamsDetected}</p>
        </div>
      </div>

      {/* Recent Alerts Feed */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Recent Intercepted Alerts (Tap to Inspect)
        </h2>
        {alerts.length === 0 ? (
          <div className="p-6 text-center rounded-3xl bg-slate-900/50 border border-slate-800/60 text-slate-400 text-xs space-y-1">
            <p className="font-medium text-slate-300">No suspicious notifications intercepted yet.</p>
            <p className="text-[11px] text-slate-500">
              Enable Notification Access or tap &ldquo;Test Alert&rdquo; above to preview detection and full reporting.
            </p>
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const appInfo = getFriendlyAppInfo(alert.packageName);
            return (
              <button
                key={`${alert.timestamp}-${idx}`}
                type="button"
                onClick={() => onInspectAlert?.(alert)}
                className="w-full text-left p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/50 active:scale-[0.985] transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                      Risk {alert.riskScore}/100
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${appInfo.badgeClass}`}>
                      {appInfo.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-medium line-clamp-2 break-words">{alert.preview}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[10px] text-slate-400">
                  <span className="truncate">{alert.category || "Suspicious Message"}</span>
                  <span className="text-purple-400 font-semibold inline-flex items-center gap-0.5 shrink-0">
                    View Stats &amp; Report <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
