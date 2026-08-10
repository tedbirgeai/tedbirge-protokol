/**
 * ARAMA BAĞLANTILARI — cihazda üretilen katılım bağlantıları.
 * Bağlantı kendi alan adımızla üretilir; sunucuya kayıt yazılmaz.
 */

const KEY = "tedbirge.calls.links";

export type CallLink = {
  id: string;
  video: boolean;
  approval: boolean;
  createdAt: number;
};

function rand(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

export function createCallLink(video: boolean, approval: boolean): CallLink {
  const link: CallLink = { id: rand(), video, approval, createdAt: Date.now() };
  try {
    const rows = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as CallLink[];
    window.localStorage.setItem(KEY, JSON.stringify([link, ...rows].slice(0, 20)));
  } catch {
    /* gizli mod */
  }
  return link;
}

export function urlOfCallLink(link: CallLink): string {
  const origin =
    typeof window === "undefined" ? "https://tedbirge-gateway.lovable.app" : window.location.origin;
  return `${origin}/chat?call=${link.id}&v=${link.video ? "1" : "0"}${link.approval ? "&ok=1" : ""}`;
}
