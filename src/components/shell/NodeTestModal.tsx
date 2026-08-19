/**
 * INTERACTIVE NODE TEST
 * ------------------------------------------------------------------
 * Başka bir cihazı saniyeler içinde düğüme dönüştürmek için QR kod
 * gösterir. Kod okutulduğunda cihaz aynı ağ oturumuna katılır.
 */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X } from "lucide-react";

export function NodeTestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [src, setSrc] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const target = `${window.location.origin}/saha`;
    setUrl(target);
    void QRCode.toDataURL(target, { width: 320, margin: 1 }).then(setSrc).catch(() => setSrc(""));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-2xl border border-cyan-500/25 bg-slate-900/85 p-6 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center justify-center gap-2 text-cyan-400">
          <QrCode className="h-5 w-5" />
          <h2 className="text-base font-semibold">Interactive Node Test</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Kodu ikinci bir cihazla okutun; cihaz indirme gerektirmeden aktif bir Web-Node olarak ağa
          katılır.
        </p>
        {src ? (
          <img
            src={src}
            alt="Düğüm katılım QR kodu"
            className="mx-auto mt-4 h-52 w-52 rounded-xl bg-white p-2"
          />
        ) : (
          <div className="mx-auto mt-4 h-52 w-52 animate-pulse rounded-xl bg-slate-800" />
        )}
        <p className="mt-3 break-all font-mono text-[11px] text-slate-500">{url}</p>
      </div>
    </div>
  );
}
