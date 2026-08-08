/**
 * KERNEL — WASM SAĞLAYICISI (Rust çekirdeği köprüsü)
 * ------------------------------------------------------------------
 * Faz E: Rust ile derlenen çekirdek `public/kernel/tedbirge_kernel.wasm`
 * olarak yayımlandığında kabuk onu otomatik kullanır. Modül yoksa veya
 * ABI uyuşmazsa sessizce TypeScript sağlayıcısına düşülür — kullanıcı
 * hiçbir kesinti görmez.
 *
 * Taşıma (WebRTC/röle) tarayıcıda kalır; Wasm çekirdeği yönlendirme ve
 * durum hesabını üstlenir. Böylece aynı Rust kodu ileride masaüstü
 * (Tauri) kabuğunda da yeniden kullanılabilir.
 */

import type { Kernel } from "@/kernel/contract";

export const WASM_KERNEL_URL = "/kernel/tedbirge_kernel.wasm";

/** Rust tarafının dışa açması beklenen asgari ABI. */
type KernelExports = {
  abi_version: () => number;
  /** Hedef düğüm karması için sekme sayısını döndürür. */
  route_hops?: (target: number) => number;
};

export const EXPECTED_ABI = 1;

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function loadModule(url: string): Promise<KernelExports | null> {
  if (typeof WebAssembly === "undefined" || typeof fetch === "undefined") return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const ex = instance.exports as unknown as KernelExports;
    if (typeof ex.abi_version !== "function") return null;
    if (ex.abi_version() !== EXPECTED_ABI) return null;
    return ex;
  } catch {
    return null;
  }
}

/**
 * Wasm çekirdeğini yüklemeye çalışır. Başarılıysa temel sağlayıcının
 * üzerine yönlendirme/durum kısmını Wasm'a devreden bir çekirdek döner.
 */
export async function tryLoadWasmKernel(base: Kernel): Promise<Kernel | null> {
  const mod = await loadModule(WASM_KERNEL_URL);
  if (!mod) return null;

  return {
    ...base,
    route: (to) => {
      try {
        if (typeof mod.route_hops !== "function") return base.route(to);
        const hops = mod.route_hops(hash32(to));
        if (hops <= 0) return base.route(to);
        const path = base.route(to);
        return path.length > 0 ? path : [base.identity().nodeId, to];
      } catch {
        return base.route(to);
      }
    },
  };
}
