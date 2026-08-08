/**
 * MeshEnvelope v2 — imzalı başlık + uçtan uca şifreli gövde.
 * ------------------------------------------------------------------
 * Karar 8/11: ara röleler YALNIZCA yönlendirme başlığını görür
 * (from, to, kind, ttl, hops, lamport). Gövde (body) yalnızca hedef
 * düğümün X25519 anahtarıyla açılabilir. Röle, gövdeyi çözemez,
 * değiştiremez ve yeniden imzalayamaz.
 *
 * Karar 7: sunucu otoritesi olmadan sıralama için Lamport mantıksal
 * saati; mükerrer paket engelleme için SHA-256 tabanlı pktId.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import {
  fromB64,
  openSealed,
  sealTo,
  signBytes,
  toB64,
  verifyBytes,
  type SealedBody,
} from "@/lib/crypto/identity";
import type { Priority } from "@/lib/store/idb";

export const ENVELOPE_VERSION = 2 as const;
export const DEFAULT_TTL = 4;

/**
 * Dinamik TTL — sabit 4 atlama, acil trafiği menzil dışında sessizce
 * düşürüyordu. Trafik sınıfına göre atlama bütçesi ayrılır.
 *  · acil/sinyal : 8 atlama (can güvenliği, en geniş menzil)
 *  · sohbet/medya: 6 atlama
 *  · yayın/keşif : 3 atlama (fırtına önleme)
 */
export function ttlForKind(kind: EnvelopeKind): number {
  if (kind === "alert" || kind === "call" || kind === "signal") return 8;
  if (kind === "chat" || kind === "text" || kind === "media" || kind === "receipt") return 6;
  if (kind === "ping" || kind === "pong" || kind === "presence") return 3;
  if (kind === "app") return 3;
  return 4;
}

/** TTL tükendiğinde arayüzde gösterilecek otonom durum metni. */
export const TTL_EXHAUSTED_NOTICE =
  "Menzil dışı — şebeke bekletiliyor. Mesaj cihazınızda saklandı, bir düğüm menzile girdiğinde otomatik iletilecek.";

export type EnvelopeKind =
  | "ping"
  | "pong"
  | "telemetry"
  | "text"
  | "signal"
  | "alert"
  | "chat"
  | "receipt"
  | "call"
  | "media"
  | "sync"
  | "session"
  | "presence"
  /** Faz D: düğümden düğüme .tbapp paket teklifi. */
  | "app";


export type MeshHeader = {
  v: 2;
  pktId: string;
  from: string;
  to: string | "*";
  kind: EnvelopeKind;
  /** Değişken alan — imza kapsamı DIŞINDA (röle azaltır). */
  ttl: number;
  /** Değişken alan — imza kapsamı DIŞINDA (röle artırır). */
  hops: number;
  lamport: number;
  ts: number;
  /** Gönderenin Ed25519 doğrulama anahtarı (base64). */
  spk: string;
  /** Başlık + gövde özeti üzerinde Ed25519 imzası. */
  sig: string;
  priority: Priority;
};

export type MeshEnvelopeV2 = { h: MeshHeader; b: SealedBody };

/* --------------------------- Lamport saati --------------------------- */

const CLOCK_KEY = "tedbirge.lamport";
let clock = 0;
let clockLoaded = false;

function loadClock() {
  if (clockLoaded) return;
  clockLoaded = true;
  try {
    clock = Number(window.localStorage.getItem(CLOCK_KEY) ?? 0) || 0;
  } catch {
    clock = 0;
  }
}

function saveClock() {
  try {
    window.localStorage.setItem(CLOCK_KEY, String(clock));
  } catch {
    /* private mode */
  }
}

export function tickClock(): number {
  loadClock();
  clock += 1;
  saveClock();
  return clock;
}

/** Gelen paketin mantıksal saatiyle yerel saati birleştirir. */
export function witnessClock(remote: number): number {
  loadClock();
  clock = Math.max(clock, Number.isFinite(remote) ? remote : 0) + 1;
  saveClock();
  return clock;
}

export function currentClock(): number {
  loadClock();
  return clock;
}

/* ----------------------------- imza kapsamı ----------------------------- */

/** İmzalanan alanlar: değişmez başlık alanları + gövde şifreli metni. */
function signingBytes(h: Omit<MeshHeader, "sig" | "ttl" | "hops">, body: SealedBody): Uint8Array {
  const canonical = [
    h.v,
    h.pktId,
    h.from,
    h.to,
    h.kind,
    h.lamport,
    h.ts,
    h.spk,
    h.priority,
    body.alg,
    body.epk,
    body.iv,
    body.ct,
  ].join("\u001f");
  return new TextEncoder().encode(canonical);
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** pktId = SHA-256(from ‖ lamport ‖ şifreli gövde) — idempotency anahtarı. */
export function packetId(from: string, lamport: number, ct: string): string {
  return hex(sha256(new TextEncoder().encode(`${from}|${lamport}|${ct}`))).slice(0, 32);
}

/* ------------------------------ üretim ------------------------------ */

export type CreateInput = {
  from: string;
  to: string | "*";
  kind: EnvelopeKind;
  payload: unknown;
  /** Hedefin X25519 genel anahtarı. Yayın (*) paketlerinde grup anahtarı. */
  peerBoxPublic: string;
  senderSignPublic: string;
  priority?: Priority;
  ttl?: number;
};

export async function createEnvelope(input: CreateInput): Promise<MeshEnvelopeV2> {
  const body = await sealTo(input.peerBoxPublic, input.payload);
  const lamport = tickClock();
  const base = {
    v: ENVELOPE_VERSION,
    pktId: packetId(input.from, lamport, body.ct),
    from: input.from,
    to: input.to,
    kind: input.kind,
    lamport,
    ts: Date.now(),
    spk: input.senderSignPublic,
    priority: input.priority ?? defaultPriority(input.kind),
  } satisfies Omit<MeshHeader, "sig" | "ttl" | "hops">;

  const sig = await signBytes(input.from, signingBytes(base, body));
  return { h: { ...base, ttl: input.ttl ?? ttlForKind(input.kind), hops: 0, sig }, b: body };
}

export function defaultPriority(kind: EnvelopeKind): Priority {
  if (kind === "alert") return 0;
  if (kind === "signal" || kind === "ping" || kind === "pong" || kind === "call") return 1;
  if (kind === "text" || kind === "chat" || kind === "media" || kind === "receipt") return 2;
  return 3;
}

/* ------------------------------ doğrulama ------------------------------ */

export function isEnvelopeV2(value: unknown): value is MeshEnvelopeV2 {
  const v = value as MeshEnvelopeV2 | null;
  return Boolean(v?.h && v.b && v.h.v === ENVELOPE_VERSION && typeof v.h.sig === "string");
}

/** İmza + pktId tutarlılığı. Doğrulanmayan paket İŞLENMEZ ve RÖLE EDİLMEZ. */
export function verifyEnvelope(env: MeshEnvelopeV2): boolean {
  const { h, b } = env;
  if (!isEnvelopeV2(env)) return false;
  if (packetId(h.from, h.lamport, b.ct) !== h.pktId) return false;
  const base: Omit<MeshHeader, "sig" | "ttl" | "hops"> = {
    v: h.v,
    pktId: h.pktId,
    from: h.from,
    to: h.to,
    kind: h.kind,
    lamport: h.lamport,
    ts: h.ts,
    spk: h.spk,
    priority: h.priority,
  };
  return verifyBytes(h.spk, h.sig, signingBytes(base, b));
}

/** Röle: yalnızca TTL/hops güncellenir; imza ve gövde aynen taşınır. */
export function forwardEnvelope(env: MeshEnvelopeV2): MeshEnvelopeV2 | null {
  if (env.h.ttl <= 1) return null;
  return { h: { ...env.h, ttl: env.h.ttl - 1, hops: env.h.hops + 1 }, b: env.b };
}

export function openEnvelope<T = unknown>(nodeId: string, env: MeshEnvelopeV2): Promise<T> {
  return openSealed<T>(nodeId, env.b);
}

/** Röle düğümün gerçekten ne gördüğünü gösteren denetim özeti (şeffaflık için). */
export function relayVisibleFields(env: MeshEnvelopeV2) {
  return {
    from: env.h.from,
    to: env.h.to,
    kind: env.h.kind,
    ttl: env.h.ttl,
    hops: env.h.hops,
    lamport: env.h.lamport,
    bodyBytes: fromB64(env.b.ct).length,
    bodyReadable: false as const,
  };
}

export function encodeEnvelope(env: MeshEnvelopeV2): string {
  return JSON.stringify(env);
}

export function decodeEnvelope(raw: string): MeshEnvelopeV2 | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isEnvelopeV2(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Base64 yardımcılarının yeniden dışa aktarımı (taşıyıcı katmanı kullanır). */
export { toB64, fromB64 };
