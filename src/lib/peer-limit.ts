/**
 * ÜCRETSİZ KATMAN EŞ (PEER) SINIRI
 * ------------------------------------------------------------------
 * İstemci tarafında aktif eş sayısı takip edilir. Ücretsiz katmanda
 * eşzamanlı 5 düğüm bağlantısına izin verilir; sınır aşıldığında yeni
 * P2P/WebRTC bağlantı denemesi durdurulur, arayüze bilgilendirme
 * modalı olayı ve canlı günlüğe turuncu uyarı düşürülür.
 */

export const FREE_PEER_LIMIT = 5;

export type LicenseTier = "FREE" | "ENTERPRISE";

export const PAYWALL_EVENT = "tedbirge:paywall";
export const KERNEL_LOG_EVENT = "tedbirge:kernel-log";

export type KernelLogTone = "info" | "warn";
export type KernelLogDetail = { text: string; tone: KernelLogTone };

let tier: LicenseTier = "FREE";
let lastNoticeAt = 0;

/** Lisans anahtarı geldiğinde katman yükselir (kurumsal = sınırsız eş). */
export function setLicenseTier(next: LicenseTier) {
  tier = next;
}

export function licenseTier(): LicenseTier {
  return tier;
}

function emit<T>(name: string, detail: T) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Canlı günlük akışına satır düşürür (Dashboard terminali dinler). */
export function kernelLog(text: string, tone: KernelLogTone = "info") {
  emit<KernelLogDetail>(KERNEL_LOG_EVENT, { text, tone });
}

/**
 * Yeni bir eş bağlantısı açılabilir mi?
 * `activePeers` mevcut açık bağlantı sayısıdır.
 */
export function canAcceptPeer(activePeers: number): boolean {
  if (tier === "ENTERPRISE") return true;
  if (activePeers < FREE_PEER_LIMIT) return true;

  // Sınır aşıldı: bağlantıyı durdur, arayüzü uyar (gürültü yapmadan).
  const now = Date.now();
  if (now - lastNoticeAt > 8_000) {
    lastNoticeAt = now;
    kernelLog(
      `[LIMIT_REACHED] Free Tier ${FREE_PEER_LIMIT}/${FREE_PEER_LIMIT} Peer Limit Exceeded. Connection Throttle Active.`,
      "warn",
    );
    emit(PAYWALL_EVENT, { activePeers });
  }
  return false;
}
