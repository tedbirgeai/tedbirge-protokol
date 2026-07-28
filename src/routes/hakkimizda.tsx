import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "Hakkımızda — Tedbirge Protokol'ü Kim Geliştiriyor";
const DESC =
  "Tedbirge Protokol'ün arkasındaki ekip, mühendislik ilkeleri, açık kaynak yaklaşımı ve kurumsal iletişim bilgileri. Satıcı ünvanı: Mehmet DİNÇ (Tedbirge), Türkiye.";
const URL = "https://artisan-project-studio.lovable.app/hakkimizda";

export const Route = createFileRoute("/hakkimizda")({
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Tedbirge",
          legalName: "Mehmet DİNÇ (Tedbirge)",
          url: "https://artisan-project-studio.lovable.app",
          email: "tedbirge34@gmail.com",
          address: { "@type": "PostalAddress", addressCountry: "TR" },
          founder: { "@type": "Person", name: "Mehmet DİNÇ" },
          sameAs: ["https://github.com/tedbirgeai/aetheris"],
          description: DESC,
        }),
      },
    ],
  }),
  component: About,
});

const principles = [
  {
    tag: "01",
    title: "Tek binary, sıfır bağımlılık",
    body: "Kurulum bir dosya kopyalamaktan ibarettir. Node.js, CDN, harici veritabanı veya çalışma zamanı paket indirmesi yoktur; sahada internetsiz konuşlanma bunu zorunlu kılar.",
  },
  {
    tag: "02",
    title: "Varsayılan olarak sıfır-bilgi",
    body: "Taşınan içerik hiçbir noktada saklanmaz. Ölçüm yalnızca SHA-256 özeti ve bayt sayımı üzerinden yapılır; röle düğümü ne taşıdığını bilemez.",
  },
  {
    tag: "03",
    title: "Donanım tarafsızlığı",
    body: "Donanım satmıyoruz. Kurumun elindeki Ethernet, Wi-Fi, uydu terminali veya LoRa dongle'ı ne ise onun üzerinde çalışırız.",
  },
  {
    tag: "04",
    title: "Regülasyon önce gelir",
    body: "Varsayılan profiller Türkiye ve AB spektrum kurallarına göre sınırlandırılmıştır. Yasal statüsü belirsiz taşıyıcılar üretimde kapalı gelir.",
  },
];

const timeline = [
  ["2024", "Tünel proxy motoru ve AES-256-GCM chunk şifrelemesi ile ilk çekirdek."],
  ["2025", "Mesh yönlendirme, gossip keşfi ve off-grid imzalı fiş defterinin eklenmesi."],
  ["2026", "Dokuz taşıyıcı matrisi, gömülü yönetim paneli ve v0.6a turnkey dağıtımı."],
];

const facts = [
  ["Satıcı ünvanı", "Mehmet DİNÇ (Tedbirge)"],
  ["İşletme türü", "Şahıs şirketi"],
  ["Ülke", "Türkiye"],
  ["E-posta", "tedbirge34@gmail.com"],
  ["Sürüm", "v0.6a — turnkey"],
];

function About() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-24">
          <SectionLabel>Hakkımızda</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Kapsamanın bittiği yerde çalışan altyapı yazıyoruz
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tedbirge, Türkiye merkezli bağımsız bir mühendislik girişimidir. Amacımız; merkezi
            sunucuya, bulut aboneliğine ve tek bir taşıyıcıya bağımlı olmayan, kurumun kendi
            donanımında çalışan bir haberleşme altyapısı üretmek.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Mühendislik ilkeleri</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Dört tavizsiz kural
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {principles.map((p) => (
            <article key={p.tag} className="bg-card/50 p-7">
              <span className="font-mono text-[11px] tracking-[0.2em] text-primary">{p.tag}</span>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <SectionLabel>Yol haritası</SectionLabel>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              Nereden geldik
            </h2>
            <ul className="mt-8 space-y-6">
              {timeline.map(([year, text]) => (
                <li key={year} className="flex gap-5 border-l border-border pl-5">
                  <span className="font-mono text-sm text-primary">{year}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionLabel>Kurumsal künye</SectionLabel>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              Şeffaf satıcı bilgisi
            </h2>
            <dl className="mt-8 divide-y divide-border/60 overflow-hidden rounded-sm border border-border">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 bg-background/60 px-5 py-4">
                  <dt className="text-sm text-muted-foreground">{k}</dt>
                  <dd className="text-right font-mono text-[13px] text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-sm text-muted-foreground">
              Sözleşme, fatura ve veri işleme sorularınız için{" "}
              <Link to="/kosullar" className="text-foreground underline underline-offset-4">
                Kullanım Koşulları
              </Link>{" "}
              ve{" "}
              <Link to="/gizlilik" className="text-foreground underline underline-offset-4">
                Gizlilik Bildirimi
              </Link>{" "}
              sayfalarına bakabilirsiniz.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Ekiple doğrudan konuşun
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Kurumsal değerlendirme, teknik derinlik görüşmesi veya pilot planlaması için yazın.
          </p>
        </div>
        <Link
          to="/iletisim"
          className="rounded-sm bg-primary px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
        >
          İletişime geç
        </Link>
      </section>
    </SitePage>
  );
}
