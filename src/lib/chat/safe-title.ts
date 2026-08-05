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
import { humanName, isTechnicalLabel } from "@/lib/chat/display-name";

export type TitleLike = {
  id?: string;
  group?: boolean;
  title?: string;
  members?: string[];
};

export const UNKNOWN_TITLE = "Kayıtsız kişi";

/** Tek bir eş kimliği için görünür ad. */
export function safeNameOf(peerId: string | undefined | null, hint?: string): string {
  if (!peerId) return humanName(hint, UNKNOWN_TITLE);
  return humanName(contactLabel(peerId, hint ?? ""), UNKNOWN_TITLE);
}

/** Sohbet başlığı — grup adı ya da rehberdeki kişi adı. */
export function safeTitleOf(conv: TitleLike | null | undefined): string {
  if (!conv) return UNKNOWN_TITLE;
  if (conv.group) return humanName(conv.title, "Grup");
  const first = conv.members?.[0];
  return safeNameOf(first, conv.title);
}

/** Başlık gerçekten bir insan adı mı? (Listelemede filtre olarak kullanılır.) */
export function isNamed(conv: TitleLike | null | undefined): boolean {
  if (!conv) return false;
  if (conv.group) return !isTechnicalLabel(conv.title);
  const first = conv.members?.[0];
  const label = first ? contactLabel(first, conv.title ?? "") : (conv.title ?? "");
  return !isTechnicalLabel(label);
}
