/**
 * Bulut yedek röle istemcisi.
 * ------------------------------------------------------------------
 * Eş doğrudan bağlı değilken (kapalı cihaz, farklı ağ) şifreli zarfı
 * geçici olarak buluta bırakır; alıcı açıldığında teslim alır.
 * İçerik uçtan uca şifrelidir — bulut yalnızca taşıyıcıdır.
 */

export type RelayKeys = { nodeId: string; signPublic: string; boxPublic: string };
/** Kişinin bağlı cihazları — her cihaz için ayrı şifreli zarf üretilir. */
export type RelayDevice = RelayKeys;

const ENDPOINT = "/api/public/relay";

/**
 * Bulut rölesi kotayı aştığında (429) tüm istekler ortak bir soğuma
 * penceresi boyunca durur. Aksi hâlde her yeniden deneme kotayı yeniden
 * tüketir ve teslimat hattı kendi kendini kilitler.
 */
let cooldownUntil = 0;
let cooldownStep = 0;
let lastNoticeAt = 0;

export function relayCooldownRemainingMs(): number {
  return Math.max(0, cooldownUntil - Date.now());
}

async function noteBusy(seconds: number) {
  cooldownStep = Math.min(cooldownStep + 1, 5);
  const wait = Math.max(seconds * 1000, 5_000 * 2 ** (cooldownStep - 1));
  cooldownUntil = Date.now() + Math.min(wait, 120_000);
  if (Date.now() - lastNoticeAt < 30_000) return;
  lastNoticeAt = Date.now();
  try {
    const { logSync } = await import("@/lib/chat/sync-log");
    logSync(
      "uyarı",
      "Bulut rölesi yoğun",
      `Bağlantı yoğun; bekleyen mesajlar ${Math.round(
        (cooldownUntil - Date.now()) / 1000,
      )} saniye içinde yeniden denenecek.`,
    );
  } catch {
    /* günlük yazılamadı — teslimat akışı etkilenmez */
  }
}

async function call<T>(body: unknown): Promise<T | null> {
  if (relayCooldownRemainingMs() > 0) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    // 503: bulut deposu geçici olarak kapalı — soğuma penceresine gir.
    if (res.status === 429 || res.status === 503) {
      const retry = Number(res.headers.get("retry-after") ?? "0");
      void noteBusy(Number.isFinite(retry) && retry > 0 ? retry : 10);
      return null;
    }
    if (!res.ok) return null;
    cooldownStep = 0;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function publishRelayKeys(keys: RelayKeys & { personId?: string }): Promise<boolean> {
  const res = await call<{ ok: boolean }>({ action: "publish", ...keys });
  return Boolean(res?.ok);
}

/**
 * Hedefin (cihaz düğümü ya da kişi kimliği) ulaşılabilir tüm cihazlarını
 * döndürür. Boş dizi: kişi henüz ağa hiç bağlanmamış.
 */
export async function lookupRelayDevices(target: string): Promise<RelayDevice[]> {
  const res = await call<{ ok: boolean; found: boolean; devices?: RelayDevice[] } & RelayKeys>({
    action: "lookup",
    nodeId: target,
  });
  if (!res?.ok || !res.found) return [];
  if (res.devices?.length) return res.devices;
  return [{ nodeId: res.nodeId, signPublic: res.signPublic, boxPublic: res.boxPublic }];
}

export async function lookupRelayKeys(nodeId: string): Promise<RelayKeys | null> {
  const res = await call<{ ok: boolean; found: boolean } & RelayKeys>({ action: "lookup", nodeId });
  if (!res?.ok || !res.found) return null;
  return { nodeId: res.nodeId, signPublic: res.signPublic, boxPublic: res.boxPublic };
}

export async function pushRelayEnvelopes(
  items: { pktId: string; to: string; from: string; envelope: string; priority: number }[],
): Promise<boolean> {
  if (!items.length) return false;
  const res = await call<{ ok: boolean }>({ action: "push", items });
  return Boolean(res?.ok);
}

export async function pullRelayEnvelopes(
  nodeId: string,
  ack: string[] = [],
  personId?: string,
): Promise<{ pktId: string; envelope: string }[] | null> {
  const res = await call<{ ok: boolean; items: { pktId: string; envelope: string }[] }>({
    action: "pull",
    nodeId,
    personId,
    ack,
  });
  return res?.ok ? (res.items ?? []) : null;
}
