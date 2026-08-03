/**
 * Otomatik dil çevirisi.
 * ------------------------------------------------------------------
 * Gizlilik: çeviri isteğe bağlıdır ve yalnızca kullanıcı açtığında
 * çalışır. Metin, sunucu tarafındaki çeviri uç noktasına gider ve
 * hiçbir yerde saklanmaz. İnternet yokken çeviri devre dışı kalır,
 * mesajın özgün hâli her zaman korunur — çeviri asla orijinalin
 * yerine geçmez, altında gösterilir.
 */

const cache = new Map<string, string>();
const MAX_CACHE = 400;

export type TranslateResult = { text: string; offline?: boolean; error?: string };

function keyOf(text: string, to: string) {
  return `${to}::${text}`;
}

export function cachedTranslation(text: string, to: string): string | null {
  return cache.get(keyOf(text, to)) ?? null;
}

export async function translateText(text: string, to: string): Promise<TranslateResult> {
  const clean = text.trim();
  if (!clean || !to) return { text: "" };
  const hit = cache.get(keyOf(clean, to));
  if (hit) return { text: hit };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { text: "", offline: true, error: "Çevrimdışı — çeviri şu an yapılamıyor." };
  }
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: clean.slice(0, 2000), to }),
    });
    if (!res.ok) {
      return {
        text: "",
        error:
          res.status === 429
            ? "Çok fazla çeviri isteği. Biraz sonra tekrar deneyin."
            : "Çeviri şu an yapılamadı.",
      };
    }
    const data = (await res.json()) as { text?: string };
    const out = String(data.text ?? "").trim();
    if (!out) return { text: "", error: "Çeviri boş döndü." };
    if (cache.size > MAX_CACHE) cache.clear();
    cache.set(keyOf(clean, to), out);
    return { text: out };
  } catch {
    return { text: "", error: "Çeviri servisine ulaşılamadı." };
  }
}
