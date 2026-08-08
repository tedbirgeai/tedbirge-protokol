import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Kernel } from "@/kernel/contract";
import { supervise, kernelHealth, resetKernelHealth } from "@/kernel/supervisor";

function makeKernel(send: Kernel["send"], route?: Kernel["route"]): Kernel {
  return {
    send,
    subscribe: () => () => {},
    resolve: () => ["a"],
    route: route ?? (() => ["me", "a"]),
    identity: () => ({ nodeId: "me", personId: "p", fingerprint: "" }),
    status: () => ({ running: true, online: true, nodeId: "me", queued: 0, peers: 1 }),
  };
}

describe("kernel supervisor", () => {
  beforeEach(() => resetKernelHealth());

  it("geçici hatada yeniden dener ve başarıya ulaşır", async () => {
    let n = 0;
    const k = supervise(
      makeKernel(async () => {
        n += 1;
        return n >= 2;
      }),
      { delayMs: 0 },
    );
    await expect(k.send("chat", "a", {})).resolves.toBe(true);
    expect(n).toBe(2);
    expect(kernelHealth().health).toBe("healthy");
    expect(kernelHealth().retries).toBeGreaterThan(0);
  });

  it("ısrarlı arızada sağlığı düşürür ve kurtarmayı tetikler", async () => {
    const onDegraded = vi.fn();
    const k = supervise(
      makeKernel(async () => false),
      { delayMs: 0, onDegraded },
    );
    await k.send("chat", "a", {});
    await k.send("chat", "a", {});
    expect(kernelHealth().health).toBe("recovering");
    await k.send("chat", "a", {});
    expect(kernelHealth().health).toBe("degraded");
    expect(onDegraded).toHaveBeenCalledTimes(1);
  });

  it("başarılı gönderim sayacı sıfırlar", async () => {
    let fail = true;
    const k = supervise(
      makeKernel(async () => !fail),
      { delayMs: 0 },
    );
    await k.send("chat", "a", {});
    fail = false;
    await k.send("chat", "a", {});
    expect(kernelHealth().consecutiveFailures).toBe(0);
    expect(kernelHealth().lastRecoveryAt).not.toBeNull();
  });

  it("rota hesabı çökerse boş yol döner", () => {
    const k = supervise(
      makeKernel(async () => true, () => {
        throw new Error("çöktü");
      }),
      { delayMs: 0 },
    );
    expect(k.route("a")).toEqual([]);
  });
});
