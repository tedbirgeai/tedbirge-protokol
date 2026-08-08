/**
 * YETENEK KAPISI (Capabilities)
 * ------------------------------------------------------------------
 * Faz B: kabuk üzerinde çalışan her uygulama çekirdeğe doğrudan değil,
 * kendi yetenek listesiyle sınırlanmış bir vekil (proxy) üzerinden
 * erişir. Bugün yerleşik uygulamalar tüm yetenekleri alır; yarın Wasm
 * uygulamaları yalnız bildirdikleri yeteneklerle çalışır.
 *
 * Davranış değişmez: yetenek verilmişse çağrı birebir çekirdeğe iner.
 */

import { kernel, type Kernel } from "@/kernel/contract";

export type Capability =
  /** Şifreli zarf gönderebilir. */
  | "mesh.send"
  /** Gelen zarfları dinleyebilir. */
  | "mesh.receive"
  /** Komşu düğümleri ve rotayı sorgulayabilir. */
  | "mesh.route"
  /** Kimlik özetini okuyabilir (özel anahtar asla verilmez). */
  | "identity.read"
  /** Düğüm durumunu okuyabilir. */
  | "status.read";

export const ALL_CAPABILITIES: Capability[] = [
  "mesh.send",
  "mesh.receive",
  "mesh.route",
  "identity.read",
  "status.read",
];

export class CapabilityError extends Error {
  constructor(appId: string, cap: Capability) {
    super(`"${appId}" uygulamasının "${cap}" yetkisi yok.`);
    this.name = "CapabilityError";
  }
}

/**
 * Uygulamaya özel çekirdek vekili. Yetkisiz çağrı sessizce yutulmaz;
 * geliştirme sırasında görünür olması için hata fırlatır.
 */
export function grantKernel(appId: string, caps: readonly Capability[]): Kernel {
  const has = (c: Capability) => caps.includes(c);
  const need = (c: Capability) => {
    if (!has(c)) throw new CapabilityError(appId, c);
  };
  return {
    send: (kind, to, payload, priority) => {
      need("mesh.send");
      return kernel().send(kind, to, payload, priority);
    },
    subscribe: (kind, fn) => {
      need("mesh.receive");
      return kernel().subscribe(kind, fn);
    },
    resolve: () => {
      need("mesh.route");
      return kernel().resolve();
    },
    route: (to) => {
      need("mesh.route");
      return kernel().route(to);
    },
    identity: () => {
      need("identity.read");
      return kernel().identity();
    },
    status: () => {
      need("status.read");
      return kernel().status();
    },
  };
}
