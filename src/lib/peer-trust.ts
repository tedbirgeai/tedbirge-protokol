/**
 * Eş Güveni (Peer Trust) — Ed25519 parmak izi doğrulama katmanı.
 * ------------------------------------------------------------------
 * Model: TOFU (Trust On First Use) + isteğe bağlı elle doğrulama.
 *  - Bir eş ilk görüldüğünde Ed25519 anahtarı `knownSignPublic` olarak
 *    IndexedDB'ye sabitlenir → durum "auto".
 *  - Kullanıcı QR / emoji / manuel karşılaştırma ile onaylarsa
 *    `verifiedAt` yazılır → durum "manual".
 *  - Sabitlenmiş anahtar değişirse `keyChangedAt` yazılır → durum
 *    "changed". Bu, ortadaki adam (MITM) ihtimaline karşı UYARIDIR;
 *    kullanıcı yeniden doğrulamadan rozet yeşile dönmez.
 *
 * Parmak izi gösterimi üç biçimde sunulur (aynı anahtardan türer):
 *  - Manuel: 4 blok × 4 onaltılık karakter (fingerprintOfKey)
 *  - Emoji : 5 sembol (sözlü/telefonla karşılaştırma için)
 *  - QR    : tbg-peer:<peerId>:<signPublic> yükü
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { fingerprintOfKey, fromB64 } from "@/lib/crypto/identity";
import { getPeer, putPeer, listPeers, type PeerRecord } from "@/lib/store/idb";

export type TrustStatus = "unknown" | "auto" | "manual" | "changed";

export const TRUST_LABEL: Record<TrustStatus, string> = {
  unknown: "Bilinmiyor",
  auto: "Otomatik",
  manual: "Manuel onaylı",
  changed: "Parmak izi değişti",
};

/** Sözlü karşılaştırma için 5 sembollük emoji seti (64 sembollük sabit sözlük). */
export const EMOJI_SET = [
  "🐝", "🌊", "🔥", "🌲", "⭐", "🍀", "🌙", "⚡",
  "🎯", "🔑", "🛡️", "🚀", "⛰️", "🧭", "📡", "🔭",
  "🐬", "🦅", "🐢", "🦊", "🐘", "🦉", "🐝", "🦋",
  "🍎", "🍋", "🍇", "🌵", "🌻", "🍄", "🌾", "🌍",
  "🎵", "🎨", "📕", "🕯️", "⏳", "🧲", "🔔", "🪙",
  "🚂", "⛵", "🛰️", "🚁", "🏔️", "🏝️", "🌋", "🗼",
  "☂️", "❄️", "🌈", "☀️", "🌪️", "💧", "🪵", "🪨",
  "🧊", "🧩", "🪞", "🔦", "🪃", "🥁", "🎲", "🧬",
] as const;

function digestOf(signPublicB64: string): Uint8Array {
  try {
    return sha256(fromB64(signPublicB64));
  } catch {
    return sha256(new TextEncoder().encode(signPublicB64));
  }
}

/** Anahtardan türeyen 5 emoji — iki cihazda birebir aynı olmalıdır. */
export function emojiFingerprint(signPublicB64: string): string[] {
  const d = digestOf(signPublicB64);
  return Array.from({ length: 5 }, (_, i) => EMOJI_SET[d[i] % EMOJI_SET.length]);
}

/** 4 blok × 4 karakter manuel karşılaştırma dizisi. */
export function manualBlocks(signPublicB64: string): string[] {
  return fingerprintOfKey(signPublicB64).split("-");
}

const FALLBACK_ORIGIN = "https://tedbirge-gateway.lovable.app";

/**
 * QR yükü — telefon kamerası doğrudan açabilsin diye normal bir https
 * bağlantısıdır. Kimlik ve genel anahtar bağlantı parametrelerinde taşınır;
 * bağlantı açıldığında kişi rehbere eklenir.
 */
export function qrPayload(peerId: string, signPublicB64: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : FALLBACK_ORIGIN;
  const u = new URL("/chat", origin);
  u.searchParams.set("p", peerId);
  u.searchParams.set("k", signPublicB64);
  return u.toString();
}

export function parseQrPayload(raw: string): { peerId: string; signPublic: string } | null {
  const value = raw.trim();
  const legacy = /^tbg-peer:([^:]+):(.+)$/.exec(value);
  if (legacy) return { peerId: legacy[1], signPublic: legacy[2] };
  try {
    const u = new URL(value);
    const peerId = u.searchParams.get("p");
    const signPublic = u.searchParams.get("k");
    if (peerId && signPublic) return { peerId, signPublic };
  } catch {
    /* geçersiz bağlantı */
  }
  return null;
}

export function trustStatusOf(rec?: PeerRecord | null): TrustStatus {
  if (!rec) return "unknown";
  if (rec.keyChangedAt && (!rec.verifiedAt || rec.verifiedAt < rec.keyChangedAt)) return "changed";
  if (rec.verifiedAt) return "manual";
  if (rec.knownSignPublic) return "auto";
  return "unknown";
}

/**
 * Eş el sıkışması sırasında çağrılır: anahtarı sabitler, değişimi tespit eder.
 * Dönen durum arayüzde rozet olarak gösterilir.
 */
export async function observePeerKey(input: {
  peerId: string;
  signPublic: string;
  boxPublic: string;
}): Promise<TrustStatus> {
  const prev = await getPeer(input.peerId);
  const changed = Boolean(prev?.knownSignPublic && prev.knownSignPublic !== input.signPublic);
  const rec: PeerRecord = {
    ...(prev ?? { peerId: input.peerId, lastSeen: 0 }),
    peerId: input.peerId,
    verifyKey: input.signPublic,
    publicKey: input.boxPublic,
    fingerprint: fingerprintOfKey(input.signPublic),
    knownSignPublic: input.signPublic,
    keyChangedAt: changed ? Date.now() : prev?.keyChangedAt,
    verifiedAt: changed ? undefined : prev?.verifiedAt,
    verified: !changed && Boolean(prev?.verifiedAt),
    lastSeen: Date.now(),
  };
  await putPeer(rec);
  return trustStatusOf(rec);
}

/** Kullanıcı doğrulamayı onayladı (QR / emoji / manuel). */
export async function confirmPeerVerified(peerId: string, signPublic?: string): Promise<TrustStatus> {
  const prev = await getPeer(peerId);
  const spk = signPublic ?? prev?.verifyKey;
  const rec: PeerRecord = {
    ...(prev ?? { peerId, lastSeen: Date.now() }),
    peerId,
    verifyKey: spk,
    knownSignPublic: spk,
    fingerprint: spk ? fingerprintOfKey(spk) : prev?.fingerprint,
    verifiedAt: Date.now(),
    verified: true,
    lastSeen: Date.now(),
  };
  await putPeer(rec);
  return trustStatusOf(rec);
}

/** Doğrulamayı geri alır (anahtar değişimi sonrası yeniden onay için). */
export async function revokePeerVerification(peerId: string): Promise<TrustStatus> {
  const prev = await getPeer(peerId);
  if (!prev) return "unknown";
  const rec: PeerRecord = { ...prev, verifiedAt: undefined, verified: false };
  await putPeer(rec);
  return trustStatusOf(rec);
}

export async function trustMap(): Promise<Record<string, TrustStatus>> {
  const rows = await listPeers();
  const out: Record<string, TrustStatus> = {};
  for (const r of rows) out[r.peerId] = trustStatusOf(r);
  return out;
}
