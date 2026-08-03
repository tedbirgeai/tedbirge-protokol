import { useState } from "react";
import { SectionLabel } from "@/components/site/SiteChrome";
import { INTEROP_TARGETS, INTEROP_STATUS_LABEL, type InteropStatus } from "@/lib/interop";

const TONE: Record<InteropStatus, string> = {
  hazir: "text-primary border-primary/40",
  kismi: "text-amber-400 border-amber-400/40",
  planli: "text-muted-foreground border-border",
};

/** El sıkışma haritası: hangi ekosistemle hangi yüzeyden entegre oluyoruz. */
export function AdminInterop() {
  const [open, setOpen] = useState<string | null>(INTEROP_TARGETS[0]?.id ?? null);

  return (
    <div className="mt-8">
      <SectionLabel>Birlikte çalışabilirlik</SectionLabel>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">El Sıkışma Haritası</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Tedbirge Gateway bir düğümdür: mevcut sistemlerin yerine geçmez, yanına eklenir. Aşağıdaki
        tablo her ekosistemde karşı tarafın çözemediği boşluğu, bizim getirdiğimiz çözümü, teknik
        temas yüzeyini ve yasal notu tek yerde toplar.
      </p>

      <div className="mt-8 space-y-4">
        {INTEROP_TARGETS.map((t) => (
          <article key={t.id} className="overflow-hidden rounded-sm border border-border">
            <button
              type="button"
              onClick={() => setOpen(open === t.id ? null : t.id)}
              className="flex w-full flex-wrap items-center gap-3 bg-card/50 px-5 py-4 text-left hover:bg-secondary/40"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                  {t.category}
                </p>
                <h3 className="mt-1.5 text-lg font-semibold tracking-tight">{t.name}</h3>
              </div>
              <span
                className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${TONE[t.status]}`}
              >
                {INTEROP_STATUS_LABEL[t.status]}
              </span>
            </button>

            {open === t.id && (
              <div className="space-y-4 border-t border-border bg-background/60 px-5 py-5 text-sm leading-relaxed">
                <Field label="Karşı tarafın boşluğu" text={t.gap} />
                <Field label="El sıkışma" text={t.handshake} />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Teknik temas yüzeyi
                  </p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {t.surface.map((s) => (
                      <li key={s}>· {s}</li>
                    ))}
                  </ul>
                </div>
                <Field label="Yasal not" text={t.legal} />
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-muted-foreground">{text}</p>
    </div>
  );
}
