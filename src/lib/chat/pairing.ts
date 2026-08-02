/**
 * MODEL A — Korumalı eşleşme (PIN / QR) ve güven sınırı.
 * ------------------------------------------------------------------
 * Kural: eşleşmemiş (untrusted) bir cihazdan gelen mesaj, medya, arama
 * veya eşitleme paketi ARKA PLANDA DÜŞÜRÜLÜR. Yalnızca "pair-*" el
 * sıkışma paketleri güven sınırını geçebilir.
 *
 * El sıkışma akışı:
 *   1. A cihazı eşleşme başlatır → tek seferlik 4 haneli PIN üretir,
 *      ekranda PIN + QR gösterir ve B'ye "pair-req" yollar.
 *   2. B ekranda PIN'i girer (veya QR yükünü yapıştırır) → A'ya
 *      "pair-pin" yollar.
 *   3. A doğrular → B'yi güvenilir kaydeder ve "pair-ok" yollar.
 *      B de A'yı güvenilir kaydeder; kanal açılır.
 * PIN 3 dakika sonra geçersizdir ve 5 hatalı denemede iptal olur.
 */

import { useSyncExternalStore } from "react";
import {
  deleteTrustedNode,
  listTrustedNodes,
  putTrustedNode,
  type TrustedNode,
} from "@/lib/store/idb";
import { onMesh, setMeshGate } from "@/lib/mesh-bus";
import { sendMesh } from "@/lib/node-runtime";
import { getAlias } from "@/lib/chat/profile";

export const PIN_TTL_MS = 3 * 60_000;
const MAX_ATTEMPTS = 5;

export type PairSession = {
  nodeId: string;
  alias?: string;
  /** "host" = PIN'i üreten ve gösteren taraf, "guest" = PIN'i giren taraf. */
  role: "host" | "guest";
  pin?: string;
  createdAt: number;
  attempts: number;
  error?: string;
  status: "waiting" | "paired" | "rejected";
};

export type PairingState = {
  trusted: Record<string, TrustedNode>;
  /** Aktif el sıkışma oturumu (aynı anda tek modal). */
  session: PairSession | null;
  /** Karşı taraftan gelen eşleşme isteği kuyruğu. */
  incoming: Array<{ nodeId: string; alias?: string; ts: number }>;
};

let state: PairingState = { trusted: {}, session: null, incoming: [] };
const listeners = new Set<() => void>();
let booted = false;

function publish(patch: Partial<PairingState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/* ------------------------------ güven ------------------------------ */

export function isTrusted(nodeId: string): boolean {
  return Boolean(state.trusted[nodeId]);
}

export function trustedIds(): string[] {
  return Object.keys(state.trusted);
}

async function trust(nodeId: string, method: "pin" | "qr", alias?: string) {
  const rec: TrustedNode = { nodeId, alias, method, pairedAt: Date.now() };
  await putTrustedNode(rec);
  publish({
    trusted: { ...state.trusted, [nodeId]: rec },
    incoming: state.incoming.filter((i) => i.nodeId !== nodeId),
  });
}

export async function revokeTrust(nodeId: string) {
  await deleteTrustedNode(nodeId);
  const { [nodeId]: _gone, ...rest } = state.trusted;
  publish({ trusted: rest });
}

/* ------------------------------ PIN ------------------------------ */

function newPin(): string {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return String(1000 + (b[0]! % 9000));
}

function expired(s: PairSession) {
  return Date.now() - s.createdAt > PIN_TTL_MS;
}

/** QR yükü — karşı cihaz kamerayla okur ya da metni yapıştırır. */
export function pairQrPayload(nodeId: string, pin: string) {
  return `tbg-pair:${nodeId}:${pin}`;
}

export function parsePairPayload(raw: string): { nodeId: string; pin: string } | null {
  const m = /^tbg-pair:([^:]+):(\d{4})$/.exec(raw.trim());
  return m ? { nodeId: m[1]!, pin: m[2]! } : null;
}

/** A tarafı: PIN üretir, karşı cihaza eşleşme isteği yollar. */
export async function beginPairing(nodeId: string, alias?: string): Promise<PairSession> {
  const session: PairSession = {
    nodeId,
    alias,
    role: "host",
    pin: newPin(),
    createdAt: Date.now(),
    attempts: 0,
    status: "waiting",
  };
  publish({ session });
  await sendMesh("chat", nodeId, { t: "pair-req", alias: getAlias() });
  return session;
}

/** B tarafı: gelen isteği kabul eder, PIN giriş ekranını açar. */
export function acceptPairing(nodeId: string, alias?: string) {
  publish({
    session: { nodeId, alias, role: "guest", createdAt: Date.now(), attempts: 0, status: "waiting" },
    incoming: state.incoming.filter((i) => i.nodeId !== nodeId),
  });
}

export function dismissPairing(nodeId?: string) {
  publish({
    session: null,
    incoming: nodeId ? state.incoming.filter((i) => i.nodeId !== nodeId) : state.incoming,
  });
}

/** B tarafı: PIN'i (veya QR yükünü) gönderir. */
export async function submitPin(input: string): Promise<void> {
  const s = state.session;
  if (!s) return;
  const parsed = parsePairPayload(input);
  const pin = parsed?.pin ?? input.replace(/\D/g, "").slice(0, 4);
  const target = parsed?.nodeId ?? s.nodeId;
  if (pin.length !== 4) {
    publish({ session: { ...s, error: "4 haneli kodu girin." } });
    return;
  }
  publish({ session: { ...s, error: undefined } });
  await sendMesh("chat", target, { t: "pair-pin", pin, alias: getAlias(), method: parsed ? "qr" : "pin" });
}

/* --------------------------- mesh el sıkışma --------------------------- */

type PairPayload = { t?: string; pin?: string; alias?: string; method?: "pin" | "qr" };

function isPairPacket(body: unknown): boolean {
  const t = (body as PairPayload | null)?.t;
  return typeof t === "string" && t.startsWith("pair-");
}

async function onPair(from: string, raw: unknown) {
  const p = raw as PairPayload;
  if (!p?.t?.startsWith("pair-")) return;

  if (p.t === "pair-req") {
    if (isTrusted(from)) return;
    if (state.session?.nodeId === from) return;
    if (state.incoming.some((i) => i.nodeId === from)) return;
    publish({ incoming: [...state.incoming, { nodeId: from, alias: p.alias, ts: Date.now() }] });
    return;
  }

  if (p.t === "pair-pin") {
    const s = state.session;
    if (!s || s.role !== "host" || s.nodeId !== from) return;
    if (expired(s)) {
      publish({ session: { ...s, status: "rejected", error: "Kodun süresi doldu." } });
      void sendMesh("chat", from, { t: "pair-fail", reason: "expired" });
      return;
    }
    if (p.pin !== s.pin) {
      const attempts = s.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        publish({ session: { ...s, attempts, status: "rejected", error: "Çok fazla hatalı deneme." } });
        void sendMesh("chat", from, { t: "pair-fail", reason: "attempts" });
        return;
      }
      publish({ session: { ...s, attempts, error: "Kod eşleşmedi." } });
      void sendMesh("chat", from, { t: "pair-fail", reason: "mismatch" });
      return;
    }
    await trust(from, p.method === "qr" ? "qr" : "pin", p.alias);
    publish({ session: { ...state.session!, status: "paired", error: undefined } });
    void sendMesh("chat", from, { t: "pair-ok", alias: getAlias(), method: p.method ?? "pin" });
    return;
  }

  if (p.t === "pair-ok") {
    await trust(from, p.method === "qr" ? "qr" : "pin", p.alias);
    const s = state.session;
    if (s?.nodeId === from) publish({ session: { ...s, status: "paired", error: undefined } });
    return;
  }

  if (p.t === "pair-fail") {
    const s = state.session;
    if (s?.nodeId === from && s.role === "guest") {
      publish({ session: { ...s, error: "Kod doğrulanmadı, tekrar deneyin." } });
    }
  }
}

/* ------------------------------ önyükleme ------------------------------ */

export async function bootPairing() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  // Güven sınırı: eşleşmemiş düğümlerin paketleri düşürülür.
  setMeshGate((_kind, from, body) => isTrusted(from) || isPairPacket(body));
  onMesh("chat", (from, body) => void onPair(from, body));
  const rows = await listTrustedNodes();
  const map: Record<string, TrustedNode> = {};
  for (const r of rows) map[r.nodeId] = r;
  publish({ trusted: map });
}

export function usePairing(): PairingState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
