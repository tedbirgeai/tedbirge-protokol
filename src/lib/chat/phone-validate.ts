/**
 * GSM NUMARASI DOĞRULAMA (Anti-Spoofing)
 * ------------------------------------------------------------------
 * Rastgele/sahte numaraların rehbere girmesini ve ağa kaydolmasını
 * engeller. Uluslararası E.164 biçimi zorunludur; ülke kodu bilinen
 * pazarlarda cep numarası kuralları da ayrıca denetlenir.
 *
 * KVKK: doğrulama tamamen cihazda yapılır, numara ağa çıkmaz.
 */

export type PhoneCheck =
  | { ok: true; e164: string; country: string; national: string }
  | { ok: false; reason: string };

/** Bilinen ülkeler için cep numarası kuralları (ulusal kısım). */
const MOBILE_RULES: Record<string, { len: number[]; prefix: RegExp; label: string }> = {
  "90": { len: [10], prefix: /^5\d{9}$/, label: "Türkiye cep numarası 5 ile başlar (10 hane)" },
  "49": { len: [10, 11], prefix: /^1\d{9,10}$/, label: "Almanya cep numarası 1 ile başlar" },
  "44": { len: [10], prefix: /^7\d{9}$/, label: "Birleşik Krallık cep numarası 7 ile başlar" },
  "1": { len: [10], prefix: /^[2-9]\d{9}$/, label: "ABD/Kanada numarası 10 hanedir" },
  "31": { len: [9], prefix: /^6\d{8}$/, label: "Hollanda cep numarası 6 ile başlar" },
  "971": { len: [9], prefix: /^5\d{8}$/, label: "BAE cep numarası 5 ile başlar" },
};

/** Bariz sahte örüntüler: aynı rakam, ardışık dizi, 12345… */
function looksFake(digits: string): boolean {
  if (/^(\d)\1+$/.test(digits)) return true;
  if ("01234567890123456789".includes(digits)) return true;
  if ("09876543210987654321".includes(digits)) return true;
  return false;
}

/**
 * Numarayı E.164'e çevirir ve geçerliliğini denetler.
 * Geçersizse kullanıcıya gösterilebilir bir gerekçe döner.
 */
export function checkPhone(raw: string, defaultCode = "90"): PhoneCheck {
  let s = (raw ?? "").replace(/[^\d+]/g, "");
  if (!s) return { ok: false, reason: "Telefon numarası girin." };
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!s.startsWith("+")) s = `+${defaultCode}${s.replace(/^0+/, "")}`;

  const digits = s.slice(1);
  if (!/^[1-9]\d{7,14}$/.test(digits))
    return { ok: false, reason: "Numara uluslararası biçimde olmalı (8–15 hane)." };

  const country = Object.keys(MOBILE_RULES)
    .sort((a, b) => b.length - a.length)
    .find((c) => digits.startsWith(c));

  const national = country ? digits.slice(country.length) : digits;
  if (looksFake(national)) return { ok: false, reason: "Bu numara gerçek görünmüyor." };

  if (country) {
    const rule = MOBILE_RULES[country]!;
    if (!rule.len.includes(national.length) || !rule.prefix.test(national))
      return { ok: false, reason: `${rule.label}.` };
  }

  return { ok: true, e164: `+${digits}`, country: country ?? "", national };
}

/** Kısa yol: geçerliyse E.164, değilse null. */
export function toE164(raw: string, defaultCode = "90"): string | null {
  const r = checkPhone(raw, defaultCode);
  return r.ok ? r.e164 : null;
}

/** Ekranda okunur biçim: +90 532 000 00 00 */
export function prettyPhone(raw: string, defaultCode = "90"): string {
  const r = checkPhone(raw, defaultCode);
  if (!r.ok) return raw;
  const n = r.national;
  const grouped = n.replace(/(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4");
  return `+${r.country} ${grouped}`.trim();
}
