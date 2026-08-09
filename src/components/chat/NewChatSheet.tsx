import { useMemo, useState } from "react";
import { Search, UserPlus, Users, UsersRound, X } from "lucide-react";

import { Avatar } from "@/components/chat/Avatar";
import { getAvatar } from "@/lib/chat/avatars";
import { useContacts } from "@/lib/chat/contacts";
import { pressFeedback } from "@/lib/chat/sounds";

/**
 * "+" → YENİ SOHBET EKRANI
 * ------------------------------------------------------------------
 * WhatsApp yerleşimi: arama çubuğu, "Yeni grup · Yeni kişi · Yeni
 * topluluk" eylemleri ve altında rehberdeki kişiler. Teknik kimlik
 * (TBG-…) arayüzde gösterilmez.
 */
export function NewChatSheet({
  open,
  onClose,
  onOpenChat,
  onNewGroup,
  onNewContact,
  onNewCommunity,
}: {
  open: boolean;
  onClose: () => void;
  onOpenChat: (peerId: string, name: string) => void;
  onNewGroup: () => void;
  onNewContact: () => void;
  onNewCommunity: () => void;
}) {
  const { contacts } = useContacts();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const named = contacts.filter((c) => c.displayName.trim().length > 0);
    const term = q.trim().toLocaleLowerCase("tr");
    const list = term
      ? named.filter((c) => c.displayName.toLocaleLowerCase("tr").includes(term))
      : named;
    return [...list].sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
  }, [contacts, q]);

  if (!open) return null;

  const actions = [
    { id: "group", label: "Yeni grup", icon: Users, run: onNewGroup },
    { id: "contact", label: "Yeni kişi", icon: UserPlus, run: onNewContact },
    { id: "community", label: "Yeni topluluk", icon: UsersRound, run: onNewCommunity },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Yeni sohbet"
        className="wa wa-scope flex max-h-[92dvh] w-full max-w-[min(28rem,100vw)] flex-col overflow-hidden rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:max-w-md md:rounded-3xl"
        style={{ background: "var(--wa-panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 px-5 py-4"
          style={{ borderBottom: "1px solid var(--wa-border)" }}
        >
          <p className="text-[18px] font-bold" style={{ color: "var(--wa-text)" }}>
            Yeni sohbet
          </p>
          <button
            type="button"
            onClick={onClose}
            className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: "var(--wa-muted)" }}
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 px-4 pb-2 pt-3">
          <div
            className="flex items-center gap-3 rounded-full px-4"
            style={{ background: "var(--wa-panel-soft)", height: 44 }}
          >
            <Search className="h-5 w-5 shrink-0" style={{ color: "var(--wa-muted)" }} aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="İsim ara"
              aria-label="Kişilerde ara"
              className="w-full min-w-0 bg-transparent text-[16px] outline-none"
              style={{ color: "var(--wa-text)" }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                pressFeedback();
                onClose();
                a.run();
              }}
              className="wa-press flex min-h-14 w-full items-center gap-4 px-5 text-left"
              style={{ color: "var(--wa-text)" }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--wa-accent)", color: "#fff" }}
              >
                <a.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[17px]">{a.label}</span>
            </button>
          ))}

          <h3
            className="px-5 pb-1 pt-4 text-[13px] font-semibold"
            style={{ color: "var(--wa-muted)" }}
          >
            Tedbirge'deki kişiler
          </h3>

          {rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--wa-muted)" }}>
              {q ? "Eşleşen kişi yok." : "Henüz kayıtlı kişi yok. “Yeni kişi” ile ekleyebilirsiniz."}
            </p>
          ) : (
            rows.map((c) => (
              <button
                key={c.peerId}
                type="button"
                onClick={() => {
                  pressFeedback();
                  onClose();
                  onOpenChat(c.peerId, c.displayName);
                }}
                className="wa-press flex min-h-16 w-full items-center gap-3 px-5 text-left"
              >
                <Avatar name={c.displayName} src={getAvatar(c.peerId) || undefined} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px]" style={{ color: "var(--wa-text)" }}>
                    {c.displayName}
                  </span>
                  <span className="block truncate text-[13px]" style={{ color: "var(--wa-muted)" }}>
                    Tedbirge'de
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
