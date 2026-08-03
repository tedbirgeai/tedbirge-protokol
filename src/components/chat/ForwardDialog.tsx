import { useMemo, useState } from "react";
import { Forward, X } from "lucide-react";
import { forwardMessage } from "@/lib/chat/engine";
import { pressFeedback } from "@/lib/chat/sounds";
import type { ChatMessage, Conversation } from "@/lib/store/idb";

const panel = { background: "var(--wa-panel)", color: "var(--wa-text)" } as const;

/**
 * İletme penceresi — bir mesajı birden çok sohbete iletir.
 * "Alıntılı ilet" seçeneği açıkken metin, özgün göndericinin adıyla
 * tırnak içinde gönderilir; kaynak bilgisi kaybolmaz.
 */
export function ForwardDialog({
  message,
  conversations,
  titleOf,
  authorName,
  onClose,
}: {
  message: ChatMessage | null;
  conversations: Conversation[];
  titleOf: (c: Conversation) => string;
  authorName: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [quote, setQuote] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const targets = useMemo(
    () => conversations.filter((c) => c.id !== message?.convId),
    [conversations, message?.convId],
  );

  if (!message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl p-5 shadow-xl"
        style={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Mesajı ilet</h2>
          <button type="button" onClick={onClose} className="wa-press rounded-full p-2" aria-label="Kapat">
            <X className="h-4 w-4" style={{ color: "var(--wa-muted)" }} />
          </button>
        </div>

        <p
          className="mt-2 line-clamp-2 rounded-lg px-3 py-2 text-[13px]"
          style={{ background: "var(--wa-panel-soft)", color: "var(--wa-muted)" }}
        >
          {message.text || message.media?.name || "Ek"}
        </p>

        <label className="mt-3 flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={quote} onChange={(e) => setQuote(e.target.checked)} />
          Alıntılı ilet (kaynağı göster)
        </label>

        <ul className="mt-3 flex-1 overflow-y-auto rounded-lg" style={{ border: "1px solid var(--wa-border)" }}>
          {targets.length === 0 && (
            <li className="px-4 py-6 text-center text-[13px]" style={{ color: "var(--wa-muted)" }}>
              İletilecek başka sohbet yok.
            </li>
          )}
          {targets.map((c) => {
            const on = selected.includes(c.id);
            return (
              <li key={c.id} style={{ borderBottom: "1px solid var(--wa-border)" }}>
                <button
                  type="button"
                  onClick={() =>
                    setSelected((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))
                  }
                  className="wa-row flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] hover:bg-black/[0.03]"
                >
                  <span className="truncate">{titleOf(c)}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{
                      background: on ? "var(--wa-accent)" : "transparent",
                      color: on ? "#fff" : "var(--wa-muted)",
                      border: on ? "none" : "1px solid var(--wa-border)",
                    }}
                  >
                    {on ? "Seçildi" : "Seç"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {err && (
          <p className="mt-2 text-xs" style={{ color: "#e03131" }}>
            {err}
          </p>
        )}

        <button
          type="button"
          disabled={!selected.length || busy}
          onClick={() => {
            pressFeedback();
            setBusy(true);
            setErr(null);
            void forwardMessage(message.id, selected, { quote, authorName })
              .then(() => onClose())
              .catch((e: Error) => setErr(e.message))
              .finally(() => setBusy(false));
          }}
          className="wa-press mt-4 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--wa-accent)" }}
        >
          <Forward className="h-4 w-4" />
          {busy ? "İletiliyor…" : `İlet (${selected.length})`}
        </button>
      </div>
    </div>
  );
}
