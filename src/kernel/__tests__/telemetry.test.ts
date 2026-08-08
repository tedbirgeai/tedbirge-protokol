import { describe, expect, it, beforeEach } from "vitest";

import type { Kernel } from "@/kernel/contract";
import { instrument, kernelMetrics, kernelEvents, resetKernelTelemetry } from "@/kernel/telemetry";

function fakeKernel(sendResult: boolean | Error): Kernel {
  return {
    send: async () => {
      if (sendResult instanceof Error) throw sendResult;
      return sendResult;
    },
    subscribe: () => () => {},
    resolve: () => ["a"],
    route: () => ["me", "a"],
    identity: () => ({ nodeId: "me", personId: "p", fingerprint: "" }),
    status: () => ({ running: true, online: true, nodeId: "me", queued: 0, peers: 1 }),
  };
}

describe("kernel telemetry", () => {
  beforeEach(() => resetKernelTelemetry());

  it("başarılı gönderimi sayar", async () => {
    const k = instrument(fakeKernel(true));
    await k.send("chat", "a", {});
    expect(kernelMetrics().sent).toBe(1);
    expect(kernelMetrics().failed).toBe(0);
    expect(kernelEvents()[0]?.ok).toBe(true);
  });

  it("başarısız gönderimi ayırır", async () => {
    const k = instrument(fakeKernel(false));
    await k.send("chat", "a", {});
    expect(kernelMetrics().failed).toBe(1);
  });

  it("hatayı yutmaz ama kaydeder", async () => {
    const k = instrument(fakeKernel(new Error("kopuk")));
    await expect(k.send("chat", "a", {})).rejects.toThrow("kopuk");
    expect(kernelMetrics().lastError).toBe("kopuk");
  });

  it("rota çağrısını günlüğe yazar", () => {
    const k = instrument(fakeKernel(true));
    expect(k.route("a")).toEqual(["me", "a"]);
    expect(kernelEvents()[0]?.op).toBe("route");
  });
});
