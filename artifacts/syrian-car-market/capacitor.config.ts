import type { CapacitorConfig } from "@capacitor/cli";

const REPLIT_SERVER = `https://${process.env.REPLIT_DEV_DOMAIN || "8c351e7f-e68b-4328-b0e1-22e5731e9373-00-1xit6bq2ta1l9.spock.replit.dev"}`;

const config: CapacitorConfig = {
  appId: "com.marklet.sy",
  appName: "MARKLET",
  webDir: "dist/public",

  server: {
    url: REPLIT_SERVER,
    cleartext: false,
    allowNavigation: [
      "*.replit.dev",
      "*.spock.replit.dev",
      "marklet.sy",
      "*.marklet.sy",
      "marklet.replit.app",
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
      style: "Dark",
      backgroundColor: "#062f2f",
    },
  },
};

export default config;
