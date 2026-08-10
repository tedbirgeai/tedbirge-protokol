/** Sunucudan/Zod'dan gelen ham hataları kullanıcı diline çevirir. */

const RULES: { test: RegExp; message: string }[] = [
  {
    test: /too_small|minimum.*2|min.*2/i,
    message: "Düğüm adı en az 2 karakter olmalı (örn. saha-A).",
  },
  { test: /too_big|maximum/i, message: "Girdiğiniz değer çok uzun, lütfen kısaltın." },
  {
    test: /invalid_string|regex|yalnızca harf/i,
    message: "Düğüm adı sadece harf, rakam, nokta ve tire içerebilir (örn. ev-01).",
  },
  { test: /invalid_type|Required|received undefined/i, message: "Lütfen tüm alanları doldurun." },
  {
    test: /invalid input/i,
    message: "Girdiğiniz bilgiler eksik veya hatalı — lütfen kontrol edin.",
  },
  {
    test: /Failed to fetch|NetworkError/i,
    message: "Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.",
  },
  { test: /401|Unauthorized/i, message: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." },
];

export function friendlyError(err: unknown, fallback = "İşlem tamamlanamadı."): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!raw) return fallback;
  for (const rule of RULES) if (rule.test.test(raw)) return rule.message;
  // Ham JSON dizisi ise kullanıcıya gösterme.
  if (raw.trim().startsWith("[") || raw.trim().startsWith("{")) return fallback;
  return raw;
}

/** Düğüm adını güvenli biçime getirir: boşluk → tire, geçersiz karakter atılır. */
export function normalizeNodeId(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 64);
}
