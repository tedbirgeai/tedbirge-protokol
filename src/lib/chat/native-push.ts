/**
 * YEREL (NATIVE) PUSH KÖPRÜSÜ — APNs / FCM
 * ------------------------------------------------------------------
 * Tarayıcıda Web Push (VAPID) kullanılır; iOS/Android mağaza sürümünde
 * ise sistem push kanalı gerekir. Bu köprü Capacitor varsa devreye girer,
 * yoksa sessizce hiçbir şey yapmaz (tarayıcıda hata üretmez).
 *
 * Sertifika gerektiren kısım: APNs anahtarı (.p8) ve FCM sunucu anahtarı
 * yalnızca Apple/Google hesaplarınızdan alınabilir. Alındığında
 * `MOBILE.md` içindeki adımlarla eklenir; kod tarafı hazırdır.
 */

const TOKEN_KEY = "tedbirge.native.pushToken";

/** Uygulama Capacitor kabuğu içinde mi çalışıyor? */
export function isNativeApp(): boolean {
  try {
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return Boolean(cap?.isNativePlatform?.());
  } catch {
    return false;
  }
}

async function reportToken(token: string): Promise<void> {
  try {
    const { getBrowserNodeId } = await import("@/lib/browser-node");
    const cap = (globalThis as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const platform =
      cap?.getPlatform?.() === "ios"
        ? "ios"
        : cap?.getPlatform?.() === "android"
          ? "android"
          : "unknown";
    await fetch("/api/public/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "native-subscribe",
        nodeId: getBrowserNodeId(),
        token,
        platform,
      }),
    });
  } catch {
    /* çevrimdışı: jeton bir sonraki açılışta bildirilir */
  }
}

/** Uygulama silinirken/çıkışta jetonu sunucudan düşürür. */
export async function disableNativePush(): Promise<void> {
  const token = nativePushToken();
  if (!token) return;
  try {
    await fetch("/api/public/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "native-unsubscribe", token }),
    });
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* çevrimdışı */
  }
}

export function nativePushToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Sistem push iznini ister ve cihaz jetonunu saklar.
 * Jeton, sunucudan "uyandırma" sinyali göndermek için kullanılır;
 * mesaj içeriği hiçbir zaman sunucuya gitmez.
 */
export async function enableNativePush(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const status = await PushNotifications.checkPermissions();
    let granted = status.receive === "granted";
    if (!granted) {
      const asked = await PushNotifications.requestPermissions();
      granted = asked.receive === "granted";
    }
    if (!granted) return false;

    await PushNotifications.addListener("registration", (token) => {
      try {
        window.localStorage.setItem(TOKEN_KEY, token.value);
      } catch {
        /* gizli mod */
      }
      // Jetonu web push ile aynı gönderim hattına kaydet.
      void reportToken(token.value);
    });
    await PushNotifications.addListener("registrationError", () => {
      /* sertifika/yapılandırma eksik: uygulama yine de çalışır */
    });
    await PushNotifications.register();
    return true;
  } catch {
    return false;
  }
}

/**
 * Uygulama ön plana geldiğinde rehber/kuyruk eşitlemesini tetikler.
 * Yerel kabukta `visibilitychange` her zaman tetiklenmediği için
 * Capacitor App olayına da bağlanır.
 */
export async function bindNativeForeground(onForeground: () => void): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) onForeground();
    });
    return () => void handle.remove();
  } catch {
    return () => undefined;
  }
}
