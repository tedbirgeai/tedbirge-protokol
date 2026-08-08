/**
 * ÇEKİRDEK DENETLEYİCİSİ (Supervisor) — Faz F
 * ------------------------------------------------------------------
 * Faz E ile çekirdek değiştirilebilir hale geldi; Faz F onu dayanıklı
 * yapar. Amaç: geçici kopmalarda kullanıcıya hata göstermek yerine
 * sessizce yeniden denemek, ısrarlı arızada sağlıklı sağlayıcıya
 * dönmek ve durumu okunur biçimde bildirmek.
 *
 * Kurallar:
 *  - Gönderim başarısız olursa artan bekleme ile en çok 3 kez denenir.
 *  - Arka arkaya 3 başarısız gönderim "arızalı" sayılır ve bir kez
 *    kurtarma çağrısı yapılır (bkz. boot.ts: hızlandırılmış çekirdekten
 *    standart çekirdeğe iniş).
 *  - Denetleyici hiçbir veriyi dışarı göndermez; her şey cihazda kalır.
 */

import type { Kernel } from "@/kernel/contract";

export type KernelHealth = "healthy" | "recovering" | "degraded";

export type SupervisorState = {
  health: KernelHealth;
  /** Arka arkaya başarısız gönderim sayısı. */
  consecutiveFailures: number;
  /** Toplam yeniden deneme sayısı. */
  retries: number;
  /** Son kurtarma zamanı (ms). */
  lastRecoveryAt: number | null;
};

const FAIL_THRESHOLD = 3;
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 200;

let state: SupervisorState = {
  health: "healthy",
  consecutiveFailures: 0,
  retries: 0,
  lastRecoveryAt: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function onKernelHealth(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function kernelHealth(): SupervisorState {
  return state;
}

export function resetKernelHealth() {
  state = { health: "healthy", consecutiveFailures: 0, retries: 0, lastRecoveryAt: null };
  emit();
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export type SuperviseOptions = {
  /** Israrlı arıza durumunda çağrılır (örn. sağlayıcı düşürme). */
  onDegraded?: () => void;
  /** Testlerde beklemeyi kısaltmak için. */
  delayMs?: number;
};

function markSuccess() {
  const wasBad = state.consecutiveFailures > 0;
  state = {
    ...state,
    health: "healthy",
    consecutiveFailures: 0,
    lastRecoveryAt: wasBad ? Date.now() : state.lastRecoveryAt,
  };
  emit();
}

function markFailure(onDegraded?: () => void) {
  const n = state.consecutiveFailures + 1;
  const health: KernelHealth = n >= FAIL_THRESHOLD ? "degraded" : "recovering";
  const becameDegraded = health === "degraded" && state.health !== "degraded";
  state = { ...state, consecutiveFailures: n, health };
  emit();
  if (becameDegraded) onDegraded?.();
}

/**
 * Sözleşmeyi bozmadan çekirdeği dayanıklılık katmanıyla kaplar.
 * Dönüş değeri yine bir `Kernel`; çağrı yerleri değişmez.
 */
export function supervise(k: Kernel, opts: SuperviseOptions = {}): Kernel {
  const base = opts.delayMs ?? BASE_DELAY_MS;
  return {
    ...k,
    send: async (kind, to, payload, priority) => {
      let lastErr: unknown = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const ok = await k.send(kind, to, payload, priority);
          if (ok) {
            markSuccess();
            return true;
          }
        } catch (err) {
          lastErr = err;
        }
        if (attempt < MAX_ATTEMPTS) {
          state = { ...state, retries: state.retries + 1 };
          await wait(base * attempt);
        }
      }
      markFailure(opts.onDegraded);
      if (lastErr) throw lastErr;
      return false;
    },
    route: (to) => {
      try {
        return k.route(to);
      } catch {
        // Yönlendirme hesabı çökerse kullanıcı arayüzü durmaz: boş yol
        // dönerek üst katmanın bulut rölesine düşmesine izin verilir.
        markFailure(opts.onDegraded);
        return [];
      }
    },
  };
}
