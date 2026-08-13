/**
 * ÇEKİRDEK IPC — ikili çerçeve (zero-copy Transferable ArrayBuffer)
 * ------------------------------------------------------------------
 * React ana iş parçacığı ile `kernel.worker.ts` arasındaki tüm trafik
 * JSON yerine sabit genişlikli, küçük-endian ikili düzende taşınır.
 * Çerçeve düzeni:
 *
 *   [u8 opcode][u8 flags][u16 reserved][u32 corrId][u32 len][payload…]
 *
 * Gövde `Transferable` olarak aktarılır; kopya oluşmaz. Aynı düzen
 * Rust/Wasm çekirdeğinin `kernel_alloc`/`kernel_free` tamponlarıyla
 * birebir uyumludur (bincode sabit genişlikli kodlaması).
 */

export const FRAME_HEADER_BYTES = 12;

export const OP = {
  /** Rota isteği (grafik + kaynak + hedef). */
  ROUTE: 1,
  /** Rota yanıtı. */
  ROUTE_RESULT: 2,
  /** 32 bit özet (mükerrer paket filtresi). */
  DIGEST: 3,
  DIGEST_RESULT: 4,
  /** Çekirdek yetenek bildirimi (Wasm var mı?). */
  HELLO: 5,
  HELLO_RESULT: 6,
} as const;

export type Opcode = (typeof OP)[keyof typeof OP];

export type Frame = { op: number; corrId: number; payload: ArrayBuffer };

export function encodeFrame(op: number, corrId: number, payload: ArrayBuffer): ArrayBuffer {
  const out = new ArrayBuffer(FRAME_HEADER_BYTES + payload.byteLength);
  const view = new DataView(out);
  view.setUint8(0, op);
  view.setUint8(1, 0);
  view.setUint16(2, 0, true);
  view.setUint32(4, corrId, true);
  view.setUint32(8, payload.byteLength, true);
  new Uint8Array(out, FRAME_HEADER_BYTES).set(new Uint8Array(payload));
  return out;
}

export function decodeFrame(buf: ArrayBuffer): Frame | null {
  if (buf.byteLength < FRAME_HEADER_BYTES) return null;
  const view = new DataView(buf);
  const op = view.getUint8(0);
  const corrId = view.getUint32(4, true);
  const len = view.getUint32(8, true);
  if (FRAME_HEADER_BYTES + len > buf.byteLength) return null;
  return { op, corrId, payload: buf.slice(FRAME_HEADER_BYTES, FRAME_HEADER_BYTES + len) };
}

/* ------------------------- yazma/okuma imleci ------------------------- */

export class ByteWriter {
  private chunks: number[] = [];

  u8(v: number) {
    this.chunks.push(v & 0xff);
    return this;
  }

  u16(v: number) {
    this.chunks.push(v & 0xff, (v >>> 8) & 0xff);
    return this;
  }

  u32(v: number) {
    this.chunks.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
    return this;
  }

  str(s: string) {
    const bytes = new TextEncoder().encode(s);
    this.u16(bytes.length);
    for (const b of bytes) this.chunks.push(b);
    return this;
  }

  buffer(): ArrayBuffer {
    return new Uint8Array(this.chunks).buffer;
  }
}

export class ByteReader {
  private offset = 0;
  private view: DataView;
  private bytes: Uint8Array;

  constructor(buf: ArrayBuffer) {
    this.view = new DataView(buf);
    this.bytes = new Uint8Array(buf);
  }

  get done() {
    return this.offset >= this.bytes.length;
  }

  u8(): number {
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }

  u16(): number {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }

  u32(): number {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  str(): string {
    const len = this.u16();
    const s = new TextDecoder().decode(this.bytes.subarray(this.offset, this.offset + len));
    this.offset += len;
    return s;
  }
}
