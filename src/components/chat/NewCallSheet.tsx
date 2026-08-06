import { useMemo, useState } from "react";
import { Link2, Search, UserPlus, Video, X, Phone, Check } from "lucide-react";

import { Avatar } from "@/components/chat/Avatar";
import { useContacts } from "@/lib/chat/contacts";
import { getAvatar, useAvatars } from "@/lib/chat/avatars";
import { pressFeedback } from "@/lib/chat/sounds";
import { listCalls } from "@/lib/chat/call-log";

const MAX_SELECT = 31;

/**
 * YENİ ARAMA
 * ------------------------------------------------------------------
 * WhatsApp "Yeni arama" ekranı: arama kutusu, "Yeni arama bağlantısı"
 * ve "Yeni kişi" satırları, sık görüşülenler, alfabetik kişi listesi
 * ve sağda A–Z hızlı şeridi. Birden fazla kişi seçilirse alttaki yeşil
 * çubukla konferans araması başlatılır.
 */
export function NewCallSheet({
  open,
  onClose,
  onCall,
  onConference,
  onNewLink,
  onNewContact,
}: {
  open: boolean;
  onClose: () => void;
  onCall: (peerId: string, video: boolean) => void;
  onConference: (peerIds: string[], video: boolean) => void;
  onNewLink: () => void;
  onNewContact: () => void;
}) {
  const { contacts } = useContacts();
  useAvatars();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const named = useMemo(
    () => contacts.filter((c) => c.displayName).sort((a, b) => a.displayName.localeCompare(b.displayName, "tr")),
    [contacts],
  );

  const frequent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const rec of listCalls()) counts.set(rec.peerId, (counts.get(rec.peerId) ?? 0) + 1);
    return named
      .filter((c) => counts.has(c.peerId))
      .sort((a, b) => (counts.get(b.peerId) ?? 0) - (counts.get(a.peerId) ?? 0))
      .slice(0, 4);
  }, [named]);

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    if (!term) return named;
    return named.filter(
      (c) => c.displayName.toLocaleLowerCase("tr").includes(term) || c.shortId.toLowerCase().includes(term),
    );
  }, [named, q]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const letter = (c.displayName[0] ?? "#").toLocaleUpperCase("tr");
      const key = /[A-ZÇĞİÖŞÜ]/.test(letter) ? letter : "#";
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return [...map.entries()];
  }, [filtered]);

  if (!open) return null;

  const toggle = (peerId: string) => {
    pressFeedback();
    setSelected((prev) =>
      prev.includes(peerId)
        ? prev.filter((p) => p !== peerId)
        : prev.length >= MAX_SELECT
          ? prev
          : [...prev, peerId],
    );
  };

  const start = (video: boolean) => {
    if (selected.length === 0) return;
    onClose();
    if (selected.length === 1) onCall(selected[0]!, video);
    else onConference(selected, video);
    setSelected([]);
  };

  return (
    <div className="wa fixed inset-0 z-[70] flex justify-center" style={{ background: "var(--wa-panel)" }}>
      <div className="flex min-h-0 w-full max-w-[520px] flex-col">
        <div
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--wa-border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="wa-press text-[15px]"
            style={{ color: "var(--wa-accent)" }}
          >
            İptal
          </button>
          <p className="truncate text-center text-[17px] font-semibold" style={{ color: "var(--wa-text)" }}>
            Yeni arama
          </p>
          <span className="text-[13px]" style={{ color: "var(--wa-muted)" }}>
            {selected.length}/{MAX_SELECT}
          </span>
        </div>

        <div className="px-4 py-2">
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2.5"
            style={{ background: "var(--wa-panel-soft)" }}
          >
            <Search className="h-4 w-4 shrink-0" style={{ color: "var(--wa-muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ad, numara veya TBG kimliği"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
              style={{ color: "var(--wa-text)" }}
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Temizle">
                <X className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-24">
          <ActionRow icon={<Link2 className="h-5 w-5" />} label="Yeni arama bağlantısı" onClick={() => { onClose(); onNewLink(); }} />
          <ActionRow icon={<UserPlus className="h-5 w-5" />} label="Yeni kişi" onClick={() => { onClose(); onNewContact(); }} />

          {frequent.length > 0 && !q && (
            <>
              <h3 className="px-4 pb-1 pt-4 text-[13px] font-semibold" style={{ color: "var(--wa-muted)" }}>
                Sık görüşülenler
              </h3>
              {frequent.map((c) => (
                <ContactRow
                  key={`f_${c.peerId}`}
                  name={c.displayName}
                  sub={c.shortId}
                  avatar={getAvatar(c.peerId) || undefined}
                  checked={selected.includes(c.peerId)}
                  onToggle={() => toggle(c.peerId)}
                  onCall={() => { onClose(); onCall(c.peerId, false); }}
                  onVideo={() => { onClose(); onCall(c.peerId, true); }}
                />
              ))}
            </>
          )}

          {groups.length === 0 && (
            <p className="px-4 py-10 text-center text-sm" style={{ color: "var(--wa-muted)" }}>
              Kayıtlı kişi bulunamadı.
            </p>
          )}

          {groups.map(([letter, rows]) => (
            <div key={letter} id={`sec_${letter}`}>
              <h3 className="px-4 pb-1 pt-4 text-[13px] font-semibold" style={{ color: "var(--wa-muted)" }}>
                {letter}
              </h3>
              {rows.map((c) => (
                <ContactRow
                  key={c.peerId}
                  name={c.displayName}
                  sub={c.shortId}
                  avatar={getAvatar(c.peerId) || undefined}
                  checked={selected.includes(c.peerId)}
                  onToggle={() => toggle(c.peerId)}
                  onCall={() => { onClose(); onCall(c.peerId, false); }}
                  onVideo={() => { onClose(); onCall(c.peerId, true); }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* A–Z hızlı şerit */}
        <div className="pointer-events-none absolute bottom-24 right-1 top-32 hidden flex-col justify-center gap-0.5 sm:flex">
          {groups.map(([letter]) => (
            <button
              key={`idx_${letter}`}
              type="button"
              className="pointer-events-auto px-1 text-[10px]"
              style={{ color: "var(--wa-accent)" }}
              onClick={() => document.getElementById(`sec_${letter}`)?.scrollIntoView({ behavior: "smooth" })}
            >
              {letter}
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <div
            className="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
            style={{ background: "var(--wa-panel)", borderTop: "1px solid var(--wa-border)" }}
          >
            <span className="min-w-0 flex-1 truncate text-[14px]" style={{ color: "var(--wa-muted)" }}>
              {selected.length} kişi seçildi
            </span>
            <button
              type="button"
              onClick={() => start(true)}
              className="wa-press flex h-12 w-12 items-center justify-center rounded-full text-white"
              style={{ background: "var(--wa-accent)" }}
              aria-label="Görüntülü ara"
            >
              <Video className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => start(false)}
              className="wa-press flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-white"
              style={{ background: "var(--wa-accent)" }}
            >
              <Phone className="h-5 w-5" /> Ara
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        pressFeedback();
        onClick();
      }}
      className="wa-press flex min-h-14 w-full items-center gap-4 px-4 text-left"
      style={{ color: "var(--wa-text)" }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--wa-accent)", color: "#fff" }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-[16px]">{label}</span>
    </button>
  );
}

function ContactRow({
  name,
  sub,
  avatar,
  checked,
  onToggle,
  onCall,
  onVideo,
}: {
  name: string;
  sub: string;
  avatar?: string | undefined;
  checked: boolean;
  onToggle: () => void;
  onCall: () => void;
  onVideo: () => void;
}) {
  return (
    <div className="flex min-h-16 w-full items-center gap-3 px-4">
      <button
        type="button"
        onClick={onToggle}
        className="wa-press flex min-w-0 flex-1 items-center gap-3 py-2 text-left"
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
          style={{
            borderColor: checked ? "var(--wa-accent)" : "var(--wa-border)",
            background: checked ? "var(--wa-accent)" : "transparent",
            color: "#fff",
          }}
        >
          {checked && <Check className="h-4 w-4" />}
        </span>
        <Avatar name={name} src={avatar} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px]" style={{ color: "var(--wa-text)" }}>
            {name}
          </span>
          <span className="block truncate text-[13px]" style={{ color: "var(--wa-muted)" }}>
            {sub}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onVideo}
        className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
        style={{ color: "var(--wa-accent)" }}
        aria-label={`${name} ile görüntülü ara`}
      >
        <Video className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onCall}
        className="wa-press flex h-10 w-10 items-center justify-center rounded-full"
        style={{ color: "var(--wa-accent)" }}
        aria-label={`${name} ile sesli ara`}
      >
        <Phone className="h-5 w-5" />
      </button>
    </div>
  );
}
