/**
 * YEREL REHBER KASASI (cihazda şifreli depolama)
 * ------------------------------------------------------------------
 * Cihaz rehberi (ad + numara) hiçbir zaman düz metin olarak saklanmaz.
 * Bu cihaza özel rastgele bir anahtarla şifrelenir; şifreleme
 * senkron çalışır (WebCrypto beklemesi olmadan) ve @noble/hashes
 * üzerinde "önce şifrele, sonra imzala" (encrypt-then-MAC) düzeniyle
 * kurulur.
 *
 * KVKK: veri yalnızca bu cihazda kalır, ağa/sunucuya çıkmaz.
 */
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";

const KEY_STORAGE = "tedbirge.chat.bookKey";

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(text: string): Uint8Array {
  const raw = atob(text);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Bu cihaza özel anahtar; yoksa üretilir. */
function deviceKey(): Uint8Array {
  try {
    const saved = window.localStorage.getItem(KEY_STORAGE);
    if (saved) {
      const k = unb64(saved);
      if (k.length === 32) return k;
    }
  } catch {
    /* gizli mod */
  }
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  try {
    window.localStorage.setItem(KEY_STORAGE, b64(key));
  } catch {
    /* gizli mod: oturum boyu geçerli anahtar */
  }
  return key;
}

/** HMAC-SHA256 sayaç modunda anahtar akışı. */
function keystream(key: Uint8Array, nonce: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let offset = 0;
  let counter = 0;
  while (offset < length) {
    const block = new Uint8Array(nonce.length + 4);
    block.set(nonce, 0);
    new DataView(block.buffer).setUint32(nonce.length, counter, false);
    const digest = hmac(sha256, key, block);
    out.set(digest.subarray(0, Math.min(32, length - offset)), offset);
    offset += 32;
    counter += 1;
  }
  return out;
}

/** Nesneyi şifreli metne çevirir. */
export function sealJson(value: unknown): string {
  const key = deviceKey();
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);
  const stream = keystream(key, nonce, plain.length);
  const cipher = new Uint8Array(plain.length);
  for (let i = 0; i < plain.length; i += 1) cipher[i] = plain[i]! ^ stream[i]!;
  const signed = new Uint8Array(nonce.length + cipher.length);
  signed.set(nonce, 0);
  signed.set(cipher, nonce.length);
  const tag = hmac(sha256, key, signed).subarray(0, 16);
  return `tbv1.${b64(nonce)}.${b64(cipher)}.${b64(tag)}`;
}

/** Şifreli metni çözer; bozulmuş/yabancı veri için null döner. */
export function openJson<T>(text: string | null): T | null {
  if (!text || !text.startsWith("tbv1.")) return null;
  try {
    const [, n, c, t] = text.split(".");
    if (!n || !c || !t) return null;
    const key = deviceKey();
    const nonce = unb64(n);
    const cipher = unb64(c);
    const signed = new Uint8Array(nonce.length + cipher.length);
    signed.set(nonce, 0);
    signed.set(cipher, nonce.length);
    const expected = hmac(sha256, key, signed).subarray(0, 16);
    const got = unb64(t);
    if (got.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < got.length; i += 1) diff |= got[i]! ^ expected[i]!;
    if (diff !== 0) return null;
    const stream = keystream(key, nonce, cipher.length);
    const plain = new Uint8Array(cipher.length);
    for (let i = 0; i < cipher.length; i += 1) plain[i] = cipher[i]! ^ stream[i]!;
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    return null;
  }
}
