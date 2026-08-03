/**
 * Sohbet arayüz teması (görsel katman).
 * ------------------------------------------------------------------
 * Tek tema: "pro" — yenilenmiş, kurumsal ve sakin görünüm.
 * Eski "klasik" seçeneği kaldırıldı.
 *
 * Yalnızca CSS değişkenlerini değiştirir; hiçbir iş mantığına dokunmaz.
 */

export type ChatSkin = "pro";

export function getSkin(): ChatSkin {
  return "pro";
}

/** Arayüz temasını okur; artık yalnızca pro döner. */
export function useChatSkin(): { skin: ChatSkin } {
  return { skin: "pro" };
}

