/**
 * Çevrimdışı Çalışma Zırhı — yerel lisans belirteçleri.
 * ------------------------------------------------------------------
 * Afet/blackout anında merkez sunucuya ulaşılamadığında sistemin
 * kilitlenmemesi için, cihaz kendi Ed25519 kimliğiyle imzalanmış bir
 * yerel çalışma belirteci üretir ve IndexedDB'de saklar. Doğrulama
 * tamamen cihazda yapılır; ağ gerekmez.
 *
 * Arayüzde hiçbir kriptografi terimi gösterilmez; yalnızca
 * "Çevrimdışı Çalışma Zırhı Aktif" etiketi görünür.
 */

import { ensureIdentity, signBytes, verifyBytes } from "@/lib/crypto/identity";
import { getBrowserNodeId } from "@/lib/browser-node";
import {
  appendEvent,
  getOfflineLicense,
  putOfflineLicense,
  type OfflineLicenseRecord,
} from "@/lib/store/idb";

const RECORD_ID = "local";
/** Belirteç geçerlilik süresi: 30 gün internetsiz çalışma hedefi. */
const TTL_MS = 30 * 24 * 3600_000;
/** Süresi dolmaya bu kadar kalınca sessizce yenilenir. */
const RENEW_BEFORE_MS = 7 * 24 * 3600_000;

export type OfflineGrantPayload = {
  v: 1;
  nodeId: string;
  plan: string;
  seats: number;
  issuedAt: number;
  expiresAt: number;
};

export type OfflineGrant = {
  active: boolean;
  plan: string;
  seats: number;
  issuedAt: number;
  expiresAt: number;
  /** Kalan gün sayısı (0 = süresi dolmuş). */
  remainingDays: number;
};

function encodePayload(p: OfflineGrantPayload): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
}

function decodePayload(b64: string): OfflineGrantPayload | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(b64)))) as OfflineGrantPayload;
  } catch {
    return null;
  }
}

function toGrant(payload: OfflineGrantPayload, valid: boolean): OfflineGrant {
  const remaining = Math.max(0, payload.expiresAt - Date.now());
  return {
    active: valid && remaining > 0,
    plan: payload.plan,
    seats: payload.seats,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    remainingDays: Math.ceil(remaining / 86_400_000),
  };
}

/** Yeni bir yerel çalışma belirteci imzalar ve saklar. */
export async function issueOfflineGrant(plan = "field", seats = 5): Promise<OfflineGrant | null> {
  if (typeof window === "undefined") return null;
  try {
    const nodeId = getBrowserNodeId();
    const identity = await ensureIdentity(nodeId);
    const issuedAt = Date.now();
    const payload: OfflineGrantPayload = {
      v: 1,
      nodeId,
      plan,
      seats,
      issuedAt,
      expiresAt: issuedAt + TTL_MS,
    };
    const encoded = encodePayload(payload);
    const signature = await signBytes(nodeId, new TextEncoder().encode(encoded));
    const rec: OfflineLicenseRecord = {
      id: RECORD_ID,
      payload: encoded,
      signature,
      signPublic: identity.signPublic,
      issuedAt,
      expiresAt: payload.expiresAt,
    };
    await putOfflineLicense(rec);
    void appendEvent("offline-grant", `Çevrimdışı çalışma izni yenilendi (${plan}).`);
    return toGrant(payload, true);
  } catch {
    return null;
  }
}

/** Saklı belirteci imza + süre kontrolüyle okur. Geçersizse null. */
export async function readOfflineGrant(): Promise<OfflineGrant | null> {
  if (typeof window === "undefined") return null;
  const rec = await getOfflineLicense(RECORD_ID);
  if (!rec) return null;
  const payload = decodePayload(rec.payload);
  if (!payload) return null;
  const valid = verifyBytes(rec.signPublic, rec.signature, new TextEncoder().encode(rec.payload));
  return toGrant(payload, valid);
}

/**
 * Uygulama açılışında çağrılır: belirteç yoksa/bozuksa/yakında dolacaksa
 * arka planda sessizce üretir. Kullanıcı hiçbir adım görmez.
 */
export async function ensureOfflineGrant(): Promise<OfflineGrant | null> {
  const current = await readOfflineGrant();
  if (current?.active && current.expiresAt - Date.now() > RENEW_BEFORE_MS) return current;
  return (await issueOfflineGrant(current?.plan ?? "field", current?.seats ?? 5)) ?? current;
}
