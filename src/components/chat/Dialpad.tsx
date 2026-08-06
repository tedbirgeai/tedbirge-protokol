import { useMemo, useState } from "react";
import { Delete, Phone, X } from "lucide-react";

import { pressFeedback } from "@/lib/chat/sounds";
import { useContacts } from "@/lib/chat/contacts";
import { normalizePhone } from "@/lib/chat/directory";

const KEYS: { d: string; letters?: string }[] = [
  { d: "1" },
  { d: "2", letters: "ABC" },
  { d: "3", letters: "DEF" },
  { d: "4", letters: "GHI" },
  { d: "5", letters: "JKL" },
  { d: "6", letters: "MNO" },
  { d: "7", letters: "PQRS" },
  { d: "8", letters: "TUV" },
  { d: "9", letters: "WXYZ" },
  { d: "*" },
  { d: "0", letters: "+" },
  { d: "#" },
];

/**
 * TUŞ TAKIMI
 * ------------------------------------------------------------------
 * WhatsApp tuş takımı ölçüleriyle birebir: 72px daireler, üstte
 * yazılan numara, altta yeşil arama düğmesi. Numara rehberdeki bir
 * kişiyle eşleşirse doğrudan o kişi aranır.
 */
export function Dialpad({
  open,
  onClose,
  onCall,
}: {
  open: boolean;
  onClose: () => void;
  onCall: (peerId: string, video: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const { contacts } = useContacts();

  const match = useMemo(() => {
    const e164 = normalizePhone(value, "90");
    if (!e164 || value.length < 6) return null;
    return (
      contacts.find((c) => c.displayName && (c.phone === e164 || c.phone === value)) ?? null
    );
  }, [contacts, value]);

  if (!open) return null;

  return (
    <div className="wa fixed inset-0 z-[70] flex flex-col" style={{ background: "var(--wa-panel)" }}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--wa-border)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
          style={{ color: "var(--wa-muted)" }}
          aria-label="Kapat"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-[17px] font-semibold" style={{ color: "var(--wa-text)" }}>
          Tuş takımı
        </p>
        <span className="h-10 w-10" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-between overflow-y-auto px-6 py-4">
        <div className="flex min-h-[72px] w-full flex-col items-center justify-center">
          <p
            className="w-full truncate text-center text-[30px] font-light tracking-wide"
            style={{ color: "var(--wa-text)" }}
          >
            {value || " "}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: "var(--wa-muted)" }}>
            {match ? match.displayName : value ? "Rehberde kayıtlı değil" : "Numara girin"}
          </p>
        </div>

        <div className="grid w-full max-w-[300px] grid-cols-3 gap-x-6 gap-y-3">
          {KEYS.map((k) => (
            <button
              key={k.d}
              type="button"
              onClick={() => {
                pressFeedback();
                setValue((v) => (v.length > 20 ? v : v + k.d));
              }}
              className="wa-press mx-auto flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full"
              style={{ background: "var(--wa-panel-soft)", color: "var(--wa-text)" }}
            >
              <span className="text-[28px] font-normal leading-none">{k.d}</span>
              {k.letters && (
                <span className="mt-0.5 text-[10px] tracking-[0.15em]" style={{ color: "var(--wa-muted)" }}>
                  {k.letters}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid w-full max-w-[300px] grid-cols-3 items-center py-3">
          <span />
          <button
            type="button"
            disabled={!match}
            onClick={() => {
              if (!match) return;
              pressFeedback();
              onClose();
              onCall(match.peerId, false);
            }}
            className="wa-press mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white disabled:opacity-40"
            style={{ background: "var(--wa-accent)" }}
            aria-label="Ara"
          >
            <Phone className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              setValue((v) => v.slice(0, -1));
            }}
            className="wa-press mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Sil"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
