/**
 * KÜRESEL PWA KURULUM DEPOSU
 * ------------------------------------------------------------------
 * Tarayıcı `beforeinstallprompt` olayını sayfa açılır açılmaz bir kez
 * yayınlar. Bu olay modül yüklenir yüklenmez yakalanır ve saklanır;
 * böylece "Uygulamayı Yükle" düğmesi daha sonra monte olsa bile
 * tek tıkla yerel kurulum penceresi açılabilir.
 */
import { useEffect, useState } from "react";

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Snapshot = { canInstall: boolean; installed: boolean };

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || iosStandalone);
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPadOs = /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOs;
}

export function isPublishedOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    window.location.protocol === "https:" &&
    !host.startsWith("id-preview--") &&
    !host.startsWith("preview--") &&
    !host.endsWith(".lovableproject.com") &&
    window.self === window.top
  );
}

if (typeof window !== "undefined") {
  installed = isStandaloneDisplay();
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

/** Yerel kurulum penceresini açar. Desteklenmiyorsa false döner. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const evt = deferred;
  if (!evt) return "unavailable";
  deferred = null;
  emit();
  await evt.prompt();
  const choice = await evt.userChoice;
  if (choice.outcome === "accepted") {
    installed = true;
    emit();
  }
  return choice.outcome;
}

/** Bileşenlerin kurulum durumunu izlemesi için abonelik kancası. */
export function useInstallState(): Snapshot & { ios: boolean } {
  const [snap, setSnap] = useState<Snapshot>({ canInstall: false, installed: false });
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const sync = () => setSnap({ canInstall: Boolean(deferred), installed });
    listeners.add(sync);
    sync();
    setIos(isIosDevice());
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return { ...snap, ios };
}
