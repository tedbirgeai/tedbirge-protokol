/**
 * Tedbirge Yerel Ağ Doğrulaması (Offline-First Local Auth)
 * ------------------------------------------------------------------
 * Dış GSM/SMS şebekesine bağımlılık yoktur. Doğrulama kodu cihazda,
 * Web Crypto ile zaman tabanlı (RFC 6238 / TOTP) olarak üretilir ve
 * yine cihazda doğrulanır. İnternet kesildiğinde de çalışır.
 *
 * Saklanan veriler cihazda kalır; sunucuya gönderilmez.
 */

const SECRET_KEY = "tbg.localauth.secret.v1";
const SESSION_KEY = "tbg.localauth.session.v1";
const STEP_SECONDS = 30;
const DIGITS = 6;

export type LocalSession = {
  phone: string;
  alias: string;
  verifiedAt: number;
  /** Bulut hesabı da açıldıysa true; çevrimdışı katılımlarda false. */
  cloudLinked: boolean;
};

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string): Uint8Array {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Cihaza özel gizli anahtar (yalnızca bu tarayıcıda kalır). */
export function getDeviceSecret(): Uint8Array {
  if (typeof window === "undefined") return new Uint8Array(20);
  const existing = window.localStorage.getItem(SECRET_KEY);
  if (existing) {
    try {
      return fromB64(existing);
    } catch {
      /* bozuksa yeniden üret */
    }
  }
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  window.localStorage.setItem(SECRET_KEY, b64(bytes));
  return bytes;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.slice().buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, message.slice().buffer as ArrayBuffer);
  return new Uint8Array(sig);
}

function counterBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i -= 1) {
    buf[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return buf;
}

/** Telefon numarasına bağlanmış cihaz anahtarı (numara değişince kod da değişir). */
async function bindSecret(phone: string): Promise<Uint8Array> {
  const secret = getDeviceSecret();
  const salt = new TextEncoder().encode(`tedbirge/local-auth/v1:${phone}`);
  const material = new Uint8Array(secret.length + salt.length);
  material.set(secret, 0);
  material.set(salt, secret.length);
  const digest = await crypto.subtle.digest("SHA-256", material.slice().buffer as ArrayBuffer);
  return new Uint8Array(digest).slice(0, 20);
}

/** Belirli bir zaman adımı için 6 haneli kodu üretir (RFC 6238). */
export async function localCodeAt(phone: string, counter: number): Promise<string> {
  const key = await bindSecret(phone);
  const mac = await hmacSha1(key, counterBytes(counter));
  const offset = (mac[mac.length - 1] ?? 0) & 0x0f;
  const binary =
    (((mac[offset] ?? 0) & 0x7f) << 24) |
    (((mac[offset + 1] ?? 0) & 0xff) << 16) |
    (((mac[offset + 2] ?? 0) & 0xff) << 8) |
    ((mac[offset + 3] ?? 0) & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function currentCounter(): number {
  return Math.floor(Date.now() / 1000 / STEP_SECONDS);
}

/** Şu anda geçerli olan doğrulama kodu. */
export function localCode(phone: string): Promise<string> {
  return localCodeAt(phone, currentCounter());
}

/** Kodun kalan geçerlilik süresi (saniye). */
export function secondsLeft(): number {
  return STEP_SECONDS - (Math.floor(Date.now() / 1000) % STEP_SECONDS);
}

/** ±1 zaman adımı toleransıyla kodu doğrular (saat kayması payı). */
export async function verifyLocalCode(phone: string, code: string): Promise<boolean> {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== DIGITS) return false;
  const base = currentCounter();
  for (const c of [base, base - 1, base + 1]) {
    if ((await localCodeAt(phone, c)) === clean) return true;
  }
  return false;
}

export function saveLocalSession(session: LocalSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getLocalSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

export function clearLocalSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

/** Çevrimdışıysa bulut adımları atlanır. */
export function isOnline(): boolean {
  return typeof navigator === "undefined" ? false : navigator.onLine !== false;
}
