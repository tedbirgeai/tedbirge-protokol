/**
 * TEK BAŞLIK KAYNAĞI — safeTitleOf()
 * ------------------------------------------------------------------
 * Arayüzdeki her başlık (sohbet listesi, son sohbetler, İlet penceresi,
 * bildirim, arama ekranı, arşiv, medya galerisi) bu fonksiyondan geçer.
 * Kural: mob-…, TBG-…, node_…, ham hash gibi teknik kimlikler asla
 * kullanıcıya gösterilmez. Adı bilinmeyen kayıtlar listelenmez —
 * bunun kontrolü için `isNamed()` kullanılır.
 */

import { contactLabel } from "@/lib/chat/contacts";
import { resolveDisplayName } from "@/lib/chat/name-resolver";
import { humanName, isTechnicalLabel } from "@/lib/chat/display-name";

export type TitleLike = {
  id?: string;
  group?: boolean;
  title?: string;
  members?: string[];
};

export const UNKNOWN_TITLE = "Tedbirge kullanıcısı";

/** Tek bir eş kimliği için görünür ad. */
export function safeNameOf(peerId: string | undefined | null, hint?: string): string {
  if (!peerId) return humanName(hint, UNKNOWN_TITLE);
  // TEK KANAL: kişi kimliği üzerinden çözülen ad her zaman önceliklidir.
  const resolved = resolveDisplayName(peerId);
  if (resolved) return resolved;
  return humanName(contactLabel(peerId, hint ?? ""), UNKNOWN_TITLE);
}

/**
 * KENDİNİZE NOT — kalıcı "Tedbirge kullanıcısı" hayaletinin kök nedeni.
 * Not defterinin tek üyesi kendi cihaz kimliğimdir (mob-…); bu kimlik
 * rehberde bulunmadığı için başlık nötr yer tutucuya düşüyor, kayıt da
 * her filtreden muaf olduğu için listede hayalet satır olarak kalıyordu.
 * Başlık artık bu tek noktada sabitlenir.
 */
export const SELF_CONV_TITLE = "Kendinize not";
const SELF_ID = "self_notes";

/** Sohbet başlığı — grup adı ya da rehberdeki kişi adı. */
export function safeTitleOf(conv: TitleLike | null | undefined): string {
  if (!conv) return UNKNOWN_TITLE;
  if (conv.id === SELF_ID) return SELF_CONV_TITLE;
  if (conv.group) return humanName(conv.title, "Grup");
  const first = conv.members?.[0];
  return safeNameOf(first, conv.title);
}

/** Başlık gerçekten bir insan adı mı? (Listelemede filtre olarak kullanılır.) */
export function isNamed(conv: TitleLike | null | undefined): boolean {
  if (!conv) return false;
  if (conv.id === SELF_ID) return true;
  if (conv.group) return !isTechnicalLabel(conv.title);
  const first = conv.members?.[0];
  if (first && resolveDisplayName(first)) return true;
  const label = first ? contactLabel(first, conv.title ?? "") : (conv.title ?? "");
  return !isTechnicalLabel(label);
}
