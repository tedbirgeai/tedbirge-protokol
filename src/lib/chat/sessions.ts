/**
 * ÇOKLU CİHAZ OTURUMLARI
 * ------------------------------------------------------------------
 * Aynı kimlikle (telefon + masaüstü) eşzamanlı oturum açılabilir.
 * Cihaz listesi, mesaj/okundu/rehber eşitlemesi ve uzaktan çıkış
 * yalnızca güvenilir (eşleştirilmiş) kendi cihazlarımız arasında,
 * mevcut uçtan uca şifreli mesh kanalı üzerinden yürür. Hiçbir cihaz
 * bilgisi bulut sunucusunda tutulmaz.
 */

import { getBrowserNodeId, getPersonId } from "@/lib/browser-node";
import { sendMesh } from "@/lib/node-runtime";
import { onMesh } from "@/lib/mesh-bus";
import { logError } from "@/lib/chat/errors";

const KEY = "tedbirge.chat.sessions";
const REVOKED_KEY = "tedbirge.chat.sessionRevoked";

export type DeviceSession = {
  nodeId: string;
  personId: string;
  label: string;
  platform: string;
  firstSeen: number;
  lastSeen: number;
  self: boolean;
};

type Payload = {
  t: "session-hello" | "session-bye" | "session-revoke";
  nodeId: string;
  personId: string;
  label?: string;
  platform?: string;
  target?: string;
};

let cache: DeviceSession[] | null = null;
const listeners = new Set<() => void>();

function read(): DeviceSession[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as DeviceSession[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(rows: DeviceSession[]) {
  cache = rows;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
}

export function onSessionsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listSessions(): DeviceSession[] {
  return [...read()].sort((a, b) => Number(b.self) - Number(a.self) || b.lastSeen - a.lastSeen);
}

function platformLabel(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Cihaz";
}

function deviceLabel(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Tarayıcı";
  return `${platformLabel()} · ${browser}`;
}

function upsert(row: Omit<DeviceSession, "firstSeen"> & { firstSeen?: number }) {
  const rows = read();
  const idx = rows.findIndex((r) => r.nodeId === row.nodeId);
  const merged: DeviceSession = {
    firstSeen: rows[idx]?.firstSeen ?? row.firstSeen ?? Date.now(),
    ...row,
  };
  const next = idx >= 0 ? rows.map((r, i) => (i === idx ? merged : r)) : [...rows, merged];
  write(next);
}

/** Bu cihaz uzaktan kapatıldı mı? (Açılışta kontrol edilir.) */
export function isRevoked(): boolean {
  try {
    return window.localStorage.getItem(REVOKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearRevoked() {
  try {
    window.localStorage.removeItem(REVOKED_KEY);
  } catch {
    /* gizli mod */
  }
}

async function announce(t: Payload["t"], target?: string) {
  const body: Payload = {
    t,
    nodeId: getBrowserNodeId(),
    personId: getPersonId(),
    label: deviceLabel(),
    platform: platformLabel(),
    ...(target ? { target } : {}),
  };
  try {
    await sendMesh("session", "*", body);
  } catch (err) {
    logError("sessions.announce", err);
  }
}

let booted = false;

/** Oturum eşitlemesini başlatır: kendini duyurur, diğer cihazları dinler. */
export function bootSessions(): void {
  if (booted || typeof window === "undefined") return;
  booted = true;

  upsert({
    nodeId: getBrowserNodeId(),
    personId: getPersonId(),
    label: `${deviceLabel()} (bu cihaz)`,
    platform: platformLabel(),
    lastSeen: Date.now(),
    self: true,
  });

  onMesh("session", (_from, body) => {
    const p = body as Payload;
    if (!p || typeof p.t !== "string") return;
    if (p.personId !== getPersonId()) return; // yalnızca kendi cihazlarımız

    if (p.t === "session-revoke") {
      if (p.target && p.target === getBrowserNodeId()) {
        try {
          window.localStorage.setItem(REVOKED_KEY, "1");
        } catch {
          /* gizli mod */
        }
        window.location.reload();
      } else if (p.target) {
        write(read().filter((r) => r.nodeId !== p.target));
      }
      return;
    }

    if (p.t === "session-bye") {
      write(read().filter((r) => r.nodeId !== p.nodeId));
      return;
    }

    upsert({
      nodeId: p.nodeId,
      personId: p.personId,
      label: p.label ?? "Bağlı cihaz",
      platform: p.platform ?? "Cihaz",
      lastSeen: Date.now(),
      self: false,
    });
  });

  void announce("session-hello");
  const beat = setInterval(() => void announce("session-hello"), 60_000);
  window.addEventListener("pagehide", () => clearInterval(beat));
}

/** Uzaktan çıkış: hedef cihazın oturumunu kapatır. */
export async function revokeSession(nodeId: string): Promise<void> {
  if (nodeId === getBrowserNodeId()) return;
  write(read().filter((r) => r.nodeId !== nodeId));
  await announce("session-revoke", nodeId);
}
