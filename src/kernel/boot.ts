/**
 * ÇEKİRDEK AÇILIŞI
 * ------------------------------------------------------------------
 * Faz B: çekirdek sağlayıcısı artık arayüz bileşenlerinden değil tek
 * bir açılış modülünden kaydedilir. Rust/Wasm sağlayıcısı geldiğinde
 * yalnız bu dosya seçim yapar; kabuk ve uygulamalar değişmez.
 */

import "@/kernel/ts-provider";

export type KernelProviderId = "ts" | "wasm";

/** Bugün tek sağlayıcı TypeScript uygulamasıdır. */
export const activeKernelProvider: KernelProviderId = "ts";
