import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.scamshield.ai',
  appName: 'ScamShield AI',
  webDir: '.next',
  server: {
    url: 'https://scamshield-ai.netlify.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_scamshield',
      iconColor: '#8b5cf6',
    },
  },
};

export default config;
