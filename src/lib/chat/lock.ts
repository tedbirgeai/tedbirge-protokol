/**
 * Uygulama kilidi — PIN (+ varsa cihaz biyometrisi).
 * ------------------------------------------------------------------
 * PIN düz metin olarak SAKLANMAZ: rastgele tuz ile PBKDF2-SHA256
 * (210.000 tur) türevi tutulur. Kilit tamamen cihaz yereldir; hiçbir
 * sunucuya gitmez ve sıfırlama için hesap gerekmez.
 */

import { useSyncExternalStore } from "react";

const KEY = "tedbirge.chat.lock";
const AUTO_MS_KEY = "tedbirge.chat.lock.timeout";

type LockRecord = { salt: string; hash: string; createdAt: number };

type LockState = { enabled: boolean; locked: boolean };

let state: LockState = { enabled: false, locked: false };
const listeners = new Set<() => void>();

function publish(patch: Partial<LockState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  view.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function readRecord(): LockRecord | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LockRecord) : null;
  } catch {
    return null;
  }
}

async function derive(pin: string, saltB64: string): Promise<string> {
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 210_000, hash: "SHA-256" },
    base,
    256,
  );
  return b64(bits);
}

export function lockEnabled(): boolean {
  return Boolean(readRecord());
}

export function autoLockMinutes(): number {
  const v = Number(window.localStorage.getItem(AUTO_MS_KEY) ?? 5);
  return Number.isFinite(v) && v > 0 ? v : 5;
}

export function setAutoLockMinutes(min: number) {
  window.localStorage.setItem(AUTO_MS_KEY, String(Math.max(1, Math.round(min))));
}

export async function enableLock(pin: string): Promise<boolean> {
  if (pin.trim().length < 4) return false;
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = b64(saltBytes);
  const hash = await derive(pin, salt);
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ salt, hash, createdAt: Date.now() } satisfies LockRecord),
  );
  publish({ enabled: true, locked: false });
  return true;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const rec = readRecord();
  if (!rec) return true;
  const hash = await derive(pin, rec.salt);
  const ok = hash === rec.hash;
  if (ok) publish({ locked: false });
  return ok;
}

export async function disableLock(pin: string): Promise<boolean> {
  if (!(await verifyPin(pin))) return false;
  window.localStorage.removeItem(KEY);
  publish({ enabled: false, locked: false });
  return true;
}

export function lockNow() {
  if (lockEnabled()) publish({ locked: true });
}

let idleTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  if (!lockEnabled()) return;
  idleTimer = setTimeout(() => lockNow(), autoLockMinutes() * 60_000);
}

let booted = false;

/** Açılışta kilidi uygular; hareketsizlik ve sekme gizlenmesini izler. */
export function bootLock() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  const enabled = lockEnabled();
  publish({ enabled, locked: enabled });
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, scheduleIdle, { passive: true }),
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") scheduleIdle();
  });
  scheduleIdle();
}

export function useLock(): LockState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
