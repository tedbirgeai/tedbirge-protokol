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
  listPeers,
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
 * Hayalet temizliği: adı çözülemeyen ve hiç mesajı olmayan düğüm kayıtları
 * silinir. Adsız kayıt hiçbir listede kalmaz; elle doğrulanmış kişiler
 * (method === "manual") ve mesajı olanlar korunur.
 */
export async function pruneGhostContacts(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const { resolveDisplayName } = await import("@/lib/chat/name-resolver");
  const [trusted, messages] = await Promise.all([
    listTrustedNodes().catch(() => []),
    listAllMessages().catch(() => []),
  ]);
  const active = new Set<string>();
  for (const m of messages) {
    if (m.convId) active.add(m.convId);
    if (m.from) active.add(m.from);
  }

  let removed = 0;
  for (const node of trusted) {
    const named = Boolean(resolveDisplayName(node.nodeId).trim() || node.alias?.trim());
    if (named) continue;
    if (node.method === "qr" || node.method === "pin") continue;
    if (active.has(node.nodeId)) continue;
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

/**
 * KOPYA KİŞİ BİRLEŞTİRME — tek seferlik ama idempotent göç.
 * ------------------------------------------------------------------
 * personId alanı boş kalmış eski kayıtlar yüzünden aynı kişi listede
 * iki satır olarak görünüyordu. Bu göç:
 *  1) Aynı kişiye ait düğümleri (personId / ortak imza anahtarı / aynı ad)
 *     tek kişi kimliğine bağlar,
 *  2) adları tek kanala (name-resolver) yazar,
 *  3) artık düğüm kayıtlarını siler.
 * Tekrar çalıştırıldığında veri kaybetmez; yalnızca eksikleri tamamlar.
 */
export async function mergePersonDuplicates(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const { linkNodeToPerson, normalizedPersonName, resolveDisplayName, writeNickname } = await import(
    "@/lib/chat/name-resolver"
  );
  const [trusted, peers] = await Promise.all([
    listTrustedNodes().catch(() => []),
    listPeers().catch(() => []),
  ]);
  const keyOf = new Map(peers.map((p) => [p.peerId, p.knownSignPublic ?? p.verifyKey] as const));

  // Küme anahtarı sırası: numara çıpası (personId) → imza anahtarı → ad.
  // Numarası bilinen iki kişi aynı adı taşısa bile birleşmez; ad yalnızca
  // her iki tarafta da kimlik bilinmiyorken birleştirme sebebidir.
  type TrustedRow = (typeof trusted)[number];
  const buckets = new Map<string, TrustedRow[]>();
  for (const node of trusted) {
    const signKey = keyOf.get(node.nodeId);
    const name = normalizedPersonName(resolveDisplayName(node.nodeId) || node.alias || "");
    const key = node.personId
      ? `p:${node.personId}`
      : signKey
        ? `k:${signKey}`
        : name
          ? `n:${name}`
          : `s:${node.nodeId}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(node);
    else buckets.set(key, [node]);
  }

  let merged = 0;
  for (const [key, bucket] of buckets) {
    // Kişi kimliği: kayıtlardan biri taşıyorsa o, yoksa en eski düğüm.
    const personId = bucket.find((n) => n.personId)?.personId ?? (key.startsWith("p:") ? key.slice(2) : "");

    const sorted = [...bucket].sort((a, b) => (b.pairedAt ?? 0) - (a.pairedAt ?? 0));
    const primary = sorted[0];
    if (!primary) continue;
    const anchor = personId || primary.nodeId;
    const name =
      bucket.map((n) => resolveDisplayName(n.nodeId) || n.alias || "").find((v) => v.trim()) ?? "";

    for (const node of bucket) linkNodeToPerson(node.nodeId, anchor);
    if (name) writeNickname(anchor, name);

    if (bucket.length > 1) {
      for (const node of sorted.slice(1)) {
        await deleteTrustedNode(node.nodeId).catch(() => undefined);
        merged += 1;
      }
      await putTrustedNode({
        ...primary,
        personId: anchor,
        alias: name || primary.alias,
      });
    } else if (personId && primary.personId !== personId) {
      await putTrustedNode({ ...primary, personId });
    }
  }
  return merged;
}
