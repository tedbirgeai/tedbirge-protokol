import { describe, expect, it } from "vitest";

import { canInstall, packageFingerprint, packageTrust } from "@/apps/package";
import { parseTbApp } from "@/apps/tbapp";

const pkg = parseTbApp(
  JSON.stringify({
    id: "ornek.sayac",
    name: "Sayaç",
    version: "1.0.0",
    capabilities: ["status.read"],
    module: "/wasm/sayac.wasm",
  }),
);

describe("paket güveni", () => {
  it("parmak izi kararlıdır ve içerik değişince değişir", () => {
    const a = packageFingerprint(pkg);
    expect(a).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
    expect(packageFingerprint(pkg)).toBe(a);
    expect(packageFingerprint({ ...pkg, version: "1.0.1" })).not.toBe(a);
  });

  it("imzasız paket yalnız geliştirici modunda kurulur", () => {
    const t = packageTrust(pkg);
    expect(t.level).toBe("unsigned");
    expect(canInstall(t, false)).toBe(false);
    expect(canInstall(t, true)).toBe(true);
  });

  it("imzası tutmayan paket hiçbir modda kurulmaz", () => {
    const t = packageTrust({ ...pkg, spk: "AAAA", sig: "AAAA" });
    expect(t.level).toBe("broken");
    expect(canInstall(t, true)).toBe(false);
  });
});
