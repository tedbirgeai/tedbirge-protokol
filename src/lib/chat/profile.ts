/**
 * Kimlik profili — takma ad (alias) ve sıfır sürtünmeli katılım.
 * Kriptografik kimlik arka planda otomatik üretilir; kullanıcıdan
 * yalnızca görünen ad istenir.
 */

const ALIAS_KEY = "tedbirge.chat.alias";
const ONBOARD_KEY = "tedbirge.chat.onboarded";

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
