/**
 * REHBER (Contacts) — üç katmanlı kimlik modeli.
 * ------------------------------------------------------------------
 * Telefon numarası YOKTUR. Bir kişiyi üç katman birlikte tanımlar:
 *
 *  1) KALICI KISA KİMLİK  — Ed25519 genel anahtarından türeyen,
 *     değiştirilemez "TBG-XXXX-XXXX" kodu. Aynı kişi cihaz/taşıyıcı
 *     değiştirse de kod aynı kalır; iki kişi aynı adı kullansa bile
 *     kodları farklıdır. Ayırt edici tek doğruluk kaynağı budur.
 *  2) DOĞRULAMA ROZETİ    — TOFU + elle doğrulama (peer-trust.ts).
 *     Bilinmiyor / Otomatik / Manuel onaylı / Parmak izi değişti.
 *  3) KENDİ TAKMA ADINIZ  — kişiye SİZİN verdiğiniz ad. Yalnızca bu
 *     cihazda saklanır, karşı tarafa gönderilmez, ağa çıkmaz.
 *     Karşı tarafın beyan ettiği ad (alias) doğrulanmamış veridir ve
 *     rehberde "beyan" olarak ikinci planda gösterilir.
 *
 * KVKK / GDPR:
 *  - Tüm rehber verisi yalnızca kullanıcı cihazında (IndexedDB +
 *    localStorage) tutulur; sunucuya, buluta veya üçüncü tarafa
 *    aktarılmaz (veri minimizasyonu, KVKK m.4 / GDPR m.5).
 *  - Telefon rehberi okunmaz, kişi listesi yüklenmez.
 *  - Taşınabilirlik (KVKK m.11 / GDPR m.20): exportContactsData()
 *  - Silme / unutulma (KVKK m.7 / GDPR m.17): eraseContact(),
 *    eraseAllContacts()
 */

import { useSyncExternalStore } from "react";
import { sha256 } from "@noble/hashes/sha2.js";
import { fromB64, getIdentity } from "@/lib/crypto/identity";
import {
  deletePeer,
  deleteTrustedNode,
  listPeers,
  listTrustedNodes,
  type PeerRecord,
  type TrustedNode,
} from "@/lib/store/idb";
import { trustStatusOf, type TrustStatus } from "@/lib/peer-trust";
import { getBrowserNodeId } from "@/lib/browser-node";

import {
  ALIAS_KEY,
  NICK_KEY,
  cleanPersonLabel,
  linkNodeToPerson,
  readMap,
  resolveClaimedName,
  resolveNickname,
  resolvePhoneHash,

  normalizedPersonName,
  writeNickname,
} from "@/lib/chat/name-resolver";



/** Karıştırılabilir harf/rakam (I, L, O, U) çıkarılmış Crockford Base32. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Kalıcı kısa kimlik: anahtarın SHA-256 özetinden 8 karakter.
 * Anahtar yoksa (henüz el sıkışılmamış eş) düğüm kimliğinden türetilir;
 * anahtar geldiğinde kod anahtara sabitlenir.
 */
export function shortIdOf(material: string): string {
  let bytes: Uint8Array;
  try {
    bytes =
      /^[A-Za-z0-9+/=]+$/.test(material) && material.length > 20
        ? fromB64(material)
        : new TextEncoder().encode(material);
  } catch {
    bytes = new TextEncoder().encode(material);
  }
  const d = sha256(bytes);
  let out = "";
  for (let i = 0; i < 8; i += 1) out += ALPHABET[d[i]! % ALPHABET.length];
  return `TBG-${out.slice(0, 4)}-${out.slice(4)}`;
}

/* --------------------------- kendi takma adlar --------------------------- */
/* Tüm okuma/yazma tek kanaldan: @/lib/chat/name-resolver */

function writeMap(key: string, map: Record<string, string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* gizli mod */
  }
}

export function getNickname(peerId: string): string {
  return resolveNickname(peerId);
}

/** Kişiye kendi verdiğiniz ad — cihazdan çıkmaz. */
export function setNickname(peerId: string, name: string) {
  writeNickname(peerId, name);
  void refreshContacts();
}


/* ------------------------------- model ------------------------------- */

export type Contact = {
  peerId: string;
  /** Katman 1 — kalıcı kısa kimlik. */
  shortId: string;
  signPublic?: string;
  fingerprint?: string;
  /** Katman 2 — doğrulama rozeti. */
  trust: TrustStatus;
  /** Katman 3 — sizin verdiğiniz ad (yerel). */
  nickname?: string;
  /** Karşı tarafın beyan ettiği ad — doğrulanmamış. */
  claimedName?: string;
  /** Listede gösterilecek ad. */
  displayName: string;
  /** Aynı beyan adını taşıyan başka kişi var mı? (isim çakışması uyarısı) */
  ambiguous: boolean;
  method?: TrustedNode["method"];
  /** Numaraya çıpalanmış kişi kimliği (aynı kişinin tüm cihazları). */
  personId?: string;
  /** Rehberden gelen numara özeti — kart birleştirmenin birincil çıpası. */
  phoneHash?: string;

  /** Bu kişinin diğer bağlı cihazları — arayüzde tek kart gösterilir. */
  linkedNodes?: string[];
  pairedAt?: number;
  lastSeen: number;
};

export type ContactsState = {
  contacts: Contact[];
  /** Kendi kimlik kartınız. */
  me: { peerId: string; shortId: string; signPublic?: string; fingerprint?: string } | null;
  loaded: boolean;
};

let state: ContactsState = { contacts: [], me: null, loaded: false };
const listeners = new Set<() => void>();

function publish(patch: Partial<ContactsState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function buildContact(
  peer: PeerRecord | undefined,
  trusted: TrustedNode | undefined,
  peerId: string,
  _nicknames: Record<string, string>,
  _aliases: Record<string, string>,
): Contact {
  const signPublic = peer?.knownSignPublic ?? peer?.verifyKey;
  // Ad tek kanaldan okunur: kişi kimliği varsa onun üzerinden.
  linkNodeToPerson(peerId, trusted?.personId);
  const nickname = cleanPersonLabel(resolveNickname(peerId)) || undefined;
  const claimedName =
    cleanPersonLabel(resolveClaimedName(peerId) || trusted?.alias || "") || undefined;
  const shortId = shortIdOf(signPublic ?? peerId);
  return {
    peerId,
    shortId,
    signPublic,
    fingerprint: peer?.fingerprint,
    trust: trustStatusOf(peer ?? null),
    nickname,
    claimedName,
    displayName: nickname || claimedName || "",
    ambiguous: false,
    method: trusted?.method,
    personId: trusted?.personId,
    phoneHash: trusted?.phoneHash || resolvePhoneHash(peerId) || undefined,
    pairedAt: trusted?.pairedAt,
    lastSeen: Math.max(peer?.lastSeen ?? 0, trusted?.pairedAt ?? 0),
  };
}



/**
 * Aynı kişiye ait cihazları tek karta indirir: en son görülen cihaz
 * birincil olur, diğerleri linkedNodes listesinde saklanır.
 */
function collapsePersons(rows: Contact[]): Contact[] {
  const groups = new Map<string, Contact[]>();
  for (const row of rows) {
    // Sıra: NUMARA ÖZETİ → kişi kimliği → imza anahtarı → ad → cihaz kimliği.
    // Aynı numaraya bağlı cihazlar adları farklı olsa da tek kartta toplanır;
    // kimliği bilinen iki ayrı kişi aynı adı taşısa bile ayrı kalır.
    const nameKey = normalizedPersonName(row.displayName);
    const key = row.phoneHash
      ? `h:${row.phoneHash}`
      : row.personId
        ? `p:${row.personId}`
        : row.signPublic
          ? `k:${row.signPublic}`
          : nameKey
            ? `n:${nameKey}`
            : row.peerId;

    const bucket = groups.get(key);
    if (bucket) bucket.push(row);
    else groups.set(key, [row]);
  }

  const out: Contact[] = [];
  for (const bucket of groups.values()) {
    const sorted = [...bucket].sort((a, b) => b.lastSeen - a.lastSeen);
    const primary = sorted[0];
    if (!primary) continue;
    const linked = sorted.slice(1);
    if (linked.length > 0) {
      primary.linkedNodes = linked.map((c) => c.peerId);
      // Ad yalnızca bir cihazda kayıtlıysa tüm karta yansısın.
      if (!primary.nickname) primary.nickname = linked.find((c) => c.nickname)?.nickname;
      if (!primary.claimedName) primary.claimedName = linked.find((c) => c.claimedName)?.claimedName;
      primary.displayName = primary.nickname || primary.claimedName || "";
      // Doğrulama rozeti kartın en güçlü halkasını gösterir; bir cihaz elle
      // onaylanmışsa kişi "Manuel onaylı" görünür.
      const rank: Record<TrustStatus, number> = {
        changed: 3,
        manual: 2,
        auto: 1,
        unknown: 0,
      } as Record<TrustStatus, number>;
      for (const c of bucket) {
        if ((rank[c.trust] ?? 0) > (rank[primary.trust] ?? 0)) primary.trust = c.trust;
      }
      if (!primary.method) primary.method = bucket.find((c) => c.method)?.method;
      const anchor = bucket.find((c) => c.personId)?.personId ?? primary.personId ?? primary.peerId;
      primary.personId = anchor;
      const hash = bucket.find((c) => c.phoneHash)?.phoneHash;
      if (hash) primary.phoneHash = hash;
      for (const contact of bucket) {
        linkNodeToPerson(contact.peerId, anchor);
        // Numara özeti kişinin tüm cihazlarına yayılır: bir sonraki açılışta
        // aynı kişi hiçbir koşulda iki karta bölünmez.
        if (hash) writePhoneHash(contact.peerId, hash);
      }

    }

    out.push(primary);
  }
  // Adı gerçekten bilinmeyen kayıt listeye HİÇ yazılmaz (gizlenmez — oluşturulmaz).
  return out.filter((c) => c.displayName.trim().length > 0);
}


/** Rehberi IndexedDB + yerel adlardan yeniden kurar. */
export async function refreshContacts(): Promise<Contact[]> {
  if (typeof window === "undefined") return [];
  const [peers, trusted] = await Promise.all([listPeers(), listTrustedNodes()]);
  const nicknames = readMap(NICK_KEY);
  const aliases = readMap(ALIAS_KEY);
  const ids = new Set<string>([...peers.map((p) => p.peerId), ...trusted.map((t) => t.nodeId)]);
  const self = getBrowserNodeId();
  ids.delete(self);
  // Kendi numaraya çıpalı kimliğim rehberde kişi olarak görünmez.
  try {
    const mine = window.localStorage.getItem("tedbirge.person.id");
    if (mine) ids.delete(mine);
  } catch {
    /* gizli mod */
  }

  const peerMap = new Map(peers.map((p) => [p.peerId, p] as const));
  const trustMap = new Map(trusted.map((t) => [t.nodeId, t] as const));

  const rows = collapsePersons(
    Array.from(ids).map((id) =>
      buildContact(peerMap.get(id), trustMap.get(id), id, nicknames, aliases),
    ),
  );

  // İsim çakışması: aynı beyan adını taşıyan birden çok kişi varsa uyarı ver.
  const nameCount = new Map<string, number>();
  for (const c of rows) {
    const key = (c.nickname || c.claimedName || "").toLocaleLowerCase("tr");
    if (!key) continue;
    nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
  }
  for (const c of rows) {
    const key = (c.nickname || c.claimedName || "").toLocaleLowerCase("tr");
    c.ambiguous = Boolean(key) && (nameCount.get(key) ?? 0) > 1;
  }

  rows.sort(
    (a, b) =>
      Number(b.trust === "manual") - Number(a.trust === "manual") ||
      a.displayName.localeCompare(b.displayName, "tr"),
  );

  let me = state.me;
  if (!me) {
    const identity = await getIdentity(self).catch(() => null);
    let anchoredPersonId = "";
    try {
      anchoredPersonId = window.localStorage.getItem("tedbirge.person.id") ?? "";
    } catch {
      anchoredPersonId = "";
    }
    me = {
      peerId: self,
      shortId: anchoredPersonId || shortIdOf(identity?.signPublic ?? self),
      signPublic: identity?.signPublic,
      fingerprint: identity?.fingerprint,
    };
  }

  publish({ contacts: rows, me, loaded: true });
  return rows;
}

export function contactFor(peerId: string): Contact | undefined {
  return state.contacts.find((c) => c.peerId === peerId);
}

/** Bir düğüm kimliği için gösterilecek ad — üç katmanın özeti. */
export function contactLabel(peerId: string, fallbackAlias?: string): string {
  // Tek kanal: kişi kimliği üzerinden takma ad → beyan adı → çağıranın ipucu.
  const resolved = resolveNickname(peerId) || resolveClaimedName(peerId);
  if (resolved) return resolved;
  const c = contactFor(peerId);
  if (c?.displayName) return c.displayName;
  if (fallbackAlias?.trim()) return fallbackAlias.trim();
  return shortIdOf(peerId);
}

/** Kişi kimliğiyle (personId) de kart bulunabilsin. */
export function contactForPerson(id: string): Contact | undefined {
  return state.contacts.find(
    (c) => c.peerId === id || c.personId === id || c.linkedNodes?.includes(id),
  );
}


export function useContacts(): ContactsState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!state.loaded) void refreshContacts();
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

/* ---------------------------- KVKK / GDPR ---------------------------- */

/** Taşınabilirlik hakkı — rehberin makine okunur dışa aktarımı (JSON). */
export async function exportContactsData(): Promise<string> {
  await refreshContacts();
  return JSON.stringify(
    {
      format: "tedbirge.contacts.v1",
      exportedAt: new Date().toISOString(),
      notice:
        "Bu dosya yalnızca bu cihazda tutulan rehber verisidir. Mesaj içerikleri uçtan uca şifrelidir ve bu dışa aktarıma dahil değildir.",
      me: state.me,
      contacts: state.contacts.map((c) => ({
        shortId: c.shortId,
        nickname: c.nickname ?? null,
        claimedName: c.claimedName ?? null,
        trust: c.trust,
        fingerprint: c.fingerprint ?? null,
        pairedAt: c.pairedAt ? new Date(c.pairedAt).toISOString() : null,
        lastSeen: c.lastSeen ? new Date(c.lastSeen).toISOString() : null,
      })),
    },
    null,
    2,
  );
}

/** Silme hakkı — tek kişi. */
export async function eraseContact(peerId: string): Promise<void> {
  const map = readMap(NICK_KEY);
  delete map[peerId];
  writeMap(NICK_KEY, map);
  const aliases = readMap(ALIAS_KEY);
  delete aliases[peerId];
  writeMap(ALIAS_KEY, aliases);
  await Promise.all([deletePeer(peerId), deleteTrustedNode(peerId)]);
  await refreshContacts();
}

/** Unutulma hakkı — tüm rehber (mesajlara dokunulmaz). */
export async function eraseAllContacts(): Promise<number> {
  const rows = await refreshContacts();
  writeMap(NICK_KEY, {});
  writeMap(ALIAS_KEY, {});
  for (const c of rows) await Promise.all([deletePeer(c.peerId), deleteTrustedNode(c.peerId)]);
  await refreshContacts();
  return rows.length;
}
