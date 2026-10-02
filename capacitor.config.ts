/// <reference types="@capacitor/push-notifications" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vaulttradingacademy.vaultos',
  appName: 'Vault OS',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      // Keep light system icons on Vault's dark surfaces, regardless of OS theme.
      style: 'DARK',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      // Android edge-to-edge/fullscreen WebViews do not shrink on their own.
      resizeOnFullScreen: true,
    },
  },
};

export default config;
