/**
 * UYGULAMA ÇALIŞMA ZAMANI KAYDI (App Runtime Registry)
 * ------------------------------------------------------------------
 * Faz B: kabuk artık "sekme" değil "uygulama" çalıştırır. Her uygulama
 * kimliğini, türünü (yerleşik / Wasm) ve istediği yetenekleri bildirir.
 * Yerleşik uygulamalar bugünkü panellerdir; Wasm uygulamaları ileride
 * aynı kayda eklenir, kabuk kodu değişmez.
 */

import { SHELL_APPS, type ShellApp, type ShellAppId } from "@/shell/apps";
import type { Capability } from "@/kernel/capabilities";

export type AppKind = "builtin" | "wasm";

export type AppManifest = ShellApp & {
  kind: AppKind;
  /** Uygulamanın çekirdekten istediği yetenekler. */
  capabilities: Capability[];
  /** Wasm uygulamaları için modül adresi (yerleşiklerde yoktur). */
  moduleUrl?: string;
};

const CAPS: Record<ShellAppId, Capability[]> = {
  chats: ["mesh.send", "mesh.receive", "mesh.route", "identity.read", "status.read"],
  calls: ["mesh.send", "mesh.receive", "mesh.route", "identity.read", "status.read"],
  communities: ["mesh.send", "mesh.receive", "identity.read", "status.read"],
  me: ["identity.read", "status.read"],
};

const registry = new Map<string, AppManifest>(
  SHELL_APPS.map((a) => [a.id, { ...a, kind: "builtin" as const, capabilities: CAPS[a.id] }]),
);

export function listApps(): AppManifest[] {
  return [...registry.values()];
}

export function getApp(id: string): AppManifest | undefined {
  return registry.get(id);
}

export function capabilitiesOf(id: string): Capability[] {
  return registry.get(id)?.capabilities ?? [];
}

/** İleride Wasm uygulamaları bu kapıdan eklenir. */
export function registerApp(app: AppManifest) {
  registry.set(app.id, app);
}
