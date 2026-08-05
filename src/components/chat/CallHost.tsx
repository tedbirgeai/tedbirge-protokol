import { useEffect } from "react";
import { CallOverlay } from "@/components/chat/CallOverlay";

/**
 * Küresel çağrı/mesaj alıcısı.
 * ------------------------------------------------------------------
 * Gelen arama ve mesajlar yalnız /chat sayfası açıkken değil, uygulamanın
 * HERHANGİ bir sayfası açıkken karşılanır. Telefon mantığı budur: hat
 * açıksa telefon çalar. Bu bileşen açılışta düğümü başlatır, mesh veri
 * yolunu ve arama motorunu kurar, gelen çağrıyı tam ekran gösterir.
 */
export function CallHost() {
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        const [{ bootCalls }, { startNode }, chat] = await Promise.all([
          import("@/lib/call/engine"),
          import("@/lib/node-runtime"),
          import("@/lib/chat/engine"),
        ]);
        // Arama motoru her koşulda kurulur; ağ başlatma başarısız olsa bile
        // arama ekranı çalışır.
        bootCalls();
        await startNode();
        await chat.bootChat();
        // Cihaz değişse de numaradan bulunabilirlik korunur. Oturum soğuk
        // açılışta henüz yüklenmemişse auth olayı geldiğinde tekrar kaydedilir.
        const { supabase } = await import("@/integrations/supabase/client");
        const syncDirectory = async () => {
          if (disposed) return;
          const [{ syncPersonIdentity, getBrowserNodeId }, profile, queue] = await Promise.all([
            import("@/lib/browser-node"),
            import("@/lib/chat/profile"),
            import("@/lib/chat/enroll-queue"),
          ]);
          // Katılım kaydı önce cihazda kuyruğa alınır: çevrimdışı katılan
          // kullanıcı da ağ gelince kendiliğinden dizine yazılır.
          const personId = await syncPersonIdentity();
          queue.queueEnrollment({
            personId,
            nodeId: getBrowserNodeId(),
            ...(profile.getAlias() ? { displayName: profile.getAlias() } : {}),
          });
          await queue.flushEnrollment().catch(() => "queued" as const);

          const { ensureCloudSession } = await import("@/lib/chat/history-sync");
          const cloudReady = await ensureCloudSession();
          if (!cloudReady) return;
          // Rehber kalıcılığı: uygulama silinip yeniden kurulsa da şifreli
          // yedekten geri gelir, sonrasında güncel hâli tekrar yedeklenir.
          // Çıpa numarası yerel oturumdan da okunur; böylece bulut oturumu
          // olmayan cihazlar da aynı hesapta birleşir.
          const { getAnchorPhone } = await import("@/lib/chat/anchor");
          const phone = (await getAnchorPhone()) || profile.getPhone();
          if (phone) {
            const vault = await import("@/lib/chat/vault");
            await vault.restoreContacts(phone);
            const { autoSyncContacts } = await import("@/lib/chat/directory");
            await autoSyncContacts();
            await vault.backupContacts(phone);
          }

        };
        await syncDirectory().catch((error) => console.error("[sync] açılış eşitlemesi başarısız", error));
        // Otonom eşitleme: ön plana gelişte, ağ dönüşünde ve 6 saatte bir.
        const { startDirectorySync } = await import("@/lib/chat/enroll-queue");
        const stopSync = startDirectorySync();
        const auth = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            void syncDirectory().catch((error) =>
              console.error("[sync] oturum eşitlemesi başarısız", error),
            );
          }
        });
        unsubscribe = () => {
          stopSync();
          auth.data.subscription.unsubscribe();
        };
      } catch {
        /* tarayıcı kısıtlaması: sohbet sayfası yine de kendi başlatmasını yapar */
      }
    })();
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  return <CallOverlay />;
}

