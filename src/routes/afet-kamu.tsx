import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "Afet ve Kamu Güvenliği Haberleşmesi — Tedbirge Protokol";
const DESC =
  "GSM ve elektrik çöktüğünde saha içi haberleşmeyi ayakta tutan off-grid mesh altyapısı. AFAD, il afet müdürlükleri, itfaiye ve arama-kurtarma ekipleri için sayısal telsize tamamlayıcı veri katmanı.";
const URL = "https://artisan-project-studio.lovable.app/afet-kamu";

export const Route = createFileRoute("/afet-kamu")({
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
          "@type": "Service",
          name: "Tedbirge Afet ve Kamu Güvenliği Mesh Altyapısı",
          serviceType: "Off-grid mesh haberleşme altyapısı",
          areaServed: "TR",
          provider: { "@type": "Organization", name: "Tedbirge" },
          description: DESC,
        }),
      },
    ],
  }),
  component: PublicSafety,
});

const scenarios = [
  {
    phase: "T+0 · İlk saat",
    title: "Şebeke yok, koordinasyon var",
    body: "Deprem sonrası baz istasyonları ve fiber hatları devre dışı kaldığında saha ekipleri sırt çantasındaki düğümlerle birbirini bulur. Gossip keşfi ile üç dakikadan kısa sürede yerel mesh ayağa kalkar; DNS, sunucu veya SIM kart gerekmez.",
  },
  {
    phase: "T+6 · Yerleşim",
    title: "Toplanma alanı omurgası",
    body: "Konteyner kent, sahra hastanesi ve lojistik deposu arasında Wi-Fi HaLow veya FSO köprüsüyle megabit seviyesinde bağlantı kurulur. Ekip listesi, hasta kaydı ve malzeme sayımı senkronize edilir.",
  },
  {
    phase: "T+24 · Dış dünya",
    title: "Tek WAN, tüm saha",
    body: "Uydu terminali ya da çalışan tek bir hücresel hat exit node olarak tanımlanır. Kapsama dışındaki bütün düğümler bu komşu üzerinden şifreli tünelle merkeze çıkar; exit düğüm içeriği göremez.",
  },
  {
    phase: "T+72 · Muhasebe",
    title: "Kimin ne taşıdığı kanıtlı",
    body: "Kurumlar arası paylaşılan röle kapasitesi Ed25519 imzalı fişlerle kayıt altına alınır. Operasyon bitiminde taşınan bayt dökümü mahsuplaşma ve raporlama için dışa aktarılır.",
  },
];

const institutions = [
  {
    name: "AFAD ve il afet müdürlükleri",
    body: "Kesintisiz ve güvenli haberleşme hedefine veri katmanı desteği: sayısal telsizin ses trafiğini bozmadan form, harita, fotoğraf ve durum raporu taşır.",
  },
  {
    name: "İtfaiye ve UMKE",
    body: "Bina içi ve tünel gibi kapsama boşluklarında hop-by-hop taşıma; ekip konumu ve triyaj verisi merkeze ulaşır.",
  },
  {
    name: "Belediye ve altyapı işletmecileri",
    body: "Su, doğalgaz ve enerji SCADA telemetrisi kriz anında LoRa/TVWS üzerinden yedeklenir.",
  },
  {
    name: "Sivil toplum ve arama-kurtarma",
    body: "Donanım bağımsız SDK; mevcut Android cihaz ve USB LoRa dongle ile düşük maliyetli konuşlanma.",
  },
];

const dmr = [
  ["Ses trafiği", "DMR Tier III telsiz", "Değişmez — Tedbirge sese dokunmaz"],
  ["Veri / dosya", "Sınırlı kısa mesaj", "Mesh üzerinden dosya, form, görüntü"],
  ["Bant genişliği", "Kanal başına düşük", "150 kbps – 10 Gbps taşıyıcıya göre"],
  ["Altyapı", "Röle direği bağımlı", "Düğümden düğüme, direksiz çalışır"],
  ["Şifreleme", "Cihaz bağımlı", "AES-256-GCM uçtan uca, sıfır-bilgi"],
  ["Konuşlanma", "Kurulum projesi", "Tek statik binary, saatler içinde"],
];

const compliance = [
  "868 MHz SRD bandı ve ETSI EN 300 220 güç/görev döngüsü sınırlarına uygun varsayılan profil.",
  "TVWS 470–790 MHz için ETSI EN 301 598 uyumlu kanal seçimi; sahada BTK koordinasyonu şart koşulur.",
  "915 MHz profili Türkiye ve AB kurulumlarında varsayılan olarak kapalıdır.",
  "RF taşıyıcılarda IP/MAC kullanılmaz; kişisel veri taşıma katmanında açığa çıkmaz (Zero-KVKK çerçeveleme).",
  "Kurum içi konuşlanma: tüm bileşenler kurumun kendi donanımında çalışır, dış SaaS bağımlılığı yoktur.",
];

function PublicSafety() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-24">
          <SectionLabel>Afet ve kamu güvenliği</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Şebeke çöktüğünde haberleşme durmasın
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tedbirge Protokol; baz istasyonu, fiber ve elektrik olmadan çalışan yerel bir veri
            ağı kurar. Mevcut sayısal telsiz yatırımlarının yerini almaz, üzerine dosya ve
            telemetri taşıyan şifreli bir katman ekler.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/iletisim"
              className="rounded-sm bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              Kurum pilotu talep et
            </Link>
            <Link
              to="/tasiyicilar"
              className="rounded-sm border border-border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
            >
              Taşıyıcı matrisi
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Operasyon zaman çizelgesi</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          İlk dakikadan mahsuplaşmaya
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {scenarios.map((s) => (
            <article key={s.phase} className="bg-card/50 p-7">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                {s.phase}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Sayısal telsizle ilişki</SectionLabel>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            DMR&apos;ın yerini almaz, eksiğini kapatır
          </h2>
          <div className="mt-10 overflow-x-auto rounded-sm border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-secondary/50 text-left font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Boyut</th>
                  <th className="px-5 py-3 font-medium">Sayısal telsiz (DMR Tier III)</th>
                  <th className="px-5 py-3 font-medium">Tedbirge katmanı</th>
                </tr>
              </thead>
              <tbody>
                {dmr.map(([dim, a, b]) => (
                  <tr key={dim} className="border-t border-border/60">
                    <td className="px-5 py-4 font-medium text-foreground">{dim}</td>
                    <td className="px-5 py-4 text-muted-foreground">{a}</td>
                    <td className="px-5 py-4 text-foreground">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Kurumlar</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Kimin için tasarlandı
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {institutions.map((i) => (
            <div key={i.name} className="rounded-sm border border-border bg-card/40 p-7">
              <h3 className="text-lg font-semibold">{i.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <SectionLabel>Regülasyon ve veri uyumu</SectionLabel>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Sahaya çıkmadan önce yasal statü
          </h2>
          <ul className="mt-7 space-y-3 text-sm">
            {compliance.map((c) => (
              <li key={c} className="flex gap-3 text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Taşıma katmanı anonimliği, uygulama katmanındaki KVKK yükümlülüklerini ortadan
            kaldırmaz. Kurum kurulumlarında veri envanteri ve saklama süreleri kurum
            politikasına göre yapılandırılır.
          </p>
        </div>
      </section>
    </SitePage>
  );
}
