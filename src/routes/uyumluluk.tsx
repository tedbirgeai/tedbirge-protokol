import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { ZeroKnowledgeAudit } from "@/components/site/ZeroKnowledgeAudit";
import {
  REGION_MATRIX,
  MATRIX_NOTE,
  MATRIX_SOURCES,
  RUNTIME_RULES,
  REGION_PROFILE_SNIPPET,
} from "@/lib/regulation";


const TITLE = "Spektrum & Uyum Matrisi — Ülke Bazlı Taşıyıcı Kuralları";
const DESC =
  "Tedbirge Protokol taşıyıcılarının bölge bazlı spektrum, güç ve görev döngüsü sınırları: AB/TR, ABD/Kanada, Birleşik Krallık, Körfez, APAC ve Afrika profilleri.";
const URL = "https://tedbirge-gateway.lovable.app/uyumluluk";

export const Route = createFileRoute("/uyumluluk")({
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
  component: Compliance,
});

const regions = REGION_MATRIX;


const rules = RUNTIME_RULES;

function Compliance() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Spektrum & uyum</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Her bölgede yasal sınırlar içinde çalışan taşıyıcı profilleri
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tedbirge Protokol dokuz fiziksel katmanı destekler, ancak hepsi her ülkede
            lisanssız değildir. Aşağıdaki matris, üretim profillerinin bölgeye göre nasıl
            sınırlandırıldığını gösterir.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Bölge matrisi</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Sub-GHz ve yüksek bant kuralları
        </h2>
        <div className="mt-10 overflow-x-auto rounded-sm border border-border">
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
              {regions.map((r) => (
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
        <p className="mt-4 text-xs text-muted-foreground">
{MATRIX_NOTE}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{MATRIX_SOURCES}</p>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Uygulama kuralları</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Uyum bir belge değil, çalışma zamanı davranışıdır
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
            {rules.map((r) => (
              <article key={r.t} className="bg-background/60 p-7">
                <h3 className="text-lg font-semibold">{r.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.b}</p>
              </article>
            ))}
          </div>
          <pre className="mt-8 overflow-x-auto rounded-sm border border-border bg-background/70 p-5 font-mono text-[12px] leading-relaxed text-muted-foreground">
            <code>{REGION_PROFILE_SNIPPET}</code>
          </pre>
        </div>
      </section>

      <section id="denetim" className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>KVKK & sıfır-bilgi denetimi</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Uyumu iddia etmiyoruz — cihazınızda test ediyoruz
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Aşağıdaki yedi test, anahtarların cihazdan çıkmadığını, mesaj gövdesinin ara rölelerce
          okunamadığını ve kurcalanan paketlerin reddedildiğini canlı olarak kanıtlar. Sonuçlar
          imzalı bir denetim raporu olarak yazdırılabilir veya PDF'e kaydedilebilir.
        </p>
        <div className="mt-10">
          <ZeroKnowledgeAudit />
        </div>
      </section>



      <section className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Bölgeniz listede yok mu?
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Konuşlanma yapacağınız ülkeyi yazın; düzenleyici çerçeveye göre profil çıkarıp
            hangi taşıyıcıların açılabileceğini raporlayalım.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/turkiye-mevzuat"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Türkiye mevzuatı
          </Link>
          <Link
            to="/sertifikasyon"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Sertifikasyon & test
          </Link>
          <Link
            to="/ihracat-uyum"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            İhracat uyumu
          </Link>

          <Link
            to="/iletisim"
            className="rounded-sm bg-primary px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            Profil talep et
          </Link>
        </div>
      </section>
    </SitePage>
  );
}
