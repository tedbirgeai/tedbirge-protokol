import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import {
  CONTRACT_ANNEXES,
  OFFICIAL_DRAFTS,
  REG_VERSION,
  REG_REVIEWED,
  REG_VENDOR,
} from "@/lib/regulation";

const TITLE = "Sözleşme Ekleri ve İdari Dilekçeler — Tedbirge Gateway";
const DESC =
  "Ek-A spektrum taahhüdü, Ek-B 5651 log sorumluluğu, Ek-C ihracat kontrolü son kullanıcı beyanı ile BTK muafiyet dilekçesi ve valilik saha testi bilgilendirme yazısı taslakları.";
const URL = "https://tedbirge-gateway.lovable.app/yasal";

export const Route = createFileRoute("/yasal")({
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
  component: LegalPack,
});

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
      className="rounded-sm border border-border px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
    >
      {done ? "Kopyalandı" : label}
    </button>
  );
}

function annexToText(i: number) {
  const a = CONTRACT_ANNEXES[i];
  return [
    `${a.code} — ${a.title}`,
    `Kapsam: ${a.scope}`,
    `Dayanak: ${a.refs}`,
    "",
    ...a.clauses.map((c) => `${c.n} ${c.h}\n${c.p}\n`),
    a.signature,
  ].join("\n");
}

function LegalPack() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Şirketleşme ve idari uyum paketi</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Sözleşme ekleri ve resmî dilekçe taslakları
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Ek-A spektrum ve donanım taahhüdü, Ek-B 5651 sorumluluk devri, Ek-C ihracat kontrolü
            son kullanıcı beyanı ile BTK ve mülki idareye sunulacak resmî yazı taslakları. Tüm
            metinler kopyalanabilir; sözleşme dosyanıza olduğu gibi eklenebilir.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/belgeler/tedbirge-uyum-paketi.pdf"
              download
              className="rounded-sm bg-primary px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              Tüm paketi PDF indir
            </a>
            <a
              href="#dilekceler"
              className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Dilekçe taslakları
            </a>
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Sürüm {REG_VERSION} · Gözden geçirme {REG_REVIEWED} · {REG_VENDOR}
          </p>
        </div>
      </section>

      <section id="ekler" className="mx-auto max-w-6xl space-y-12 px-6 py-20">
        {CONTRACT_ANNEXES.map((a, i) => (
          <article key={a.id} id={a.id} className="overflow-hidden rounded-sm border border-border">
            <header className="border-b border-border bg-card/60 px-6 py-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                {a.code}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{a.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a.scope}</p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Dayanak: {a.refs}
              </p>
            </header>
            <ol className="divide-y divide-border/60">
              {a.clauses.map((c) => (
                <li key={c.n} className="grid gap-3 bg-card/20 px-6 py-5 md:grid-cols-[110px_1fr]">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
                    {c.n}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{c.h}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.p}</p>
                  </div>
                </li>
              ))}
            </ol>
            <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-card/40 px-6 py-5">
              <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{a.signature}</p>
              <a
                href={`/belgeler/tedbirge-${a.id}.pdf`}
                download
                className="rounded-sm bg-primary px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
              >
                {a.code} PDF indir
              </a>
              <CopyButton text={annexToText(i)} label={`${a.code} metnini kopyala`} />
            </footer>
          </article>
        ))}
      </section>

      <section id="dilekceler" className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl space-y-10 px-6 py-20">
          <div>
            <SectionLabel>İdari dilekçeler</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Resmî başvuru ve bilgilendirme taslakları
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Kurum antetli kâğıdınıza yapıştırıp boş alanları doldurmanız yeterlidir.
            </p>
          </div>

          {OFFICIAL_DRAFTS.map((d) => (
            <article key={d.id} id={d.id} className="overflow-hidden rounded-sm border border-border">
              <header className="flex flex-wrap items-start gap-4 border-b border-border bg-background/60 px-6 py-5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                    {d.label}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight">{d.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.summary}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`/belgeler/tedbirge-${d.id}.pdf`}
                    download
                    className="rounded-sm bg-primary px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
                  >
                    PDF indir
                  </a>
                  <CopyButton text={d.body} label="Dilekçeyi kopyala" />
                </div>
              </header>
              <pre className="overflow-x-auto whitespace-pre-wrap bg-background/70 px-6 py-6 font-mono text-[12px] leading-relaxed text-muted-foreground">
                <code>{d.body}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/mevzuat"
            className="rounded-sm bg-primary px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            Regülasyon merkezi
          </Link>
          <Link
            to="/izinler"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            İzin matrisi
          </Link>
          <Link
            to="/ihracat-uyum"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            İhracat kontrolü
          </Link>
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Bu metinler taslaktır, hukuki görüş yerine geçmez ve imzalanmadan önce hukuk
          müşavirinizce nihai hâline getirilmelidir. Sorumluluk sınırlandırmaları, ilgili yargı
          bölgesinin emredici hükümleri saklı kalmak kaydıyla geçerlidir.
        </p>
      </section>
    </SitePage>
  );
}
