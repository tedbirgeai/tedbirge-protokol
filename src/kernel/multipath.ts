/**
 * ÇOKLU HAT PARÇA YÖNLENDİRİCİSİ (Multipath Chunk Router)
 * ------------------------------------------------------------------
 * Büyük yükler (fotoğraf, ses, dosya, geçmiş eşitlemesi) tek bir hattı
 * tıkamaz: yük 16 KB / 64 KB parçalara bölünür ve açık taşıyıcı hatlara
 * (lane) sırayla dağıtılır. Alıcı tarafta parçalar sıra bağımsız
 * birleştirilir; eksik parça varsa yük uygulamaya HİÇ verilmez.
 *
 * Saf fonksiyonlardır: tarayıcı API'si kullanmaz, test edilebilir.
 */

import { transitConfig } from "@/lib/transit-config";

/** Ağ üzerinde taşınan tek parça. */
export type ChunkFrame = {
  /** Sabit imza: normal gövdelerden ayırt etmek için. */
  __tbchunk: 1;
  /** Aynı yükün tüm parçalarını birleştiren kimlik. */
  id: string;
  /** Parça sırası (0 tabanlı). */
  i: number;
  /** Toplam parça sayısı. */
  n: number;
  /** Parça verisi (UTF-8 JSON diliminin base64'ü değil, düz dilim). */
  d: string;
};

/** Birleştirme durumu. */
type Assembly = { n: number; parts: Map<number, string>; at: number };

const inbox = new Map<string, Assembly>();
/** Yarım kalan yükler 5 dakika sonra düşürülür (bellek sızıntısı olmaz). */
const ASSEMBLY_TTL_MS = 300_000;

function newId(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

/** Parçalama eşiği: bu boyutun altındaki yükler bölünmez. */
export function chunkThreshold(): number {
  return transitConfig().chunkBytes;
}

/**
 * Yükü parçalara böler. Yük eşiğin altındaysa boş dizi döner —
 * çağıran taraf normal tek zarf yolunu kullanır.
 */
export function chunkPayload(payload: unknown, chunkBytes = chunkThreshold()): ChunkFrame[] {
  const text = JSON.stringify(payload ?? null) ?? "null";
  if (text.length <= chunkBytes) return [];
  const id = newId();
  const total = Math.ceil(text.length / chunkBytes);
  const out: ChunkFrame[] = [];
  for (let i = 0; i < total; i++) {
    out.push({
      __tbchunk: 1,
      id,
      i,
      n: total,
      d: text.slice(i * chunkBytes, (i + 1) * chunkBytes),
    });
  }
  return out;
}

/** Parçaları hatlara (lane) sırayla dağıtır: her hat kendi dilimini taşır. */
export function laneSchedule<T>(items: T[], lanes = transitConfig().lanes): T[][] {
  const width = Math.max(1, Math.min(lanes, items.length || 1));
  const out: T[][] = Array.from({ length: width }, () => []);
  items.forEach((item, idx) => out[idx % width]!.push(item));
  return out;
}

export function isChunkFrame(body: unknown): body is ChunkFrame {
  const f = body as Partial<ChunkFrame> | null;
  return (
    !!f &&
    f.__tbchunk === 1 &&
    typeof f.id === "string" &&
    typeof f.d === "string" &&
    typeof f.i === "number" &&
    typeof f.n === "number"
  );
}

function prune(now: number) {
  for (const [id, a] of inbox) {
    if (now - a.at > ASSEMBLY_TTL_MS) inbox.delete(id);
  }
}

/**
 * Gelen parçayı birleştiriciye verir. Yük tamamlandıysa çözülmüş gövdeyi,
 * tamamlanmadıysa `null` döner.
 */
export function ingestChunk(frame: ChunkFrame): { payload: unknown } | null {
  const now = Date.now();
  prune(now);
  const entry = inbox.get(frame.id) ?? { n: frame.n, parts: new Map<number, string>(), at: now };
  entry.parts.set(frame.i, frame.d);
  entry.at = now;
  inbox.set(frame.id, entry);
  if (entry.parts.size < entry.n) return null;
  inbox.delete(frame.id);
  let text = "";
  for (let i = 0; i < entry.n; i++) text += entry.parts.get(i) ?? "";
  try {
    return { payload: JSON.parse(text) as unknown };
  } catch {
    return null;
  }
}

/** Test/kapanış: yarım kalan birleştirmeleri temizler. */
export function resetMultipath() {
  inbox.clear();
}
