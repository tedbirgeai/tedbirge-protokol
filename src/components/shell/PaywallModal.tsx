/**
 * PAYWALL MODALI
 * ------------------------------------------------------------------
 * Ücretsiz katmanda 5 aktif düğüm sınırı aşıldığında çekirdek katmanı
 * `tedbirge:paywall` olayını yayınlar; bu bileşen bulanık arka planlı
 * bilgilendirme kartını açar.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, X } from "lucide-react";

import { FREE_PEER_LIMIT, PAYWALL_EVENT } from "@/lib/peer-limit";

export function PaywallModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onEvent = () => setOpen(true);
    window.addEventListener(PAYWALL_EVENT, onEvent);
    return () => window.removeEventListener(PAYWALL_EVENT, onEvent);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/25 bg-slate-900/85 p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Kapat"
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-base font-semibold">
            Ücretsiz Ağ Limiti Aşıldı ({FREE_PEER_LIMIT}/{FREE_PEER_LIMIT} Peer)
          </h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Tedbirge Web-OS Ücretsiz Katmanı maksimum {FREE_PEER_LIMIT} aktif düğüm bağlantısını
          destekler. Sınırsız P2P veri taşıma, kurumsal orkestrasyon ve kesintisiz katman için
          Kurumsal Lisans&apos;a yükseltin.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/fiyatlandirma"
            onClick={() => setOpen(false)}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Kurumsal Lisansa Yükselt
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
          >
            Düğümleri Yönet / Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
