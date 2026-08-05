/**
 * KİMLİK GÖÇÜ, BİRLEŞTİRME VE TEMİZLİK
 * ------------------------------------------------------------------
 * Kimlik çıpası cihazdan GSM numarasına taşındığında:
 *  1) Eski cihaz tabanlı kimliğe yazılmış yerel kayıtlar (takma ad,
 *     sessize alma, taslak) yeni kişi kimliğine TAŞINIR — silinmez.
 *  2) Aynı kişiye ait birden çok düğüm tek kişi kartında birleşir.
 *  3) Adı çözülemeyen, mesajsız ve 30 günden eski hayalet kayıtlar
 *     budanır; "Kayıtsız kişi" hiçbir listede kalmaz.
 *
 * Tüm işlemler yalnızca bu cihazda çalışır; ağa hiçbir şey gitmez.
 */
import {
  deletePeer,
  deleteTrustedNode,
  listAllMessages,
  listTrustedNodes,
  putTrustedNode,
} from "@/lib/store/idb";

const MAPS = [
  "tedbirge.chat.nicknames",
  "tedbirge.chat.aliases",
  "tedbirge.chat.mute",
  "tedbirge.chat.drafts",
];

const MIGRATED_KEY = "tedbirge.identity.migrated";
const GHOST_MAX_AGE_MS = 30 * 24 * 3_600_000;

function readMap(key: string): Record<string, unknown> {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, unknown>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* gizli mod */
  }
}

/**
 * Eski kimlik anahtarlarını yeni kişi kimliğine taşır. Tek yönlüdür ve
 * hedefte kayıt varsa üzerine yazmaz (veri kaybı sıfır).
 */
export async function migrateIdentity(previous: string, next: string): Promise<void> {
  if (typeof window === "undefined" || !previous || !next || previous === next) return;
  const done = readMap(MIGRATED_KEY);
  if (done[`${previous}>${next}`]) return;

  for (const key of MAPS) {
    const map = readMap(key);
    if (map[previous] !== undefined && map[next] === undefined) {
      map[next] = map[previous];
      writeMap(key, map);
    }
  }

  const trusted = await listTrustedNodes().catch(() => []);
  const old = trusted.find((t) => t.nodeId === previous);
  if (old && !trusted.some((t) => t.nodeId === next)) {
    await putTrustedNode({ ...old, nodeId: next, personId: next });
  }

  done[`${previous}>${next}`] = Date.now();
  writeMap(MIGRATED_KEY, done);
}

/**
 * Hayalet temizliği: otomatik eşleşmeyle gelmiş, adı olmayan, hiç mesajı
 * bulunmayan ve 30 günden eski düğüm kayıtlarını siler.
 */
export async function pruneGhostContacts(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const [trusted, messages] = await Promise.all([
    listTrustedNodes().catch(() => []),
    listAllMessages().catch(() => []),
  ]);
  const active = new Set<string>();
  for (const m of messages) {
    if (m.convId) active.add(m.convId);
    if (m.from) active.add(m.from);
  }
  const nicknames = readMap("tedbirge.chat.nicknames");
  const cutoff = Date.now() - GHOST_MAX_AGE_MS;

  let removed = 0;
  for (const node of trusted) {
    const named = Boolean(nicknames[node.nodeId]) || Boolean(node.alias?.trim());
    if (named) continue;
    if (active.has(node.nodeId)) continue;
    if ((node.pairedAt ?? 0) > cutoff) continue;
    await deleteTrustedNode(node.nodeId).catch(() => undefined);
    await deletePeer(node.nodeId).catch(() => undefined);
    removed += 1;
  }
  return removed;
}

/**
 * Aynı kişiye ait düğümleri gruplar: birincil düğüm en son görülendir,
 * diğerleri "bağlı cihaz" olarak saklanır. Arayüz tek kart gösterir.
 */
export function groupByPerson<T extends { peerId: string; personId?: string; lastSeen: number }>(
  rows: T[],
): { primary: T; linked: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.personId || row.peerId;
    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }
  return Array.from(groups.values()).map((bucket) => {
    const sorted = [...bucket].sort((a, b) => b.lastSeen - a.lastSeen);
    return { primary: sorted[0]!, linked: sorted.slice(1) };
  });
}
