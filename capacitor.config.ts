/// <reference types="@capacitor/push-notifications" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vaulttradingacademy.vaultos',
  appName: 'Vault OS',
  webDir: 'dist',
  plugins: {
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
