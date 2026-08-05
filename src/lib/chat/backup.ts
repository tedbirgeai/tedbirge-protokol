/**
 * Yedekleme ve cihaz taşıma — şifreli .tbg dosyası.
 * ------------------------------------------------------------------
 * Tüm sohbet geçmişi cihazda kalır; yedek de cihazda üretilir.
 * Dosya, kullanıcının belirlediği parola ile PBKDF2-SHA256 (210.000 tur)
 * türetilmiş AES-256-GCM anahtarıyla şifrelenir. Parolasız açılamaz;
 * hiçbir sunucuya yüklenmez.
 */

import {
  listAllMessages,
  listConversations,
  putConversation,
  putMessage,
  getMessage,
  type ChatMessage,
  type Conversation,
} from "@/lib/store/idb";

const MAGIC = "TBG-BACKUP-1";

export type BackupFile = {
  magic: string;
  createdAt: number;
  salt: string;
  iv: string;
  ct: string;
};

type Payload = {
  conversations: Conversation[];
  messages: ChatMessage[];
  aliases: Record<string, string>;
  nicknames: Record<string, string>;
  /** Medya ekleri mesajların içinde (data URL) taşınır; avatarlar ayrıca. */
  avatars?: Record<string, string>;
  myAvatar?: string;
  /** Yerel rehber defteri (cihazda tutulan kişiler). */
  localBook?: string;
};

function b64(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function unb64(v: string): Uint8Array {
  return Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
}

async function keyFrom(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 210_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function readMap(key: string): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** Şifreli yedek üretir ve indirilecek Blob döner. */
export async function createBackup(passphrase: string): Promise<Blob> {
  if (passphrase.length < 8) throw new Error("Parola en az 8 karakter olmalı.");
  const payload: Payload = {
    conversations: await listConversations(),
    messages: await listAllMessages(),
    aliases: readMap("tedbirge.chat.aliases"),
    nicknames: readMap("tedbirge.chat.nicknames"),
    avatars: readMap("tedbirge.chat.avatars"),
    myAvatar: readRaw("tedbirge.chat.avatar.me"),
    localBook: readRaw("tedbirge.chat.localBook"),
  };
  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);
  const key = await keyFrom(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const file: BackupFile = {
    magic: MAGIC,
    createdAt: Date.now(),
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(new Uint8Array(ct)),
  };
  return new Blob([JSON.stringify(file)], { type: "application/json" });
}

export function downloadBackup(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tedbirge-yedek-${new Date().toISOString().slice(0, 10)}.tbg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export type RestoreResult = { conversations: number; messages: number };

/** Yedeği geri yükler; mevcut mesajların üzerine yazmaz (birleştirir). */
export async function restoreBackup(text: string, passphrase: string): Promise<RestoreResult> {
  let file: BackupFile;
  try {
    file = JSON.parse(text) as BackupFile;
  } catch {
    throw new Error("Dosya okunamadı.");
  }
  if (file.magic !== MAGIC) throw new Error("Bu bir Tedbirge yedek dosyası değil.");
  const key = await keyFrom(passphrase, unb64(file.salt));
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(file.iv) as BufferSource },
      key,
      unb64(file.ct) as BufferSource,
    );
  } catch {
    throw new Error("Parola hatalı ya da dosya bozulmuş.");
  }
  const payload = JSON.parse(new TextDecoder().decode(plain)) as Payload;
  for (const c of payload.conversations) await putConversation(c);
  let added = 0;
  for (const m of payload.messages) {
    if (await getMessage(m.id)) continue;
    await putMessage(m);
    added += 1;
  }
  try {
    window.localStorage.setItem(
      "tedbirge.chat.aliases",
      JSON.stringify({ ...readMap("tedbirge.chat.aliases"), ...payload.aliases }),
    );
    window.localStorage.setItem(
      "tedbirge.chat.nicknames",
      JSON.stringify({ ...readMap("tedbirge.chat.nicknames"), ...payload.nicknames }),
    );
    if (payload.avatars)
      window.localStorage.setItem(
        "tedbirge.chat.avatars",
        JSON.stringify({ ...readMap("tedbirge.chat.avatars"), ...payload.avatars }),
      );
    if (payload.myAvatar) window.localStorage.setItem("tedbirge.chat.avatar.me", payload.myAvatar);
    if (payload.localBook && !window.localStorage.getItem("tedbirge.chat.localBook"))
      window.localStorage.setItem("tedbirge.chat.localBook", payload.localBook);
  } catch {
    /* gizli mod */
  }
  return { conversations: payload.conversations.length, messages: added };
}
