/**
 * SEKMELER ARASI LİDER SEÇİMİ
 * ------------------------------------------------------------------
 * Aynı tarayıcıda birden fazla Tedbirge sekmesi açıkken röle/LAN
 * bağlantısının tek sekmeden kurulmasını sağlar. Lider sekme kapanınca
 * kalan sekmelerden biri saniyeler içinde devralır.
 *
 * Yöntem: BroadcastChannel üzerinden periyodik "canlıyım" duyurusu;
 * en küçük (en eski) sekme kimliği lider olur.
 */

const CHANNEL = "tedbirge-leader";
const BEAT_MS = 1_500;
const STALE_MS = 4_500;

const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let channel: BroadcastChannel | null = null;
let peers = new Map<string, number>();
let leader = true;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(isLeader: boolean) => void>();

function evaluate() {
  const now = Date.now();
  for (const [id, ts] of peers) if (now - ts > STALE_MS) peers.delete(id);
  const ids = [...peers.keys(), tabId].sort();
  const next = ids[0] === tabId;
  if (next !== leader) {
    leader = next;
    listeners.forEach((l) => l(leader));
  }
}

export function bootLeader(): void {
  if (typeof window === "undefined" || channel) return;
  if (typeof BroadcastChannel === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (ev: MessageEvent<{ id?: string; bye?: boolean }>) => {
    const id = ev.data?.id;
    if (!id || id === tabId) return;
    if (ev.data?.bye) peers.delete(id);
    else peers.set(id, Date.now());
    evaluate();
  };
  const beat = () => {
    channel?.postMessage({ id: tabId });
    evaluate();
  };
  beat();
  timer = setInterval(beat, BEAT_MS);
  window.addEventListener("pagehide", () => {
    channel?.postMessage({ id: tabId, bye: true });
    if (timer) clearInterval(timer);
  });
}

/** Bu sekme ağ bağlantısını yönetmekle görevli mi? */
export function isLeaderTab(): boolean {
  return leader;
}

export function onLeaderChange(fn: (isLeader: boolean) => void): () => void {
  listeners.add(fn);
  fn(leader);
  return () => listeners.delete(fn);
}

/** Açık başka sekme var mı? (IndexedDB sürüm çakışması uyarısı için.) */
export function otherTabsOpen(): boolean {
  const now = Date.now();
  return [...peers.values()].some((ts) => now - ts < STALE_MS);
}

export function leaderTabId(): string {
  return tabId;
}
