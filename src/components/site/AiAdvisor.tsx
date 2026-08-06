import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Afet senaryosunda internet yokken nasıl çalışır?",
  "Hangi taşıyıcı bizim sahamıza uygun?",
  "Türkiye'de yasal olarak izin gerekiyor mu?",
  "Pilot süreci nasıl başlar?",
];

export function AiAdvisor({ hideLauncher = false }: { hideLauncher?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [transport] = useState(() => new DefaultChatTransport({ api: "/api/chat" }));

  const { messages, sendMessage, status, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Panelden gelen "danışmanı aç" isteklerini karşılar (proaktif içgörü butonları).
  useEffect(() => {
    function handler(e: Event) {
      const prefill = (e as CustomEvent<{ prefill?: string }>).detail?.prefill;
      setOpen(true);
      if (prefill) setInput(prefill);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    window.addEventListener("tedbirge:advisor", handler);
    return () => window.removeEventListener("tedbirge:advisor", handler);
  }, []);


  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    void sendMessage({ text: value });
  }

  if (!open) {
    // Sohbet ekranında yüzen düğme gizlenir; panel yalnızca olayla açılır.
    if (hideLauncher) return null;
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Tedbirge yapay zeka danışmanını aç"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-sm bg-primary px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground shadow-lg transition-opacity hover:opacity-90 print:hidden"
      >
        <span className="size-2 animate-pulse rounded-full bg-primary-foreground" />
        AI Danışman
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-sm border border-border bg-background/98 shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-5 sm:w-[400px] print:hidden">
      <div className="flex items-center justify-between border-b border-border/60 bg-card/60 px-4 py-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Tedbirge Danışman
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Çözüm eşleştirme ve pilot ön değerlendirme
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Danışmanı kapat"
          className="rounded-sm px-2 py-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Merhaba. Sahanızı ve senaryonuzu anlatın; uygun taşıyıcıyı, yasal çerçeveyi ve pilot
              adımını birlikte netleştirelim.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-sm border border-border px-3 py-1.5 text-left text-[11px] leading-snug text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("")
            .trim();
          const saved = m.parts.some((p) => p.type === "tool-kaydet_talep");
          if (!text && !saved) return null;
          return (
            <div
              key={m.id}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[88%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/70 bg-card/60 text-foreground"
                }`}
              >
                {text ? (
                  m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{text}</p>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-a:text-primary">
                      <ReactMarkdown>{text}</ReactMarkdown>
                    </div>
                  )
                ) : null}
                {saved && (
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                    ✓ Talep ekibe iletildi
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex gap-1 px-1 text-muted-foreground">
            <span className="size-1.5 animate-bounce rounded-full bg-current" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
          </div>
        )}

        {error && (
          <p className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
            Danışman şu anda yanıt veremedi. Lütfen tekrar deneyin veya
            <a href="/iletisim" className="ml-1 underline">
              pilot formunu
            </a>{" "}
            kullanın.
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border/60 bg-card/40 p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Sahanızı ve ihtiyacınızı yazın…"
            aria-label="Danışmana mesaj yazın"
            className="max-h-28 flex-1 resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-sm bg-primary px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-40"
          >
            Gönder
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
          Yapay zeka yanıtları bilgilendirme amaçlıdır; paylaştığınız iletişim bilgileri yalnızca
          pilot değerlendirmesi için Tedbirge ekibine iletilir.
        </p>
      </form>
    </div>
  );
}
