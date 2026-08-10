/**
 * PAKET KİMLİĞİ, PARMAK İZİ VE İMZA (Faz D)
 * ------------------------------------------------------------------
 * Bir .tbapp paketi ağ üzerinden elden ele dolaşabildiği için,
 * kullanıcıya "bu paket yolda değişti mi?" sorusunun cevabı gösterilir.
 *
 * · Parmak izi: paketin içeriğinden üretilen kısa, okunabilir kod.
 *   Aynı paket her cihazda aynı kodu verir; tek bir karakter değişse
 *   kod tamamen değişir.
 * · İmza: paketi hazırlayan kişinin kimliğiyle atılmış onay. İmzasız
 *   paketler de çalışır (geliştirici modu kararı) ama arayüzde
 *   "doğrulanmadı" olarak işaretlenir ve ayrı bir onay ister.
 */

import { sha256 } from "@noble/hashes/sha2.js";

import { fingerprintOfKey, signBytes, verifyBytes } from "@/lib/crypto/identity";
import type { TbAppManifest } from "@/apps/tbapp";

export type SignedTbApp = TbAppManifest & {
  /** Paketi imzalayanın doğrulama anahtarı (base64). */
  spk?: string;
  /** İmza (base64). */
  sig?: string;
};

export type PackageTrust =
  | { level: "signed"; fingerprint: string; publisher: string }
  | { level: "unsigned"; fingerprint: string }
  | { level: "broken"; fingerprint: string };

/** İmza kapsamındaki alanlar — sıra sabittir, aksi halde imza tutmaz. */
function signingBytes(m: SignedTbApp): Uint8Array {
  const canonical = JSON.stringify([m.id, m.name, m.version, [...m.capabilities].sort(), m.module]);
  return new TextEncoder().encode(canonical);
}

/** İnsan tarafından okunabilir parmak izi: 4'erli 4 grup. */
export function packageFingerprint(m: TbAppManifest): string {
  const digest = sha256(signingBytes(m as SignedTbApp));
  const hex = Array.from(digest.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return hex.replace(/(.{4})(?=.)/g, "$1-");
}

/** Paketin güven durumu — arayüzde rozet olarak gösterilir. */
export function packageTrust(m: SignedTbApp): PackageTrust {
  const fingerprint = packageFingerprint(m);
  if (!m.spk || !m.sig) return { level: "unsigned", fingerprint };
  try {
    const ok = verifyBytes(m.spk, m.sig, signingBytes(m));
    return ok
      ? { level: "signed", fingerprint, publisher: fingerprintOfKey(m.spk) }
      : { level: "broken", fingerprint };
  } catch {
    return { level: "broken", fingerprint };
  }
}

export const TRUST_LABELS: Record<PackageTrust["level"], { title: string; detail: string }> = {
  signed: {
    title: "Doğrulanmış paket",
    detail: "Paket, hazırlayan kişinin kimliğiyle onaylanmış ve yolda değişmemiş.",
  },
  unsigned: {
    title: "İmzasız paket",
    detail: "Paketi kimin hazırladığı doğrulanamıyor. Yalnız güvendiğiniz kaynaklardan yükleyin.",
  },
  broken: {
    title: "Paket bozulmuş",
    detail: "Paketin onayı içeriğiyle uyuşmuyor; yolda değişmiş olabilir. Yüklenmesi önerilmez.",
  },
};

/** Kendi kimliğinizle paket imzalar (geliştirici akışı). */
export async function signPackage(
  nodeId: string,
  m: TbAppManifest,
  spkB64: string,
): Promise<SignedTbApp> {
  const sig = await signBytes(nodeId, signingBytes(m as SignedTbApp));
  return { ...m, spk: spkB64, sig };
}

/* --------------------------- geliştirici modu --------------------------- */

const DEV_KEY = "tedbirge.shell.devmode";

/** Geliştirici modu kapalıyken imzasız/bozuk paketler yüklenmez. */
export function isDeveloperMode(): boolean {
  try {
    return window.localStorage.getItem(DEV_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDeveloperMode(on: boolean) {
  try {
    window.localStorage.setItem(DEV_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

/** Yükleme izni kuralı: bozuk paket asla, imzasız paket yalnız geliştirici modunda. */
export function canInstall(trust: PackageTrust, devMode = isDeveloperMode()): boolean {
  if (trust.level === "signed") return true;
  if (trust.level === "broken") return false;
  return devMode;
}
