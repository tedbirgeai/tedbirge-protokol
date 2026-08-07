import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Share2 } from "lucide-react";

import { Avatar } from "@/components/chat/Avatar";
import { pressFeedback } from "@/lib/chat/sounds";

/**
 * "QR KODU" EKRANI
 * ------------------------------------------------------------------
 * WhatsApp düzeni: başlık + paylaş, beyaz kart içinde avatar, ad ve
 * karekod, altta "Tara" ve "QR kodunu sıfırla". Kimlik bağlantısı
 * mevcut davet adresinden üretilir; yeni iş mantığı yoktur.
 */
export function QrCodeSheet({
  open,
  onClose,
  name,
  avatar,
  personId,
  onShare,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  avatar?: string | undefined;
  personId: string;
  onShare: () => void;
  onScan: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!open) return;
    const url = `${window.location.origin}/chat?kisi=${encodeURIComponent(personId)}${
      nonce ? `&r=${nonce}` : ""
    }`;
    let alive = true;
    void QRCode.toDataURL(url, { margin: 1, width: 320 }).then((data) => {
      if (alive) setQr(data);
    });
    return () => {
      alive = false;
    };
  }, [open, personId, nonce]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="QR kodu"
        className="flex max-h-[92dvh] w-full max-w-[420px] flex-col overflow-hidden rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:rounded-3xl"
        style={{ background: "var(--wa-panel-soft)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-center gap-2 px-3 py-3"
          style={{ background: "var(--wa-panel)", borderBottom: "1px solid var(--wa-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: "var(--wa-text)" }}
            aria-label="Geri"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="min-w-0 flex-1 text-center text-[17px] font-bold" style={{ color: "var(--wa-text)" }}>
            QR kodu
          </p>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              onShare();
            }}
            className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: "var(--wa-text)" }}
            aria-label="Paylaş"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div
            className="flex flex-col items-center gap-3 rounded-3xl px-5 pb-8 pt-10"
            style={{ background: "var(--wa-panel)" }}
          >
            <div className="-mt-16">
              <Avatar name={name} src={avatar} size={88} />
            </div>
            <p className="text-[22px] font-bold" style={{ color: "var(--wa-text)" }}>
              {name}
            </p>
            <p className="text-[15px]" style={{ color: "var(--wa-muted)" }}>
              Tedbirge kişisi
            </p>
            {qr && <img src={qr} alt="Kimlik karekodu" className="mt-4 h-56 w-56" />}
          </div>

          <p className="px-2 pt-5 text-center text-[15px]" style={{ color: "var(--wa-muted)" }}>
            QR kodunuz size özeldir. Paylaştığınız kişiler Tedbirge kamerasıyla bu kodu tarayıp
            sizi kişi olarak ekleyebilir.
          </p>

          <button
            type="button"
            onClick={() => {
              pressFeedback();
              onScan();
            }}
            className="wa-press mt-6 h-14 w-full rounded-full text-[17px] font-bold text-white"
            style={{ background: "var(--wa-accent)" }}
          >
            Tara
          </button>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setNonce(Date.now());
            }}
            className="wa-press mt-3 h-12 w-full rounded-full text-[16px] font-bold"
            style={{ color: "var(--wa-accent)" }}
          >
            QR kodunu sıfırla
          </button>
        </div>
      </div>
    </div>
  );
}
