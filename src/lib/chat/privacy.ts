/**
 * Sohbet gizlilik tercihleri — yalnızca bu cihazda saklanır.
 * ------------------------------------------------------------------
 * - Okundu bilgisi gizleme: açıkken karşı tarafa "read" makbuzu
 *   gönderilmez (WhatsApp'taki "okundu bilgisi" kapatma davranışı).
 *   Karşılıklılık ilkesi: kapatan kullanıcı da karşı tarafın okundu
 *   bilgisini göremez.
 * - Otomatik çeviri: gelen mesajlar seçilen dile çevrilerek gösterilir.
 * - Yazıyor bilgisi: kapatılabilir.
 */

const KEY = "tedbirge.chat.privacy";

export type ChatPrivacy = {
  /** true → okundu makbuzu gönderilmez ve karşı tarafınki gizlenir. */
  hideReadReceipts: boolean;
  /** true → "yazıyor…" sinyali gönderilmez. */
  hideTyping: boolean;
  /** Boş ise çeviri kapalı; "tr", "en", "ar" gibi. */
  autoTranslateTo: string;
};

const DEFAULTS: ChatPrivacy = {
  hideReadReceipts: false,
  hideTyping: false,
  autoTranslateTo: "",
};

let cache: ChatPrivacy | null = null;
const listeners = new Set<() => void>();

export function getPrivacy(): ChatPrivacy {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULTS;
  try {
    cache = { ...DEFAULTS, ...(JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as object) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function setPrivacy(patch: Partial<ChatPrivacy>): ChatPrivacy {
  const next = { ...getPrivacy(), ...patch };
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
  return next;
}

export function onPrivacyChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const TRANSLATE_LANGUAGES = [
  { code: "", label: "Kapalı" },
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "İngilizce" },
  { code: "ar", label: "Arapça" },
  { code: "de", label: "Almanca" },
  { code: "fr", label: "Fransızca" },
  { code: "ru", label: "Rusça" },
  { code: "es", label: "İspanyolca" },
  { code: "fa", label: "Farsça" },
] as const;

export function languageLabel(code: string): string {
  return TRANSLATE_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}
