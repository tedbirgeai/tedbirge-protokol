/**
 * 3 Katmanlı Melez Erişim Motoru (Hybrid Access Engine).
 * ------------------------------------------------------------------
 * Katman A — Bulut/Domain : internet varken kurumsal domain üzerinden çalışır.
 * Katman B — Yerel Ağ     : internet koptuğunda `tedbirge-gateway.local`
 *                            veya yerel IP üzerindeki saha geçidine düşer.
 * Katman C — Tam Kesinti  : hiçbir geçit yoksa cihaz kendi ada modunda
 *                            (AP + captive portal) çalışmayı sürdürür.
 *
 * Motor arka planda sessiz çalışır; arayüz yalnızca sade Türkçe durum
 * metni görür ("Yerel Ağ Moduna Geçildi" gibi).
 */

import { useSyncExternalStore } from "react";

export type AccessTier = "cloud" | "local" | "island";

export type AccessState = {
  tier: AccessTier;
  /** Erişimin sağlandığı adres (Katman B'de yerel geçidin adresi). */
  endpoint: string | null;
  /** Yerel tarama sürüyor mu? */
  scanning: boolean;
  /** Son kontrol zamanı (epoch ms). */
  checkedAt: number | null;
  /** Yerel taramada bulunan adaylar. */
  candidates: string[];
};

const STORAGE_KEY = "tedbirge.access.local-endpoint";
const PROBE_PATH = "/api/public/ping";
const PROBE_TIMEOUT_MS = 1500;
const CHECK_INTERVAL_MS = 20_000;

/** mDNS adı + saha kurulumlarında en sık görülen yerel geçit adresleri. */
export const LOCAL_CANDIDATES = [
  "http://tedbirge-gateway.local",
  "http://tedbirge-gateway.local:8080",
  "http://192.168.4.1",
  "http://192.168.1.1:8080",
  "http://192.168.0.1:8080",
  "http://10.0.0.1:8080",
];

let state: AccessState = {
  tier: "cloud",
  endpoint: null,
  scanning: false,
  checkedAt: null,
  candidates: [],
};

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let booted = false;

function publish(patch: Partial<AccessState>) {
  const next = { ...state, ...patch };
  const tierChanged = next.tier !== state.tier;
  state = next;
  listeners.forEach((l) => l());
  if (tierChanged && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<{ tier: AccessTier; message: string }>("tedbirge:access-tier", {
        detail: { tier: next.tier, message: describeTier(next).message },
      }),
    );
  }
}

/** Kullanıcıya gösterilecek sade metin (teknik jargon içermez). */
export function describeTier(s: AccessState): { label: string; message: string; tone: "ok" | "warn" | "alert" } {
  if (s.tier === "cloud")
    return {
      label: "Bulut bağlantısı",
      message: "İnternet bağlantısı var — veriler merkezle eşitleniyor.",
      tone: "ok",
    };
  if (s.tier === "local")
    return {
      label: "Yerel ağ modu",
      message: `Yerel Ağ Moduna Geçildi — sahadaki geçit üzerinden çalışıyorsunuz${
        s.endpoint ? ` (${s.endpoint.replace(/^https?:\/\//, "")})` : ""
      }.`,
      tone: "warn",
    };
  return {
    label: "Bağımsız ada modu",
    message: "Tam kesinti — cihaz kendi ağında çalışıyor. Yeni cihazlar QR ile katılabilir.",
    tone: "alert",
  };
}

async function probe(origin: string): Promise<boolean> {
  // HTTPS sayfasından düz http:// yoklaması karma içerik sayılır ve tarayıcı
  // adres çubuğunda "güvenli değil" uyarısı doğar; bu istekler hiç atılmaz.
  if (typeof window !== "undefined" && window.location.protocol === "https:" && origin.startsWith("http://")) {
    return false;
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}${PROBE_PATH}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      mode: origin.startsWith(window.location.origin) ? "same-origin" : "cors",
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function storedEndpoint(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberEndpoint(origin: string | null) {
  try {
    if (origin) window.localStorage.setItem(STORAGE_KEY, origin);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

/** Tek tık: yerel ağda saha geçidi arar. */
export async function scanLocalNetwork(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  publish({ scanning: true });
  const remembered = storedEndpoint();
  const targets = remembered ? [remembered, ...LOCAL_CANDIDATES.filter((c) => c !== remembered)] : LOCAL_CANDIDATES;
  const found: string[] = [];
  for (const target of targets) {
    // eslint-disable-next-line no-await-in-loop -- sıralı deneme yerel ağı boğmamak için bilinçli
    if (await probe(target)) {
      found.push(target);
      break;
    }
  }
  const endpoint = found[0] ?? null;
  rememberEndpoint(endpoint);
  publish({
    scanning: false,
    candidates: found,
    endpoint,
    tier: navigator.onLine && state.tier === "cloud" ? "cloud" : endpoint ? "local" : "island",
    checkedAt: Date.now(),
  });
  return endpoint;
}

/** Arka plan kontrolü: bulut → yerel → ada sırasıyla otomatik düşer. */
export async function refreshAccessTier(): Promise<AccessTier> {
  if (typeof window === "undefined") return "cloud";
  if (navigator.onLine && (await probe(window.location.origin))) {
    publish({ tier: "cloud", endpoint: window.location.origin, checkedAt: Date.now() });
    return "cloud";
  }
  const remembered = storedEndpoint();
  if (remembered && (await probe(remembered))) {
    publish({ tier: "local", endpoint: remembered, checkedAt: Date.now() });
    return "local";
  }
  // Otomatik yerel tarama yalnızca gerçekten çevrimdışıyken yapılır;
  // çevrimiçi ama geçici hata durumlarında ağ gereksiz yere yoklanmaz.
  const endpoint = navigator.onLine ? null : await scanLocalNetwork();
  const tier: AccessTier = endpoint ? "local" : "island";
  publish({ tier, endpoint, checkedAt: Date.now() });
  return tier;
}

/** useEffect içinden bir kez çağrılır. */
export function bootAccessEngine() {
  if (typeof window === "undefined" || booted) return;
  booted = true;
  state = { ...state, endpoint: storedEndpoint() };
  void refreshAccessTier();
  window.addEventListener("online", () => void refreshAccessTier());
  window.addEventListener("offline", () => void refreshAccessTier());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refreshAccessTier();
  });
  if (!timer) timer = setInterval(() => void refreshAccessTier(), CHECK_INTERVAL_MS);
}

export function useAccessTier(): AccessState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

/** Saha QR'ı için en uygun katılım adresi. */
export function joinUrl(s: AccessState): string {
  const base = s.tier === "local" && s.endpoint ? s.endpoint : typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/katil`;
}
