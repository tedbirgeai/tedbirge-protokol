/**
 * .tbapp YÜKLEYİCİ (Wasm uygulama paketi)
 * ------------------------------------------------------------------
 * Faz C: kabuk, dışarıdan gelen bir uygulama paketini okur, bildirdiği
 * yetenekleri kullanıcıya sorar ve onaylandıysa Wasm modülünü yalnız o
 * yeteneklerle sınırlı bir çekirdek vekiliyle çalıştırır.
 *
 * Paket biçimi (JSON, uzantı .tbapp):
 * {
 *   "id": "ornek.sayac",
 *   "name": "Sayaç",
 *   "version": "1.0.0",
 *   "capabilities": ["status.read"],
 *   "module": "data:application/wasm;base64,..."   // veya "/wasm/x.wasm"
 * }
 *
 * İmzasız paketler çalışır (geliştirici modu kararı), ancak yetenek
 * onayı zorunludur ve her paket kendi sanal kutusundadır.
 */

import { ALL_CAPABILITIES, type Capability } from "@/kernel/capabilities";
import { grantKernel } from "@/kernel/capabilities";
import type { Kernel } from "@/kernel/contract";
import { registerApp, type AppManifest } from "@/apps/registry";

export type TbAppManifest = {
  id: string;
  name: string;
  version: string;
  capabilities: Capability[];
  module: string;
  description?: string;
  /** Faz D: paketi imzalayanın doğrulama anahtarı (varsa). */
  spk?: string;
  /** Faz D: paket imzası (varsa). */
  sig?: string;
};

export class TbAppError extends Error {}

/** Paket metnini doğrular; hatalar sade Türkçe anlatılır. */
export function parseTbApp(text: string): TbAppManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new TbAppError("Paket okunamadı: geçerli bir .tbapp dosyası değil.");
  }
  const m = raw as Partial<TbAppManifest>;
  if (!m || typeof m.id !== "string" || !/^[a-z0-9][a-z0-9.\-_]{2,63}$/i.test(m.id))
    throw new TbAppError("Paket kimliği geçersiz.");
  if (typeof m.name !== "string" || !m.name.trim()) throw new TbAppError("Paket adı eksik.");
  if (typeof m.version !== "string" || !m.version.trim())
    throw new TbAppError("Paket sürümü eksik.");
  if (typeof m.module !== "string" || !m.module.trim())
    throw new TbAppError("Paket içinde çalıştırılacak modül yok.");
  const caps = Array.isArray(m.capabilities) ? m.capabilities : [];
  const unknown = caps.filter((c) => !ALL_CAPABILITIES.includes(c as Capability));
  if (unknown.length) throw new TbAppError(`Tanınmayan yetki isteği: ${unknown.join(", ")}`);
  return {
    id: m.id,
    name: m.name.trim(),
    version: m.version.trim(),
    capabilities: caps as Capability[],
    module: m.module,
    ...(m.description ? { description: String(m.description) } : {}),
    ...(typeof m.spk === "string" ? { spk: m.spk } : {}),
    ...(typeof m.sig === "string" ? { sig: m.sig } : {}),
  };
}

export async function readTbAppFile(file: File): Promise<TbAppManifest> {
  return parseTbApp(await file.text());
}

/** Yüklenen paketleri cihazda saklar (yalnız manifest; kod yeniden indirilir). */
const STORE_KEY = "tedbirge.shell.tbapps";

export function installedTbApps(): TbAppManifest[] {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as TbAppManifest[]) : [];
  } catch {
    return [];
  }
}

function persist(list: TbAppManifest[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}

export function installTbApp(m: TbAppManifest) {
  const list = installedTbApps().filter((x) => x.id !== m.id);
  list.push(m);
  persist(list);
  registerApp(toShellApp(m, list.length));
}

export function uninstallTbApp(id: string) {
  persist(installedTbApps().filter((x) => x.id !== id));
}

function toShellApp(m: TbAppManifest, order: number): AppManifest {
  return {
    id: m.id,
    label: m.name,
    mobileOrder: 100 + order,
    railOrder: null,
    kind: "wasm",
    capabilities: m.capabilities,
    moduleUrl: m.module,
  };
}

/** Açılışta daha önce yüklenmiş paketleri kayda geri koyar. */
export function restoreInstalledTbApps() {
  installedTbApps().forEach((m, i) => registerApp(toShellApp(m, i)));
}

export type TbAppInstance = {
  manifest: TbAppManifest;
  exports: WebAssembly.Exports;
  dispose: () => void;
};

/**
 * Modülü, yalnız onaylanmış yeteneklerle sınırlı bir köprüyle başlatır.
 * Wasm tarafına verilen tek yüzey `tedbirge` içe aktarma nesnesidir;
 * doğrudan DOM, ağ veya depolama erişimi yoktur.
 */
export async function instantiateTbApp(
  m: TbAppManifest,
  granted: readonly Capability[],
): Promise<TbAppInstance> {
  const kernel: Kernel = grantKernel(m.id, granted);
  const res = await fetch(m.module);
  if (!res.ok) throw new TbAppError(`Modül indirilemedi (HTTP ${res.status}).`);
  const bytes = await res.arrayBuffer();

  const host = {
    status_online: () => (kernel.status().online ? 1 : 0),
    status_peers: () => kernel.status().peers,
    log: (_ptr: number, _len: number) => {
      /* ayrılmış: paket günlüğü ileride kabuk konsoluna bağlanır */
    },
  };

  const { instance } = await WebAssembly.instantiate(bytes, { tedbirge: host });
  let disposed = false;
  return {
    manifest: m,
    exports: instance.exports,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      const stop = instance.exports["stop"];
      if (typeof stop === "function") (stop as () => void)();
    },
  };
}
