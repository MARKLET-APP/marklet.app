import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lazemni.app",
  appName: "LAZEMNI",
  webDir: "dist/public",

  server: {
    cleartext: false,
    allowNavigation: [
      "marklet.net",
      "*.marklet.net",
      "lazemni.com",
      "*.lazemni.com",
      "*.replit.app",
      "*.replit.dev",
      "*.spock.replit.dev",
    ],
  },

  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#062f2f",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    StatusBar: {
      style: "Light",
      backgroundColor: "#062f2f",
      overlaysWebView: false,
    },
  },
};

export default config;
