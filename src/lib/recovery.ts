/**
 * Kurtarma ifadesi (12 kelime — BIP-39 standardı).
 * ------------------------------------------------------------------
 * Cihaz kaybı/değişiminde düğüm kimliğini (Ed25519 + X25519) yeniden
 * kurmak için kullanılır. Kelime listesi paket içinde gömülüdür,
 * çevrimdışıyken de çalışır. İfade sunucuya ASLA gönderilmez.
 */

import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import {
  ensureIdentity,
  restoreIdentityFromEntropy,
  revealSeed,
  type Identity,
} from "@/lib/crypto/identity";

export const RECOVERY_WORD_COUNT = 12;

/** Mevcut düğümün kurtarma ifadesini üretir (yalnızca kullanıcı talebiyle gösterilir). */
export async function getRecoveryPhrase(nodeId: string): Promise<string | null> {
  await ensureIdentity(nodeId);
  const seed = await revealSeed(nodeId);
  if (!seed || seed.length !== 16) return null;
  return entropyToMnemonic(seed, wordlist);
}

export function isValidPhrase(phrase: string): boolean {
  return validateMnemonic(normalizePhrase(phrase), wordlist);
}

export function normalizePhrase(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, " ");
}

/** İfadeden kimliği geri yükler. Hatalı ifade kabul edilmez. */
export async function restoreFromPhrase(nodeId: string, phrase: string): Promise<Identity> {
  const clean = normalizePhrase(phrase);
  if (!validateMnemonic(clean, wordlist)) {
    throw new Error("Kurtarma ifadesi geçersiz. 12 kelimeyi sırasıyla kontrol edin.");
  }
  const entropy = mnemonicToEntropy(clean, wordlist);
  return restoreIdentityFromEntropy(nodeId, entropy);
}

/** Kullanıcının ifadeyi yazdığını doğrulamak için rastgele 3 kelime indeksi seçer. */
export function challengeIndexes(): number[] {
  const set = new Set<number>();
  while (set.size < 3) set.add(Math.floor(Math.random() * RECOVERY_WORD_COUNT));
  return Array.from(set).sort((a, b) => a - b);
}
