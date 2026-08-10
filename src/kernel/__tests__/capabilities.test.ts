import { describe, expect, it } from "vitest";

import { registerKernel, type Kernel } from "@/kernel/contract";
import { CapabilityError, grantKernel } from "@/kernel/capabilities";
import { capabilitiesOf, listApps } from "@/apps/registry";

const fake: Kernel = {
  send: async () => true,
  subscribe: () => () => {},
  resolve: () => ["n1"],
  route: () => ["n0", "n1"],
  identity: () => ({ nodeId: "n0", personId: "p0", fingerprint: "" }),
  status: () => ({ running: true, online: true, nodeId: "n0", queued: 0, peers: 1 }),
};

registerKernel(fake);

describe("yetenek kapısı", () => {
  it("yetkili çağrı çekirdeğe iner", async () => {
    const k = grantKernel("chats", capabilitiesOf("chats"));
    await expect(k.send("chat", "*", {})).resolves.toBe(true);
    expect(k.resolve()).toEqual(["n1"]);
  });

  it("yetkisiz çağrı hata verir", () => {
    const k = grantKernel("me", capabilitiesOf("me"));
    expect(() => k.resolve()).toThrow(CapabilityError);
    expect(k.identity().nodeId).toBe("n0");
  });

  it("tüm yerleşik uygulamalar kayıtlıdır", () => {
    expect(
      listApps()
        .map((a) => a.id)
        .sort(),
    ).toEqual(["calls", "chats", "communities", "feed", "me"]);
    expect(listApps().every((a) => a.kind === "builtin")).toBe(true);
  });
});
