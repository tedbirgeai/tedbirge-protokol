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

/** Serbest metinden (yapıştırılan liste) numara çıkarır. */
export function parsePastedContacts(text: string): DeviceContact[] {
  return text
    .split(/[\n,;]+/)
    .map((line) => {
      const phone = normalizePhone(line);
      if (!phone) return null;
      const name = line.replace(/[\d+()\-\s]/g, "").trim();
      return { name: name || phone, phone };
    })
    .filter((v): v is DeviceContact => v !== null);
}

export type ImportResult = { checked: number; matched: number };

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
