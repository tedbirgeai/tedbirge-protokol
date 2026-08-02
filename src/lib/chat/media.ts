/**
 * Medya parçalama ve yeniden birleştirme motoru.
 * ------------------------------------------------------------------
 * Fotoğraf, sesli not ve belgeler base64'e çevrilip 32 KB'lık
 * parçalara bölünür. Her parça normal mesh zarfı içinde uçtan uca
 * şifreli gider; alıcıda sıra bağımsız olarak birleştirilir.
 */

export const CHUNK_SIZE = 32 * 1024;
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

export type MediaChunk = {
  t: "media-chunk";
  mid: string;
  convId: string;
  name: string;
  mime: string;
  size: number;
  idx: number;
  total: number;
  data: string;
  ts: number;
};

export function isMediaChunk(v: unknown): v is MediaChunk {
  const c = v as MediaChunk | null;
  return Boolean(c && c.t === "media-chunk" && typeof c.mid === "string" && typeof c.data === "string");
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Dosya okunamadı"));
    reader.readAsDataURL(file);
  });
}

export function splitMedia(input: {
  mid: string;
  convId: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
}): MediaChunk[] {
  const total = Math.max(1, Math.ceil(input.dataUrl.length / CHUNK_SIZE));
  const ts = Date.now();
  return Array.from({ length: total }, (_, idx) => ({
    t: "media-chunk" as const,
    mid: input.mid,
    convId: input.convId,
    name: input.name,
    mime: input.mime,
    size: input.size,
    idx,
    total,
    data: input.dataUrl.slice(idx * CHUNK_SIZE, (idx + 1) * CHUNK_SIZE),
    ts,
  }));
}

type Pending = { chunks: Map<number, string>; total: number; meta: MediaChunk };

const pending = new Map<string, Pending>();

/** Parçayı biriktirir; tamamlandıysa birleşmiş medyayı döndürür. */
export function collectChunk(chunk: MediaChunk):
  | { done: true; name: string; mime: string; size: number; dataUrl: string; mid: string; convId: string }
  | { done: false; received: number; total: number } {
  let entry = pending.get(chunk.mid);
  if (!entry) {
    entry = { chunks: new Map(), total: chunk.total, meta: chunk };
    pending.set(chunk.mid, entry);
  }
  entry.chunks.set(chunk.idx, chunk.data);
  if (entry.chunks.size < entry.total) {
    return { done: false, received: entry.chunks.size, total: entry.total };
  }
  const dataUrl = Array.from({ length: entry.total }, (_, i) => entry!.chunks.get(i) ?? "").join("");
  pending.delete(chunk.mid);
  return {
    done: true,
    mid: chunk.mid,
    convId: entry.meta.convId,
    name: entry.meta.name,
    mime: entry.meta.mime,
    size: entry.meta.size,
    dataUrl,
  };
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
