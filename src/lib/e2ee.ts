/**
 * Uçtan uca şifreleme (E2EE) yardımcıları — tarayıcı WebCrypto tabanlı.
 *
 * Model: her düğüm kendi ECDH P-256 anahtar çiftini ÜRETİR. Özel anahtar
 * cihazdan hiç çıkmaz (tarayıcıda localStorage, ajanda dosya). Sunucuya
 * yalnızca genel anahtar ve parmak izi gider. Mesaj gövdesi AES-256-GCM ile
 * şifrelenir; sunucu yalnızca şifreli zarfı taşır, içeriği okuyamaz.
 *
 * Tüm fonksiyonlar yalnızca tarayıcıda/ajanda çağrılmalıdır (useEffect,
 * olay işleyicisi). SSR sırasında modül yan etkisi yoktur.
 */

export const E2EE_ALG = "ECDH-P256+AES-256-GCM";
const KEY_STORAGE_PREFIX = "tedbirge:e2ee:";

export type Envelope = {
  alg: string;
  epk: string; // gönderenin efemer genel anahtarı (base64)
  iv: string; // base64
  ct: string; // base64 şifreli metin
};

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("Bu ortam WebCrypto desteklemiyor (HTTPS gerekir).");
  return c.subtle;
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export async function generateNodeKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}> {
  const pair = await subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveKey",
  ]);
  const pub = await subtle().exportKey("raw", pair.publicKey);
  const priv = await subtle().exportKey("pkcs8", pair.privateKey);
  const publicKey = toB64(pub);
  return {
    publicKey,
    privateKey: toB64(priv),
    fingerprint: await fingerprintOf(publicKey),
  };
}

/** Genel anahtarın insan tarafından karşılaştırılabilir kısa parmak izi. */
export async function fingerprintOf(publicKeyB64: string): Promise<string> {
  const digest = await subtle().digest("SHA-256", fromB64(publicKeyB64) as unknown as BufferSource);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return (hex.slice(0, 16).match(/.{4}/g) ?? []).join("-").toUpperCase();
}

async function importPrivate(privateKeyB64: string) {
  return subtle().importKey(
    "pkcs8",
    fromB64(privateKeyB64) as unknown as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"],
  );
}

async function importPublic(publicKeyB64: string) {
  return subtle().importKey(
    "raw",
    fromB64(publicKeyB64) as unknown as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

async function deriveAesKey(privateKeyB64: string, peerPublicKeyB64: string) {
  return subtle().deriveKey(
    { name: "ECDH", public: await importPublic(peerPublicKeyB64) },
    await importPrivate(privateKeyB64),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Mesajı hedef düğümün genel anahtarına şifreler (efemer anahtar ile ileri gizlilik). */
export async function seal(peerPublicKeyB64: string, payload: unknown): Promise<Envelope> {
  const ephemeral = await generateNodeKeyPair();
  const key = await deriveAesKey(ephemeral.privateKey, peerPublicKeyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource,
  );
  return { alg: E2EE_ALG, epk: ephemeral.publicKey, iv: toB64(iv), ct: toB64(ct) };
}

/** Şifreli zarfı kendi özel anahtarınla açar. */
export async function open<T = unknown>(privateKeyB64: string, env: Envelope): Promise<T> {
  const key = await deriveAesKey(privateKeyB64, env.epk);
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: fromB64(env.iv) as unknown as BufferSource },
    key,
    fromB64(env.ct) as unknown as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export function isEnvelope(value: unknown): value is Envelope {
  const v = value as Partial<Envelope> | null;
  return Boolean(v && typeof v.alg === "string" && typeof v.epk === "string" && typeof v.iv === "string" && typeof v.ct === "string");
}

/** Düğüm özel anahtarını yalnızca bu cihazın tarayıcısında saklar. */
export function storeNodeKey(nodeId: string, privateKeyB64: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${KEY_STORAGE_PREFIX}${nodeId}`, privateKeyB64);
}

export function loadNodeKey(nodeId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(`${KEY_STORAGE_PREFIX}${nodeId}`);
}
