/**
 * Telefon rehberi eşleştirme (istemci tarafı).
 * ------------------------------------------------------------------
 * Numaralar cihazdan çıkmaz: sunucuya yalnızca geri döndürülemez
 * SHA-256 özetleri gönderilir. Eşleşen kişiler yerel rehbere eklenir;
 * eşleşmeyen numaralar sunucuda hiçbir iz bırakmaz.
 */
import { putTrustedNode } from "@/lib/store/idb";
import { refreshContacts, setNickname } from "@/lib/chat/contacts";
import { logSync } from "@/lib/chat/sync-log";
import { logError } from "@/lib/chat/errors";
import { friendlyError } from "@/lib/friendly-error";


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
    if (picked.length === 0) return { checked: 0, matched: 0, people: [] };
    saveLocalBook(picked);
    return await importContacts(picked);
  } catch (error) {
    logError("rehber", error, "Cihaz rehberi okunamadı. İzin verip tekrar deneyin.");
    logSync("hata", "cihaz-rehberi", friendlyError(error, "Cihaz rehberi okunamadı."));
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
  } catch (error) {
    logSync("bilgi", "yerel-rehber", friendlyError(error, "Yerel rehber köprüsü yok."));
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
    // Çıpa numarası: yerel oturum → profil → hesap. Yeni bir ortamda
    // rehber yedeği bu numarayla otomatik geri yüklenir.
    const { getAnchorPhone } = await import("@/lib/chat/anchor");
    const phone = await getAnchorPhone();
    if (phone) {
      const vault = await import("@/lib/chat/vault");
      const restored = await vault.restoreContacts(phone).catch((error: unknown) => {
        logError("rehber", error, "Rehber yedeği geri yüklenemedi. Bağlantı gelince yeniden denenecek.");
        logSync("hata", "kasa-geri-yükleme", friendlyError(error, "Rehber yedeği geri yüklenemedi."));
        return 0;
      });
      if (restored > 0) {
        // Yedekten gelen cihaz rehberi varsa hemen eşleştirilir.
        const book = loadLocalBook();
        if (book.length > 0) {
          const r = await importContacts(book);
          return { ...r, source: "vault" };
        }
        return { checked: restored, matched: restored, people: [], source: "vault" };
      }
    }
  } catch (error) {
    logSync("uyarı", "rehber-yedek", friendlyError(error, "Rehber yedeği bulunamadı."));
  }

  return { checked: 0, matched: 0, people: [], source: "none" };
}


/** Eşleşen kişinin arayüzde gösterilecek özeti. */
export type MatchedContact = { peerId: string; name: string; shortId: string };

export type ImportResult = { checked: number; matched: number; people: MatchedContact[] };

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

/** Basit CSV satır çözümleyici (tırnak içindeki virgülleri korur). */
function csvRow(line: string, sep: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      cells.push(cur);
      cur = "";
    } else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

/**
 * Google Kişiler / Outlook CSV dışa aktarımı çözümleyici.
 * Ad sütunu "name" içeren ilk sütun, numara sütunu "phone"/"tel"
 * içeren tüm sütunlardır. Dosya cihazda okunur, ağa gönderilmez.
 */
export function parseContactsCsv(text: string): DeviceContact[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0]!.match(/;/g)?.length ?? 0) > (lines[0]!.match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = csvRow(lines[0]!, sep).map((h) => h.toLowerCase());
  const nameCols = head
    .map((h, i) => (/name|ad|isim/.test(h) && !/file|nick|user/.test(h) ? i : -1))
    .filter((i) => i >= 0);
  const phoneCols = head
    .map((h, i) => (/phone|tel|mobil|numara|gsm/.test(h) && !/type|label/.test(h) ? i : -1))
    .filter((i) => i >= 0);
  if (phoneCols.length === 0) return [];

  const out: DeviceContact[] = [];
  for (const line of lines.slice(1)) {
    const cells = csvRow(line, sep);
    const name = nameCols
      .map((i) => cells[i] ?? "")
      .find((v) => v.trim())
      ?.trim();
    for (const i of phoneCols) {
      for (const raw of (cells[i] ?? "").split(/[:;/]| ::: /)) {
        const phone = normalizePhone(raw.trim());
        if (phone) out.push({ name: name || phone, phone });
      }
    }
  }
  return out;
}

/** Dosya adına/içeriğine göre doğru çözümleyiciyi seçer. */
export function parseContactsFile(fileName: string, text: string): DeviceContact[] {
  if (/BEGIN:VCARD/i.test(text)) return parseVcards(text);
  if (/\.csv$/i.test(fileName) || /[,;]/.test(text.split(/\r?\n/)[0] ?? "")) {
    return parseContactsCsv(text);
  }
  return [];
}

/**
 * Rehber dosyasını okur, cihazda saklar ve eşleştirir.
 * Ham numara/ad hiçbir zaman ağa çıkmaz.
 */
export async function importContactsFile(file: File): Promise<ImportResult> {
  const text = await file.text();
  const parsed = parseContactsFile(file.name, text);
  if (parsed.length === 0) return { checked: 0, matched: 0, people: [] };
  const merged = new Map<string, DeviceContact>();
  for (const c of [...loadLocalBook(), ...parsed]) merged.set(c.phone, c);
  const all = Array.from(merged.values());
  saveLocalBook(all);
  const result = await importContacts(all);
  return { ...result, checked: parsed.length };
}


/**
 * Kişileri eşleştirir ve bulunanları yerel rehbere ekler.
 * Rehberdeki ad yerel kalır; ağa gönderilmez.
 */
export async function importContacts(list: DeviceContact[]): Promise<ImportResult> {
  const unique = new Map<string, DeviceContact>();
  for (const c of list) if (!unique.has(c.phone)) unique.set(c.phone, c);
  const rows = Array.from(unique.values()).slice(0, 500);
  if (rows.length === 0) return { checked: 0, matched: 0, people: [] };

  const hashes = await Promise.all(rows.map((r) => hashPhone(r.phone)));
  const byHash = new Map(hashes.map((h, i) => [h, rows[i]!] as const));

  // Yerel doğrulama çevrimdışı çalışabilir. Bulut oturumu yokken korumalı
  // eşleştirme fonksiyonunu çağırmak 401 üretmemeli; sonraki açılışta yeniden denenir.
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { checked: rows.length, matched: 0, people: [] };

  const { matchDirectoryContacts } = await import("@/lib/directory.functions");
  const { matches } = await matchDirectoryContacts({ data: { hashes } });

  const { getBrowserNodeId } = await import("@/lib/browser-node");
  const { shortIdOf } = await import("@/lib/chat/contacts");
  const self = getBrowserNodeId();
  const { getPhone } = await import("@/lib/chat/profile");
  const myPhone = getPhone();
  const myHash = myPhone ? await hashPhone(myPhone) : null;

  const people: MatchedContact[] = [];
  let matched = 0;
  let skippedUnnamed = 0;
  // Aynı kişinin birden çok cihazı varsa tek kişi olarak sayılır; en son
  // görülen cihaz birincil kabul edilir (WhatsApp bağlı-cihaz modeli).
  const seenPersons = new Set<string>();
  const { linkNodeToPerson, writeClaimedName, cleanPersonLabel, writePhoneHash } = await import(
    "@/lib/chat/name-resolver"
  );

  for (const m of matches) {
    const local = byHash.get(m.hash);
    const target = m.nodeId || m.personId;
    // Kendi numaranız eşleşse bile rehberde kişi olarak gösterilmez.
    if (!target || target === self || (myHash && m.hash === myHash)) continue;
    // Rehberdeki ad → kişinin beyan ettiği ad. İkisi de yoksa KAYIT AÇILMAZ:
    // adsız satır arayüzde hiç oluşmasın (gizlenmesin).
    // Cihaz etiketi ("BİLGİSAYAR …", "TELEFON …") adın parçası değildir.
    const label = cleanPersonLabel(local?.name?.trim() || m.displayName?.trim() || "");
    if (!label) {
      skippedUnnamed += 1;
      continue;
    }
    linkNodeToPerson(target, m.personId);
    await putTrustedNode({
      nodeId: target,
      alias: label,
      personId: m.personId || undefined,
      // Numara özeti kişi kartlarının birincil birleştirme çıpasıdır.
      phoneHash: m.hash,
      method: "auto",
      pairedAt: Date.now(),
    });
    // Ad tek kanaldan yazılır: kişi kimliği + tüm bağlı düğümler.
    setNickname(target, label);
    if (m.displayName?.trim()) writeClaimedName(target, cleanPersonLabel(m.displayName.trim()));
    // Numara özeti kişinin bilinen tüm cihazlarına yazılır: farklı tarayıcı,
    // PWA ve mobil kayıtları tek kişi kartında birleşir.
    writePhoneHash(target, m.hash);
    if (m.personId) writePhoneHash(m.personId, m.hash);


    const personKey = m.personId || target;
    if (seenPersons.has(personKey)) continue;
    seenPersons.add(personKey);
    matched += 1;
    people.push({ peerId: target, name: label, shortId: shortIdOf(target) });
  }
  // Eski ortamlardan kalan kopya ve hayalet kayıtlar tek kişide birleşir.
  try {
    const { mergePersonDuplicates, pruneGhostContacts } = await import("@/lib/chat/merge");
    await mergePersonDuplicates();
    await pruneGhostContacts();
  } catch (error) {
    logSync("uyarı", "rehber-temizlik", friendlyError(error, "Kişi temizliği tamamlanamadı."));
  }
  if (skippedUnnamed > 0) {
    logSync(
      "bilgi",
      "rehber-eşleşme",
      `${skippedUnnamed} eşleşme adsız olduğu için listeye eklenmedi`,
    );
  }
  logSync("bilgi", "rehber-eşleşme", `${rows.length} numara tarandı, ${matched} kişi eşleşti`);
  await refreshContacts();
  return { checked: rows.length, matched, people };
}


/**
 * SESSİZ YENİDEN EŞLEŞTİRME.
 * Cihazda saklanan rehber (ham numara cihazdan çıkmaz) yeniden
 * eşleştirilir; sonradan Tedbirge'ye katılan tanıdıklar kendiliğinden
 * belirir. Kullanıcıya hiçbir pencere açılmaz.
 */
export async function rematchSavedBook(): Promise<ImportResult> {
  const saved = loadLocalBook();
  if (saved.length === 0) return { checked: 0, matched: 0, people: [] };
  return importContacts(saved);
}

const AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000;
const LAST_SYNC_KEY = "tedbirge.chat.lastContactSync";

function lastSyncAt(): number {
  try {
    return Number(window.localStorage.getItem(LAST_SYNC_KEY) ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Periyodik rehber tazeleme: açılışta, ağ geri geldiğinde ve uygulama
 * öne alındığında (en fazla yarım saatte bir) sessizce çalışır.
 */
export function startContactAutoSync(): () => void {
  if (typeof window === "undefined") return () => undefined;
  let running = false;

  const tick = async () => {
    if (running) return;
    if (Date.now() - lastSyncAt() < AUTO_SYNC_INTERVAL_MS) return;
    running = true;
    try {
      const r = await rematchSavedBook();
      try {
        window.localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
      } catch {
        /* gizli mod */
      }
      if (r.matched > 0) {
        await refreshContacts();
        logSync("bilgi", "rehber-tazeleme", `${r.matched} kişi güncellendi.`);
      }
    } catch (error) {
      logSync("uyarı", "rehber-tazeleme", friendlyError(error, "Rehber tazelenemedi."));
    } finally {
      running = false;
    }
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") void tick();
  };
  const timer = window.setInterval(() => void tick(), AUTO_SYNC_INTERVAL_MS);
  window.addEventListener("online", () => void tick());
  document.addEventListener("visibilitychange", onVisible);
  void tick();

  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
