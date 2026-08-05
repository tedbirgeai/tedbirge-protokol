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

/** Bir düğümün hangi kişiye ait olduğunu kalıcı olarak kaydeder. */
export function linkNodeToPerson(nodeId: string, personId?: string | null): void {
  if (!nodeId || !personId || nodeId === personId) return;
  const map = readMap(PERSON_MAP_KEY);
  if (map[nodeId] === personId) return;
  map[nodeId] = personId;
  writeMap(PERSON_MAP_KEY, map);
}

/** Ad okuma/yazma anahtarı: kişi kimliği varsa o, yoksa düğüm kimliği. */
export function nameKeyOf(id: string): string {
  if (!id) return id;
  return readMap(PERSON_MAP_KEY)[id] ?? id;
}

/** Aynı kişiye ait bilinen tüm kimlikler (kişi kimliği + düğümleri). */
export function idsOfPerson(id: string): string[] {
  const key = nameKeyOf(id);
  const map = readMap(PERSON_MAP_KEY);
  const out = new Set<string>([id, key]);
  for (const [node, person] of Object.entries(map)) if (person === key) out.add(node);
  return Array.from(out);
}

/** düğüm/kişi kimliği → rehber numara özeti (yalnızca bu cihazda). */
export const PHONE_HASH_KEY = "tedbirge.chat.phoneHash";

/** Numara özetini kişinin bilinen tüm kimliklerine yazar. */
export function writePhoneHash(id: string, hash: string): void {
  if (!id || !hash) return;
  const map = readMap(PHONE_HASH_KEY);
  let changed = false;
  for (const key of idsOfPerson(id)) {
    if (map[key] !== hash) {
      map[key] = hash;
      changed = true;
    }
  }
  if (changed) writeMap(PHONE_HASH_KEY, map);
}

/** Kişinin numara özeti — bağlı cihazlardan herhangi biri biliyorsa döner. */
export function resolvePhoneHash(id: string): string {
  const map = readMap(PHONE_HASH_KEY);
  for (const key of idsOfPerson(id)) {
    const v = (map[key] ?? "").trim();
    if (v) return v;
  }
  return "";
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
 * İKİNCİ GEÇİŞ — AYNI AD = AYNI KİŞİ.
 * Aynı kişinin iki cihazı farklı imza anahtarı ya da eksik numara özeti
 * yüzünden ayrı kümelere düşebiliyor. Numara özetleri çakışmadığı sürece
 * normalize adı birebir aynı olan kümeler tek kişide birleşir.
 */
export function mergeGroupsByName<T>(
  groups: Map<string, T[]>,
  getName: (bucket: T[]) => string,
  getHash: (bucket: T[]) => string | undefined,
): void {
  const byName = new Map<string, string>();
  for (const [key, bucket] of Array.from(groups.entries())) {
    const name = normalizedPersonName(getName(bucket));
    if (!name) continue;
    const target = byName.get(name);
    if (!target) {
      byName.set(name, key);
      continue;
    }
    const other = groups.get(target);
    if (!other) continue;
    const hashA = getHash(bucket);
    const hashB = getHash(other);
    // İki farklı numaraya çıpalı kişi aynı adı taşıyorsa ASLA birleşmez.
    if (hashA && hashB && hashA !== hashB) continue;
    other.push(...bucket);
    groups.delete(key);
  }
}




function firstOf(mapKey: string, ids: string[]): string {
  const map = readMap(mapKey);
  for (const id of ids) {
    const v = (map[id] ?? "").trim();
    if (v) return v;
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
  const clean = name.trim().slice(0, 40);
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
  if (!clean) return;
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
