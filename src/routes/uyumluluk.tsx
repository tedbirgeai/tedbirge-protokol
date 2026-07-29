import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "Spektrum & Uyum Matrisi — Ülke Bazlı Taşıyıcı Kuralları";
const DESC =
  "Tedbirge Gateway taşıyıcılarının bölge bazlı spektrum, güç ve görev döngüsü sınırları: AB/TR, ABD/Kanada, Birleşik Krallık, Körfez, APAC ve Afrika profilleri.";
const URL = "https://artisan-project-studio.lovable.app/uyumluluk";

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

const regions = [
  {
    region: "Türkiye (BTK)",
    sub: "TR",
    lora: "868 MHz (SRD) · 25 mW e.r.p. · %1 görev döngüsü",
    halow: "Üretimde kapalı — 900 MHz bandı lisanslı",
    tvws: "Üretimde kapalı — beyaz alan çerçevesi yok",
    wigig: "60 GHz serbest · EIRP sınırlı",
    fso: "Lisanssız (optik) · göz güvenliği Class 1M",
  },
  {
    region: "Avrupa Birliği (ETSI EN 300 220 / 302 567)",
    sub: "EU",
    lora: "863–870 MHz · 25 mW e.r.p. · %0.1–%1 görev döngüsü",
    halow: "Üretimde kapalı — 863–868 uyumlu profil yok",
    tvws: "Ülke bazlı (EN 301 598) · varsayılan kapalı",
    wigig: "57–66 GHz · 40 dBm EIRP",
    fso: "Lisanssız · IEC 60825 Class 1M",
  },
  {
    region: "ABD / Kanada (FCC Part 15 / ISED)",
    sub: "US-CA",
    lora: "902–928 MHz · frekans atlamalı · 1 W iletim",
    halow: "802.11ah 902–928 MHz · açılabilir profil",
    tvws: "470–698 MHz · veri tabanı sorgusu zorunlu",
    wigig: "57–71 GHz · Part 15.255",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Birleşik Krallık (Ofcom)",
    sub: "UK",
    lora: "863–870 MHz · IR 2030 · %1 görev döngüsü",
    halow: "Kapalı",
    tvws: "470–790 MHz · veri tabanı destekli, izinli",
    wigig: "57–71 GHz serbest",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Körfez (BAE TDRA · S. Arabistan CST)",
    sub: "GCC",
    lora: "865–868 MHz · 25 mW · yerel kayıt",
    halow: "Kapalı",
    tvws: "Kapalı",
    wigig: "57–66 GHz serbest",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "APAC (AU/NZ ACMA · JP ARIB · SG IMDA)",
    sub: "APAC",
    lora: "915–928 MHz (AU/NZ) · 920–923 MHz (JP, LBT zorunlu)",
    halow: "AU/NZ açılabilir · JP profil sınırlı",
    tvws: "SG/NZ pilot çerçevesi · varsayılan kapalı",
    wigig: "57–66 GHz serbest",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Japonya (MIC / ARIB STD-T108)",
    sub: "JP",
    lora: "920–923 MHz · LBT zorunlu · 20 mW",
    halow: "Kapalı — 802.11ah profili onaysız",
    tvws: "Kapalı",
    wigig: "57–66 GHz serbest",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Güney Kore (RRA) · Çin (SRRC) · Hindistan (WPC)",
    sub: "KR-CN-IN",
    lora: "KR 917–923.5 MHz · CN 470–510 MHz (868 yasak) · IN 865–867 MHz",
    halow: "Üçünde de kapalı",
    tvws: "Kapalı",
    wigig: "60 GHz serbest (yerel tip onayı ile)",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Afrika & LATAM (ITU Bölge 1/2 karma)",
    sub: "AF-LATAM",
    lora: "868 veya 915 MHz — ulusal düzenleyiciye göre seçilir (BR 902–907.5/915–928)",
    halow: "Ülke bazlı · varsayılan kapalı",
    tvws: "ZA/KE beyaz alan çerçevesi · izinli",
    wigig: "57–66 GHz genellikle serbest",
    fso: "Lisanssız · Class 1M",
  },
];


const rules = [
  {
    t: "Varsayılan olarak kısıtlı",
    b: "Yasal statüsü belirsiz her taşıyıcı üretim yapılandırmasında kapalı gelir. Açmak, bölge profilinin açıkça seçilmesini ve operatör onayını gerektirir.",
  },
  {
    t: "Bölge profili tek kaynaktan",
    b: "TEDBIRGE_REGION ortam değişkeni tek doğruluk kaynağıdır; frekans planı, iletim gücü tavanı ve görev döngüsü bütçesi bu profilden türetilir.",
  },
  {
    t: "Görev döngüsü zorlaması",
    b: "Sub-GHz taşıyıcılarda görev döngüsü bütçesi çalışma zamanında sayılır; bütçe dolduğunda paketler kuyruğa alınır, sessizce ihlal edilmez.",
  },
  {
    t: "Sorumluluk paylaşımı",
    b: "Lisans, kayıt ve saha izinleri operatörün sorumluluğundadır. Tedbirge, kuralları teknik olarak uygulanabilir kılar; hukuki temsil sağlamaz.",
  },
];

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
            Tedbirge Gateway dokuz fiziksel katmanı destekler, ancak hepsi her ülkede
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
          Ethernet, Wi-Fi (2.4/5 GHz), hücresel ve uydu taşıyıcıları her bölgede operatörün
          mevcut aboneliği/donanımı üzerinden çalışır; ek spektrum izni gerektirmez.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Kaynaklar: ETSI EN 300 220 / EN 302 567, FCC Part 15.247 &amp; 15.255, Ofcom IR 2030,
          BTK KEGY, ACMA/ARIB/IMDA sub-GHz düzenlemeleri, IEC 60825-1 lazer sınıflandırması.
          Matris bilgilendirme amaçlıdır; konuşlanmadan önce ilgili ulusal düzenleyicinin
          yürürlükteki metni esas alınmalıdır.
        </p>
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
            <code>{`# Bölge profilini seçin — kapalı taşıyıcılar açılmaz
TEDBIRGE_REGION=EU        # TR | EU | US | UK | GCC | APAC
TEDBIRGE_CARRIERS=eth,wifi,cellular,satellite
TEDBIRGE_LORA_DUTY_CYCLE=0.01`}</code>
          </pre>
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
