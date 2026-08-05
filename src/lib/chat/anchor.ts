/**
 * KİMLİK ÇIPASI — GSM numarası.
 * ------------------------------------------------------------------
 * Kimlik artık cihaza değil telefon numarasına bağlıdır. Aynı numara
 * Chrome, Edge, PWA, iOS ve Android'de AYNI kişi kimliğini (TBG-…)
 * üretir. Cihazlar bu hesabın "bağlı cihazı"dır; her cihazın kendi
 * düğüm kimliği (mob-…) yalnızca taşıma katmanında kullanılır ve
 * kullanıcıya gösterilmez.
 *
 * KVKK/GDPR: ham numara ağa çıkmaz; sunucu tarafında yalnızca geri
 * döndürülemez SHA-256 özeti tutulur.
 */

const PERSON_ID_KEY = "tedbirge.person.id";
const PERSON_PHONE_KEY = "tedbirge.person.phone-hash";

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sunucu ile birebir aynı özet (directory.functions.ts / local-auth.functions.ts). */
export async function phoneHash(e164: string): Promise<string> {
  const bytes = new TextEncoder().encode(`tedbirge/phone/v1:${e164}`);
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

/** Numaradan deterministik kişi kimliği: her ortamda aynı TBG kodu. */
export async function personIdFromPhone(e164: string): Promise<string> {
  const source = new TextEncoder().encode(`tedbirge/person/phone/v1:${await phoneHash(e164)}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", source));
  const code = hex(digest.slice(0, 6)).toUpperCase();
  return `TBG-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

export function getStoredPersonId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PERSON_ID_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredPersonId(personId: string): void {
  try {
    window.localStorage.setItem(PERSON_ID_KEY, personId);
  } catch {
    /* gizli mod */
  }
}

export function getStoredPhoneHash(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PERSON_PHONE_KEY) ?? "";
  } catch {
    return "";
  }
}

function setStoredPhoneHash(value: string): void {
  try {
    window.localStorage.setItem(PERSON_PHONE_KEY, value);
  } catch {
    /* gizli mod */
  }
}

/**
 * Çıpa numarasını bulur. Sıra: yerel doğrulama oturumu → cihaz profili
 * → bulut oturumundaki doğrulanmış numara. Böylece yeni bir ortamda
 * (yeni tarayıcı/PWA) oturum açıldığında numara yine bulunur ve
 * rehber kasası kendiliğinden çözülebilir.
 */
export async function getAnchorPhone(): Promise<string> {
  if (typeof window === "undefined") return "";
  try {
    const { getLocalSession } = await import("@/lib/chat/local-auth");
    const local = getLocalSession();
    if (local?.phone) return local.phone;
  } catch {
    /* yoksay */
  }
  try {
    const { getPhone } = await import("@/lib/chat/profile");
    const stored = getPhone();
    if (stored) return stored;
  } catch {
    /* yoksay */
  }
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    const raw = data.user?.phone?.trim();
    if (raw) return raw.startsWith("+") ? raw : `+${raw}`;
  } catch {
    /* çevrimdışı */
  }
  return "";
}

/**
 * Kişi kimliğini numaraya sabitler ve önceki (cihaz tabanlı) kimliği
 * döndürür — geriye dönük göç için kullanılır.
 */
export async function anchorIdentityToPhone(
  e164: string,
): Promise<{ personId: string; previous: string; changed: boolean }> {
  const previous = getStoredPersonId();
  const personId = await personIdFromPhone(e164);
  setStoredPersonId(personId);
  setStoredPhoneHash(await phoneHash(e164));
  return { personId, previous, changed: previous !== personId };
}
