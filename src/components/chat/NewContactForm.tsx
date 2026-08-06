/**
 * YENİ KİŞİ — WhatsApp mantığında elle kişi ekleme.
 * ------------------------------------------------------------------
 * Ad · Soyadı · Ülke kodu · Telefon. Numara cihazda saklanır, ağa
 * yalnızca geri döndürülemez özeti gider (KVKK m.4 veri minimizasyonu).
 * Kişi Tedbirge'de kayıtlıysa hemen eşleşir; değilse davet edilebilir
 * kayıt olarak durur ve katıldığı an kendiliğinden görünür.
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Phone, User, X } from "lucide-react";

import { importContacts, loadLocalBook, normalizePhone, saveLocalBook } from "@/lib/chat/directory";
import { pressFeedback } from "@/lib/chat/sounds";

const COUNTRIES = [
  { code: "90", label: "TR +90" },
  { code: "49", label: "DE +49" },
  { code: "44", label: "GB +44" },
  { code: "1", label: "US +1" },
  { code: "31", label: "NL +31" },
  { code: "971", label: "AE +971" },
];

export function NewContactForm({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (peerId: string, name: string) => void;
}) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [code, setCode] = useState("90");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFirst("");
    setLast("");
    setPhone("");
    setBusy(false);
    const t = window.setTimeout(() => firstRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const save = async () => {
    const name = `${first.trim()} ${last.trim()}`.trim();
    if (!name) {
      toast.error("Kişinin adını yazın.");
      return;
    }
    const e164 = normalizePhone(phone, code);
    if (!e164) {
      toast.error("Telefon numarası geçersiz. Örnek: 532 000 00 00");
      return;
    }
    setBusy(true);
    try {
      // Kopya kişi yasağı: aynı numara varsa kayıt güncellenir, yenisi açılmaz.
      const book = loadLocalBook().filter((c) => c.phone !== e164);
      saveLocalBook([...book, { name, phone: e164 }]);
      const result = await importContacts([...book, { name, phone: e164 }]);
      const hit = result.people.find((p) => p.name.trim() === name);
      if (hit) {
        toast.success(`${name} Tedbirge'de bulundu. Sohbet açılabilir.`);
        onSaved?.(hit.peerId, hit.name);
      } else {
        toast.success(`${name} rehberinize eklendi. Tedbirge'ye katıldığında görünecek.`);
      }
      onClose();
    } catch {
      toast.error("Kişi kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-black/40 md:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Yeni kişi"
        className="wa max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:rounded-3xl"
        style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--wa-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="wa-press flex h-9 w-9 items-center justify-center rounded-full"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-[18px] font-bold">Yeni kişi</p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <Field icon={<User className="h-4 w-4" />}>
            <input
              ref={firstRef}
              value={first}
              onChange={(e) => setFirst(e.target.value.slice(0, 40))}
              placeholder="Ad"
              className="w-full bg-transparent py-2 text-[16px] outline-none"
              style={{ color: "var(--wa-text)" }}
              aria-label="Ad"
            />
          </Field>
          <Field>
            <input
              value={last}
              onChange={(e) => setLast(e.target.value.slice(0, 40))}
              placeholder="Soyadı"
              className="w-full bg-transparent py-2 text-[16px] outline-none"
              style={{ color: "var(--wa-text)" }}
              aria-label="Soyadı"
            />
          </Field>
          <Field icon={<Phone className="h-4 w-4" />}>
            <div className="flex w-full items-center gap-3">
              <select
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-transparent py-2 text-[15px] outline-none"
                style={{ color: "var(--wa-text)" }}
                aria-label="Ülke kodu"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.slice(0, 20))}
                inputMode="tel"
                placeholder="Telefon"
                className="min-w-0 flex-1 bg-transparent py-2 text-[16px] outline-none"
                style={{ color: "var(--wa-text)" }}
                aria-label="Telefon"
              />
            </div>
          </Field>

          <p className="text-[12px]" style={{ color: "var(--wa-muted)" }}>
            Numara bu cihazda kalır. Eşleştirme için sunucuya yalnızca geri döndürülemez özeti
            gönderilir; kişi listeniz yalnızca size görünür.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              pressFeedback();
              void save();
            }}
            className="wa-press w-full rounded-full py-3 text-[16px] font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--wa-accent)" }}
          >
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 shrink-0" style={{ color: "var(--wa-muted)" }} aria-hidden>
        {icon}
      </span>
      <div
        className="min-w-0 flex-1"
        style={{ borderBottom: "1px solid var(--wa-border)" }}
      >
        {children}
      </div>
    </div>
  );
}
