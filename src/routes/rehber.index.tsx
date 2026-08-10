import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { guides } from "@/lib/guides";

const TITLE = "Rehber — Off-Grid Mesh ve Sıfır-Bilgi Ağ Yazıları";
const DESC =
  "Tedbirge mühendislik rehberleri: off-grid mesh kurulumu, afet haberleşmesi mimarisi ve sıfır-bilgi tünel geçidinin VPN'den farkı.";
const URL = "https://tedbirge-gateway.lovable.app/rehber";

export const Route = createFileRoute("/rehber/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Rehber</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Sahada işe yarayan mühendislik notları
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Kurulum, mimari ve güvenlik konularında uygulanabilir rehberler. Hepsi Tedbirge Tedbirge
            ProtokolGateway&apos;inapos;ün gerçek davranışından türetildi.
          </p>
          <a
            href="/tedbirge-teknik-ozet.md"
            download
            className="mt-8 inline-block rounded-sm border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
          >
            Teknik özeti indir (.md)
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {guides.map((g) => (
            <article key={g.slug} className="bg-card/50 p-7">
              <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                <span>{g.tag}</span>
                <span className="text-muted-foreground">{g.readingMinutes} dk</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold leading-snug">
                <Link to="/rehber/$slug" params={{ slug: g.slug }} className="hover:text-primary">
                  {g.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{g.description}</p>
              <Link
                to="/rehber/$slug"
                params={{ slug: g.slug }}
                className="mt-5 inline-block font-mono text-xs uppercase tracking-[0.15em] text-foreground underline underline-offset-4"
              >
                Yazıyı oku
              </Link>
            </article>
          ))}
        </div>
      </section>
    </SitePage>
  );
}
