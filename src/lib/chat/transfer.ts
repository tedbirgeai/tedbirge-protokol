/**
 * Şifreli yedeğin mesh üzerinden ikinci cihaza aktarımı.
 * ------------------------------------------------------------------
 * Cihaz değiştirirken (ya da ikinci cihaza kopya alırken) yedek dosyası
 * hiçbir buluta uğramaz: .tbg içeriği zaten parola ile AES-256-GCM
 * şifrelidir ve mesh kanalı üzerinden parçalar hâlinde doğrudan karşı
 * cihaza gönderilir. Aktarım şifreli zarf içinde gider; röle düğümler
 * içeriği göremez, hedef cihaz da parolayı bilmeden açamaz.
 */

import { createBackup, restoreBackup, type RestoreResult } from "@/lib/chat/backup";
import { onMesh, bootMeshBus } from "@/lib/mesh-bus";
import { sendMesh } from "@/lib/node-runtime";

const CHUNK = 20_000;

type MetaPacket = { t: "bk-meta"; id: string; total: number; bytes: number };
type PartPacket = { t: "bk-part"; id: string; i: number; data: string };

type Incoming = { id: string; total: number; parts: string[]; received: number; at: number };

const inbox = new Map<string, Incoming>();

export type PendingBackup = { from: string; text: string; bytes: number; at: number };

let pending: PendingBackup | null = null;
const listeners = new Set<() => void>();
let booted = false;

export function pendingBackup(): PendingBackup | null {
  return pending;
}

export function clearPendingBackup() {
  pending = null;
  listeners.forEach((l) => l());
}

export function onBackupTransfer(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Gelen yedeği parola ile bu cihaza uygular. */
export async function applyPendingBackup(passphrase: string): Promise<RestoreResult> {
  if (!pending) throw new Error("Bekleyen yedek yok.");
  const res = await restoreBackup(pending.text, passphrase);
  clearPendingBackup();
  return res;
}

/** Yedeği üretir ve seçilen eşe parçalar hâlinde gönderir. */
export async function sendBackupToPeer(
  peerId: string,
  passphrase: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  if (!peerId) throw new Error("Hedef cihaz seçilmedi.");
  const blob = await createBackup(passphrase);
  const text = await blob.text();
  const id = `bk_${Date.now().toString(36)}`;
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK) parts.push(text.slice(i, i + CHUNK));

  const metaOk = await sendMesh(
    "sync",
    peerId,
    { t: "bk-meta", id, total: parts.length, bytes: text.length } satisfies MetaPacket,
    1,
  );
  if (!metaOk) throw new Error("Hedef cihaza ulaşılamadı. İki cihaz da aynı ağda/menzilde olmalı.");

  for (let i = 0; i < parts.length; i += 1) {
    await sendMesh("sync", peerId, { t: "bk-part", id, i, data: parts[i]! } satisfies PartPacket, 1);
    onProgress?.(Math.round(((i + 1) / parts.length) * 100));
  }
}

function isMeta(v: unknown): v is MetaPacket {
  const p = v as MetaPacket | null;
  return Boolean(p && p.t === "bk-meta" && typeof p.id === "string" && p.total > 0);
}

function isPart(v: unknown): v is PartPacket {
  const p = v as PartPacket | null;
  return Boolean(p && p.t === "bk-part" && typeof p.id === "string" && typeof p.data === "string");
}

/** Alıcı taraf dinleyicisi — uygulama açılışında bir kez çağrılır. */
export function bootBackupTransfer() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  bootMeshBus();
  onMesh("sync", (from, body) => {
    if (isMeta(body)) {
      inbox.set(body.id, {
        id: body.id,
        total: body.total,
        parts: new Array<string>(body.total).fill(""),
        received: 0,
        at: Date.now(),
      });
      return;
    }
    if (!isPart(body)) return;
    const rec = inbox.get(body.id);
    if (!rec || body.i < 0 || body.i >= rec.total) return;
    if (!rec.parts[body.i]) rec.received += 1;
    rec.parts[body.i] = body.data;
    if (rec.received < rec.total) return;
    inbox.delete(body.id);
    const text = rec.parts.join("");
    pending = { from, text, bytes: text.length, at: Date.now() };
    listeners.forEach((l) => l());
  });
}
