import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Tedbirge — yerel (native) iOS/Android sarmalayıcı yapılandırması.
 *
 * Geliştirme sırasında uygulama canlı önizlemeyi yükler (server.url).
 * Mağazaya çıkarken bu bloğu kaldırın; uygulama `dist` içindeki
 * yerel dosyalarla tamamen çevrimdışı çalışır.
 */
const config: CapacitorConfig = {
  appId: "com.tedbirge.app",
  appName: "Tedbirge",
  webDir: "dist/client",
  server: {
    url: "https://tedbirge-gateway.lovable.app",
    cleartext: false,
  },
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
