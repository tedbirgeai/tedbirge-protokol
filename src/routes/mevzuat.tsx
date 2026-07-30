import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import {
  REG_PILLARS,
  REGION_MATRIX,
  MATRIX_NOTE,
  MATRIX_SOURCES,
  RUNTIME_RULES,
  REGION_PROFILE_SNIPPET,
  DECLARATION_ROWS,
  REG_VERSION,
  REG_REVIEWED,
  REG_VENDOR,
  LIABILITY_5651,
  FIRMWARE_SPECTRUM_WARNING,
  PRIVACY_NOTICE,
} from "@/lib/regulation";

const TITLE = "Regülasyon Merkezi — Spektrum, Sertifikasyon, Mevzuat ve İhracat";
const DESC =
  "Tedbirge Gateway'in tüm uyum çerçevesi tek sayfada: altı regülasyon sütunu, ülke bazlı spektrum matrisi, test standartları, Türkiye mevzuatı, ihracat kontrolü ve indirilebilir uyum beyanı.";
const URL = "https://tedbirge-gateway.lovable.app/mevzuat";

export const Route = createFileRoute("/mevzuat")({
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
  component: RegulationHub,
});

function RegulationHub() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60 print:hidden">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Regülasyon merkezi</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Uyumun tamamı tek çerçevede, tek doğruluk kaynağından
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Spektrum, sertifikasyon, ulusal mevzuat, ihracat kontrolü ve operasyonel izinler
            aynı veri kümesinden türetilir. Alt sayfalar bu sayfayla çelişemez — hepsi aynı
            kaynağı okur.
          </p>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Sürüm {REG_VERSION} · Son gözden geçirme {REG_REVIEWED} · {REG_VENDOR}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#uyum-beyani"
              className="rounded-sm bg-primary px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              Uyum beyanı
            </a>
            <a
              href="#bolge-matrisi"
              className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Bölge matrisi
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 print:hidden">
        <SectionLabel>Altı sütun</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Regülasyon haritası</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {REG_PILLARS.map((p) => (
            <article key={p.no} className="flex flex-col bg-background/60 p-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                {p.no} · {p.refs}
              </p>
              <h3 className="mt-3 text-lg font-semibold">{p.t}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{p.b}</p>
              <Link
                to={p.to}
                className="mt-5 self-start rounded-sm border border-border px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
              >
                {p.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section id="bolge-matrisi" className="border-y border-border/60 bg-card/30 print:hidden">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Bölge matrisi</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Sub-GHz ve yüksek bant kuralları
          </h2>
          <div className="mt-10 overflow-x-auto rounded-sm border border-border bg-background/60">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-card/60 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="px-5 py-4">Bölge</th>
                  <th className="px-5 py-4">LoRa</th>
                  <th className="px-5 py-4">Wi-Fi HaLow</th>
                  <th className="px-5 py-4">TVWS</th>
                  <th className="px-5 py-4">WiGig 60 GHz</th>
                  <th className="px-5 py-4">FSO Lazer</th>
                </tr>
              </thead>
              <tbody>
                {REGION_MATRIX.map((r) => (
                  <tr key={r.sub} className="border-t border-border/60 align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{r.region}</p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
                        {r.sub}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{r.lora}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.halow}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.tvws}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.wigig}</td>
                    <td className="px-5 py-4 text-muted-foreground">{r.fso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{MATRIX_NOTE}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{MATRIX_SOURCES}</p>

          <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
            {RUNTIME_RULES.map((r) => (
              <article key={r.t} className="bg-background/60 p-7">
                <h3 className="text-base font-semibold">{r.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.b}</p>
              </article>
            ))}
          </div>
          <pre className="mt-8 overflow-x-auto rounded-sm border border-border bg-background/70 p-5 font-mono text-[12px] leading-relaxed text-muted-foreground">
            <code>{REGION_PROFILE_SNIPPET}</code>
          </pre>
        </div>
      </section>

      <section id="uyum-beyani" className="mx-auto max-w-6xl px-6 py-20">
        <div className="print:hidden">
          <SectionLabel>Uyum beyanı</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Tedarikçi uygunluk beyanı (indirilebilir)
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Kurumsal satın alma ve pilot dosyalarına eklenmek üzere hazırlanmış özet beyan.
            Yazdırma penceresinde hedef olarak &ldquo;PDF olarak kaydet&rdquo; seçin.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-sm border border-border print:mt-0 print:border-0">
          <div className="border-b border-border bg-card/60 px-6 py-5 print:bg-transparent">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              Tedbirge Gateway — Uyum Beyanı
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Sürüm {REG_VERSION} · Gözden geçirme {REG_REVIEWED}
            </p>
          </div>
          <dl className="divide-y divide-border/60">
            {DECLARATION_ROWS.map(([k, v]) => (
              <div key={k} className="grid gap-2 bg-card/30 px-6 py-4 md:grid-cols-[240px_1fr] print:bg-transparent">
                <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {k}
                </dt>
                <dd className="text-sm leading-relaxed text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-sm bg-primary px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            Beyanı PDF olarak al
          </button>
          <Link
            to="/pilot-panosu"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Pilot uyum panosu
          </Link>
          <Link
            to="/iletisim"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Ülke profili talep et
          </Link>
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Bu sayfa bilgilendirme amaçlıdır ve hukuki görüş yerine geçmez. Nihai sınıflandırma ve
          izin yükümlülüğü, konuşlanmanın yapılacağı yargı bölgesindeki yetkili makam tarafından
          teyit edilmelidir.
        </p>
      </section>
    </SitePage>
  );
}
