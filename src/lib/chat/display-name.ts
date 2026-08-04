/**
 * GÖRÜNEN AD KURALI
 * ------------------------------------------------------------------
 * Arayüzde asla teknik kimlik (mob-…, TBG-…, node_…, ham hash)
 * başlık olarak gösterilmez. Başlık her zaman kişinin Adı Soyadı
 * ya da rehberdeki kayıt adıdır.
 */

const TECHNICAL = [
  /^mob[-_]/i,
  /^web[-_]/i,
  /^node[-_]/i,
  /^tbg-/i,
  /^peer[-_]/i,
  /^[0-9a-f]{12,}$/i,
  /^[A-Za-z0-9+/=]{24,}$/,
];

/** Verilen etiket teknik bir kimlik mi? */
export function isTechnicalLabel(label: string | undefined | null): boolean {
  const s = (label ?? "").trim();
  if (!s) return true;
  return TECHNICAL.some((re) => re.test(s));
}

/** Görünür başlık: insan adı yoksa nötr bir etiket döner. */
export function humanName(label: string | undefined | null, fallback = "Kayıtsız kişi"): string {
  const s = (label ?? "").trim();
  return isTechnicalLabel(s) ? fallback : s;
}
