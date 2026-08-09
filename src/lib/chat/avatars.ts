/**
 * PROFİL FOTOĞRAFLARI — yalnızca bu cihazda saklanır.
 * ------------------------------------------------------------------
 * KVKK/GDPR: fotoğraflar sunucuya gönderilmez, buluta yüklenmez.
 * Kişi kimliği (peerId / nodeId) → data URL eşlemesi localStorage'ta
 * tutulur. Kendi fotoğrafınız ayrı bir anahtarda saklanır.
 */

import { useSyncExternalStore } from "react";

const MAP_KEY = "tedbirge.chat.avatars";
const ME_KEY = "tedbirge.chat.avatar.me";

let cache: Record<string, string> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((l) => l());
}

function read(): Record<string, string> {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    cache = JSON.parse(window.localStorage.getItem(MAP_KEY) ?? "{}") as Record<string, string>;
  } catch {
    cache = {};
  }
  return cache;
}

/** Kişinin profil fotoğrafı (data URL) — yoksa boş dizi. */
export function getAvatar(id: string | undefined | null): string {
  if (!id) return "";
  return read()[id] ?? "";
}

export function setAvatar(id: string, dataUrl: string) {
  const next = { ...read(), [id]: dataUrl };
  cache = next;
  try {
    window.localStorage.setItem(MAP_KEY, JSON.stringify(next));
  } catch {
    /* gizli mod / kota */
  }
  emit();
}

export function getMyAvatar(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(ME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setMyAvatar(dataUrl: string) {
  try {
    window.localStorage.setItem(ME_KEY, dataUrl);
  } catch {
    /* gizli mod */
  }
  emit();
}

/**
 * Seçilen görseli kareye kırpıp küçülterek data URL üretir.
 * Telefon kameralarının yön (EXIF) bilgisi dikkate alınır; aksi hâlde
 * dikey çekilen fotoğraflar ters/yan görünür.
 */
export async function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = null;
  }
  if (!bitmap) {
    // Safari/iOS yedeği: <img> çözümlemesi EXIF yönünü kendiliğinden uygular.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await (img.decode?.() ??
        new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("Görsel okunamadı"));
        }));
      bitmap = await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Görsel işlenemedi");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function useAvatars() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => version,
    () => 0,
  );
}
