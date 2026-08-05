/**
 * MERKEZÎ HATA GÜNLÜĞÜ
 * ------------------------------------------------------------------
 * Sessiz `catch {}` blokları yerine tek nokta: hata burada kaydedilir,
 * gerekiyorsa kullanıcıya anlaşılır Türkçe bir bildirim gösterilir.
 * Kayıtlar yalnızca bu cihazda tutulur (son 100 giriş) ve hiçbir yere
 * gönderilmez; Ayarlar > Hakkında içinden görüntülenebilir.
 */

import { toast } from "sonner";

export type ErrorEntry = {
  ts: number;
  scope: string;
  message: string;
  userMessage?: string;
};

const MAX = 100;
const KEY = "tedbirge.chat.errorlog";

let entries: ErrorEntry[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  if (typeof window === "undefined") return;
  try {
    entries = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as ErrorEntry[];
  } catch {
    entries = [];
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err).slice(0, 200);
  } catch {
    return "bilinmeyen hata";
  }
}

/**
 * Hata kaydeder. `userMessage` verilirse kullanıcıya Türkçe bildirim çıkar.
 */
export function logError(scope: string, err: unknown, userMessage?: string): void {
  load();
  const entry: ErrorEntry = {
    ts: Date.now(),
    scope,
    message: describe(err),
    ...(userMessage ? { userMessage } : {}),
  };
  entries = [entry, ...entries].slice(0, MAX);
  persist();
  if (userMessage) {
    try {
      toast.error(userMessage);
    } catch {
      /* toast henüz hazır değil */
    }
  }
  if (import.meta.env.DEV) console.warn(`[${scope}]`, err);
}

export function listErrors(): ErrorEntry[] {
  load();
  return entries;
}

export function clearErrors(): void {
  entries = [];
  persist();
}

export function onErrorLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Promise'i yutar, hatayı günlüğe yazar. */
export function guard<T>(scope: string, p: Promise<T>, userMessage?: string): Promise<T | null> {
  return p.catch((err: unknown) => {
    logError(scope, err, userMessage);
    return null;
  });
}
