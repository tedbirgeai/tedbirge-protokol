/** Sunucu tarafı davet yardımcıları (istemci paketine girmez). */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Kriptografik rastgele, okunaklı tek kullanımlık davet anahtarı. */
export function newEnrollmentToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i % 5 === 4 && i !== bytes.length - 1) out += "-";
  }
  return out;
}
