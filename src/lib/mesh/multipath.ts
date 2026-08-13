import { onMesh } from "@/lib/mesh-bus";
import { sendMesh } from "@/lib/node-runtime";
import { transitConfig } from "@/lib/transit-config";
import type { EnvelopeKind } from "@/lib/mesh-envelope";
import type { Priority } from "@/lib/store/idb";

const MP_KEY = "__tbg_mp__";
const REASSEMBLY_TIMEOUT_MS = 30_000;

export type ChunkMeta = { mid: string; idx: number; total: number; lane: number; data: string };

function toB64(bytes: Uint8Array): string {
  let bin = ""; for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]!); return btoa(bin);
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i); return out;
}
function randMid(): string {
  const raw = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
}

export function laneForChunk(index: number, lanes: number): number { return lanes <= 0 ? 0 : index % lanes; }
export function shouldChunk(byteLen: number): boolean { return byteLen > transitConfig().chunkBytes; }

export function planChunks(mid: string, bytes: Uint8Array): ChunkMeta[] {
  const { chunkBytes, lanes } = transitConfig();
  const total = Math.max(1, Math.ceil(bytes.length / chunkBytes));
  const chunks: ChunkMeta[] = [];
  for (let i = 0; i < total; i += 1) {
    const slice = bytes.subarray(i * chunkBytes, (i + 1) * chunkBytes);
    chunks.push({ mid, idx: i, total, lane: laneForChunk(i, lanes), data: toB64(slice) });
  }
  return chunks;
}

export async function sendChunked(kind: EnvelopeKind, to: string | "*", payload: unknown, priority?: Priority): Promise<boolean> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload ?? null));
  if (!shouldChunk(bytes.length)) return sendMesh(kind, to, payload, priority);
  const chunks = planChunks(randMid(), bytes);
  let ok = true;
  for (const c of chunks) { const sent = await sendMesh(kind, to, { [MP_KEY]: c }, priority); ok = ok && Boolean(sent); }
  return ok;
}

type Pending = { parts: Map<number, Uint8Array>; total: number; startedAt: number };

export class ChunkReassembler {
  private pending = new Map<string, Pending>();
  push(meta: ChunkMeta): Uint8Array | null {
    this.sweep();
    const entry = this.pending.get(meta.mid) ?? { parts: new Map<number, Uint8Array>(), total: meta.total, startedAt: Date.now() };
    entry.parts.set(meta.idx, fromB64(meta.data));
    this.pending.set(meta.mid, entry);
    if (entry.parts.size < entry.total) return null;
    this.pending.delete(meta.mid);
    let size = 0; for (let k = 0; k < entry.total; k += 1) size += entry.parts.get(k)?.length ?? 0;
    const out = new Uint8Array(size); let off = 0;
    for (let k = 0; k < entry.total; k += 1) { const part = entry.parts.get(k); if (!part) return null; out.set(part, off); off += part.length; }
    return out;
  }
  private sweep() { const cutoff = Date.now() - REASSEMBLY_TIMEOUT_MS; for (const [mid, e] of this.pending) if (e.startedAt < cutoff) this.pending.delete(mid); }
  get pendingCount() { return this.pending.size; }
}

export function bindChunkReassembly(kind: EnvelopeKind, onComplete: (from: string, payload: unknown) => void): () => void {
  const asm = new ChunkReassembler();
  return onMesh(kind, (from, body) => {
    const meta = (body as Record<string, unknown> | null)?.[MP_KEY] as ChunkMeta | undefined;
    if (!meta || typeof meta.mid !== "string") { onComplete(from, body); return; }
    const full = asm.push(meta);
    if (!full) return;
    try { onComplete(from, JSON.parse(new TextDecoder().decode(full))); } catch { /* bozuk birleşim */ }
  });
}
