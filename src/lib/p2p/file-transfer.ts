/**
 * CİHAZDAN CİHAZA DOSYA AKTARIMI (P2P)
 * ------------------------------------------------------------------
 * Dosya cihazda parçalara bölünür ve şifreli zarflar hâlinde doğrudan
 * hedefe gönderilir; hiçbir buluta kopyalanmaz. Ara röleler yalnız
 * yönlendirme başlığını görür. Alıcıda parçalar birleşir ve kullanıcı
 * onaylayıp indirene kadar yalnız bellekte durur.
 */

import { kernel } from "@/kernel/contract";

const CHUNK = 24_000;
export const MAX_TRANSFER_BYTES = 16 * 1024 * 1024;

export type TransferStatus = "gonderiliyor" | "aliniyor" | "tamam" | "hata";

export type Transfer = {
  id: string;
  dir: "out" | "in";
  peer: string;
  name: string;
  mime: string;
  size: number;
  percent: number;
  status: TransferStatus;
  error?: string;
  /** Alınan dosyanın indirilebilir içeriği (yalnız dir="in"). */
  dataUrl?: string;
  at: number;
};

const transfers = new Map<string, Transfer>();
const parts = new Map<string, string[]>();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function listTransfers(): Transfer[] {
  return [...transfers.values()].sort((a, b) => b.at - a.at);
}

export function onTransferChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function clearTransfer(id: string) {
  transfers.delete(id);
  parts.delete(id);
  emit();
}

function put(t: Transfer) {
  transfers.set(t.id, t);
  emit();
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Dosya okunamadı."));
    r.readAsDataURL(file);
  });
}

/** Seçilen dosyayı hedef düğüme (veya "*" ile yakındakilere) gönderir. */
export async function sendFileToPeer(peer: string, file: File): Promise<void> {
  if (!peer) throw new Error("Hedef cihaz seçilmedi.");
  if (file.size > MAX_TRANSFER_BYTES) throw new Error("Dosya 16 MB sınırını aşıyor.");
  const k = kernel();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const dataUrl = await fileToDataUrl(file);
  const total = Math.max(1, Math.ceil(dataUrl.length / CHUNK));

  const t: Transfer = {
    id,
    dir: "out",
    peer,
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    percent: 0,
    status: "gonderiliyor",
    at: Date.now(),
  };
  put(t);

  try {
    await k.send("app", peer, {
      kind: "file.meta",
      id,
      name: t.name,
      mime: t.mime,
      size: t.size,
      total,
    });
    for (let i = 0; i < total; i += 1) {
      await k.send("app", peer, {
        kind: "file.part",
        id,
        i,
        total,
        data: dataUrl.slice(i * CHUNK, (i + 1) * CHUNK),
      });
      put({ ...t, percent: Math.round(((i + 1) / total) * 100) });
    }
    put({ ...t, percent: 100, status: "tamam" });
  } catch (e) {
    put({ ...t, status: "hata", error: e instanceof Error ? e.message : "Aktarım kesildi." });
    throw e;
  }
}

let booted = false;

/** Gelen dosya parçalarını dinlemeye başlar (fikirdaş / idempotent). */
export function bootFileTransfer() {
  if (booted || typeof window === "undefined") return;
  let k: ReturnType<typeof kernel>;
  try {
    k = kernel();
  } catch {
    window.setTimeout(bootFileTransfer, 500);
    return;
  }
  booted = true;

  k.subscribe("app", (from, body) => {
    const b = body as Record<string, unknown> | null;
    if (!b || typeof b["kind"] !== "string") return;

    if (b["kind"] === "file.meta") {
      const id = String(b["id"] ?? "");
      const size = Number(b["size"] ?? 0);
      if (!id || size > MAX_TRANSFER_BYTES) return;
      parts.set(id, new Array<string>(Math.max(1, Number(b["total"] ?? 1))).fill(""));
      put({
        id,
        dir: "in",
        peer: from,
        name: String(b["name"] ?? "dosya"),
        mime: String(b["mime"] ?? "application/octet-stream"),
        size,
        percent: 0,
        status: "aliniyor",
        at: Date.now(),
      });
      return;
    }

    if (b["kind"] === "file.part") {
      const id = String(b["id"] ?? "");
      const buf = parts.get(id);
      const t = transfers.get(id);
      if (!buf || !t) return;
      const i = Number(b["i"] ?? -1);
      if (i < 0 || i >= buf.length) return;
      buf[i] = String(b["data"] ?? "");
      const done = buf.filter((x) => x.length > 0).length;
      const percent = Math.round((done / buf.length) * 100);
      if (done === buf.length) {
        put({ ...t, percent: 100, status: "tamam", dataUrl: buf.join("") });
        parts.delete(id);
      } else {
        put({ ...t, percent });
      }
    }
  });
}
