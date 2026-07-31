import { Link } from "@tanstack/react-router";

const TARGETS = {
  "/urun": "Ürün yetenekleri",
  "/demo": "Canlı demo",
  "/fiyatlandirma": "Fiyatlandırma",
  "/kur": "Kolay kurulum",
  "/panel": "Müşteri paneli",
  "/saha": "Saha erişimi",
  "/iletisim": "Pilot başlat",
} as const;

export type NextStepTarget = keyof typeof TARGETS;

/**
 * Single-flow yönlendirme: kullanıcıyı geri tuşuna zorlamadan
 * bir sonraki mantıksal adıma taşır.
 */
export function NextStep({
  to,
  title,
  description,
}: {
  to: NextStepTarget;
  title: string;
  description: string;
}) {
  return (
    <section className="border-t border-border/60 bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Sonraki adım</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <Link
          to={to}
          className="shrink-0 rounded-sm bg-primary px-6 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
        >
          {TARGETS[to]} →
        </Link>
      </div>
    </section>
  );
}
