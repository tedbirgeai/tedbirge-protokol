import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Tedbirge — yerel (native) iOS/Android sarmalayıcı yapılandırması.
 *
 * VARSAYILAN: mağaza sürümü. Uygulama `dist/client` içindeki yerel
 * dosyalarla tamamen çevrimdışı açılır.
 *
 * Geliştirme sırasında canlı önizlemeye bağlanmak isterseniz:
 *   CAP_LIVE_URL=https://tedbirge-gateway.lovable.app npx cap sync
 */
const liveUrl = process.env["CAP_LIVE_URL"];

const config: CapacitorConfig = {
  appId: "com.tedbirge.app",
  appName: "Tedbirge",
  webDir: "dist/client",
  ...(liveUrl ? { server: { url: liveUrl, cleartext: false } } : {}),
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },

  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0b141a",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
