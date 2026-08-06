/**
 * AÇILIŞ EKRANI (Splash)
 * ------------------------------------------------------------------
 * WhatsApp Web/mobil ilk açılış mantığı: uygulama yerel veriyi
 * (IndexedDB) hazırlarken kullanıcıya boş/yarım arayüz gösterilmez;
 * marka işareti, ince ilerleme çubuğu ve gizlilik güvencesi görünür.
 * Aynı bileşen mobil ve masaüstünde kullanılır — tek kaynak.
 */

import { Lock } from "lucide-react";

export function SplashScreen({ label = "Yükleniyor…" }: { label?: string }) {
  return (
    <div
      className="wa fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8"
      style={{ background: "var(--wa-panel)" }}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-black tracking-tight text-white"
        style={{ background: "var(--wa-accent)" }}
        aria-hidden
      >
        TB
      </div>

      <p className="text-[17px] font-semibold" style={{ color: "var(--wa-text)" }}>
        Tedbirge
      </p>

      <div
        className="h-[3px] w-56 overflow-hidden rounded-full"
        style={{ background: "var(--wa-border)" }}
      >
        <div className="tb-splash-bar h-full w-1/3 rounded-full" style={{ background: "var(--wa-accent)" }} />
      </div>

      <p className="sr-only">{label}</p>

      <p
        className="absolute bottom-10 flex items-center gap-1.5 text-[12px]"
        style={{ color: "var(--wa-muted)" }}
      >
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Uçtan uca şifreli · verileriniz cihazınızda kalır
      </p>
    </div>
  );
}
