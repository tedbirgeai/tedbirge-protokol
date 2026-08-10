import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { PROTOCOL_LAYERS, RAAS_TIERS } from "@/lib/protocol-layers";
import { NextStep } from "@/components/site/NextStep";

export const Route = createFileRoute("/protokol")({
  head: () => ({
    meta: [
      { title: "Tedbirge Protocol — 7 Katmanlı Bağlantı Sürekliliği Mimarisi" },
      {
        name: "description",
        content:
          "Trust, Edge, Loop, Off-Grid, Sense, Console ve Relay katmanları: kurulum gerektirmeyen, uçtan uca şifreli kurumsal bağlantı sürekliliği platformu.",
      },
      { property: "og:title", content: "Tedbirge Protocol — 7 Katmanlı Mimari" },
      {
        property: "og:description",
        content:
          "Kesintisiz bağlantı için 7 katman ve Resilience-as-a-Service abonelik modeli. Karmaşık kurulum yok, 2 tıkla aktif.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tedbirge-gateway.lovable.app/protokol" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/protokol" }],
  }),
  component: ProtocolPage,
});

function ProtocolPage() {
  return (
    <SitePage>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Tedbirge Protocol</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Bağlantı sürekliliğinin <span className="text-primary">7 katmanı</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tedbirge Protocol, kurumunuzun bağlantısını ayakta tutan yedi katmanı tek çatı altında
            toplar. Güvenlik katmanları arka planda otomatik çalışır; sizin tarafınızda yalnızca
            açık, sade ve iki tıkla tamamlanan işlemler kalır.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/kur"
              className="rounded-sm bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              2 tıkla başlat
            </Link>
            <Link
              to="/fiyatlandirma"
              className="rounded-sm border border-border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
            >
              RaaS paketleri
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {PROTOCOL_LAYERS.map((l) => (
            <article key={l.name} className="bg-card/60 p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] text-primary">
                  {l.n}
                </span>
                <h2 className="font-mono text-sm uppercase tracking-[0.18em] text-primary">
                  {l.name}
                </h2>
              </div>
              <p className="mt-4 text-lg font-semibold text-foreground">{l.tagline}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{l.body}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {l.badges.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {b}
                  </span>
                ))}
              </div>
              <Link
                to={l.action.to}
                className="mt-6 inline-block rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
              >
                {l.action.label}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Resilience-as-a-Service</SectionLabel>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Süreklilik, abonelik olarak
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Donanım satın almadan, saha ekibi kurmadan: ihtiyacınız kadar düğüm, aylık abonelikle.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {RAAS_TIERS.map((t) => (
              <div key={t.key} className="rounded-sm border border-border bg-background/60 p-6">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  {t.name}
                </p>
                <p className="mt-4 text-2xl font-semibold tracking-tight">{t.price}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{t.note}</p>
                <p className="mt-4 text-sm text-muted-foreground">{t.for}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {t.points.map((p) => (
                    <li key={p}>· {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link
            to="/fiyatlandirma"
            className="mt-8 inline-block rounded-sm bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground"
          >
            Paketleri karşılaştır
          </Link>
        </div>
      </section>

      <NextStep
        to="/kur"
        title="İlk düğümünüzü şimdi başlatın"
        description="Kurulum dosyası, terminal veya anahtar yönetimi yok. Tarayıcıyı açın, ağa katılın."
      />
    </SitePage>
  );
}
