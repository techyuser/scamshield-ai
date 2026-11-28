import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface ScamAlert {
  riskScore: number;
  preview: string;
  packageName: string;
  timestamp: number;
}

export interface ScamShieldBridgePlugin {
  getNotificationStatus(): Promise<{ enabled: boolean; monitoring: boolean }>;
  requestNotificationAccess(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  setMonitoringEnabled(options: { enabled: boolean }): Promise<{ monitoring: boolean }>;
  addListener(
    eventName: 'scamAlert',
    listenerFunc: (alert: ScamAlert) => void
  ): Promise<PluginListenerHandle>;
}

const ScamShieldBridge = registerPlugin<ScamShieldBridgePlugin>('ScamShieldBridge', {
  web: {
    async getNotificationStatus() {
      return { enabled: false, monitoring: false };
    },
    async requestNotificationAccess() {
      console.log('Web mock: requestNotificationAccess');
    },
    async openNotificationSettings() {
      console.log('Web mock: openNotificationSettings');
    },
    async setMonitoringEnabled(options: { enabled: boolean }) {
      return { monitoring: options.enabled };
    },
    async addListener() {
      return { remove: async () => {} };
    }
  }
});

export { ScamShieldBridge };
