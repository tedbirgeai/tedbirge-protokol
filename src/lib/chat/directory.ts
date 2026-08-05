/**
 * Telefon rehberi eşleştirme (istemci tarafı).
 * ------------------------------------------------------------------
 * Numaralar cihazdan çıkmaz: sunucuya yalnızca geri döndürülemez
 * SHA-256 özetleri gönderilir. Eşleşen kişiler yerel rehbere eklenir;
 * eşleşmeyen numaralar sunucuda hiçbir iz bırakmaz.
 */
import { putTrustedNode } from "@/lib/store/idb";
import { refreshContacts, setNickname } from "@/lib/chat/contacts";

export type DeviceContact = { name: string; phone: string };

/** Yerel numarayı E.164 biçimine getirir (varsayılan ülke kodu +90). */
export function normalizePhone(raw: string, defaultCode = "90"): string | null {
  let s = raw.replace(/[^\d+]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!s.startsWith("+")) {
    s = s.replace(/^0+/, "");
    s = `+${defaultCode}${s}`;
  }
  const digits = s.slice(1);
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export async function hashPhone(e164: string): Promise<string> {
  const bytes = new TextEncoder().encode(`tedbirge/phone/v1:${e164}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

type ContactsManager = {
  select: (
    props: string[],
    opts?: { multiple?: boolean },
  ) => Promise<{ name?: string[]; tel?: string[] }[]>;
};

export function deviceContactsSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as unknown as { contacts?: ContactsManager }).contacts;
  return typeof c?.select === "function";
}

/** Cihaz rehberinden kişi seçtirir (Android/Chrome Contact Picker API). */
export async function pickDeviceContacts(): Promise<DeviceContact[]> {
  const c = (navigator as unknown as { contacts?: ContactsManager }).contacts;
  if (!c?.select) return [];
  const picked = await c.select(["name", "tel"], { multiple: true });
  const out: DeviceContact[] = [];
  for (const p of picked) {
    const name = p.name?.[0]?.trim() ?? "";
    for (const tel of p.tel ?? []) {
      const phone = normalizePhone(tel);
      if (phone) out.push({ name: name || phone, phone });
    }
  }
  return out;
}

const LOCAL_BOOK_KEY = "tedbirge.chat.localBook";

/**
 * Cihaz rehberini YALNIZCA bu cihazda saklar (KVKK: ham numara/ad
 * hiçbir zaman sunucuya veya ağa gönderilmez).
 */
export function saveLocalBook(list: DeviceContact[]): void {
  try {
    window.localStorage.setItem(LOCAL_BOOK_KEY, JSON.stringify(list.slice(0, 1000)));
  } catch {
    /* gizli mod / kota */
  }
}

export function loadLocalBook(): DeviceContact[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_BOOK_KEY);
    return raw ? (JSON.parse(raw) as DeviceContact[]) : [];
  } catch {
    return [];
  }
}

/**
 * Cihaz rehberini otomatik eşitler: izin verilirse kişiler önce bu
 * cihazın yerel hafızasına yazılır, ardından yalnızca geri döndürülemez
 * özetlerle Tedbirge ağıyla eşleştirilir. Elle numara yazma yoktur.
 */
export async function syncDeviceContacts(): Promise<ImportResult | null> {
  if (!deviceContactsSupported()) return null;
  try {
    const picked = await pickDeviceContacts();
    if (picked.length === 0) return { checked: 0, matched: 0 };
    saveLocalBook(picked);
    return await importContacts(picked);
  } catch {
    return null;
  }
}

export type AutoSyncResult = ImportResult & { source: "device" | "saved" | "vault" | "none" };

/**
 * OTONOM REHBER EŞİTLEME — kullanıcı hiçbir seçim yapmaz.
 * Sırasıyla: (1) cihaz rehberi izni varsa doğrudan okunur,
 * (2) daha önce bu cihazda saklanan rehber yeniden eşleştirilir
 * (araya yeni katılan tanıdıklar böylece kendiliğinden belirir),
 * (3) hiçbiri yoksa şifreli hesap yedeğinden geri yüklenir.
 * Yalnızca üçü de boşsa arayüz dosya seçimine düşer.
 */
export async function autoSyncContacts(): Promise<AutoSyncResult> {
  // (0) Yerel iOS/Android uygulaması: sistem rehber izniyle tüm kişiler
  // arka planda okunur — kullanıcı hiçbir seçim yapmaz (WhatsApp modeli).
  try {
    const { readNativeContacts } = await import("@/lib/chat/native-contacts");
    const native = await readNativeContacts();
    if (native && native.length > 0) {
      saveLocalBook(native);
      const r = await importContacts(native);
      return { ...r, source: "device" };
    }
  } catch {
    /* yerel kabuk yok */
  }

  if (deviceContactsSupported()) {
    const r = await syncDeviceContacts();
    if (r && r.checked > 0) return { ...r, source: "device" };
  }


  const saved = loadLocalBook();
  if (saved.length > 0) {
    const r = await importContacts(saved);
    return { ...r, source: "saved" };
  }

  try {
    const { getPhone } = await import("@/lib/chat/profile");
    const phone = getPhone();
    if (phone) {
      const vault = await import("@/lib/chat/vault");
      const restored = await vault.restoreContacts(phone).catch(() => 0);
      if (restored > 0) return { checked: restored, matched: restored, source: "vault" };
    }
  } catch {
    /* yedek yok */
  }

  return { checked: 0, matched: 0, source: "none" };
}


export type ImportResult = { checked: number; matched: number };

/**
 * Rehber dosyası (.vcf / vCard) çözümleyici — cihaz rehberine erişemeyen
 * tarayıcılar için yedek yol. Dosya cihazda okunur, ağa gönderilmez.
 */
export function parseVcards(text: string): DeviceContact[] {
  const out: DeviceContact[] = [];
  for (const card of text.split(/END:VCARD/i)) {
    if (!/BEGIN:VCARD/i.test(card)) continue;
    const name = /(?:^|\n)FN[^:\n]*:(.+)/i.exec(card)?.[1]?.trim() ?? "";
    for (const m of card.matchAll(/(?:^|\n)TEL[^:\n]*:(.+)/gi)) {
      const phone = normalizePhone(m[1]?.trim() ?? "");
      if (phone) out.push({ name: name || phone, phone });
    }
  }
  return out;
}

/**
 * Kişileri eşleştirir ve bulunanları yerel rehbere ekler.
 * Rehberdeki ad yerel kalır; ağa gönderilmez.
 */
export async function importContacts(list: DeviceContact[]): Promise<ImportResult> {
  const unique = new Map<string, DeviceContact>();
  for (const c of list) if (!unique.has(c.phone)) unique.set(c.phone, c);
  const rows = Array.from(unique.values()).slice(0, 500);
  if (rows.length === 0) return { checked: 0, matched: 0 };

  const hashes = await Promise.all(rows.map((r) => hashPhone(r.phone)));
  const byHash = new Map(hashes.map((h, i) => [h, rows[i]!] as const));

  // Yerel doğrulama çevrimdışı çalışabilir. Bulut oturumu yokken korumalı
  // eşleştirme fonksiyonunu çağırmak 401 üretmemeli; sonraki açılışta yeniden denenir.
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { checked: rows.length, matched: 0 };

  const { matchDirectoryContacts } = await import("@/lib/directory.functions");
  const { matches } = await matchDirectoryContacts({ data: { hashes } });

  let matched = 0;
  for (const m of matches) {
    const local = byHash.get(m.hash);
    const target = m.nodeId || m.personId;
    if (!target) continue;
    await putTrustedNode({
      nodeId: target,
      alias: m.displayName ?? local?.name ?? undefined,
      method: "auto",
      pairedAt: Date.now(),
    });
    if (local?.name) setNickname(target, local.name);
    matched += 1;
  }
  await refreshContacts();
  return { checked: rows.length, matched };
}
