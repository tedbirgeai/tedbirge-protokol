import { useEffect, useState } from "react";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [{ bootCalls }, { startNode }, chat] = await Promise.all([
          import("@/lib/call/engine"),
          import("@/lib/node-runtime"),
          import("@/lib/chat/engine"),
        ]);
        // Düğüm her sayfada çalışır: aksi halde karşı taraf "erişilemez" görünür.
        await startNode();
        await chat.bootChat();
        bootCalls();
        if (!cancelled) setReady(true);
      } catch {
        /* tarayıcı kısıtlaması: sohbet sayfası yine de kendi başlatmasını yapar */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <CallOverlay />;
}
