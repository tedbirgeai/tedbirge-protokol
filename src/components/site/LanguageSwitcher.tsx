import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

const LANGS = [
  { code: "tr", label: "Türkçe", short: "TR", to: "/" as const },
  { code: "en", label: "English", short: "EN", to: "/en" as const },
];

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = pathname.startsWith("/en") ? LANGS[1] : LANGS[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Dil seçimi"
        className="flex items-center gap-1.5 rounded-sm border border-border/70 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        {current.short}
        <span aria-hidden className="text-[9px] leading-none">
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-sm border border-border bg-background shadow-lg"
        >
          {LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === current.code}
                onClick={() => {
                  setOpen(false);
                  navigate({ to: l.to });
                }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary ${
                  l.code === current.code ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {l.label}
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                  {l.short}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
