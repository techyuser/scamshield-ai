"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldAlert, Activity, AlertTriangle } from "lucide-react";
import { ScamShieldBridge, type ScamAlert } from "@/plugins/scamshield-bridge";
import { appendMobileHistory } from "@/lib/mobile-storage";

export function NotificationShieldDashboard({ isActive = true }: { isActive?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [inspectedCount, setInspectedCount] = useState(0);
  const [scamsDetected, setScamsDetected] = useState(0);
  const [alerts, setAlerts] = useState<ScamAlert[]>([]);

  useEffect(() => {
    if (!isActive) return;
    ScamShieldBridge.getNotificationStatus()
      .then((status) => {
        setEnabled(status.enabled);
        setMonitoring(status.monitoring);
      })
      .catch((err) => console.error("Failed to get notification status:", err));
  }, [isActive]);

  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await ScamShieldBridge.getNotificationStatus();
        setEnabled(status.enabled);
        setMonitoring(status.monitoring);
      } catch (err) {
        console.error("Failed to get notification status:", err);
      }
    }
    checkStatus();

    const onReturn = () => {
      if (document.visibilityState === "visible") {
        void checkStatus();
      }
    };
    window.addEventListener("focus", checkStatus);
    document.addEventListener("visibilitychange", onReturn);

    let listener: { remove: () => Promise<void> } | undefined;
    ScamShieldBridge.addListener("scamAlert", (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      setScamsDetected((c) => c + 1);
      setInspectedCount((c) => c + 1);
      appendMobileHistory({
        riskScore: alert.riskScore,
        preview: alert.preview,
        source: `${alert.packageName} (Notification Shield)`,
        timestamp: alert.timestamp,
      });
    }).then((l) => {
      listener = l;
    });

    return () => {
      window.removeEventListener("focus", checkStatus);
      document.removeEventListener("visibilitychange", onReturn);
      listener?.remove();
    };
  }, []);

  const handleRequestAccess = async () => {
    try {
      await ScamShieldBridge.requestNotificationAccess();
      // Re-check after returning
      setTimeout(async () => {
        const status = await ScamShieldBridge.getNotificationStatus();
        setEnabled(status.enabled);
        setMonitoring(status.enabled);
      }, 1500);
    } catch (err) {
      console.error("Failed to request access:", err);
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

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Notification Shield
          </h1>
          <p className="text-xs text-slate-400">Real-time scam detection for messages & alerts</p>
        </div>
        <div className={`p-2 rounded-2xl ${monitoring ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
          {monitoring ? <Shield className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
        </div>
      </div>

      {/* Permission Card */}
      <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${enabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <div>
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
              onClick={handleToggleMonitoring}
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
        <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 space-y-1">
          <div className="flex items-center gap-2 text-cyan-400">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium text-slate-400">Inspected</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{inspectedCount}</p>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 space-y-1">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium text-slate-400">Scams Blocked</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{scamsDetected}</p>
        </div>
      </div>

      {/* Recent Alerts Feed */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent Intercepted Alerts</h2>
        {alerts.length === 0 ? (
          <div className="p-6 text-center rounded-3xl bg-slate-900/40 border border-slate-800/60 text-slate-500 text-xs">
            No suspicious notifications intercepted yet.
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <div key={idx} className="p-4 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                  Risk Score: {alert.riskScore}/100
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium line-clamp-2">{alert.preview}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[10px] text-slate-500">
                <span>App: {alert.packageName}</span>
                <span className="text-purple-400 font-medium">ScamShield Evaluated</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
