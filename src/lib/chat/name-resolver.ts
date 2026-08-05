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
