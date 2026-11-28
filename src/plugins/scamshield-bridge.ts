import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface ScamAlert {
  riskScore: number;
  preview: string;
  packageName: string;
  timestamp: number;
  category?: string;
}

export interface ShieldDataResponse {
  inspectedCount: number;
  scamsDetected: number;
  alerts: ScamAlert[];
  pendingAlert?: ScamAlert;
}

export interface ScamShieldBridgePlugin {
  getNotificationStatus(): Promise<{
    enabled: boolean;
    monitoring: boolean;
    notificationsAllowed?: boolean;
  }>;
  requestNotificationAccess(): Promise<void>;
  requestPostNotificationsPermission(): Promise<{ notificationsAllowed: boolean }>;
  openNotificationSettings(): Promise<void>;
  setMonitoringEnabled(options: { enabled: boolean }): Promise<{ monitoring: boolean }>;
  setShieldConfig(options: { threshold: number; monitoredApps: string }): Promise<void>;
  setAppTheme(options: { theme: 'dark' | 'light' | 'system' }): Promise<void>;
  getShieldData(): Promise<ShieldDataResponse>;
  clearShieldData(): Promise<void>;
  sendTestAlert(): Promise<void>;
  extractTextFromImage(options: { base64: string }): Promise<{ text: string }>;
  addListener(
    eventName: 'scamAlert' | 'openScamAlert',
    listenerFunc: (alert: ScamAlert) => void
  ): Promise<PluginListenerHandle>;
}

const ScamShieldBridge = registerPlugin<ScamShieldBridgePlugin>('ScamShieldBridge', {
  web: {
    async getNotificationStatus() {
      return { enabled: false, monitoring: false, notificationsAllowed: false };
    },
    async requestNotificationAccess() {
      console.log('Web mock: requestNotificationAccess');
    },
    async requestPostNotificationsPermission() {
      return { notificationsAllowed: false };
    },
    async openNotificationSettings() {
      console.log('Web mock: openNotificationSettings');
    },
    async setMonitoringEnabled(options: { enabled: boolean }) {
      return { monitoring: options.enabled };
    },
    async setShieldConfig() {
      console.log('Web mock: setShieldConfig');
    },
    async setAppTheme() {
      console.log('Web mock: setAppTheme');
    },
    async getShieldData() {
      return { inspectedCount: 0, scamsDetected: 0, alerts: [] };
    },
    async clearShieldData() {
      console.log('Web mock: clearShieldData');
    },
    async sendTestAlert() {
      console.log('Web mock: sendTestAlert');
    },
    async extractTextFromImage() {
      return { text: '' };
    },
    async addListener() {
      return { remove: async () => {} };
    },
  },
});

export { ScamShieldBridge };
