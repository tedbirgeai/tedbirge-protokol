import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/fiyatlandirma")({
  head: () => ({
    meta: [
      { title: "Fiyatlandırma — Tedbirge Saha Ağı" },
      {
        name: "description",
        content:
          "Tedbirge Saha Ağı paketleri: tekil bürolar için Başlangıç, çok ekipli bürolar için Kurumsal ve ağ operatörleri için Ortaklık modeli.",
      },
      { property: "og:title", content: "Tedbirge Saha Ağı Fiyatlandırma" },
      {
        property: "og:description",
        content: "Ekip ve dosya bazlı şeffaf paketler; başarıya dayalı ortaklık modeli.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    name: "Başlangıç",
    price: "₺0",
    unit: "/ ilk 30 gün",
    note: "pilot, 3 saha cihazı",
    body: "Tek büro ve küçük saha ekibi için değerlendirme paketi.",
    features: [
      "3 saha cihazı, sınırsız delil kaydı",
      "Delil zinciri ve bütünlük doğrulama",
      "Çevrimdışı mesh taşıma",
      "Büro paneli (tek kullanıcı)",
      "E-posta desteği",
    ],
    cta: "Pilotu başlat",
    to: "/iletisim",
    highlight: false,
  },
  {
    name: "Kurumsal",
    price: "₺7.900",
    unit: "/ ay",
    note: "10 cihaz dahil, ek cihaz ₺450",
    body: "Çok ekipli hukuk büroları ve eksperlik şirketleri için üretim paketi.",
    features: [
      "Sınırsız dosya, 10+ saha cihazı",
      "Tedbirge AI ön değerlendirme ve dilekçe taslağı",
      "KVKK denetim izi ve erişim raporları",
      "WhatsApp müvekkil bildirimleri",
      "Rol bazlı yetkilendirme, çok kullanıcılı panel",
      "SLA: 8×5 destek, 99.9% panel erişilebilirliği",
    ],
    cta: "Teklif al",
    to: "/iletisim",
    highlight: true,
  },
  {
    name: "Ortaklık",
    price: "Özel",
    note: "başarıya dayalı gelir paylaşımı",
    body: "Sigorta eksperleri, filo yöneticileri ve bölgesel çözüm ortakları için.",
    features: [
      "Beyaz etiket panel ve saha uygulaması",
      "Dosya başına veya kazanılan tazminat üzerinden model",
      "Bölgesel münhasırlık seçeneği",
      "Mevcut büro yazılımınıza entegrasyon",
      "7×24 destek ve saha eğitimi",
    ],
    cta: "Görüşme planla",
    to: "/iletisim",
    highlight: false,
  },
];

const faqs = [
  [
    "Fiyat neye göre belirleniyor?",
    "Kurumsal pakette ücret, saha cihazı sayısına göre hesaplanır; dosya sayısı ve depolanan delil hacmi için ek ücret alınmaz.",
  ],
  [
    "Müvekkilden ücret alınıyor mu?",
    "Hayır. Tedbirge Saha Ağı büroya sunulan bir altyapıdır; müvekkil tarafındaki ön değerlendirme ücretsiz kalır.",
  ],
  [
    "İnternet olmadan toplanan deliller ücretlendirmeyi etkiler mi?",
    "Etkilemez. Çevrimdışı toplanan deliller sinyal geldiğinde senkronize olur; ücret yalnızca aktif cihaz sayısı üzerinden işler.",
  ],
  [
    "Veriler nerede saklanıyor?",
    "Deliller Türkiye'de barındırılan altyapıda, özel nitelikli veriler ayrı anahtarla şifreli olarak tutulur. İsteyen kurumlar kendi sunucularında barındırabilir.",
  ],
];

function Pricing() {
  return (
    <SitePage>
      <section className="brand-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <SectionLabel>Fiyatlandırma</SectionLabel>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            Ekibinizle ölçeklenen şeffaf paketler
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-primary-foreground/80">
            Pilotla değerlendirin, üretimde cihaz başına ödeyin, çözüm ortağıysanız kazanılan
            dosya üzerinden anlaşın.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-xl border p-8 ${
                p.highlight
                  ? "border-primary bg-card shadow-xl"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-foreground">
                  {p.name}
                </h2>
                {p.highlight && (
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                    Popüler
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight">{p.price}</span>
                {p.unit && <span className="text-sm text-muted-foreground">{p.unit}</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>

              <ul className="mt-7 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={p.to}
                className={`mt-8 rounded-lg px-5 py-3 text-center text-sm font-bold transition-opacity hover:opacity-90 ${
                  p.highlight
                    ? "bg-accent text-accent-foreground"
                    : "border border-border text-foreground"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Fiyatlara KDV dahil değildir. Yıllık ödemede iki ay ücretsizdir.
        </p>
      </section>

      <section className="border-t border-border bg-muted/50">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <SectionLabel>Sık sorulanlar</SectionLabel>
          <div className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
            {faqs.map(([q, a]) => (
              <div key={q} className="px-6 py-6">
                <h3 className="font-semibold text-foreground">{q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SitePage>
  );
}
