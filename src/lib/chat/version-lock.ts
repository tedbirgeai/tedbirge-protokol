/**
 * SÜRÜM KİLİDİ
 * ------------------------------------------------------------------
 * Uygulama sürümü değiştiğinde eski önbellekten gelen liste/etiket
 * kalıntıları bir kez temizlenir: hayalet kayıtlar budanır, servis
 * çalışanının eski önbellekleri silinir. Mesajlar, rehber ve kimlik
 * ASLA silinmez — yalnızca önbellek ve hayalet kayıtlar temizlenir.
 */

import { BUILD_ID } from "@/lib/build-id";

/**
 * Sürüm kimliği artık elle yazılan bir sabit değil, derleme damgasıdır.
 * Böylece her yeni yayın kilidi kendiliğinden tetikler; "düzeltme yayında
 * ama ekranda eski paket duruyor" durumu oluşmaz.
 */
export const APP_DATA_VERSION = BUILD_ID;

const KEY = "tedbirge.app.dataVersion";

function readVersion(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function writeVersion(v: string) {
  try {
    window.localStorage.setItem(KEY, v);
  } catch {
    /* gizli mod */
  }
}

async function clearStaleCaches() {
  if (typeof caches === "undefined") return;
  try {
    const keys = await caches.keys();
    await Promise.allSettled(keys.map((k) => caches.delete(k)));
  } catch {
    /* önbellek erişimi yok */
  }
}

/**
 * Eski servis çalışanını tazeler VE bekleyen yeni paketi devralmaya zorlar.
 * Yalnızca `update()` çağırmak yetmiyordu: yeni paket "bekliyor" durumunda
 * kalıp ekranda eski JS çalışmaya devam ediyordu.
 */
async function takeOverServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs.map(async (r) => {
        await r.update().catch(() => undefined);
        r.waiting?.postMessage({ type: "SKIP_WAITING" });
      }),
    );
  } catch {
    /* servis çalışanı yok */
  }
}

const RELOAD_MARKER = "tedbirge.app.versionReload";

/**
 * Sürüm değiştiyse tek seferlik temizlik yapar. Dönen değer: temizlik
 * çalıştı mı.
 */
export async function applyVersionLock(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const previous = readVersion();
  if (previous === APP_DATA_VERSION) {
    try {
      window.sessionStorage.removeItem(RELOAD_MARKER);
    } catch {
      /* gizli mod */
    }
    return false;
  }
  try {
    const { sweepGhosts } = await import("@/lib/chat/merge");
    await sweepGhosts(true).catch(() => 0);
  } catch {
    /* motor henüz hazır değil */
  }
  await clearStaleCaches();
  writeVersion(APP_DATA_VERSION);
  await takeOverServiceWorker();

  // İlk kurulumda yenileme yapılmaz. Sürüm gerçekten değiştiyse (eski paket
  // kalıntısı olabilir) sayfa TEK KEZ tazelenir; döngü koruması oturumda tutulur.
  if (!previous) return true;
  try {
    if (window.sessionStorage.getItem(RELOAD_MARKER) === APP_DATA_VERSION) return true;
    window.sessionStorage.setItem(RELOAD_MARKER, APP_DATA_VERSION);
    window.setTimeout(() => window.location.reload(), 400);
  } catch {
    /* gizli mod: yenileme atlanır */
  }
  return true;
}

/**
 * GÖRÜNÜR ONARIM: kullanıcı Ayarlar'dan tek dokunuşla çalıştırır.
 * Hayalet kayıtları budar, adsız kayıtları siler, rehberi tazeler ve
 * kaç kaydın temizlendiğini döner.
 */
export async function repairNow(): Promise<{ cleaned: number }> {
  if (typeof window === "undefined") return { cleaned: 0 };
  const { sweepGhosts } = await import("@/lib/chat/merge");
  const cleaned = await sweepGhosts(true).catch(() => 0);
  await clearStaleCaches();
  await takeOverServiceWorker();
  return { cleaned };
}

