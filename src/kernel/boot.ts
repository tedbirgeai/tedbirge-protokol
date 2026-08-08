/**
 * ÇEKİRDEK AÇILIŞI
 * ------------------------------------------------------------------
 * Faz E: sağlayıcı seçimi tek noktadan yapılır.
 *   1) TypeScript çekirdeği daima hazır kaydedilir (kesintisizlik).
 *   2) Kullanıcı tercihi "wasm" ise Rust/Wasm modülü arka planda
 *      yüklenir; başarılıysa canlı olarak devralır.
 *   3) Yükleme başarısızsa TS çekirdeğinde kalınır, hata gösterilmez.
 * Tüm çağrılar yerel telemetri sarmalayıcısından geçer.
 */

import { registerKernel } from "@/kernel/contract";
import { instrument } from "@/kernel/telemetry";
import { supervise } from "@/kernel/supervisor";
import { tsKernel } from "@/kernel/ts-provider";
import { tryLoadWasmKernel } from "@/kernel/wasm-provider";

export type KernelProviderId = "ts" | "wasm";

const PREF_KEY = "tbg.kernel.provider";

let active: KernelProviderId = "ts";
const listeners = new Set<() => void>();

export function activeKernelProvider(): KernelProviderId {
  return active;
}

export function onKernelProviderChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function preferredKernelProvider(): KernelProviderId {
  if (typeof localStorage === "undefined") return "ts";
  return localStorage.getItem(PREF_KEY) === "wasm" ? "wasm" : "ts";
}

function setActive(id: KernelProviderId) {
  active = id;
  for (const fn of listeners) fn();
}

/** Tercihi kaydeder ve seçimi hemen uygular. */
export async function setPreferredKernelProvider(id: KernelProviderId) {
  if (typeof localStorage !== "undefined") localStorage.setItem(PREF_KEY, id);
  await bootKernel(id);
}

let booting: Promise<KernelProviderId> | null = null;

/** Çekirdeği kurar; hangi sağlayıcının canlı olduğunu döndürür. */
export async function bootKernel(
  pref: KernelProviderId = preferredKernelProvider(),
): Promise<KernelProviderId> {
  registerKernel(instrument(tsKernel));
  setActive("ts");
  if (pref !== "wasm") return "ts";

  booting = (async () => {
    const wasm = await tryLoadWasmKernel(tsKernel);
    if (wasm) {
      registerKernel(instrument(wasm));
      setActive("wasm");
      return "wasm" as const;
    }
    return "ts" as const;
  })();
  return booting;
}

// Kabuk bu modülü içe aktardığında çekirdek kendiliğinden açılır.
void bootKernel();
