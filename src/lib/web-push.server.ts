/**
 * Web Push gönderim motoru (RFC 8291 aes128gcm + RFC 8292 VAPID).
 * ------------------------------------------------------------------
 * Neden kendi motorumuz: sunucu tarafı Cloudflare Worker üzerinde çalışır;
 * Node.js'e bağlı "web-push" paketi burada çalışmaz. Bu dosya yalnızca Web
 * Crypto API kullanır, bu yüzden uç (edge) çalışma zamanında sorunsuzdur.
 *
 * GİZLİLİK İLKESİ (WhatsApp/Signal modeli):
 *  - Bildirim yükü ASLA mesaj içeriği taşımaz. Yalnızca "yeni şifreli mesaj
 *    var" / "gelen arama var" sinyali ve kısa bir düğüm etiketi gider.
 *  - Gerçek metin, alıcının cihazındaki şifreli depodan üretilir.
 *  - Push yükü ayrıca cihazın kendi anahtarıyla (p256dh/auth) şifrelenir;
 *    push servisi (Google/Apple/Mozilla) içeriği okuyamaz.
 */

const enc = new TextEncoder();

function b64urlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const bin = atob(value.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as unknown as ArrayBuffer));
}

/** HKDF (tek bloklu; ihtiyacımız olan uzunluklar 32 bayttan kısadır). */
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  kind: "message" | "call";
  tag?: string;
  url?: string;
  peer?: string;
};

/** RFC 8291: yükü alıcı cihazın anahtarlarıyla şifreler. */
async function encryptPayload(
  sub: PushSubscriptionRecord,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(sub.p256dh);
  const authSecret = b64urlToBytes(sub.auth);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const asKeyPair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", asKeyPair.publicKey));

  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic as unknown as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asKeyPair.privateKey, 256),
  );

  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek as unknown as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  // aes128gcm gövdesinde son kayıt 0x02 ayracıyla biter.
  const padded = concat(plaintext, new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce as unknown as ArrayBuffer },
      aesKey,
      padded as unknown as ArrayBuffer,
    ),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

async function vapidHeader(audience: string): Promise<string | null> {
  const jwkRaw = process.env["VAPID_PRIVATE_JWK"];
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:destek@tedbirge.com";
  if (!jwkRaw || !publicKey) return null;

  const jwk = JSON.parse(jwkRaw) as JsonWebKey;
  const key = await crypto.subtle.importKey(
    "jwk",
    { ...jwk, key_ops: ["sign"], ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = bytesToB64url(
    enc.encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: subject,
      }),
    ),
  );
  const signingInput = enc.encode(`${header}.${claims}`);
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      signingInput as unknown as ArrayBuffer,
    ),
  );
  return `vapid t=${header}.${claims}.${bytesToB64url(sig)}, k=${publicKey}`;
}

export function webPushConfigured(): boolean {
  return Boolean(process.env["VAPID_PRIVATE_JWK"] && process.env["VAPID_PUBLIC_KEY"]);
}

export function vapidPublicKey(): string | null {
  return process.env["VAPID_PUBLIC_KEY"] ?? null;
}

export type PushResult = { ok: boolean; status: number; gone: boolean };

/** Tek bir aboneliğe şifreli bildirim gönderir. */
export async function sendWebPush(
  sub: PushSubscriptionRecord,
  payload: PushNotificationPayload,
  options: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" } = {},
): Promise<PushResult> {
  try {
    const audience = new URL(sub.endpoint).origin;
    const auth = await vapidHeader(audience);
    if (!auth) return { ok: false, status: 0, gone: false };

    const body = await encryptPayload(sub, enc.encode(JSON.stringify(payload)));
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(options.ttl ?? (payload.kind === "call" ? 30 : 86_400)),
        Urgency: options.urgency ?? (payload.kind === "call" ? "high" : "normal"),
      },
      body: body as unknown as BodyInit,
    });

    return {
      ok: res.ok,
      status: res.status,
      // 404/410: abonelik iptal edilmiş, kaydı silmeliyiz.
      gone: res.status === 404 || res.status === 410,
    };
  } catch {
    return { ok: false, status: 0, gone: false };
  }
}
