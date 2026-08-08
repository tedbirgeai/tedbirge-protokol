/**
 * TEDBİRGE OS — KABUK SAĞLAYICISI (Shell)
 * ------------------------------------------------------------------
 * Faz A sınırı: kabuk sekme/uygulama durumunu, yüzey (modal) yığınını
 * ve düğüm yaşam döngüsünü sahiplenir. Uygulamalar (Messenger, Aramalar,
 * Topluluklar, Siz) düğümün açık olduğunu varsayar; başlatma/durdurma
 * tek yerdedir. Görsel davranış değişmez.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { ShellAppId } from "@/shell/apps";
import type { SurfaceApi, SurfaceId } from "@/shell/surfaces";
import { bootNodeRuntime, useNodeRuntime } from "@/lib/node-runtime";
import type { BrowserNodeState } from "@/lib/browser-node";
import "@/kernel/boot";
import type { Kernel } from "@/kernel/contract";
import { grantKernel } from "@/kernel/capabilities";
import { capabilitiesOf } from "@/apps/registry";

export type ShellContextValue = {
  /** Etkin uygulama (sekme). */
  app: ShellAppId;
  setApp: (id: ShellAppId) => void;
  surfaces: SurfaceApi;
  /** Kabuk seviyesinde yönetilen düğüm durumu. */
  node: BrowserNodeState;
  /** Uygulamanın yetenekleriyle sınırlanmış çekirdek vekili. */
  kernelFor: (appId: string) => Kernel;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({
  children,
  initialApp = "chats",
}: {
  children: ReactNode;
  initialApp?: ShellAppId;
}) {
  const [app, setApp] = useState<ShellAppId>(initialApp);
  const [stack, setStack] = useState<SurfaceId[]>([]);
  const node = useNodeRuntime();

  // Düğüm yaşam döngüsü kabuğa aittir: uygulama bileşenleri başlatma
  // yapmaz, yalnızca durumu okur. Çağrı fikirdaştır (idempotent).
  useEffect(() => {
    bootNodeRuntime();
    // Faz C: daha önce yüklenmiş .tbapp paketleri kayda geri konur.
    void import("@/apps/tbapp").then((m) => m.restoreInstalledTbApps());
    // Sosyal akış ve dosya aktarımı gelen paketleri kabuk açılışında dinler.
    void import("@/lib/social/feed").then((m) => m.bootFeed());
    void import("@/lib/p2p/file-transfer").then((m) => m.bootFileTransfer());
    // Sıfır-pencere arama: mikrofon/kamera izni açılışta bir kez alınır,
    // arama anında tarayıcı izin penceresi çıkmaz.
    void import("@/lib/call/media-prewarm").then((m) => m.bootMediaPrewarm());
    // Rehber, kullanıcı hiçbir seçim yapmadan şifreli olarak eşitlenir.
    let stopSync: (() => void) | undefined;
    void import("@/lib/chat/directory").then((m) => {
      stopSync = m.startContactAutoSync();
    });
    return () => stopSync?.();
  }, []);

  const open = useCallback((id: SurfaceId) => {
    setStack((s) => (s.includes(id) ? s : [...s, id]));
  }, []);
  const close = useCallback((id: SurfaceId) => {
    setStack((s) => (s.includes(id) ? s.filter((x) => x !== id) : s));
  }, []);

  const surfaces = useMemo<SurfaceApi>(
    () => ({
      stack,
      isOpen: (id) => stack.includes(id),
      open,
      close,
      set: (id, value) => (value ? open(id) : close(id)),
      closeAll: () => setStack([]),
    }),
    [stack, open, close],
  );

  // Uygulama başına çekirdek vekili; aynı uygulama için tek örnek üretilir.
  const grants = useMemo(() => new Map<string, Kernel>(), []);
  const kernelFor = useCallback(
    (appId: string) => {
      const cached = grants.get(appId);
      if (cached) return cached;
      const k = grantKernel(appId, capabilitiesOf(appId));
      grants.set(appId, k);
      return k;
    },
    [grants],
  );

  const value = useMemo<ShellContextValue>(
    () => ({ app, setApp, surfaces, node, kernelFor }),
    [app, surfaces, node, kernelFor],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell yalnız <ShellProvider> içinde kullanılabilir.");
  return ctx;
}
