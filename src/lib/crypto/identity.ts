/**
 * Düğüm kimliği ve kriptografik anahtar yönetimi.
 * ------------------------------------------------------------------
 * Karar 9/10 uyarınca:
 *  - İmza: Ed25519 (zorunlu, eş kimlik doğrulaması)
 *  - Anahtar anlaşması: X25519 → AES-256-GCM (mesh zarf gövdesi)
 *  - Kök gizli (seed) 12 kelimelik kurtarma ifadesinden türetilebilir
 *  - Seed cihazda AÇIK saklanmaz: IndexedDB içinde tutulan
 *    NON-EXTRACTABLE AES-GCM cihaz anahtarı (KEK) ile şifreli durur.
 *    KEK tarayıcıdan hiçbir biçimde dışa aktarılamaz.
 *
 * Not: WebCrypto Ed25519/X25519 desteği tarayıcılar arasında tutarsız
 * olduğundan eğri işlemleri denetlenmiş @noble/curves ile yapılır;
 * simetrik şifreleme ve KEK donanım destekli WebCrypto'da kalır.
 */

import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { getKeyRecord, putKeyRecord, type KeyRecord } from "@/lib/store/idb";

export const IDENTITY_ALG = "Ed25519+X25519+AES-256-GCM";
const KEK_ID = "__device_kek__";

export type Identity = {
  nodeId: string;
  alg: string;
  /** Ed25519 doğrulama anahtarı (base64). */
  signPublic: string;
  /** X25519 genel anahtarı (base64). */
  boxPublic: string;
  fingerprint: string;
};

type Secrets = { signSecret: Uint8Array; boxSecret: Uint8Array; seed: Uint8Array };

const secretCache = new Map<string, Secrets>();

/* ----------------------------- yardımcılar ----------------------------- */

export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("Bu ortam WebCrypto desteklemiyor (HTTPS gerekir).");
  return c.subtle;
}

function label(tag: string, seed: Uint8Array) {
  const prefix = new TextEncoder().encode(tag);
  const buf = new Uint8Array(prefix.length + seed.length);
  buf.set(prefix, 0);
  buf.set(seed, prefix.length);
  return sha256(buf);
}

export function fingerprintOfKey(publicKey: Uint8Array | string): string {
  const bytes = typeof publicKey === "string" ? fromB64(publicKey) : publicKey;
  const hex = Array.from(sha256(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return (hex.slice(0, 16).match(/.{4}/g) ?? []).join("-").toUpperCase();
}

function deriveSecrets(seed: Uint8Array): Secrets {
  return {
    seed,
    signSecret: label("tedbirge/sign/v1", seed),
    boxSecret: label("tedbirge/box/v1", seed),
  };
}

function publicOf(secrets: Secrets) {
  return {
    signPublic: toB64(ed25519.getPublicKey(secrets.signSecret)),
    boxPublic: toB64(x25519.getPublicKey(secrets.boxSecret)),
  };
}

/* -------------------------- cihaz anahtarı (KEK) -------------------------- */

async function getKek(): Promise<CryptoKey> {
  const rec = await getKeyRecord(KEK_ID);
  if (rec?.kek) return rec.kek;
  const kek = await subtle().generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await putKeyRecord({ nodeId: KEK_ID, kek, alg: "AES-256-GCM", createdAt: Date.now() });
  return kek;
}

async function sealSeed(seed: Uint8Array) {
  const kek = await getKek();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    kek,
    seed as unknown as BufferSource,
  );
  return { iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}

async function unsealSeed(sealed: { iv: string; ct: string }) {
  const kek = await getKek();
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: fromB64(sealed.iv) as unknown as BufferSource },
    kek,
    fromB64(sealed.ct) as unknown as BufferSource,
  );
  return new Uint8Array(plain);
}

/* ------------------------------ kimlik akışı ------------------------------ */

function identityOf(nodeId: string, secrets: Secrets): Identity {
  const pub = publicOf(secrets);
  return {
    nodeId,
    alg: IDENTITY_ALG,
    signPublic: pub.signPublic,
    boxPublic: pub.boxPublic,
    fingerprint: fingerprintOfKey(pub.signPublic),
  };
}

async function persist(nodeId: string, secrets: Secrets) {
  const pub = publicOf(secrets);
  const rec: KeyRecord = {
    nodeId,
    alg: IDENTITY_ALG,
    createdAt: Date.now(),
    signPublic: pub.signPublic,
    boxPublic: pub.boxPublic,
    sealedSeed: await sealSeed(secrets.seed),
  };
  await putKeyRecord(rec);
}

/** Kimliği yükler; yoksa yeni rastgele seed ile oluşturur. */
export async function ensureIdentity(nodeId: string): Promise<Identity> {
  const cached = secretCache.get(nodeId);
  if (cached) return identityOf(nodeId, cached);

  const rec = await getKeyRecord(nodeId);
  if (rec?.sealedSeed) {
    try {
      const seed = await unsealSeed(rec.sealedSeed);
      const secrets = deriveSecrets(seed);
      secretCache.set(nodeId, secrets);
      return identityOf(nodeId, secrets);
    } catch {
      /* KEK kaybolmuş: yeni kimlik üretilir */
    }
  }

  const seed = crypto.getRandomValues(new Uint8Array(16));
  const secrets = deriveSecrets(seed);
  secretCache.set(nodeId, secrets);
  await persist(nodeId, secrets);
  return identityOf(nodeId, secrets);
}

/** Yalnızca genel bilgileri döner; kimlik yoksa null. */
export async function getIdentity(nodeId: string): Promise<Identity | null> {
  const cached = secretCache.get(nodeId);
  if (cached) return identityOf(nodeId, cached);
  const rec = await getKeyRecord(nodeId);
  if (!rec?.signPublic || !rec.boxPublic) return null;
  return {
    nodeId,
    alg: rec.alg,
    signPublic: rec.signPublic,
    boxPublic: rec.boxPublic,
    fingerprint: fingerprintOfKey(rec.signPublic),
  };
}

/** Kurtarma ifadesinden gelen 16 baytlık entropiyle kimliği (yeniden) kurar. */
export async function restoreIdentityFromEntropy(
  nodeId: string,
  entropy: Uint8Array,
): Promise<Identity> {
  const secrets = deriveSecrets(entropy);
  secretCache.set(nodeId, secrets);
  await persist(nodeId, secrets);
  return identityOf(nodeId, secrets);
}

/** Kurtarma ifadesi üretmek için kök entropiyi çözer (yalnız kullanıcı isteğiyle). */
export async function revealSeed(nodeId: string): Promise<Uint8Array | null> {
  const cached = secretCache.get(nodeId);
  if (cached) return cached.seed;
  const rec = await getKeyRecord(nodeId);
  if (!rec?.sealedSeed) return null;
  try {
    return await unsealSeed(rec.sealedSeed);
  } catch {
    return null;
  }
}

async function secretsOf(nodeId: string): Promise<Secrets> {
  const cached = secretCache.get(nodeId);
  if (cached) return cached;
  await ensureIdentity(nodeId);
  const again = secretCache.get(nodeId);
  if (!again) throw new Error("Düğüm kimliği açılamadı.");
  return again;
}

/* ------------------------------ imza / şifre ------------------------------ */

export async function signBytes(nodeId: string, message: Uint8Array): Promise<string> {
  const s = await secretsOf(nodeId);
  return toB64(ed25519.sign(message, s.signSecret));
}

export function verifyBytes(
  signPublicB64: string,
  signatureB64: string,
  message: Uint8Array,
): boolean {
  try {
    return ed25519.verify(fromB64(signatureB64), message, fromB64(signPublicB64));
  } catch {
    return false;
  }
}

async function aesKeyFromShared(shared: Uint8Array): Promise<CryptoKey> {
  const digest = sha256(shared);
  return subtle().importKey("raw", digest as unknown as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export type SealedBody = { alg: string; epk: string; iv: string; ct: string };

/** Gövdeyi hedef düğümün X25519 anahtarına şifreler (efemer anahtar = ileri gizlilik). */
export async function sealTo(peerBoxPublicB64: string, payload: unknown): Promise<SealedBody> {
  const ephSecret = crypto.getRandomValues(new Uint8Array(32));
  const shared = x25519.getSharedSecret(ephSecret, fromB64(peerBoxPublicB64));
  const key = await aesKeyFromShared(shared);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource,
  );
  return {
    alg: "X25519+AES-256-GCM",
    epk: toB64(x25519.getPublicKey(ephSecret)),
    iv: toB64(iv),
    ct: toB64(new Uint8Array(ct)),
  };
}

/** Şifreli gövdeyi kendi özel anahtarınla açar. */
export async function openSealed<T = unknown>(nodeId: string, body: SealedBody): Promise<T> {
  const s = await secretsOf(nodeId);
  const shared = x25519.getSharedSecret(s.boxSecret, fromB64(body.epk));
  const key = await aesKeyFromShared(shared);
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: fromB64(body.iv) as unknown as BufferSource },
    key,
    fromB64(body.ct) as unknown as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
