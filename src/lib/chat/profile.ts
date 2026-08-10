/**
 * Kimlik profili — takma ad (alias) ve sıfır sürtünmeli katılım.
 * Kriptografik kimlik arka planda otomatik üretilir; kullanıcıdan
 * yalnızca görünen ad istenir.
 */

const ALIAS_KEY = "tedbirge.chat.alias";
const ONBOARD_KEY = "tedbirge.chat.onboarded";
const PHONE_KEY = "tedbirge.chat.phone";
const EMAIL_KEY = "tedbirge.chat.email";

/** İsteğe bağlı e-posta — yalnızca bu cihazda saklanır. */
export function getEmail(): string {
  try {
    return window.localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setEmail(email: string) {
  try {
    const clean = email.trim().slice(0, 120);
    if (clean) window.localStorage.setItem(EMAIL_KEY, clean);
    else window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* gizli mod */
  }
}

/** Doğrulanmış telefon numarası (E.164) — yalnızca bu cihazda saklanır. */
export function getPhone(): string {
  try {
    return window.localStorage.getItem(PHONE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPhone(e164: string) {
  try {
    window.localStorage.setItem(PHONE_KEY, e164);
  } catch {
    /* gizli mod */
  }
}

export function getAlias(): string {
  try {
    return window.localStorage.getItem(ALIAS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAlias(alias: string) {
  try {
    window.localStorage.setItem(ALIAS_KEY, alias.trim().slice(0, 32));
    window.localStorage.setItem(ONBOARD_KEY, "1");
  } catch {
    /* gizli mod */
  }
}

/**
 * Kurulum tamamlandı sayılması için AD ve NUMARA gerekir. Numara,
 * kimliğin çıpasıdır: aynı numarayla açılan her ortam (Chrome, Edge,
 * PWA, iOS, Android) aynı kişi kimliğine bağlanır ve rehber kasası
 * kendiliğinden birleşir. Numarası olmayan eski cihazlar bir kez
 * numara ekranına düşer; hiçbir veri kaybolmaz, kayıtlar yeni kişi
 * kimliğine taşınır.
 */
export function isOnboarded(): boolean {
  try {
    if (window.localStorage.getItem(ONBOARD_KEY) !== "1") return false;
    if (getAlias().length === 0) return false;
    return getPhone().length > 0;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------
 * Görünür profil alanları (yalnızca bu cihazda saklanır):
 * "Hakkımda" durumu ve isteğe bağlı kullanıcı adı.
 * ----------------------------------------------------------------- */
const ABOUT_KEY = "tedbirge.chat.about";
const USERNAME_KEY = "tedbirge.chat.username";

export function getAbout(): string {
  try {
    return window.localStorage.getItem(ABOUT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAbout(text: string) {
  try {
    const clean = text.trim().slice(0, 139);
    if (clean) window.localStorage.setItem(ABOUT_KEY, clean);
    else window.localStorage.removeItem(ABOUT_KEY);
  } catch {
    /* gizli mod */
  }
}

export function getUsername(): string {
  try {
    return window.localStorage.getItem(USERNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setUsername(name: string) {
  try {
    const clean = name.trim().replace(/^@+/, "").slice(0, 30);
    if (clean) window.localStorage.setItem(USERNAME_KEY, clean);
    else window.localStorage.removeItem(USERNAME_KEY);
  } catch {
    /* gizli mod */
  }
}
