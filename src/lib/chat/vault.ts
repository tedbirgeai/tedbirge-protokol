/**
 * REHBER KASASI — uygulamayı silseniz de rehberiniz kaybolmaz.
 * ------------------------------------------------------------------
 * Rehber (cihaz rehberi, takma adlar, doğrulanmış düğümler, sohbet
 * tercihleri) cihazda AES-GCM ile şifrelenir ve yalnızca şifreli
 * hâliyle hesabınıza yedeklenir. Şifre anahtarı telefon numaranızdan
 * türetilir (PBKDF2); sunucu içeriği çözemez. Yeni bir ortamda
 * (Chrome, Edge, PWA, mobil) numaranızla giriş yaptığınızda rehber
 * otomatik geri yüklenir.
 */
import { listTrustedNodes, putTrustedNode, type TrustedNode } from "@/lib/store/idb";
import { getNickname, refreshContacts, setNickname } from "@/lib/chat/contacts";

type Prefs = {
  /** Cihaz rehberi: { name, phone } — yalnızca şifreli hâlde çıkar. */
  localBook?: unknown;
  nicknames?: Record<string, string>;
  aliases?: Record<string, string>;
  mute?: Record<string, number>;
  privacy?: Record<string, unknown>;
  folders?: unknown;
};

type VaultPayload = {
  format: "tedbirge.vault.v1" | "tedbirge.vault.v2";
  savedAt: number;
  nodes: TrustedNode[];
  nicknames: Record<string, string>;
  prefs?: Prefs;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

const LS = {
  localBook: "tedbirge.chat.localBook",
  nicknames: "tedbirge.chat.nicknames",
  aliases: "tedbirge.chat.aliases",
  mute: "tedbirge.chat.mute",
  privacy: "tedbirge.chat.privacy",
  folders: "tedbirge.chat.folders",
} as const;

function readJson<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeJsonIfAbsentMerge(key: string, incoming: unknown) {
  if (incoming === undefined || incoming === null) return;
  try {
    const current = readJson<unknown>(key);
    if (Array.isArray(incoming)) {
      // Cihaz rehberi: numaraya göre birleştir, mevcut kayıtları koru.
      const currentList = Array.isArray(current) ? (current as { phone?: string }[]) : [];
      const byPhone = new Map<string, unknown>();
      for (const item of [...(incoming as { phone?: string }[]), ...currentList]) {
        const phone = item?.phone;
        if (phone && !byPhone.has(phone)) byPhone.set(phone, item);
      }
      window.localStorage.setItem(key, JSON.stringify(Array.from(byPhone.values())));
      return;
    }
    if (typeof incoming === "object") {
      const merged = { ...(incoming as object), ...((current as object) ?? {}) };
      window.localStorage.setItem(key, JSON.stringify(merged));
    }
  } catch {
    /* gizli mod / kota */
  }
}

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(text: string): Uint8Array<ArrayBuffer> {
  const raw = atob(text);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Kullanıcıya özel tuz: numaradan türeyen, cihazdan bağımsız ama her
 * kullanıcıda farklı bir değer. Böylece iki farklı kullanıcının aynı
 * anahtar malzemesini paylaşması ve toplu sözlük saldırısı imkânsızlaşır.
 * (v1 sabit tuzlu eski yedekler geriye dönük olarak hâlâ açılır.)
 */
async function saltFor(phone: string): Promise<Uint8Array<ArrayBuffer>> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(`tedbirge/vault/salt/v2:${phone}`),
  );
  return new Uint8Array(digest);
}

async function keyFor(phone: string, version: 1 | 2 = 2): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(phone), "PBKDF2", false, [
    "deriveKey",
  ]);
  const salt: BufferSource =
    version === 1 ? enc.encode("tedbirge/vault/v1") : await saltFor(phone);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 210_000,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Numara verilmezse çıpa numarası (yerel oturum → profil → hesap) kullanılır. */
async function resolvePhone(phone?: string): Promise<string> {
  if (phone) return phone;
  const { getAnchorPhone } = await import("@/lib/chat/anchor");
  return getAnchorPhone();
}

async function snapshot(): Promise<VaultPayload> {
  const nodes = await listTrustedNodes();
  const nicknames: Record<string, string> = {};
  for (const n of nodes) {
    const nick = getNickname(n.nodeId);
    if (nick) nicknames[n.nodeId] = nick;
  }
  const prefs: Prefs = {
    localBook: readJson(LS.localBook),
    nicknames: readJson(LS.nicknames),
    aliases: readJson(LS.aliases),
    mute: readJson(LS.mute),
    privacy: readJson(LS.privacy),
    folders: readJson(LS.folders),
  };
  return { format: "tedbirge.vault.v2", savedAt: Date.now(), nodes, nicknames, prefs };
}

/** Rehberi şifreleyip hesabınıza yedekler. */
export async function backupContacts(phone?: string): Promise<boolean> {
  const anchor = await resolvePhone(phone);
  if (!anchor) return false;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return false;

    const payload = await snapshot();
    const hasPrefs = Object.values(payload.prefs ?? {}).some((v) => v !== undefined);
    if (payload.nodes.length === 0 && !hasPrefs) return false;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await keyFor(anchor);
    const cipher = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload))),
    );
    const blob = `${b64(iv)}.${b64(cipher)}`;

    const { saveContactVault } = await import("@/lib/vault.functions");
    const res = await saveContactVault({ data: { ciphertext: blob } });
    return res.ok;
  } catch {
    return false;
  }
}

/** Yedeği indirir, çözer ve bu cihazdaki rehbere birleştirir. */
export async function restoreContacts(phone?: string): Promise<number> {
  const anchor = await resolvePhone(phone);
  if (!anchor) return 0;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return 0;

    const { loadContactVault } = await import("@/lib/vault.functions");
    const { ciphertext } = await loadContactVault();
    if (!ciphertext) return 0;

    const [ivPart, dataPart] = ciphertext.split(".");
    if (!ivPart || !dataPart) return 0;

    // Önce kullanıcıya özel tuzlu (v2) anahtar denenir; açılmazsa eski
    // sabit tuzlu (v1) yedekler için geriye dönük deneme yapılır.
    let plain = "";
    for (const version of [2, 1] as const) {
      try {
        const key = await keyFor(anchor, version);
        plain = dec.decode(
          new Uint8Array(
            await crypto.subtle.decrypt(
              { name: "AES-GCM", iv: unb64(ivPart) },
              key,
              unb64(dataPart),
            ),
          ),
        );
        break;
      } catch {
        plain = "";
      }
    }
    if (!plain) return 0;
    const payload = JSON.parse(plain) as VaultPayload;
    if (payload.format !== "tedbirge.vault.v1" && payload.format !== "tedbirge.vault.v2") return 0;

    let restored = 0;
    for (const node of payload.nodes) {
      if (!node?.nodeId) continue;
      await putTrustedNode(node);
      restored += 1;
    }
    for (const [id, nick] of Object.entries(payload.nicknames ?? {})) {
      if (!getNickname(id)) setNickname(id, nick);
    }
    const prefs = payload.prefs;
    if (prefs) {
      writeJsonIfAbsentMerge(LS.localBook, prefs.localBook);
      writeJsonIfAbsentMerge(LS.nicknames, prefs.nicknames);
      writeJsonIfAbsentMerge(LS.aliases, prefs.aliases);
      writeJsonIfAbsentMerge(LS.mute, prefs.mute);
      writeJsonIfAbsentMerge(LS.privacy, prefs.privacy);
      writeJsonIfAbsentMerge(LS.folders, prefs.folders);
      const book = prefs.localBook;
      if (Array.isArray(book)) restored += book.length;
    }
    await refreshContacts();
    return restored;
  } catch {
    return 0;
  }
}
