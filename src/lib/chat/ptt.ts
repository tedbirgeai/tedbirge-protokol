/**
 * Bas-Konuş (PTT) — saha telsizi modu.
 * ------------------------------------------------------------------
 * Düğmeye basılı tutulduğu sürece ses 400 ms'lik Opus çerçeveleri
 * hâlinde mesh üzerinden akar; karşı tarafta MediaSource ile anında
 * çalınır (canlı telsiz hissi). Bağlantı yoksa ya da taşıyıcı düşük
 * bant genişliğindeyse (LoRa) çerçeveler birleştirilip normal sesli
 * not olarak sakla-ilet kuyruğuna düşer — söz kaybolmaz.
 */

import { sendMesh } from "@/lib/node-runtime";
import { getAlias } from "@/lib/chat/profile";
import { vibrate } from "@/lib/chat/sounds";

export type PttChunk = {
  t: "ptt";
  sid: string;
  convId: string;
  seq: number;
  /** base64 Opus/WebM çerçevesi. */
  data?: string;
  end?: boolean;
  alias?: string;
};

export function isPttChunk(v: unknown): v is PttChunk {
  const p = v as PttChunk | null;
  return Boolean(p && p.t === "ptt" && typeof p.sid === "string");
}

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function unb64(v: string): Uint8Array {
  return Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
}

type Session = {
  rec: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  seq: number;
  sid: string;
};

let session: Session | null = null;

export function pttActive(): boolean {
  return session !== null;
}

/** Basılı tutma başlangıcı. `targets` konuşmanın tüm üyeleri olabilir. */
export async function startPtt(convId: string, targets: string[]): Promise<boolean> {
  if (session) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 16_000 });
    const sid = `ptt_${Date.now().toString(36)}`;
    const s: Session = { rec, stream, chunks: [], seq: 0, sid };
    session = s;
    rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      s.chunks.push(e.data);
      const seq = s.seq++;
      void e.data.arrayBuffer().then((buf) => {
        for (const peer of targets) {
          void sendMesh("media", peer, {
            t: "ptt",
            sid,
            convId,
            seq,
            data: b64(buf),
            alias: getAlias(),
          } satisfies PttChunk);
        }
      });
    };
    rec.start(400);
    vibrate(18);
    return true;
  } catch {
    session = null;
    return false;
  }
}

/** Basılı tutma bitti — kalan çerçeve gönderilir, tam kayıt dosyası döner. */
export async function stopPtt(convId: string, targets: string[]): Promise<File | null> {
  const s = session;
  if (!s) return null;
  session = null;
  return new Promise<File | null>((resolve) => {
    s.rec.onstop = () => {
      s.stream.getTracks().forEach((t) => t.stop());
      for (const peer of targets) {
        void sendMesh("media", peer, {
          t: "ptt",
          sid: s.sid,
          convId,
          seq: s.seq,
          end: true,
          alias: getAlias(),
        } satisfies PttChunk);
      }
      const blob = new Blob(s.chunks, { type: s.rec.mimeType || "audio/webm" });
      vibrate(10);
      if (blob.size < 900) return resolve(null);
      resolve(new File([blob], `telsiz-${Date.now()}.webm`, { type: blob.type }));
    };
    try {
      s.rec.stop();
    } catch {
      resolve(null);
    }
  });
}

/* --------------------------- canlı dinleme --------------------------- */

type Player = {
  media: MediaSource;
  audio: HTMLAudioElement;
  buffer: SourceBuffer | null;
  queue: Uint8Array[];
  done: boolean;
};

const players = new Map<string, Player>();

function pump(p: Player) {
  if (!p.buffer || p.buffer.updating) return;
  const next = p.queue.shift();
  if (next) {
    try {
      p.buffer.appendBuffer(next as BufferSource);
    } catch {
      /* akış kesildi */
    }
    return;
  }
  if (p.done && p.media.readyState === "open") {
    try {
      p.media.endOfStream();
    } catch {
      /* zaten kapandı */
    }
  }
}

/** Gelen PTT çerçevesini anında çalar (canlı telsiz). */
export function playPttChunk(chunk: PttChunk) {
  if (typeof window === "undefined" || typeof MediaSource === "undefined") return;
  let p = players.get(chunk.sid);
  if (!p) {
    const media = new MediaSource();
    const audio = new Audio(URL.createObjectURL(media));
    audio.autoplay = true;
    const created: Player = { media, audio, buffer: null, queue: [], done: false };
    media.addEventListener("sourceopen", () => {
      try {
        created.buffer = media.addSourceBuffer("audio/webm;codecs=opus");
        created.buffer.addEventListener("updateend", () => pump(created));
        pump(created);
      } catch {
        /* tarayıcı desteklemiyor — sesli not olarak gelecek */
      }
    });
    void audio.play().catch(() => undefined);
    players.set(chunk.sid, created);
    p = created;
    setTimeout(() => players.delete(chunk.sid), 120_000);
  }
  if (chunk.end) {
    p.done = true;
    pump(p);
    return;
  }
  if (!chunk.data) return;
  p.queue.push(unb64(chunk.data));
  pump(p);
}
