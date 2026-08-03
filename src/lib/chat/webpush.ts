/**
 * Web Push istemcisi (VAPID).
 * ------------------------------------------------------------------
 * WhatsApp/Signal mantığı: sunucu yalnızca "uyandırma" bildirimi yollar,
 * içerik cihazda çözülür. Buradaki tek sunucu kaydı, cihazın push adresi
 * ve şifreleme anahtarlarıdır — rehber, mesaj ya da konum bilgisi gitmez.
 */

const ENDPOINT = "/api/public/push";
const NODE_KEY = "tedbirge.push.node";

function b64urlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const bin = atob(value.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function publicKey(): Promise<string | null> {
  try {
    const res = await fetch(ENDPOINT, { method: "GET" });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; publicKey: string | null };
    return data.ok ? data.publicKey : null;
  } catch {
    return null;
  }
}

async function post(body: unknown): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return false;
    return Boolean(((await res.json()) as { ok?: boolean }).ok);
  } catch {
    return false;
  }
}

export function webPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

/**
 * Cihazı bu düğüm kimliği için abone eder. İzin verilmemişse hiçbir şey
 * yapmaz; aynı abonelik tekrar kaydedilirse sunucuda güncellenir.
 */
export async function enableWebPush(nodeId: string): Promise<boolean> {
  if (!webPushSupported() || Notification.permission !== "granted" || !nodeId) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const key = await publicKey();
    if (!key) return false;

    let sub = await reg.pushManager.getSubscription();
    const appKey = b64urlToBytes(key);
    if (sub) {
      const current = bytesToB64url(sub.options.applicationServerKey ?? null);
      if (current && current !== key) {
        await sub.unsubscribe();
        sub = null;
      }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appKey as unknown as BufferSource,
      });
    }

    const ok = await post({
      action: "subscribe",
      nodeId,
      endpoint: sub.endpoint,
      p256dh: bytesToB64url(sub.getKey("p256dh")),
      auth: bytesToB64url(sub.getKey("auth")),
    });
    if (ok) window.localStorage.setItem(NODE_KEY, nodeId);
    return ok;
  } catch {
    return false;
  }
}

/** Aboneliği hem tarayıcıdan hem sunucudan siler (KVKK/GDPR: veri kalmaz). */
export async function disableWebPush(): Promise<boolean> {
  if (!webPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;
    await post({ action: "unsubscribe", endpoint: sub.endpoint });
    await sub.unsubscribe();
    window.localStorage.removeItem(NODE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Açılışta izin verilmişse aboneliği tazeler (endpoint süresi dolabilir). */
export async function syncWebPush(nodeId: string): Promise<void> {
  if (!webPushSupported() || Notification.permission !== "granted") return;
  await enableWebPush(nodeId);
}

/**
 * Karşı düğümün cihazını uyandırır. Sunucuya yalnızca hedef kimlik ve
 * "mesaj mı arama mı" bilgisi gider; içerik gönderilmez.
 */
export async function wakePeer(to: string, kind: "message" | "call"): Promise<void> {
  if (!to || to === "*") return;
  await post({ action: "notify", to, kind });
}
