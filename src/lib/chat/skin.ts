/**
 * Sohbet arayüz teması (görsel katman).
 * ------------------------------------------------------------------
 * "pro"    → yenilenmiş, kurumsal ve sakin görünüm (varsayılan)
 * "klasik" → önceki arayüz, tek tıkla geri dönülebilir
 *
 * Yalnızca CSS değişkenlerini değiştirir; hiçbir iş mantığına dokunmaz.
 */

import { useCallback, useEffect, useState } from "react";

export type ChatSkin = "pro" | "klasik";

const KEY = "tedbirge.chat.skin";
const EVENT = "tedbirge:chat-skin";

export function getSkin(): ChatSkin {
  if (typeof window === "undefined") return "pro";
  return window.localStorage.getItem(KEY) === "klasik" ? "klasik" : "pro";
}

export function setSkin(skin: ChatSkin): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, skin);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: skin }));
}

/** Arayüz temasını okur ve değiştirir; sekmeler arası senkron kalır. */
export function useChatSkin(): { skin: ChatSkin; toggle: () => void; set: (s: ChatSkin) => void } {
  const [skin, setLocal] = useState<ChatSkin>("pro");

  useEffect(() => {
    setLocal(getSkin());
    const sync = () => setLocal(getSkin());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const set = useCallback((next: ChatSkin) => setSkin(next), []);
  const toggle = useCallback(() => setSkin(getSkin() === "pro" ? "klasik" : "pro"), []);

  return { skin, toggle, set };
}
