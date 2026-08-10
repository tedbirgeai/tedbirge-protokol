/**
 * Paket Zamanlayıcı (Packet Scheduler) — PHY veri düzlemi kilidi.
 * ------------------------------------------------------------------
 * Karar 2: LoRa/HaLow veri taşıyıcısı olduğunda BTK/ETSI sub-GHz
 * kısıtları YAZILIMSAL ZORUNLU TAVAN olarak uygulanır:
 *   - %1 görev döngüsü → kayan 60 dk penceresinde azami 36 sn yayın
 *   - 25 mW e.r.p. (≈14 dBm) güç tavanı — üstü modemi yapılandırmaz
 * Sınırlar regulation.ts içindeki SPECTRUM_LIMITS tablosundan okunur.
 *
 * Bütçe dolduğunda paket ATILMAZ; öncelik sırasına göre kuyrukta
 * bekletilir. Öncelik 0 (acil) ve 1 (kontrol) pencere açıldığında
 * ilk sırada gider; telemetri (3) en sona düşer.
 */

import { useSyncExternalStore } from "react";
import { spectrumLimitFor, type SpectrumLimit } from "@/lib/regulation";
import type { Priority } from "@/lib/store/idb";

/** LoRa fiziksel yük sınırı (bayt) — üstü parçalanır. */
export const LORA_MTU = 180;
/** Eksik parçaların düşürülme süresi. */
export const REASSEMBLY_TIMEOUT_MS = 30 * 60_000;

export type ScheduledFrame = {
  id: string;
  carrier: string;
  priority: Priority;
  payload: string;
  airtimeMs: number;
  queuedAt: number;
  send: (payload: string) => Promise<void> | void;
};

export type SchedulerSnapshot = {
  region: string;
  limitNote: string;
  /** Kayan pencerede kullanılan yayın süresi (ms). */
  usedMs: number;
  /** Pencere bütçesi (ms). */
  budgetMs: number;
  ratio: number;
  /** Bütçe dolduysa bir sonraki serbest zaman (epoch ms), yoksa null. */
  nextWindowAt: number | null;
  queued: number;
  sent: number;
  blocked: number;
};

let region = "TR";
let limit: SpectrumLimit = spectrumLimitFor(region);
let emissions: { at: number; ms: number }[] = [];
let queue: ScheduledFrame[] = [];
let sent = 0;
let blocked = 0;
let pump: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();
let snapshot: SchedulerSnapshot = buildSnapshot();

function budgetMs() {
  return limit.dutyCycle * limit.windowMs;
}

function usedMs() {
  const cutoff = Date.now() - limit.windowMs;
  emissions = emissions.filter((e) => e.at >= cutoff);
  return emissions.reduce((sum, e) => sum + e.ms, 0);
}

function buildSnapshot(): SchedulerSnapshot {
  const used = usedMs();
  const budget = budgetMs();
  const over = used >= budget;
  const oldest = emissions[0];
  return {
    region,
    limitNote: limit.note,
    usedMs: Math.round(used),
    budgetMs: Math.round(budget),
    ratio: budget ? Math.min(1, used / budget) : 0,
    nextWindowAt: over && oldest ? oldest.at + limit.windowMs : null,
    queued: queue.length,
    sent,
    blocked,
  };
}

function publish() {
  snapshot = buildSnapshot();
  listeners.forEach((l) => l());
}

export function setSchedulerRegion(next: string) {
  region = next;
  limit = spectrumLimitFor(next);
  publish();
}

export function schedulerRegion() {
  return region;
}

/** Bu taşıyıcı üretim profilinde açık mı? */
export function carrierAllowed(carrier: string) {
  return !limit.disabled.includes(carrier);
}

/** İstenen gücü yasal tavana kırpar; tavan üstü değer asla uygulanmaz. */
export function enforcePowerMw(requestedMw: number): { mw: number; clamped: boolean } {
  const mw = Math.min(requestedMw, limit.maxErpMw);
  return { mw, clamped: mw < requestedMw };
}

export function dbmToMw(dbm: number) {
  return 10 ** (dbm / 10);
}

export function mwToDbm(mw: number) {
  return 10 * Math.log10(Math.max(mw, 0.0001));
}

/**
 * LoRa Time-on-Air (Semtech AN1200.13).
 * Varsayılan: SF9, BW 125 kHz, CR 4/5, açık başlık, CRC açık.
 */
export function timeOnAirMs(
  payloadBytes: number,
  sf = 9,
  bwHz = 125_000,
  cr = 1,
  preamble = 8,
): number {
  const tSym = (2 ** sf / bwHz) * 1000;
  const de = sf >= 11 && bwHz === 125_000 ? 1 : 0;
  const numerator = 8 * payloadBytes - 4 * sf + 28 + 16;
  const denominator = 4 * (sf - 2 * de);
  const payloadSymb = 8 + Math.max(Math.ceil(numerator / denominator) * (cr + 4), 0);
  const tPreamble = (preamble + 4.25) * tSym;
  return tPreamble + payloadSymb * tSym;
}

/** Sub-GHz olmayan taşıyıcılarda görev döngüsü sınırı uygulanmaz. */
export function dutyCycleApplies(carrier: string) {
  return carrier === "lora";
}

/* ------------------------------ parçalama ------------------------------ */

let fragCounter = 0;

/** Uzun zarfı LoRa çerçevelerine böler: `TBG2|<id>|<i>/<n>|<parça>` */
export function fragment(raw: string, mtu = LORA_MTU): string[] {
  const id = `${Date.now().toString(36)}${(fragCounter += 1).toString(36)}`.slice(-8);
  const overhead = 20;
  const size = Math.max(16, mtu - overhead);
  const parts: string[] = [];
  for (let i = 0; i < raw.length; i += size) parts.push(raw.slice(i, i + size));
  const n = parts.length;
  return parts.map((p, i) => `TBG2|${id}|${i + 1}/${n}|${p}`);
}

type Pending = { parts: Map<number, string>; total: number; startedAt: number };

/** Gelen parçaları birleştirir; eksik kalanlar 30 dk sonra düşer. */
export class Reassembler {
  private pending = new Map<string, Pending>();

  push(frame: string): string | null {
    this.sweep();
    const m = /^TBG2\|([^|]+)\|(\d+)\/(\d+)\|([\s\S]*)$/.exec(frame);
    if (!m) return frame.trim() ? frame : null;
    const [, id, iStr, nStr, chunk] = m;
    const i = Number(iStr);
    const n = Number(nStr);
    const entry = this.pending.get(id) ?? {
      parts: new Map<number, string>(),
      total: n,
      startedAt: Date.now(),
    };
    entry.parts.set(i, chunk);
    this.pending.set(id, entry);
    if (entry.parts.size < entry.total) return null;
    this.pending.delete(id);
    let out = "";
    for (let k = 1; k <= entry.total; k += 1) out += entry.parts.get(k) ?? "";
    return out;
  }

  private sweep() {
    const cutoff = Date.now() - REASSEMBLY_TIMEOUT_MS;
    for (const [id, entry] of this.pending) if (entry.startedAt < cutoff) this.pending.delete(id);
  }

  get pendingCount() {
    return this.pending.size;
  }
}

/* ------------------------------ zamanlayıcı ------------------------------ */

function sortQueue() {
  queue.sort((a, b) => a.priority - b.priority || a.queuedAt - b.queuedAt);
}

function schedulePump(delayMs: number) {
  if (pump) clearTimeout(pump);
  pump = setTimeout(
    () => {
      pump = null;
      void drain();
    },
    Math.max(50, delayMs),
  );
}

async function drain() {
  sortQueue();
  while (queue.length) {
    const frame = queue[0];
    if (dutyCycleApplies(frame.carrier)) {
      const used = usedMs();
      if (used + frame.airtimeMs > budgetMs()) {
        blocked += 1;
        const oldest = emissions[0];
        const wait = oldest ? oldest.at + limit.windowMs - Date.now() : limit.windowMs;
        publish();
        schedulePump(wait);
        return;
      }
    }
    queue.shift();
    try {
      await frame.send(frame.payload);
      if (dutyCycleApplies(frame.carrier)) emissions.push({ at: Date.now(), ms: frame.airtimeMs });
      sent += 1;
    } catch {
      // Gönderim başarısız: paket kaybolmaz, kuyruğun sonuna alınır.
      queue.push({ ...frame, queuedAt: Date.now() });
    }
    publish();
  }
}

/** Bir zarfı taşıyıcıya yollamak üzere kuyruğa alır (parçalama dahil). */
export function scheduleEnvelope(opts: {
  carrier: string;
  raw: string;
  priority: Priority;
  send: (payload: string) => Promise<void> | void;
  sf?: number;
}): { frames: number; airtimeMs: number } {
  const frames = dutyCycleApplies(opts.carrier) ? fragment(opts.raw) : [opts.raw];
  let airtimeTotal = 0;
  frames.forEach((payload, i) => {
    const airtimeMs = dutyCycleApplies(opts.carrier)
      ? timeOnAirMs(new TextEncoder().encode(payload).length, opts.sf ?? 9)
      : 0;
    airtimeTotal += airtimeMs;
    queue.push({
      id: `${Date.now()}-${i}`,
      carrier: opts.carrier,
      priority: opts.priority,
      payload,
      airtimeMs,
      queuedAt: Date.now(),
      send: opts.send,
    });
  });
  publish();
  schedulePump(0);
  return { frames: frames.length, airtimeMs: Math.round(airtimeTotal) };
}

/** Test/teşhis: bütçe durumunu okur. */
export function schedulerSnapshot(): SchedulerSnapshot {
  return buildSnapshot();
}

/** Yalnızca testlerde kullanılır. */
export function resetScheduler() {
  emissions = [];
  queue = [];
  sent = 0;
  blocked = 0;
  if (pump) clearTimeout(pump);
  pump = null;
  publish();
}

export function useCarrierScheduler() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}
