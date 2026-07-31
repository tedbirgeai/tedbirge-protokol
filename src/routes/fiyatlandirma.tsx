import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { PLANS, type PlanKey } from "@/lib/paddle-catalog";
import { useAuth } from "@/hooks/useAuth";
import { NextStep } from "@/components/site/NextStep";

export const Route = createFileRoute("/fiyatlandirma")({
  head: () => ({
    meta: [
      { title: "Fiyatlandırma — Tedbirge Protocol Resilience-as-a-Service" },
      {
        name: "description",
        content:
          "Resilience-as-a-Service (RaaS) paketleri: Freemium, Community, Enterprise ve Operator. Şeffaf düğüm başına fiyat, 30 gün koşulsuz iade.",
      },
      { property: "og:title", content: "Tedbirge Protocol — RaaS Fiyatlandırma" },
      {
        property: "og:description",
        content: "Freemium, Community, Enterprise ve Operator paketleri; düğüm başına ve kullanım bazlı abonelik.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tedbirge-gateway.lovable.app/fiyatlandirma" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/fiyatlandirma" }],
  }),
  component: Pricing,
});

const faqs = [
  [
    "Resilience-as-a-Service (RaaS) nedir?",
    "Bağlantı sürekliliğini donanım satın almadan, aylık abonelikle almanızdır. Cihazlarınız Tedbirge Protocol'e katılır; yedekleme, izleme ve raporlama hizmet olarak sunulur.",
  ],
  [
    "Freemium ile Community farkı nedir?",
    "Freemium tek kullanıcı ve 2 cihazla denemek içindir. Community, 5 düğüme kadar ücretsiz pilot kurulumu ve tüm taşıyıcı köprülerini kapsar.",
  ],
  [
    "Kullanım nasıl ölçülür?",
    "Yalnızca taşınan hacim ve aktif düğüm sayısı ölçülür. Trafiğinizin içeriği hiçbir noktada saklanmaz; fatura sade ve denetlenebilirdir.",
  ],
  [
    "İnternet olmadan da çalışır mı?",
    "Evet. Bağlantı kesildiğinde kayıtlar cihazda güvenle bekler, hat geri geldiğinde kayıpsız biçimde merkeze aktarılır ve faturaya yansır.",
  ],
  [
    "Kendi sunucumuzda barındırabilir miyiz?",
    "Evet. Enterprise ve Operator paketleri kendi altyapınızda çalışacak şekilde kurulabilir; kurulum ve devreye alma destek kapsamındadır.",
  ],
  [
    "İade mümkün mü?",
    "Evet, 30 gün içinde koşulsuz tam iade. Ödemeler kayıtlı satıcımız Paddle tarafından işlenir.",
  ],
];


function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openCheckout, loading } = usePaddleCheckout();
  const [cycle, setCycle] = useState<"month" | "year">("month");
  const [planKey, setPlanKey] = useState<PlanKey>("pro");
  const [nodes, setNodes] = useState(PLANS.pro.minNodes);

  const plan = PLANS[planKey];
  const priceId = plan.prices[cycle];
  const unitPrice = plan.unitPrice[cycle];
  const total = unitPrice * nodes;

  function selectPlan(key: PlanKey) {
    setPlanKey(key);
    setNodes((n) => Math.min(PLANS[key].maxNodes, Math.max(PLANS[key].minNodes, n)));
  }


  async function startCheckout() {
    if (!user) {
      navigate({ to: "/giris", search: { next: "/fiyatlandirma" } });
      return;
    }
    await openCheckout({
      priceId,
      quantity: nodes,
      customerEmail: user.email ?? undefined,
      customData: { userId: user.id, email: user.email ?? "" },
    });
  }

  return (
    <SitePage>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <SectionLabel>Resilience-as-a-Service</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Bağlantı sürekliliği, abonelik olarak
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Ücretsiz deneyin, kurumsal kullanımda düğüm başına ödeyin, operatörseniz taşıdığınız
            trafik üzerinden anlaşın. Donanım yatırımı ve uzun kurulum süreci yok.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Freemium + Community */}
          <div className="flex flex-col rounded-sm border border-border bg-card/40 p-8">
            <h2 className="font-mono text-sm uppercase tracking-[0.2em]">Freemium & Community</h2>
            <div className="mt-6 text-4xl font-semibold tracking-tight">Ücretsiz</div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Freemium 2 cihaz · Community 5 düğüm
            </p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Tek cihazla denemek, pilot kurmak ve saha testi yapmak için.
            </p>
            <ul className="mt-7 flex-1 space-y-3 text-sm">
              {[
                "Freemium: 2 cihaza kadar tarayıcı düğümü",
                "Community: 5 düğüme kadar ücretsiz kota",
                "Tüm taşıyıcı köprüleri ve çevrimdışı kuyruk",
                "Canlı gösterge paneli",
                "Topluluk desteği",
              ].map((f) => (
                <li key={f} className="flex gap-3 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/giris"
              className="mt-8 rounded-sm border border-border px-5 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
            >
              Ücretsiz başla
            </Link>
          </div>


          {/* Pro / Enterprise */}
          <div className="flex flex-col rounded-sm border border-primary/60 bg-card p-8 shadow-[0_0_60px_-20px_var(--color-primary)]">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm uppercase tracking-[0.2em]">{plan.label}</h2>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                Popüler
              </span>
            </div>

            <div className="mt-5 inline-flex rounded-sm border border-border p-1 font-mono text-[11px] uppercase tracking-[0.12em]">
              <button
                onClick={() => selectPlan("pro")}
                className={`rounded-sm px-3 py-1.5 ${planKey === "pro" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Pro · 6–24 düğüm
              </button>
              <button
                onClick={() => selectPlan("enterprise")}
                className={`rounded-sm px-3 py-1.5 ${planKey === "enterprise" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Enterprise · 25+
              </button>
            </div>

            <div className="mt-3 inline-flex rounded-sm border border-border p-1 font-mono text-[11px] uppercase tracking-[0.12em]">
              <button
                onClick={() => setCycle("month")}
                className={`rounded-sm px-3 py-1.5 ${cycle === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Aylık
              </button>
              <button
                onClick={() => setCycle("year")}
                className={`rounded-sm px-3 py-1.5 ${cycle === "year" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Yıllık (2 ay hediye)
              </button>
            </div>

            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight">€{unitPrice}</span>
              <span className="text-sm text-muted-foreground">
                / düğüm / {cycle === "month" ? "ay" : "yıl"}
              </span>
            </div>

            <label className="mt-6 block font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Düğüm sayısı: {nodes} ({plan.minNodes}–{plan.maxNodes})
            </label>
            <input
              type="range"
              min={plan.minNodes}
              max={plan.maxNodes}
              step={1}
              value={nodes}
              onChange={(e) => setNodes(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--color-primary)]"
            />
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Toplam: €{total.toLocaleString("tr-TR")} / {cycle === "month" ? "ay" : "yıl"} + KDV
            </p>

            <ul className="mt-7 flex-1 space-y-3 text-sm">
              {(planKey === "pro"
                ? [
                    "6–24 düğüm kotası, çoklu organizasyon",
                    "Öncelikli API limiti + webhook bildirimleri",
                    "Kesinti/olay günlüğü ve uyum raporu",
                    "Kalibrasyon PDF/CSV raporları",
                    "E-posta desteği (1 iş günü)",
                  ]
                : [
                    "Postgres + Redis üretim modu, mTLS",
                    "Kullanım bazlı faturalama sayacı",
                    "e-Fatura ve POS köprüsü",
                    "Grafana panosu + Prometheus",
                    "SLA: 8×5 destek, %99.9 panel",
                    "İmzalı çoklu platform binary dağıtımı",
                  ]
              ).map((f) => (
                <li key={f} className="flex gap-3 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>


            <button
              onClick={startCheckout}
              disabled={loading}
              className="mt-8 rounded-sm bg-primary px-5 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Açılıyor…" : user ? "Aboneliği başlat" : "Giriş yap ve satın al"}
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              30 gün koşulsuz iade · Kayıtlı satıcı: Paddle
            </p>
          </div>

          {/* Operator */}
          <div className="flex flex-col rounded-sm border border-border bg-card/40 p-8">
            <h2 className="font-mono text-sm uppercase tracking-[0.2em]">Operator</h2>
            <div className="mt-6 text-4xl font-semibold tracking-tight">Özel</div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              gelir paylaşımı veya trafik bazlı
            </p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Kendi müşterilerine ağ hizmeti satan ISP ve entegratörler için.
            </p>
            <ul className="mt-7 flex-1 space-y-3 text-sm">
              {[
                "Beyaz etiket panel ve CLI",
                "Taşınan GB başına ücretlendirme",
                "Röle kredisi mahsuplaşma motoru",
                "Özel PHY taşıyıcı entegrasyonu",
                "7×24 destek ve saha mühendisliği",
              ].map((f) => (
                <li key={f} className="flex gap-3 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/iletisim"
              className="mt-8 rounded-sm border border-border px-5 py-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
            >
              Teklif iste
            </Link>
          </div>
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
      <NextStep to="/kur" title="Ağınızı 3 adımda kurun" description="Terminal ya da anahtar yönetimi olmadan ilk düğümünüzü başlatın." />
    </SitePage>
  );
}
