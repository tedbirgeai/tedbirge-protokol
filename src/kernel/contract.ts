/**
 * KERNEL SÖZLEŞMESİ (ABI taslağı)
 * ------------------------------------------------------------------
 * Kabuğun çekirdekten beklediği asgari yüzey. Bugün tek sağlayıcı
 * TypeScript uygulamasıdır; Rust/Wasm çekirdeği aynı sözleşmeyi
 * doldurduğunda çağrı yerleri değişmeyecektir.
 */

import type { EnvelopeKind } from "@/lib/mesh-envelope";
import type { Priority } from "@/lib/store/idb";

export type KernelStatus = {
  running: boolean;
  online: boolean;
  nodeId: string;
  queued: number;
  peers: number;
};

export type KernelIdentity = {
  nodeId: string;
  personId: string;
  fingerprint: string;
};

export interface Kernel {
  /** Şifreli zarf gönderimi (uygulama katmanı). */
  send: (
    kind: EnvelopeKind,
    to: string | "*",
    payload: unknown,
    priority?: Priority,
  ) => Promise<boolean>;
  /** Gelen zarf akışına abone olur; abonelikten çıkma işlevi döner. */
  subscribe: (kind: EnvelopeKind, fn: (from: string, body: unknown) => void) => () => void;
  /** Bir kişi/cihaz için ulaşılabilir düğüm kimliklerini çözer. */
  resolve: () => string[];
  /** Hedefe giden en iyi yolu hesaplar (çok sekmeli yönlendirme). */
  route: (to: string) => string[];
  identity: () => KernelIdentity;
  status: () => KernelStatus;
}

let current: Kernel | null = null;

export function registerKernel(k: Kernel) {
  current = k;
}

export function kernel(): Kernel {
  if (!current) throw new Error("Kernel sağlayıcısı kayıtlı değil.");
  return current;
}
