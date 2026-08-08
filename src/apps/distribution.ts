/**
 * P2P UYGULAMA DAĞITIMI (Faz D)
 * ------------------------------------------------------------------
 * Bir .tbapp paketi mağaza olmadan, düğümden düğüme paylaşılır.
 * Paket bir zarf olarak gönderilir; alan cihazda hiçbir şey kendiliğinden
 * kurulmaz — kullanıcıya parmak izi, imza durumu ve istenen yetkiler
 * gösterilir, onay verilmezse paket silinir.
 *
 * Röle kapalıyken cihaz yabancı paket taşımaz (bkz. shell/relay.ts).
 */

import { kernel } from "@/kernel/contract";
import type { SignedTbApp } from "@/apps/package";
import { packageTrust, type PackageTrust } from "@/apps/package";
import { parseTbApp } from "@/apps/tbapp";

export type AppOffer = {
  from: string;
  pkg: SignedTbApp;
  trust: PackageTrust;
};

const MAX_PACKAGE_BYTES = 512 * 1024;

/** Paketi bir kişiye ya da yakındaki tüm düğümlere gönderir. */
export async function shareTbApp(pkg: SignedTbApp, to: string | "*" = "*"): Promise<boolean> {
  const text = JSON.stringify(pkg);
  if (text.length > MAX_PACKAGE_BYTES) {
    throw new Error("Paket paylaşım için fazla büyük (en çok 512 KB).");
  }
  return kernel().send("app", to, { kind: "offer", pkg: text });
}

/**
 * Gelen paket tekliflerini dinler. Doğrulanamayan veya biçimi bozuk
 * gövdeler sessizce atılır; kullanıcıya yalnız okunabilir teklifler
 * gösterilir.
 */
export function onAppOffer(fn: (offer: AppOffer) => void): () => void {
  return kernel().subscribe("app", (from, body) => {
    const b = body as { kind?: string; pkg?: string } | null;
    if (!b || b.kind !== "offer" || typeof b.pkg !== "string") return;
    if (b.pkg.length > MAX_PACKAGE_BYTES) return;
    let pkg: SignedTbApp;
    try {
      const base = parseTbApp(b.pkg);
      const raw = JSON.parse(b.pkg) as { spk?: string; sig?: string };
      pkg = {
        ...base,
        ...(raw.spk ? { spk: raw.spk } : {}),
        ...(raw.sig ? { sig: raw.sig } : {}),
      };
    } catch {
      return;
    }
    fn({ from, pkg, trust: packageTrust(pkg) });
  });
}
