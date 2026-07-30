/**
 * Tek düğüm çalışma zamanı (singleton).
 * ------------------------------------------------------------------
 * Uygulamanın hangi sayfasında olursanız olun TEK bir tarayıcı düğümü
 * çalışır. Panel kartı, saha sayfası ve üstteki kalıcı dok aynı durumu
 * paylaşır; sayfa değiştirmek düğümü durdurmaz.
 */

import { useSyncExternalStore } from "react";
import { BrowserNode, getBrowserNodeId, type BrowserNodeState } from "@/lib/browser-node";

const AUTO_KEY = "tedbirge.browser-node.auto";
const GUIDE_KEY = "tedbirge.browser-node.guide-seen";

let node: BrowserNode | null = null;
let license: string | undefined;
let pingTimer: ReturnType<typeof setInterval> | null = null;

let snapshot: BrowserNodeState = {
  running: false,
  nodeId: "",
  online: true,
  peers: [],
  queued: 0,
  lastHeartbeatAt: null,
  lastRelayAt: null,
  rttMs: null,
  error: null,
  discovery: "none",
};

const listeners = new Set<() => void>();
function publish(next: BrowserNodeState) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export function setNodeLicense(key?: string) {
  if (key && key !== license) {
    license = key;
    if (node) {
      // Lisans geldiğinde düğümü aynı kimlikle yeniden bağla (kayıt kalıcı olsun).
      stopNode();
      void startNode();
    }
  }
}

export async function startNode() {
  if (node) return;
  node = new BrowserNode(license, publish);
  await node.start();
  try {
    window.localStorage.setItem(AUTO_KEY, "1");
  } catch {
    /* private mode */
  }
  if (!pingTimer) {
    pingTimer = setInterval(() => node?.pingPeers(), 15_000);
    setTimeout(() => node?.pingPeers(), 1_500);
  }
}

export function stopNode() {
  node?.stop();
  node = null;
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  try {
    window.localStorage.setItem(AUTO_KEY, "0");
  } catch {
    /* private mode */
  }
  publish({ ...snapshot, running: false, peers: [], rttMs: null, discovery: "none" });
}

export function pingNodePeers() {
  node?.pingPeers();
}

export function isAutoStartEnabled() {
  try {
    return window.localStorage.getItem(AUTO_KEY) === "1";
  } catch {
    return false;
  }
}

export function hasSeenGuide() {
  try {
    return window.localStorage.getItem(GUIDE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markGuideSeen() {
  try {
    window.localStorage.setItem(GUIDE_KEY, "1");
  } catch {
    /* private mode */
  }
}

/** Uygulama açılışında bir kez çağrılır: daha önce başlatıldıysa otonom devam eder. */
export function bootNodeRuntime() {
  snapshot = { ...snapshot, nodeId: getBrowserNodeId(), online: navigator.onLine };
  listeners.forEach((l) => l());
  if (isAutoStartEnabled()) void startNode();
}

export function useNodeRuntime() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}

export type NodeStatus = {
  tone: "off" | "linked" | "online" | "offline";
  text: string;
  directPeers: number;
  queued: number;
};

export function describeNode(s: BrowserNodeState): NodeStatus {
  const directPeers = s.peers.filter((p) => p.direct).length;
  const queued = s.queued;
  if (!s.running) return { tone: "off", text: "Düğüm kapalı", directPeers, queued };
  if (directPeers > 0) return { tone: "linked", text: `Bağlı · ${directPeers} eş`, directPeers, queued };
  if (s.online) return { tone: "online", text: "Çalışıyor · eş aranıyor", directPeers, queued };
  return { tone: "offline", text: `Çevrimdışı · kuyruk ${queued}`, directPeers, queued };
}

/**
 * QR yönlendirme testi: /saha adresi bu cihazdan gerçekten açılıyor mu?
 * QR okutulduğunda yanlış origin veya çevrimdışı önbellek eksikliği
 * yaşanırsa kullanıcıya net hata mesajı verilir.
 */
export async function testFieldRoute(origin: string): Promise<{ ok: boolean; message: string }> {
  const url = `${origin}/saha`;
  if (!/^https?:\/\//.test(origin)) {
    return { ok: false, message: "Adres geçersiz. Linki https:// ile başlayacak şekilde paylaşın." };
  }
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) {
      return {
        ok: false,
        message: `Saha sayfası açılmadı (HTTP ${res.status}). Yayınlanmış adresi kullanın: tedbirge-gateway.lovable.app/saha`,
      };
    }
    return { ok: true, message: `QR hedefi doğrulandı: ${url}` };
  } catch {
    return {
      ok: false,
      message: navigator.onLine
        ? "Saha sayfasına ulaşılamadı. Ağ engeli olabilir; linki tarayıcıya elle yapıştırıp deneyin."
        : "Cihaz çevrimdışı. Sayfa önbellekten açılır; QR paylaşımı için tekrar çevrimiçi olun.",
    };
  }
}
