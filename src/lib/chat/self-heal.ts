/**
 * AÇILIŞ SAĞLIK DENETİMİ VE OTONOM ONARIM
 * ------------------------------------------------------------------
 * Uygulama her açılışta kendini denetler: kimlik, yerel depo, kasa,
 * eşitleme ve bildirim katmanı. Onarılabilen sorun sessizce onarılır;
 * onarılamayan sorun tek cümlelik, jargonsuz bir Türkçe öneriyle
 * kullanıcıya bildirilir. Sessiz hata yasaktır — her adım eşitleme
 * günlüğüne yazılır.
 */

import { idbAvailable, openDb, requestPersistentStorage } from "@/lib/store/idb";
import { getAlias, getPhone } from "@/lib/chat/profile";
import { getStoredPersonId } from "@/lib/chat/anchor";
import { logSync } from "@/lib/chat/sync-log";

export type HealthIssue = {
  /** Kısa başlık — kullanıcıya gösterilir. */
  title: string;
  /** Tek cümlelik Türkçe çözüm önerisi. */
  advice: string;
  /** Kendiliğinden onarıldı mı? */
  repaired: boolean;
};

export type HealthReport = {
  at: number;
  ok: boolean;
  issues: HealthIssue[];
};

let last: HealthReport | null = null;

export function getHealthReport(): HealthReport | null {
  return last;
}

/** Açılış denetimi — sonuç arayüzde gösterilebilir. */
export async function runSelfHeal(): Promise<HealthReport> {
  const issues: HealthIssue[] = [];

  // 1) Yerel depo
  if (!idbAvailable()) {
    issues.push({
      title: "Yerel depolama kapalı",
      advice: "Tarayıcınız gizli moddaysa normal pencerede açın; mesajlar aksi halde kalıcı olmaz.",
      repaired: false,
    });
  } else {
    try {
      const db = await openDb();
      db.close();
      await requestPersistentStorage().catch(() => false);
    } catch (error) {
      issues.push({
        title: "Mesaj deposu açılamadı",
        advice: "Uygulamanın başka bir sekmesini kapatıp bu sayfayı yenileyin.",
        repaired: false,
      });
      logSync("hata", "Yerel depo açılamadı", String(error));
    }
  }

  // 2) Kimlik
  if (!getAlias().trim()) {
    issues.push({
      title: "Görünen adınız boş",
      advice: "Ayarlar → Profil bölümünden adınızı yazın; karşı taraf sizi bu adla görür.",
      repaired: false,
    });
  }
  if (!getPhone().trim() || !getStoredPersonId()) {
    issues.push({
      title: "Kimlik numaraya bağlı değil",
      advice: "Numaranızı doğrulayın; tüm cihazlarınız aynı hesapta birleşsin.",
      repaired: false,
    });
  }

  // 3) Kasa ve eşitleme — bulut oturumu kendiliğinden tazelenir.
  try {
    const { ensureCloudSession, scheduleHistorySync } = await import("@/lib/chat/history-sync");
    const ok = await ensureCloudSession();
    if (ok) scheduleHistorySync(2_000);
    else
      issues.push({
        title: "Cihazlar arası eşitleme bekliyor",
        advice: "İnternete bağlandığınızda geçmişiniz kendiliğinden eşitlenecek.",
        repaired: false,
      });
  } catch (error) {
    logSync("uyarı", "Eşitleme denetimi başarısız", String(error));
  }

  // 4) Rehber otonom onarımı — mükerrer kişi kartları ve adsız hayalet
  // kayıtlar kullanıcı hiçbir şey yapmadan sessizce birleştirilir/temizlenir.
  try {
    const { mergePersonDuplicates, pruneGhostContacts, pruneGhostConversations } =
      await import("@/lib/chat/merge");
    const { pruneCallLog } = await import("@/lib/chat/call-log");
    const merged = await mergePersonDuplicates();
    const pruned = await pruneGhostContacts();
    // Adsız/kendi cihazıma ait hayalet sohbet ve arama kayıtları budanır:
    // "Tedbirge kullanıcısı" satırı listede hiç oluşmaz.
    const ghostConvs = await pruneGhostConversations().catch(() => 0);
    const ghostCalls = await pruneCallLog().catch(() => 0);
    if (merged || pruned || ghostConvs || ghostCalls) {
      const { refreshContacts } = await import("@/lib/chat/contacts");
      await refreshContacts();
      issues.push({
        title: "Rehber kendiliğinden düzeltildi",
        advice: `${merged} mükerrer kişi birleştirildi, ${pruned + ghostConvs + ghostCalls} boş kayıt kaldırıldı — yapmanız gereken bir şey yok.`,
        repaired: true,
      });
    }
  } catch (error) {
    logSync("uyarı", "Rehber onarımı yapılamadı", String(error));
  }

  // 5) Bildirim katmanı
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      issues.push({
        title: "Bildirimler kapalı",
        advice:
          "Tarayıcı ayarlarından bildirimlere izin verin; aksi halde gelen aramayı duymazsınız.",
        repaired: false,
      });
    }
  } catch {
    /* bildirim API'si yok — sorun değil */
  }

  // Kendiliğinden onarılan maddeler "sorun" sayılmaz; kullanıcıya yalnızca
  // bilgi olarak görünür.
  const open = issues.filter((i) => !i.repaired);
  last = { at: Date.now(), ok: open.length === 0, issues };

  logSync(
    open.length ? "uyarı" : "bilgi",
    "Açılış sağlık denetimi",
    issues.length ? issues.map((i) => i.title).join(" · ") : "Her şey yolunda",
  );

  return last;
}
