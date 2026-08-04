import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "Tedbirge vs goTenna, Meshtastic, Reticulum — Karşılaştırma";
const DESC =
  "Tedbirge Protokol'ü goTenna Pro, Meshtastic, Reticulum ve Briar ile yan yana karşılaştırın: taşıyıcı bağımsızlığı, donanım kilidi, şifreleme, kullanım bazlı faturalama ve kurum içi konuşlanma.";
const URL = "https://tedbirge-gateway.lovable.app/karsilastirma";

export const Route = createFileRoute("/karsilastirma")({
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
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Tedbirge ile Meshtastic arasındaki fark nedir?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Meshtastic yalnızca LoRa radyoları üzerinde çalışan tüketici odaklı bir projedir. Tedbirge on farklı fiziksel taşıyıcıyı tek yönlendirici altında birleştirir, kullanım muhasebesi ve kurumsal yönetim katmanı içerir.",
              },
            },
            {
              "@type": "Question",
              name: "Tedbirge goTenna Pro'nun yerine geçer mi?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "goTenna Pro kendi donanımına kilitli taktik bir üründür. Tedbirge donanım satmaz; mevcut Ethernet, Wi-Fi, uydu veya LoRa donanımınız üzerinde çalışan bir yazılım katmanıdır.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: Comparison,
});

type Cell = "yes" | "partial" | "no";

const columns = ["Tedbirge", "goTenna Pro", "Meshtastic", "Reticulum", "Briar"] as const;

const rows: { feature: string; note: string; values: Cell[] }[] = [
  {
    feature: "Taşıyıcı bağımsızlığı",
    note: "Ethernet, Wi-Fi, hücresel, uydu, WiGig, FSO, HaLow, TVWS, LoRa",
    values: ["yes", "no", "no", "yes", "partial"],
  },
  {
    feature: "Donanım kilidi yok",
    note: "Kendi cihazınızda çalışır, özel radyo satın alma zorunluluğu yoktur",
    values: ["yes", "no", "partial", "yes", "yes"],
  },
  {
    feature: "Çok-sıçramalı maliyet tabanlı yönlendirme",
    note: "RTT × taşıyıcı ağırlığı ile Dijkstra yol seçimi",
    values: ["yes", "partial", "partial", "yes", "no"],
  },
  {
    feature: "Uçtan uca şifreleme",
    note: "AES-256-GCM yük şifreleme, Ed25519 düğüm kimliği",
    values: ["yes", "yes", "partial", "yes", "yes"],
  },
  {
    feature: "Sıfır-bilgi ölçüm",
    note: "İçerik saklanmaz; yalnızca SHA-256 özeti ve bayt sayımı tutulur",
    values: ["yes", "no", "no", "no", "no"],
  },
  {
    feature: "Off-grid kullanım muhasebesi",
    note: "İmzalı fiş, relay credit, sonradan mahsuplaşma",
    values: ["yes", "no", "no", "no", "no"],
  },
  {
    feature: "Kullanım bazlı faturalama",
    note: "Kalıcı defter, WAL kuyruk, ödeme sağlayıcı köprüsü",
    values: ["yes", "no", "no", "no", "no"],
  },
  {
    feature: "WAN exit node köprüsü",
    note: "İnternetsiz düğüm, komşusu üzerinden şifreli çıkış yapar",
    values: ["yes", "partial", "no", "yes", "no"],
  },
  {
    feature: "Gömülü yönetim paneli",
    note: "Tek binary içinde topoloji, telemetri ve Prometheus metrikleri",
    values: ["yes", "partial", "partial", "no", "no"],
  },
  {
    feature: "Kurum içi konuşlanma (self-hosted)",
    note: "Dış SaaS bağımlılığı olmadan kurumun kendi donanımında",
    values: ["yes", "partial", "yes", "yes", "yes"],
  },
  {
    feature: "Türkiye regülasyon profili",
    note: "868 MHz SRD varsayılanı, TVWS koordinasyonu, KVKK notları",
    values: ["yes", "no", "no", "no", "no"],
  },
  {
    feature: "Ticari destek ve SLA",
    note: "Sözleşmeli kurumsal destek ve pilot mühendisliği",
    values: ["yes", "yes", "no", "no", "no"],
  },
];

const marks: Record<Cell, { glyph: string; label: string; cls: string }> = {
  yes: { glyph: "●", label: "Var", cls: "text-primary" },
  partial: { glyph: "◐", label: "Kısmi", cls: "text-accent-foreground" },
  no: { glyph: "○", label: "Yok", cls: "text-muted-foreground/60" },
};

const positioning = [
  {
    name: "goTenna Pro",
    kind: "Taktik donanım",
    body: "Sahada kanıtlanmış ancak kendi radyo donanımına kilitli. Cihaz başına maliyet yüksek, taşıyıcı çeşitliliği ve kullanım muhasebesi yok.",
  },
  {
    name: "Meshtastic",
    kind: "Açık kaynak / hobi",
    body: "LoRa üzerinde düşük maliyetli mesh. Kurumsal yönetim, faturalama, SLA ve çoklu taşıyıcı yok; kritik operasyon için garanti sunmaz.",
  },
  {
    name: "Reticulum",
    kind: "Protokol yığını",
    body: "Güçlü, taşıyıcı-bağımsız bir protokol. Ürünleşmiş yönetim paneli, ticari destek ve kullanım bazlı gelir modeli içermez.",
  },
  {
    name: "Briar",
    kind: "Mesajlaşma uygulaması",
    body: "Uçtan uca şifreli sohbet odağında. Altyapı katmanı, yönlendirme muhasebesi ve kurumsal entegrasyon kapsam dışıdır.",
  },
];

function Comparison() {
  return (
    <SitePage>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionLabel>Karşılaştırma</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Alternatiflerle yan yana
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
            Off-grid haberleşme alanında birbirinden farklı katmanlarda ürünler var: donanım,
            protokol, uygulama. Tedbirge; taşıyıcı-bağımsız altyapı katmanında konumlanır ve
            kurumsal muhasebe ile yönetim gereksinimlerini kapsar.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[840px] border-collapse text-sm">
            <caption className="sr-only">
              Tedbirge Protokol ile goTenna Pro, Meshtastic, Reticulum ve Briar özellik
              karşılaştırması
            </caption>
            <thead>
              <tr className="bg-secondary/50 text-left font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                <th scope="col" className="px-5 py-3 font-medium">
                  Özellik
                </th>
                {columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className={`px-4 py-3 text-center font-medium ${c === "Tedbirge" ? "text-primary" : ""}`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.feature} className="border-t border-border/60 align-top">
                  <th scope="row" className="px-5 py-4 text-left font-normal">
                    <span className="font-medium text-foreground">{r.feature}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{r.note}</span>
                  </th>
                  {r.values.map((v, i) => (
                    <td key={columns[i]} className="px-4 py-4 text-center">
                      <span className={`text-lg ${marks[v].cls}`} aria-hidden>
                        {marks[v].glyph}
                      </span>
                      <span className="sr-only">{marks[v].label}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap gap-6 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          {(Object.keys(marks) as Cell[]).map((k) => (
            <span key={k} className="flex items-center gap-2">
              <span className={marks[k].cls}>{marks[k].glyph}</span>
              {marks[k].label}
            </span>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Karşılaştırma, projelerin kamuya açık dokümantasyonundaki yeteneklere dayanır ve
          bilgilendirme amaçlıdır. Ürünler farklı katmanlarda çalıştığı için bazı satırlar
          ilgili proje için tasarım hedefi dışındadır.
        </p>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Konumlandırma</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Her biri farklı bir katmanda
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {positioning.map((p) => (
              <div key={p.name} className="rounded-sm border border-border bg-card/50 p-7">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                  {p.kind}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{p.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Kendi senaryonuzda karşılaştırın
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Üç düğümlük bir pilot kurun, mevcut çözümünüzle yan yana ölçün.
          </p>
        </div>
        <Link
          to="/iletisim"
          className="rounded-sm bg-primary px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
        >
          Pilot başvurusu
        </Link>
      </section>
    </SitePage>
  );
}
