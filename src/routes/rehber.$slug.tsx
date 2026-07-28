import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { getGuide, guides, type Guide } from "@/lib/guides";

export const Route = createFileRoute("/rehber/$slug")({
  loader: ({ params }): Guide => {
    const guide = getGuide(params.slug);
    if (!guide) throw notFound();
    return guide;
  },
  head: ({ loaderData }) => {
    const url = `https://artisan-project-studio.lovable.app/rehber/${loaderData?.slug ?? ""}`;
    const title = loaderData ? `${loaderData.title} — Tedbirge Rehber` : "Tedbirge Rehber";
    const desc = loaderData?.description ?? "Tedbirge mühendislik rehberi.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: loaderData
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "TechArticle",
                headline: loaderData.title,
                description: loaderData.description,
                datePublished: loaderData.date,
                author: { "@type": "Person", name: "Mehmet DİNÇ" },
                publisher: { "@type": "Organization", name: "Tedbirge" },
                mainEntityOfPage: url,
              }),
            },
          ]
        : [],
    };
  },
  component: GuideDetail,
});

function GuideDetail() {
  const guide = Route.useLoaderData() as Guide;
  const others = guides.filter((g) => g.slug !== guide.slug);

  return (
    <SitePage>
      <article className="mx-auto max-w-3xl px-6 py-20">
        <SectionLabel>{guide.tag}</SectionLabel>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          {guide.title}
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {new Date(guide.date).toLocaleDateString("tr-TR")} · {guide.readingMinutes} dk okuma
        </p>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{guide.description}</p>

        <div className="mt-12 space-y-10">
          {guide.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold tracking-tight">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {s.code && (
                <pre className="mt-5 overflow-x-auto rounded-sm border border-border bg-background/80 p-5 font-mono text-[13px] leading-relaxed text-muted-foreground">
                  <code>{s.code}</code>
                </pre>
              )}
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3 border-t border-border/60 pt-8">
          <Link
            to="/iletisim"
            className="rounded-sm bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            Pilot başvurusu
          </Link>
          <Link
            to="/demo"
            className="rounded-sm border border-border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Canlı mesh demosu
          </Link>
        </div>

        <div className="mt-14">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Diğer yazılar
          </p>
          <ul className="mt-4 space-y-3">
            {others.map((g) => (
              <li key={g.slug}>
                <Link
                  to="/rehber/$slug"
                  params={{ slug: g.slug }}
                  className="text-sm text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </SitePage>
  );
}
