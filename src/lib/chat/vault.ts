/**
 * REHBER KASASI — uygulamayı silseniz de rehberiniz kaybolmaz.
 * ------------------------------------------------------------------
 * Rehber (takma adlar + doğrulanmış düğümler) cihazda AES-GCM ile
 * şifrelenir ve yalnızca şifreli hâliyle hesabınıza yedeklenir.
 * Şifre anahtarı telefon numaranızdan türetilir (PBKDF2); sunucu
 * içeriği çözemez. Yeniden kurulumda numaranızla giriş yaptığınızda
 * rehber otomatik geri yüklenir.
 */
import { listTrustedNodes, putTrustedNode, type TrustedNode } from "@/lib/store/idb";
import { getNickname, refreshContacts, setNickname } from "@/lib/chat/contacts";

type VaultPayload = {
  format: "tedbirge.vault.v1";
  savedAt: number;
  nodes: TrustedNode[];
  nicknames: Record<string, string>;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(text: string): Uint8Array {
  const raw = atob(text);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function keyFor(phone: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(phone), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("tedbirge/vault/v1"),
      iterations: 210_000,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function snapshot(): Promise<VaultPayload> {
  const nodes = await listTrustedNodes();
  const nicknames: Record<string, string> = {};
  for (const n of nodes) {
    const nick = getNickname(n.nodeId);
    if (nick) nicknames[n.nodeId] = nick;
  }
  return { format: "tedbirge.vault.v1", savedAt: Date.now(), nodes, nicknames };
}

/** Rehberi şifreleyip hesabınıza yedekler. */
export async function backupContacts(phone: string): Promise<boolean> {
  if (!phone) return false;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return false;

    const payload = await snapshot();
    if (payload.nodes.length === 0) return false;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await keyFor(phone);
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
export async function restoreContacts(phone: string): Promise<number> {
  if (!phone) return 0;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return 0;

    const { loadContactVault } = await import("@/lib/vault.functions");
    const { ciphertext } = await loadContactVault();
    if (!ciphertext) return 0;

    const [ivPart, dataPart] = ciphertext.split(".");
    if (!ivPart || !dataPart) return 0;
    const key = await keyFor(phone);
    const plain = dec.decode(
      new Uint8Array(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: unb64(ivPart) },
          key,
          unb64(dataPart),
        ),
      ),
    );
    const payload = JSON.parse(plain) as VaultPayload;
    if (payload.format !== "tedbirge.vault.v1") return 0;

    let restored = 0;
    for (const node of payload.nodes) {
      if (!node?.nodeId) continue;
      await putTrustedNode(node);
      restored += 1;
    }
    for (const [id, nick] of Object.entries(payload.nicknames ?? {})) {
      if (!getNickname(id)) setNickname(id, nick);
    }
    await refreshContacts();
    return restored;
  } catch {
    return 0;
  }
}
