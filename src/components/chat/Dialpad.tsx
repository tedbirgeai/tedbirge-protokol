import { useEffect, useMemo, useState } from "react";
import { Delete, MessageCircle, Phone, UserPlus, X } from "lucide-react";

import { pressFeedback } from "@/lib/chat/sounds";
import { useContacts } from "@/lib/chat/contacts";
import { hashPhone } from "@/lib/chat/directory";
import { checkPhone } from "@/lib/chat/phone-validate";

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

type NetState = "bos" | "gecersiz" | "araniyor" | "agda" | "agda-degil";

/**
 * TUŞ TAKIMI (WhatsApp/iOS ölçüsü)
 * ------------------------------------------------------------------
 * Numara tuşlanırken anlık olarak (1) biçim doğrulaması, (2) yerel
 * rehber ve (3) ağ dizini sorgulanır. Rehberde varsa ad görünür,
 * yoksa sağ üstte "Ekle" belirir; kişi ağda yoksa "Davet et" çıkar.
 * Yeşil düğme hiçbir ara pencere açmadan doğrudan aramayı başlatır.
 *
 * Sahte numara koruması: yalnız E.164 doğrulamasından geçen ve ağda
 * doğrulanmış özeti bulunan numara aranabilir.
 */
export function Dialpad({
  open,
  onClose,
  onCall,
  onMessage,
  onAddContact,
}: {
  open: boolean;
  onClose: () => void;
  onCall: (peerId: string, video: boolean) => void;
  onMessage?: (peerId: string) => void;
  onAddContact?: (phone: string) => void;
}) {
  const [value, setValue] = useState("");
  const [typedHash, setTypedHash] = useState("");
  const [net, setNet] = useState<NetState>("bos");
  const [netPeer, setNetPeer] = useState<string>("");
  const { contacts } = useContacts();

  const check = useMemo(() => checkPhone(value, "90"), [value]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setNetPeer("");
    if (!value) {
      setTypedHash("");
      setNet("bos");
      return;
    }
    if (!check.ok) {
      setTypedHash("");
      setNet("gecersiz");
      return;
    }
    setNet("araniyor");
    const timer = window.setTimeout(() => {
      void (async () => {
        const h = await hashPhone(check.e164);
        if (!alive) return;
        setTypedHash(h);
        try {
          const { matchDirectoryContacts } = await import("@/lib/directory.functions");
          const res = await matchDirectoryContacts({ data: { hashes: [h] } });
          if (!alive) return;
          const hit = res.matches[0];
          if (hit) {
            setNetPeer(hit.nodeId);
            setNet("agda");
          } else {
            setNet("agda-degil");
          }
        } catch {
          if (alive) setNet("agda-degil");
        }
      })();
    }, 350);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [value, open, check]);

  const match = useMemo(() => {
    if (!typedHash) return null;
    return contacts.find((c) => c.displayName && c.phoneHash === typedHash) ?? null;
  }, [contacts, typedHash]);

  if (!open) return null;

  const target = match?.peerId || netPeer;
  const canAct = Boolean(check.ok && target);

  const hint = (() => {
    if (!value) return "Numara girin";
    if (!check.ok) return check.reason;
    if (match) return match.displayName;
    if (net === "araniyor") return "Sorgulanıyor…";
    if (net === "agda") return "Tedbirge kullanıyor · rehberde kayıtlı değil";
    return "Tedbirge kullanmıyor — davet edin";
  })();

  const invite = () => {
    pressFeedback();
    const text = "Tedbirge ile kesintisiz, uçtan uca şifreli görüşelim: https://tedbirge.com";
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ text }).catch(() => undefined);
    } else {
      void navigator.clipboard?.writeText(text);
    }
  };

  return (
    <div
      className="wa fixed inset-0 z-[70] flex flex-col"
      style={{ background: "var(--wa-panel)" }}
    >
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
        {check.ok && !match ? (
          <button
            type="button"
            onClick={() => {
              pressFeedback();
              onAddContact?.(check.e164);
            }}
            className="wa-press flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2 text-[14px] font-semibold"
            style={{ color: "var(--wa-accent)" }}
            aria-label="Rehbere kaydet"
          >
            <UserPlus className="h-5 w-5" />
            Ekle
          </button>
        ) : (
          <span className="h-10 w-10" />
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-between overflow-y-auto px-6 py-4">
        <div className="flex min-h-[72px] w-full flex-col items-center justify-center">
          <p
            className="w-full truncate text-center text-[30px] font-light tracking-wide"
            style={{ color: "var(--wa-text)" }}
          >
            {value || " "}
          </p>
          <p
            className="mt-1 text-center text-[12px]"
            style={{ color: match ? "var(--wa-accent)" : "var(--wa-muted)" }}
          >
            {hint}
          </p>
          {check.ok && net === "agda-degil" && !match && (
            <button
              type="button"
              onClick={invite}
              className="wa-press mt-2 rounded-full px-4 py-1.5 text-[13px] font-semibold text-white"
              style={{ background: "var(--wa-accent)" }}
            >
              Davet et
            </button>
          )}
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
                <span
                  className="mt-0.5 text-[10px] tracking-[0.15em]"
                  style={{ color: "var(--wa-muted)" }}
                >
                  {k.letters}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid w-full max-w-[300px] grid-cols-3 items-center py-3">
          <button
            type="button"
            disabled={!canAct}
            onClick={() => {
              if (!target) return;
              pressFeedback();
              onClose();
              onMessage?.(target);
            }}
            className="wa-press mx-auto flex h-12 w-12 items-center justify-center rounded-full disabled:opacity-40"
            style={{ background: "var(--wa-panel-soft)", color: "var(--wa-accent)" }}
            aria-label="Mesaj gönder"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
          <button
            type="button"
            disabled={!canAct}
            onClick={() => {
              if (!target) return;
              pressFeedback();
              onClose();
              onCall(target, false);
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
