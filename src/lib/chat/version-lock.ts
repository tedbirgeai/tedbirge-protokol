/**
 * SÜRÜM KİLİDİ
 * ------------------------------------------------------------------
 * Uygulama sürümü değiştiğinde eski önbellekten gelen liste/etiket
 * kalıntıları bir kez temizlenir: hayalet kayıtlar budanır, servis
 * çalışanının eski önbellekleri silinir. Mesajlar, rehber ve kimlik
 * ASLA silinmez — yalnızca önbellek ve hayalet kayıtlar temizlenir.
 */

export const APP_DATA_VERSION = "2026.08.06-identity-media-fix";

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

/** Eski servis çalışanını bir kez tazeler (paket kalıntısı kalmasın). */
async function refreshServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(regs.map((r) => r.update()));
  } catch {
    /* servis çalışanı yok */
  }
}

/**
 * Sürüm değiştiyse tek seferlik temizlik yapar. Dönen değer: temizlik
 * çalıştı mı.
 */
export async function applyVersionLock(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (readVersion() === APP_DATA_VERSION) return false;
  try {
    const { sweepGhosts } = await import("@/lib/chat/merge");
    await sweepGhosts(true).catch(() => 0);
  } catch {
    /* motor henüz hazır değil */
  }
  await clearStaleCaches();
  writeVersion(APP_DATA_VERSION);
  await refreshServiceWorker();
  return true;
}
