/**
 * ÇEKİRDEK TELEMETRİSİ (yerel)
 * ------------------------------------------------------------------
 * Faz E: çekirdek çağrıları ölçülebilir hale gelir. Veri yalnız
 * cihazda tutulur, hiçbir yere gönderilmez. Amaç: hangi sağlayıcının
 * (TS / Wasm) çalıştığını, gönderim başarımını ve gecikmeyi görmek.
 */

import type { Kernel } from "@/kernel/contract";

export type KernelEvent = {
  at: number;
  op: "send" | "route" | "error";
  detail: string;
  ok: boolean;
  ms: number;
};

export type KernelMetrics = {
  sent: number;
  failed: number;
  avgSendMs: number;
  lastError: string | null;
};

const MAX_EVENTS = 100;
const events: KernelEvent[] = [];
let sent = 0;
let failed = 0;
let totalMs = 0;
let lastError: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function push(e: KernelEvent) {
  events.unshift(e);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  emit();
}

export function onKernelTelemetry(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function kernelEvents(): readonly KernelEvent[] {
  return events;
}

export function kernelMetrics(): KernelMetrics {
  return {
    sent,
    failed,
    avgSendMs: sent + failed === 0 ? 0 : Math.round(totalMs / (sent + failed)),
    lastError,
  };
}

export function resetKernelTelemetry() {
  events.length = 0;
  sent = 0;
  failed = 0;
  totalMs = 0;
  lastError = null;
  emit();
}

const now = () => (typeof performance === "undefined" ? Date.now() : performance.now());

/** Sözleşmeyi bozmadan çekirdeği ölçüm sarmalayıcısıyla kaplar. */
export function instrument(k: Kernel): Kernel {
  return {
    ...k,
    send: async (kind, to, payload, priority) => {
      const t0 = now();
      try {
        const ok = await k.send(kind, to, payload, priority);
        const ms = Math.round(now() - t0);
        totalMs += ms;
        if (ok) sent += 1;
        else failed += 1;
        push({ at: Date.now(), op: "send", detail: `${kind} → ${to}`, ok, ms });
        return ok;
      } catch (err) {
        const ms = Math.round(now() - t0);
        totalMs += ms;
        failed += 1;
        lastError = err instanceof Error ? err.message : String(err);
        push({ at: Date.now(), op: "error", detail: `${kind} → ${to}`, ok: false, ms });
        throw err;
      }
    },
    route: (to) => {
      const t0 = now();
      const path = k.route(to);
      push({
        at: Date.now(),
        op: "route",
        detail: `${to} (${path.length} sekme)`,
        ok: path.length > 0,
        ms: Math.round(now() - t0),
      });
      return path;
    },
  };
}
