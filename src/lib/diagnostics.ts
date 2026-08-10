/**
 * Tanılama ve Performans Ölçüm Deposu (Diagnostics).
 * ------------------------------------------------------------------
 * Tüm ölçümler CİHAZ-YERELDİR: hiçbir gövde (payload) tutulmaz,
 * yalnızca yönlendirme başlığından türeyen sayaçlar saklanır.
 * Dışa aktarılan JSON da bu nedenle gövde içermez (KVKK/sıfır-bilgi).
 */

import { useSyncExternalStore } from "react";

export type DiagnosticsSnapshot = {
  /** Son RTT ölçümleri (ms) — en yeni sonda. */
  rttSamples: number[];
  rttAvg: number | null;
  rttP95: number | null;
  /** hop sayısı → paket adedi dağılımı. */
  hopHistogram: Record<number, number>;
  txAttempts: number;
  txDelivered: number;
  rxAccepted: number;
  rxDropped: number;
  relayed: number;
  /** Teslim oranı (0–1) — gönderim denemelerine göre. */
  deliveryRatio: number;
  /** Kuyruktaki en eski paketin yaşı (ms). */
  oldestQueueAgeMs: number;
  queued: number;
  startedAt: number;
};

const MAX_SAMPLES = 60;

let snap: DiagnosticsSnapshot = {
  rttSamples: [],
  rttAvg: null,
  rttP95: null,
  hopHistogram: {},
  txAttempts: 0,
  txDelivered: 0,
  rxAccepted: 0,
  rxDropped: 0,
  relayed: 0,
  deliveryRatio: 0,
  oldestQueueAgeMs: 0,
  queued: 0,
  startedAt: Date.now(),
};

const listeners = new Set<() => void>();

function recompute(patch: Partial<DiagnosticsSnapshot>) {
  const next = { ...snap, ...patch };
  const s = [...next.rttSamples].sort((a, b) => a - b);
  next.rttAvg = s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null;
  next.rttP95 = s.length
    ? Math.round(s[Math.min(s.length - 1, Math.floor(s.length * 0.95))])
    : null;
  next.deliveryRatio = next.txAttempts ? next.txDelivered / next.txAttempts : 0;
  snap = next;
  listeners.forEach((l) => l());
}

export function recordRtt(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return;
  const rttSamples = [...snap.rttSamples, Math.round(ms)].slice(-MAX_SAMPLES);
  recompute({ rttSamples });
}

export function recordTx(delivered: boolean) {
  recompute({
    txAttempts: snap.txAttempts + 1,
    txDelivered: snap.txDelivered + (delivered ? 1 : 0),
  });
}

export function recordRx(hops: number) {
  const hopHistogram = { ...snap.hopHistogram };
  const key = Number.isFinite(hops) ? hops : 0;
  hopHistogram[key] = (hopHistogram[key] ?? 0) + 1;
  recompute({ rxAccepted: snap.rxAccepted + 1, hopHistogram });
}

export function recordDrop() {
  recompute({ rxDropped: snap.rxDropped + 1 });
}

export function recordRelay() {
  recompute({ relayed: snap.relayed + 1 });
}

export function recordQueue(queued: number, oldestTs: number | null) {
  recompute({ queued, oldestQueueAgeMs: oldestTs ? Math.max(0, Date.now() - oldestTs) : 0 });
}

export function diagnosticsSnapshot() {
  return snap;
}

export function resetDiagnostics() {
  snap = {
    rttSamples: [],
    rttAvg: null,
    rttP95: null,
    hopHistogram: {},
    txAttempts: 0,
    txDelivered: 0,
    rxAccepted: 0,
    rxDropped: 0,
    relayed: 0,
    deliveryRatio: 0,
    oldestQueueAgeMs: 0,
    queued: 0,
    startedAt: Date.now(),
  };
  listeners.forEach((l) => l());
}

export function useDiagnostics() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snap,
    () => snap,
  );
}
