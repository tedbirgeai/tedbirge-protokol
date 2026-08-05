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

export function isOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARD_KEY) === "1" && getAlias().length > 0;
  } catch {
    return false;
  }
}
