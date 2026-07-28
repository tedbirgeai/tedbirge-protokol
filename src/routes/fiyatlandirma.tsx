import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/fiyatlandirma")({
  head: () => ({
    meta: [
      { title: "Fiyatlandırma — Aetheris Protocol" },
      {
        name: "description",
        content:
          "Aetheris lisans paketleri: açık kaynak Community, düğüm başına Enterprise ve kullanım bazlı Operator modeli. Şeffaf fiyat, sahada pilot.",
      },
      { property: "og:title", content: "Aetheris Fiyatlandırma" },
      {
        property: "og:description",
        content: "Community, Enterprise ve Operator paketleri; düğüm başına ve kullanım bazlı ücretlendirme.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    name: "Community",
    price: "Ücretsiz",
    note: "Apache-2.0 kaynak kod",
    body: "Değerlendirme, araştırma ve tekil saha denemeleri için.",
    features: [
      "Sınırsız düğüm, kendi altyapınızda",
      "Mesh router, tünel motoru, CLI SDK",
      "Topluluk desteği (GitHub Issues)",
      "Gömülü /admin paneli",
    ],
    cta: "GitHub'da başla",
    href: "https://github.com/tedbirgeai/aetheris",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "€49",
    unit: "/ düğüm / ay",
    note: "yıllık, min. 25 düğüm",
    body: "Üretim ortamında yönetilen filo ve destekli dağıtım.",
    features: [
      "Postgres + Redis üretim modu, mTLS",
      "Kullanım bazlı faturalama sayacı",
      "Stripe & e-Fatura köprüsü",
      "Grafana panosu + Prometheus",
      "SLA: 8×5 destek, 99.9% panel",
      "Cross-platform imzalı binary dağıtımı",
    ],
    cta: "Pilot başlat",
    to: "/iletisim",
    highlight: true,
  },
  {
    name: "Operator",
    price: "Özel",
    note: "gelir paylaşımı veya trafik bazlı",
    body: "Kendi müşterilerine ağ hizmeti satan ISP ve entegratörler için.",
    features: [
      "Beyaz etiket panel ve CLI",
      "Taşınan GB başına ücretlendirme",
      "Röle kredisi mahsuplaşma motoru",
      "Özel PHY taşıyıcı entegrasyonu",
      "7×24 destek ve saha mühendisliği",
    ],
    cta: "Teklif iste",
    to: "/iletisim",
    highlight: false,
  },
];

const faqs = [
  [
    "Lisans modeli nedir?",
    "Çekirdek protokol açık kaynaktır. Enterprise ve Operator paketleri; üretim modülleri, faturalama köprüsü, destek ve garanti içerir.",
  ],
  [
    "Kullanım nasıl ölçülür?",
    "Her düğüm taşınan bayt sayısını ve payload SHA-256 özetini kaydeder. İçerik asla saklanmaz; fatura yalnızca hacim ve düğüm sayısı üzerinden çıkar.",
  ],
  [
    "İnternet olmadan faturalama çalışır mı?",
    "Evet. Röle düğümleri Ed25519 imzalı fiş üretir; bağlantı geri geldiğinde fişler merkezi deftere aktarılır ve mahsuplaşır.",
  ],
  [
    "Kendi sunucumuzda barındırabilir miyiz?",
    "Tüm paketler self-hosted çalışır. Tek statik binary, systemd birimi ve docker-compose üretim dosyaları hazır gelir.",
  ],
];

function Pricing() {
  return (
    <SitePage>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <SectionLabel>Fiyatlandırma</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Düğüm başına şeffaf, hacimle ölçeklenen
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Açık kaynakla değerlendirin, üretimde düğüm başına ödeyin, operatörseniz taşıdığınız
            trafik üzerinden anlaşın.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-sm border p-8 ${
                p.highlight
                  ? "border-primary/60 bg-card shadow-[0_0_60px_-20px_var(--color-primary)]"
                  : "border-border bg-card/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-foreground">
                  {p.name}
                </h2>
                {p.highlight && (
                  <span className="rounded-full bg-primary/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                    Popüler
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
                {p.unit && <span className="text-sm text-muted-foreground">{p.unit}</span>}
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{p.note}</p>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>

              <ul className="mt-7 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {p.to ? (
                <Link
                  to={p.to}
                  className={`mt-8 rounded-sm px-5 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-opacity hover:opacity-90 ${
                    p.highlight
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground"
                  }`}
                >
                  {p.cta}
                </Link>
              ) : (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 rounded-sm border border-border px-5 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
                >
                  {p.cta}
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <SectionLabel>Sık sorulanlar</SectionLabel>
          <div className="mt-8 divide-y divide-border rounded-sm border border-border bg-background/50">
            {faqs.map(([q, a]) => (
              <div key={q} className="px-6 py-6">
                <h3 className="font-medium text-foreground">{q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SitePage>
  );
}
