/**
 * CANLI HAT ÖLÇÜMLERİ (LinkMetrics)
 * ------------------------------------------------------------------
 * Dijkstra kenar ağırlığı artık statik taşıyıcı tablosundan değil,
 * gerçek ölçümlerden beslenir:
 *   Ağırlık = (gecikme / kalan bant genişliği) + sinyal kalitesi cezası
 *
 * Ölçümler ping/pong RTT'si, gönderim verimi ve WebRTC istatistiklerinden
 * gelir. Kayıt bellek içidir; hayalet düğüm temizliğiyle birlikte budanır.
 */

export type LinkSample = {
  /** Gidiş-dönüş gecikmesi (ms). */
  rttMs: number;
  /** Ölçülen kalan bant genişliği (kbps). */
  freeKbps: number;
  /** 0–1 sinyal/bağlantı kalitesi. */
  quality: number;
  at: number;
};

const links = new Map<string, LinkSample>();

const DEFAULT: LinkSample = { rttMs: 120, freeKbps: 2000, quality: 0.7, at: 0 };

/** Üstel yumuşatma — ani sıçramalar rotayı zıplatmasın. */
function smooth(prev: number, next: number, alpha = 0.35): number {
  if (!Number.isFinite(prev)) return next;
  return prev * (1 - alpha) + next * alpha;
}

export function recordLink(peerId: string, sample: Partial<Omit<LinkSample, "at">>) {
  if (!peerId) return;
  const prev = links.get(peerId) ?? DEFAULT;
  links.set(peerId, {
    rttMs: Math.max(1, smooth(prev.rttMs, Number(sample.rttMs ?? prev.rttMs))),
    freeKbps: Math.max(1, smooth(prev.freeKbps, Number(sample.freeKbps ?? prev.freeKbps))),
    quality: Math.min(
      1,
      Math.max(0.05, smooth(prev.quality, Number(sample.quality ?? prev.quality))),
    ),
    at: Date.now(),
  });
}

export function linkMetrics(peerId: string): LinkSample {
  return links.get(peerId) ?? DEFAULT;
}

export function forgetLink(peerId: string) {
  links.delete(peerId);
}

export function knownLinks(): string[] {
  return [...links.keys()];
}

/**
 * Kenar ağırlığı — Wasm çekirdeğindeki `edge_weight_q16` ile aynı formül.
 * (gecikme/1000) + (8192/kalan kbps) + (1-kalite)*(1+ceza)*4
 */
export function weightFromMetrics(sample: LinkSample, penalty = 0): number {
  const kbps = Math.max(1, sample.freeKbps);
  const quality = Math.min(1, Math.max(0.05, sample.quality));
  return sample.rttMs / 1000 + 8192 / kbps + (1 - quality) * (1 + penalty) * 4;
}

/** Test/oturum sıfırlaması. */
export function resetLinkMetrics() {
  links.clear();
}
