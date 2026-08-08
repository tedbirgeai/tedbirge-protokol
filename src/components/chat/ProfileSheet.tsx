import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { Avatar } from "@/components/chat/Avatar";
import { pressFeedback } from "@/lib/chat/sounds";
import { getAbout, getPhone, getUsername, setAbout, setUsername } from "@/lib/chat/profile";

type Field = "name" | "about" | "username" | null;

/**
 * "PROFİL" EKRANI
 * ------------------------------------------------------------------
 * WhatsApp düzeni: büyük avatar + "Düzenle", altında Ad · Hakkımda ·
 * Kullanıcı adı · Telefon numarası · Bağlantılar satırları. Numara
 * kimliğin çıpası olduğu için salt gösterimdir.
 */
export function ProfileSheet({
  open,
  onClose,
  name,
  avatar,
  onAvatarPick,
  onRename,
  onLinks,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  avatar?: string | undefined;
  onAvatarPick: () => void;
  onRename: (next: string) => void;
  onLinks: () => void;
}) {
  const [about, setAboutState] = useState("");
  const [username, setUsernameState] = useState("");
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState<Field>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    setAboutState(getAbout());
    setUsernameState(getUsername());
    setPhone(getPhone());
    setEditing(null);
  }, [open]);

  if (!open) return null;

  function begin(field: Exclude<Field, null>, value: string) {
    pressFeedback();
    setEditing(field);
    setDraft(value);
  }

  function commit() {
    const value = draft.trim();
    if (editing === "name") {
      if (value) onRename(value);
    } else if (editing === "about") {
      setAbout(value);
      setAboutState(value);
    } else if (editing === "username") {
      setUsername(value);
      setUsernameState(getUsername());
    }
    setEditing(null);
  }

  const rows: { id: string; label: string; value: string; run: () => void; accent?: boolean }[] = [
    { id: "name", label: "Ad", value: name, run: () => begin("name", name) },
    {
      id: "about",
      label: "Hakkımda",
      value: about || "Müsait",
      run: () => begin("about", about || "Müsait"),
    },
    {
      id: "username",
      label: "Kullanıcı adı",
      value: username ? `@${username}` : "Kullanıcı adı oluşturun",
      run: () => begin("username", username),
      accent: !username,
    },
    { id: "phone", label: "Telefon numarası", value: phone || "—", run: () => undefined },
    { id: "links", label: "Bağlantılar", value: "Bağlantı ekle", run: onLinks, accent: true },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Profil"
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
          <p
            className="min-w-0 flex-1 text-center text-[17px] font-bold"
            style={{ color: "var(--wa-text)" }}
          >
            Profil
          </p>
          <span className="h-10 w-10" aria-hidden />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-6">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                onAvatarPick();
              }}
              className="wa-press rounded-full"
              aria-label="Profil fotoğrafını değiştir"
            >
              <Avatar name={name} src={avatar} size={132} />
            </button>
            <button
              type="button"
              onClick={() => {
                pressFeedback();
                onAvatarPick();
              }}
              className="wa-press text-[17px] font-bold"
              style={{ color: "var(--wa-accent)" }}
            >
              Düzenle
            </button>
          </div>

          <ul
            className="mt-7 overflow-hidden rounded-2xl"
            style={{ background: "var(--wa-panel)" }}
          >
            {rows.map((r, i) => (
              <li
                key={r.id}
                style={i === 0 ? undefined : { borderTop: "1px solid var(--wa-border)" }}
              >
                {editing && r.id === editing ? (
                  <div className="flex min-h-16 items-center gap-3 px-4">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commit();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
                      style={{ color: "var(--wa-text)" }}
                      aria-label={r.label}
                    />
                    <button
                      type="button"
                      onClick={commit}
                      className="wa-press shrink-0 rounded-full px-4 py-1.5 text-[14px] font-bold text-white"
                      style={{ background: "var(--wa-accent)" }}
                    >
                      Kaydet
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={r.run}
                    disabled={r.id === "phone"}
                    className="wa-press flex min-h-16 w-full items-center gap-3 px-4 text-left disabled:opacity-100"
                    style={{ color: "var(--wa-text)" }}
                  >
                    <span className="shrink-0 text-[17px] font-semibold">{r.label}</span>
                    <span
                      className="min-w-0 flex-1 truncate text-right text-[17px]"
                      style={{ color: r.accent ? "var(--wa-accent)" : "var(--wa-muted)" }}
                    >
                      {r.value}
                    </span>
                    {r.id !== "phone" && (
                      <ChevronRight
                        className="h-5 w-5 shrink-0"
                        style={{ color: "var(--wa-muted)" }}
                      />
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>

          <p className="px-2 pt-4 text-[13px]" style={{ color: "var(--wa-muted)" }}>
            Telefon numarası kimliğinizin çıpasıdır ve değiştirilemez. Profil bilgileri yalnızca bu
            cihazda saklanır.
          </p>
        </div>
      </div>
    </div>
  );
}
