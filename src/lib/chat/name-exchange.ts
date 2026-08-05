/**
 * AD TALEBİ / AD BEYANI PROTOKOLÜ (name-exchange)
 * ------------------------------------------------------------------
 * Sorun: aynı kişi bir cihazda "TÜRKAN DİNÇ", başka bir cihazda
 * "Tedbirge kullanıcısı" görünüyordu. Sebep: ad yalnızca eşleşmenin
 * yapıldığı cihazda kayıtlıydı.
 *
 * Çözüm: adı çözülemeyen her eşe küçük bir "ad talebi" gönderilir.
 * Karşı taraf kendi görünen adını ve numara-çıpalı kişi kimliğini
 * (personId) yanıtlar. Gelen ad tek ad kanalına (name-resolver)
 * yazılır; böylece geçmiş sohbet ve arama kayıtlarının başlıkları
 * geriye dönük olarak düzelir.
 *
 * KVKK: yalnızca kullanıcının kendi belirlediği görünen ad paylaşılır;
 * ham telefon numarası ya da rehber içeriği ağa çıkmaz.
 */

import { sendMesh } from "@/lib/node-runtime";
import { getAlias } from "@/lib/chat/profile";
import { getStoredPersonId } from "@/lib/chat/anchor";
import {
  linkNodeToPerson,
  resolveDisplayName,
  writeClaimedName,
} from "@/lib/chat/name-resolver";
import { logSync } from "@/lib/chat/sync-log";

export type NameExchange = {
  t: "name-req" | "name-res";
  alias?: string;
  personId?: string;
};

export function isNameExchange(value: unknown): value is NameExchange {
  const t = (value as { t?: unknown } | null)?.t;
  return t === "name-req" || t === "name-res";
}

/** Aynı eşe dakikada bir defadan sık ad talebi gönderilmez. */
const ASK_COOLDOWN_MS = 60_000;
const askedAt = new Map<string, number>();

/** Adı bilinmeyen eşe ad talebi gönderir. */
export async function requestNameFrom(peerId: string): Promise<void> {
  if (!peerId) return;
  const now = Date.now();
  if (now - (askedAt.get(peerId) ?? 0) < ASK_COOLDOWN_MS) return;
  askedAt.set(peerId, now);
  try {
    await sendMesh("chat", peerId, {
      t: "name-req",
      alias: getAlias(),
      personId: getStoredPersonId(),
    } satisfies NameExchange);
  } catch (error) {
    logSync("uyarı", "Ad talebi gönderilemedi", String(error));
  }
}

/** Gelen ad talebine kendi görünen adımızla yanıt verir. */
export async function answerNameTo(peerId: string): Promise<void> {
  const alias = getAlias();
  if (!peerId || !alias) return;
  try {
    await sendMesh("chat", peerId, {
      t: "name-res",
      alias,
      personId: getStoredPersonId(),
    } satisfies NameExchange);
  } catch (error) {
    logSync("uyarı", "Ad beyanı gönderilemedi", String(error));
  }
}

/** Bilinen tüm eşlere adımızı duyurur (açılışta ve ad değiştiğinde). */
export async function announceName(): Promise<void> {
  const alias = getAlias();
  if (!alias) return;
  try {
    await sendMesh("chat", "*", {
      t: "name-res",
      alias,
      personId: getStoredPersonId(),
    } satisfies NameExchange);
  } catch (error) {
    logSync("uyarı", "Ad duyurusu gönderilemedi", String(error));
  }
}

/**
 * Karşı taraftan gelen adı tek ad kanalına yazar.
 * @returns Arayüzün tazelenmesi gerekiyorsa true.
 */
export function applyRemoteName(
  nodeId: string,
  alias?: string,
  personId?: string,
): boolean {
  if (!nodeId) return false;
  let changed = false;
  if (personId && personId !== nodeId) {
    linkNodeToPerson(nodeId, personId);
    changed = true;
  }
  const clean = (alias ?? "").trim();
  if (clean && resolveDisplayName(nodeId) !== clean) {
    writeClaimedName(nodeId, clean);
    changed = true;
  }
  return changed;
}
