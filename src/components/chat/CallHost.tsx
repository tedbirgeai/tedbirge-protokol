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
          const { data } = await supabase.auth.getSession();
          if (!data.session) return;
          const [{ syncPersonIdentity, getBrowserNodeId }, { syncMyDirectoryEntry }, profile] =
            await Promise.all([
              import("@/lib/browser-node"),
              import("@/lib/directory.functions"),
              import("@/lib/chat/profile"),
            ]);
          const personId = await syncPersonIdentity();
          await syncMyDirectoryEntry({
            data: {
              personId,
              nodeId: getBrowserNodeId(),
              displayName: profile.getAlias() || undefined,
            },
          });
          // Rehber kalıcılığı: uygulama silinip yeniden kurulsa da şifreli
          // yedekten geri gelir, sonrasında güncel hâli tekrar yedeklenir.
          const phone = profile.getPhone();
          if (phone) {
            const vault = await import("@/lib/chat/vault");
            await vault.restoreContacts(phone).catch(() => 0);
            await vault.backupContacts(phone).catch(() => false);
          }
          // Otonom eşleştirme: saklı rehber her açılışta yeniden taranır,
          // yeni katılan tanıdıklar elle iş yapılmadan rehbere düşer.
          const { autoSyncContacts } = await import("@/lib/chat/directory");
          await autoSyncContacts().catch(() => null);



        };
        await syncDirectory().catch(() => undefined);
        const auth = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) void syncDirectory().catch(() => undefined);
        });
        unsubscribe = () => auth.data.subscription.unsubscribe();
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

