/**
 * Bildirim katmanı — uygulama arka plandayken de duyulur.
 * ------------------------------------------------------------------
 * Katman A (internet var): Servis çalışanı üzerinden bildirim gösterilir;
 *   sekme kapalı olsa bile PWA kurulu cihazda sistem bildirimi çıkar.
 * Katman B/C (mesh): Karşı düğüme "uyandırma" paketi gönderilir; alıcı
 *   cihazdaki servis çalışanı bildirimi yerel olarak üretir. Hiçbir
 *   bildirim içeriği sunucuya çıkmaz — metin cihazda üretilir.
 */

const PERM_KEY = "tedbirge.chat.notify";

export function notificationsAllowed(): boolean {
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

export function notificationsBlocked(): boolean {
  return typeof Notification !== "undefined" && Notification.permission === "denied";
}

/** İzin ister; kullanıcı bir kez reddettiyse tekrar rahatsız etmez. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    window.localStorage.setItem(PERM_KEY, res);
    return res === "granted";
  } catch {
    return false;
  }
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

export type PushKind = "message" | "call";

/**
 * Bildirimi önce servis çalışanından gösterir (arka planda da çalışır),
 * olmazsa sayfa içi Notification'a düşer.
 */
export async function showChatNotification(input: {
  title: string;
  body: string;
  kind?: PushKind;
  tag?: string;
}): Promise<boolean> {
  if (!notificationsAllowed()) return false;
  if (typeof document !== "undefined" && document.visibilityState === "visible") return false;
  const options: NotificationOptions = {
    body: input.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: input.tag ?? (input.kind === "call" ? "tedbirge-call" : "tedbirge-chat"),
    silent: false,
    requireInteraction: input.kind === "call",
    data: { url: "/chat" },
  };
  const reg = await registration();
  if (reg) {
    try {
      await reg.showNotification(input.title, options);
      return true;
    } catch {
      /* bazı tarayıcılar SW bildirimini kısıtlar */
    }
  }
  try {
    new Notification(input.title, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mesh "uyandırma" paketi: alıcı düğüm arka plandayken bile paket
 * servis çalışanına ulaşır ve yerel bildirim üretilir.
 */
export type WakePayload = { t: "wake"; kind: PushKind; title: string; preview: string };

export function isWakePayload(v: unknown): v is WakePayload {
  const p = v as WakePayload | null;
  return Boolean(p && p.t === "wake" && typeof p.title === "string");
}
