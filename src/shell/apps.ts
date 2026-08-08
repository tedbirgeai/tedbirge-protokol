/**
 * UYGULAMA KAYDI (App Registry)
 * ------------------------------------------------------------------
 * Faz A: her sekme bir "uygulama"dır. Mobil sekme çubuğu ve masaüstü
 * sol ray sabit listelerden değil bu kayıttan beslenir. İleride Wasm
 * uygulamaları aynı kayda eklenebilir; kabuk kodu değişmez.
 */

export type ShellAppId = "chats" | "calls" | "communities" | "me";

export type ShellApp = {
  id: ShellAppId;
  label: string;
  /** Mobil alt sekme çubuğundaki sıra (soldan sağa). */
  mobileOrder: number;
  /** Masaüstü sol raydaki sıra; profil (me) rayda ayrı yerde durur. */
  railOrder: number | null;
  /** Okunmamış rozeti bu uygulamada gösterilir. */
  badge?: "unread";
};

export const SHELL_APPS: ShellApp[] = [
  { id: "calls", label: "Aramalar", mobileOrder: 0, railOrder: 1 },
  { id: "communities", label: "Topluluklar", mobileOrder: 1, railOrder: 2 },
  { id: "chats", label: "Sohbetler", mobileOrder: 2, railOrder: 0, badge: "unread" },
  { id: "me", label: "Siz", mobileOrder: 3, railOrder: null },
];

export const MOBILE_APPS = [...SHELL_APPS].sort((a, b) => a.mobileOrder - b.mobileOrder);

export const RAIL_APPS = SHELL_APPS.filter((a) => a.railOrder !== null).sort(
  (a, b) => (a.railOrder ?? 0) - (b.railOrder ?? 0),
);
