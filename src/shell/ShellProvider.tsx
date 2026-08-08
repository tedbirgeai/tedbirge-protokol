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

  const value = useMemo<ShellContextValue>(
    () => ({ app, setApp, surfaces, node }),
    [app, surfaces, node],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell yalnız <ShellProvider> içinde kullanılabilir.");
  return ctx;
}
