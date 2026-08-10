/**
 * TEK AD ÇÖZÜMLEME KANALI (name-resolver)
 * ------------------------------------------------------------------
 * Sorun: rehber eşleşmesinde ad düğüm kimliğine (nodeId) yazılıp sohbet
 * kişi kimliği (personId) ile açıldığında ad bağlantısı kopuyordu.
 *
 * Kural: takma ad, beyan adı ve sohbet başlığı DAİMA aynı anahtar
 * üzerinden okunur/yazılır:
 *      anahtar = kişi kimliği (personId) varsa o, yoksa düğüm kimliği.
 *
 * directory.ts, contacts.ts, safe-title.ts ve sohbet listesi bu
 * çözümleyiciyi kullanır; ikinci bir ad kaynağı yoktur.
 * Tüm veriler yalnızca bu cihazda tutulur (KVKK: ağa çıkmaz).
 */

import { isTechnicalLabel } from "@/lib/chat/display-name";

export const NICK_KEY = "tedbirge.chat.nicknames";
export const ALIAS_KEY = "tedbirge.chat.aliases";
/** düğüm kimliği → kişi kimliği eşlemesi (yerel). */
export const PERSON_MAP_KEY = "tedbirge.chat.personMap";

/**
 * Rehber tekilleştirme anahtarı. Büyük/küçük harf, Türkçe karakter,
 * noktalama ve gereksiz boşluk farkları aynı kişiyi ayrı satıra bölmez.
 */
export function normalizedPersonName(value: string | undefined | null): string {
  const normalized = (value ?? "")
    .trim()
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  // Eski sürümler cihaz türünü kişi adının önüne ekliyordu. Bu etiketler
  // kimliğin parçası değildir; "Bilgisayar Mehmet Dinç" ile "Mehmet Dinç"
  // aynı rehber kişisidir.
  return normalized
    .replace(/^(bilgisayar|masaustu|desktop|telefon|cep telefonu|iphone|ipad|tablet|mobil)\s+/, "")
    .trim();
}

/**
 * Görünür ad temizliği: cihaz etiketleri ("Bilgisayar Mehmet Dinç",
 * "Telefon Türkan Dinç") kişinin adı değildir; kart adı tek biçim olur.
 * Büyük/küçük harf ve Türkçe karakterler korunur.
 */
export function cleanPersonLabel(value: string | undefined | null): string {
  const raw = (value ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  const stripped = raw.replace(
    /^(bilgisayar|masaüstü|masaustu|desktop|telefon|cep telefonu|iphone|ipad|tablet|mobil)\s+/i,
    "",
  );
  return stripped.trim() || raw;
}

export function readMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function writeMap(key: string, map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* gizli mod / kota */
  }
}

/** düğüm/kişi kimliği → rehber numara özeti (yalnızca bu cihazda). */
export const PHONE_HASH_KEY = "tedbirge.chat.phoneHash";

/** Bir kimliğe DOĞRUDAN yazılmış numara özeti (bağlantı takip edilmez). */
function directHash(id: string): string {
  if (!id) return "";
  return (readMap(PHONE_HASH_KEY)[id] ?? "").trim();
}

/**
 * ÇAPRAZ BAĞLANTI KORUMASI.
 * İki kimlik farklı numaralara çıpalıysa aynı kişi olamaz. Bu kural
 * olmadan bir kişinin adı başka bir kişinin cihazına sızıyordu
 * (rehberde "Türkan" seçilip "Hasan" sohbetinin açılması).
 */
function hashConflict(a: string, b: string): boolean {
  const x = directHash(a);
  const y = directHash(b);
  return Boolean(x && y && x !== y);
}

/** Bir düğümün hangi kişiye ait olduğunu kalıcı olarak kaydeder. */
export function linkNodeToPerson(nodeId: string, personId?: string | null): void {
  if (!nodeId || !personId || nodeId === personId) return;
  // Farklı numaraya çıpalı iki kimlik asla tek kişiye bağlanmaz.
  if (hashConflict(nodeId, personId)) return;
  const map = readMap(PERSON_MAP_KEY);
  if (map[nodeId] === personId) return;
  map[nodeId] = personId;
  writeMap(PERSON_MAP_KEY, map);
}

/** Yanlış kurulmuş kişi bağlantısını kaldırır. */
export function unlinkNode(nodeId: string): void {
  const map = readMap(PERSON_MAP_KEY);
  if (!(nodeId in map)) return;
  delete map[nodeId];
  writeMap(PERSON_MAP_KEY, map);
}

/** Ad okuma/yazma anahtarı: kişi kimliği varsa o, yoksa düğüm kimliği. */
export function nameKeyOf(id: string): string {
  if (!id) return id;
  const person = readMap(PERSON_MAP_KEY)[id];
  if (!person) return id;
  // Numarası çakışan bağlantı geçersizdir: kimlik kendi başına kalır.
  return hashConflict(id, person) ? id : person;
}

/** Aynı kişiye ait bilinen tüm kimlikler (kişi kimliği + düğümleri). */
export function idsOfPerson(id: string): string[] {
  const key = nameKeyOf(id);
  const map = readMap(PERSON_MAP_KEY);
  const out = new Set<string>([id, key]);
  for (const [node, person] of Object.entries(map)) {
    if (person !== key) continue;
    if (hashConflict(node, id)) continue;
    out.add(node);
  }
  return Array.from(out).filter((other) => other === id || !hashConflict(other, id));
}

/**
 * Numara özetini kişinin bilinen kimliklerine yazar.
 * Başka bir numaraya çıpalı kimliğin özeti ASLA ezilmez.
 */
export function writePhoneHash(id: string, hash: string): void {
  if (!id || !hash) return;
  const map = readMap(PHONE_HASH_KEY);
  let changed = false;
  for (const key of idsOfPerson(id)) {
    const current = (map[key] ?? "").trim();
    if (current === hash) continue;
    // Zaten farklı bir numaraya çıpalı kimlik korunur.
    if (current && key !== id) continue;
    map[key] = hash;
    changed = true;
  }
  if (changed) writeMap(PHONE_HASH_KEY, map);
}

/** Kişinin numara özeti — bağlı cihazlardan herhangi biri biliyorsa döner. */
export function resolvePhoneHash(id: string): string {
  const own = directHash(id);
  if (own) return own;
  const map = readMap(PHONE_HASH_KEY);
  for (const key of idsOfPerson(id)) {
    const v = (map[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}

/**
 * ONARIM — geçmişte kurulmuş çapraz bağlantıları temizler.
 * Farklı numaralara çıpalı düğümler arasındaki kişi bağlantısı ve
 * bu bağlantıdan ödünç alınmış adlar silinir. Kaç kayıt onarıldığını döner.
 */
export function repairCrossLinks(): number {
  const links = readMap(PERSON_MAP_KEY);
  let fixed = 0;
  for (const [node, person] of Object.entries(links)) {
    if (!hashConflict(node, person)) continue;
    delete links[node];
    fixed += 1;
  }
  if (fixed > 0) writeMap(PERSON_MAP_KEY, links);
  return fixed;
}

/**
 * KANONİK KİŞİ ANAHTARI — tek kaynak.
 * Rehber (contacts), otonom onarım (merge) ve sohbet listesi (ChatApp)
 * aynı sırayı kullanır: numara özeti → kişi kimliği → imza anahtarı →
 * normalize ad → cihaz kimliği.
 */
export function personGroupKey(p: {
  phoneHash?: string | null;
  personId?: string | null;
  signPublic?: string | null;
  name?: string | null;
  fallback: string;
}): string {
  const name = normalizedPersonName(p.name);
  if (p.phoneHash) return `h:${p.phoneHash}`;
  if (p.personId) return `p:${p.personId}`;
  if (p.signPublic) return `k:${p.signPublic}`;
  if (name) return `n:${name}`;
  return `s:${p.fallback}`;
}

/**
 * Ad varyantı kontrolü. "mehmet" ile "mehmet dinç" aynı kişidir:
 * bir adın tüm sözcükleri diğerinin sözcük kümesinde geçiyorsa
 * (ve en az bir sözcük ortaksa) aynı kişi sayılır.
 */
export function isNameVariant(a: string, b: string): boolean {
  const x = normalizedPersonName(a);
  const y = normalizedPersonName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const xs = x.split(" ").filter(Boolean);
  const ys = y.split(" ").filter(Boolean);
  if (xs.length === 0 || ys.length === 0) return false;
  const short = xs.length <= ys.length ? xs : ys;
  const long = xs.length <= ys.length ? ys : xs;
  const set = new Set(long);
  return short.every((token) => set.has(token));
}

/**
 * İKİNCİ GEÇİŞ — AYNI AD = AYNI KİŞİ.
 * Aynı kişinin iki cihazı farklı imza anahtarı ya da eksik numara özeti
 * yüzünden ayrı kümelere düşebiliyor. Numara özetleri çakışmadığı sürece
 * adı aynı (ya da kısa/uzun varyantı) olan kümeler tek kişide birleşir.
 */
export function mergeGroupsByName<T>(
  groups: Map<string, T[]>,
  getName: (bucket: T[]) => string,
  getHash: (bucket: T[]) => string | undefined,
): void {
  const anchors: Array<{ key: string; name: string }> = [];
  for (const [key, bucket] of Array.from(groups.entries())) {
    const name = normalizedPersonName(getName(bucket));
    if (!name) continue;
    const hit = anchors.find((a) => isNameVariant(a.name, name));
    if (!hit) {
      anchors.push({ key, name });
      continue;
    }
    const other = groups.get(hit.key);
    if (!other) continue;
    const hashA = getHash(bucket);
    const hashB = getHash(other);
    // İki farklı numaraya çıpalı kişi aynı adı taşıyorsa ASLA birleşmez.
    if (hashA && hashB && hashA !== hashB) continue;
    other.push(...bucket);
    groups.delete(key);
    // Birleşen kümenin daha uzun adı çapa adı olur ("mehmet" → "mehmet dinç").
    if (name.length > hit.name.length) hit.name = name;
  }
}

const SELF_PHONE_HASH_KEY = "tedbirge.person.phone-hash";
const SELF_PERSON_ID_KEY = "tedbirge.person.id";
const SELF_ALIAS_KEY = "tedbirge.chat.alias";

function readLocal(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return (window.localStorage.getItem(key) ?? "").trim();
  } catch {
    return "";
  }
}

/**
 * KENDİ KAYDIM REHBERDE/SOHBET LİSTESİNDE KİŞİ OLARAK GÖRÜNMEZ.
 * Kendi diğer cihazlarım aynı numara çıpasını (ya da numara yoksa aynı adı)
 * taşır; bunlar "Kendinize not" dışında ayrı satır açmaz.
 */
export function isSelfPerson(p: {
  id?: string | null;
  personId?: string | null;
  phoneHash?: string | null;
  name?: string | null;
}): boolean {
  const myHash = readLocal(SELF_PHONE_HASH_KEY);
  const myPerson = readLocal(SELF_PERSON_ID_KEY);
  const myName = readLocal(SELF_ALIAS_KEY);
  const hash = (p.phoneHash ?? "").trim();
  if (myHash && hash) return hash === myHash;
  if (myPerson && (p.personId === myPerson || p.id === myPerson)) return true;
  // Numara çıpası yoksa ad eşleşmesi kullanılır (yalnız çakışan numara yokken).
  if (!hash && myName && isNameVariant(myName, p.name ?? "")) return true;
  return false;
}

function firstOf(mapKey: string, ids: string[]): string {
  const map = readMap(mapKey);
  for (const id of ids) {
    const v = (map[id] ?? "").trim();
    // Nötr yer tutucu ("Tedbirge kullanıcısı" vb.) ad sayılmaz.
    if (v && !isTechnicalLabel(v)) return v;
  }
  return "";
}

/** Kullanıcının kendi verdiği ad — kişi kimliği üzerinden tekil. */
export function resolveNickname(id: string): string {
  return firstOf(NICK_KEY, idsOfPerson(id));
}

/** Karşı tarafın beyan ettiği ad — kişi kimliği üzerinden tekil. */
export function resolveClaimedName(id: string): string {
  return firstOf(ALIAS_KEY, idsOfPerson(id));
}

/** Adı tek kanaldan yazar: kişi anahtarına ve bilinen tüm düğümlerine. */
export function writeNickname(id: string, name: string): void {
  const raw = name.trim().slice(0, 40);
  // Teknik kimlik / nötr etiket ASLA ad olarak saklanmaz.
  const clean = isTechnicalLabel(raw) ? "" : raw;
  const map = readMap(NICK_KEY);
  for (const key of idsOfPerson(id)) {
    if (clean) map[key] = clean;
    else delete map[key];
  }
  writeMap(NICK_KEY, map);
}

/** Beyan adını aynı kanala yazar. */
export function writeClaimedName(id: string, name: string): void {
  const clean = name.trim().slice(0, 40);
  if (!clean || isTechnicalLabel(clean)) return;
  const map = readMap(ALIAS_KEY);
  for (const key of idsOfPerson(id)) map[key] = clean;
  writeMap(ALIAS_KEY, map);
}

/**
 * Görünür ad: takma ad → beyan adı. İkisi de yoksa boş döner;
 * ADSIZ KAYIT ARAYÜZDE OLUŞTURULMAZ (teknik kimlik gösterilmez).
 */
export function resolveDisplayName(id: string): string {
  return resolveNickname(id) || resolveClaimedName(id);
}

/**
 * Eski sürümlerden kalan nötr/teknik ad kayıtlarını yerel haritalardan siler.
 * Gerçek adlara dokunmaz; yalnızca "Tedbirge kullanıcısı" gibi yer tutucular
 * ve ham teknik kimlikler temizlenir.
 */
export function purgePlaceholderNames(): number {
  if (typeof window === "undefined") return 0;
  let removed = 0;
  for (const key of [NICK_KEY, ALIAS_KEY]) {
    const map = readMap(key);
    let changed = false;
    for (const [id, value] of Object.entries(map)) {
      if (isTechnicalLabel(value)) {
        delete map[id];
        changed = true;
        removed += 1;
      }
    }
    if (changed) writeMap(key, map);
  }
  return removed;
}
