import { createFileRoute } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/urun")({
  head: () => ({
    meta: [
      { title: "Ürün ve Mimari — Aetheris Protocol" },
      {
        name: "description",
        content:
          "Aetheris mimarisi: mesh router, zero-knowledge tünel, Ed25519 güvenlik kalkanı, off-grid defter, WAL ve gömülü yönetim paneli.",
      },
      { property: "og:title", content: "Aetheris Ürün ve Mimari" },
      {
        property: "og:description",
        content: "Tek statik binary içinde tünel, mesh, güvenlik, defter ve panel katmanları.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Product,
});

const layers = [
  ["Tünel Proxy Motoru", "Canlı TCP/UDP proxy, AES-256-GCM chunk şifreleme, zero-knowledge ölçüm (SHA-256 + bayt)."],
  ["Mesh Router", "Dijkstra çok-sıçramalı yönlendirme, TTL, loop-prevention, RTT × taşıyıcı ağırlığı maliyet modeli."],
  ["Güvenlik Kalkanı", "Ed25519 kimlik, Proof-of-Work ile Sybil direnci, nonce kayan penceresi ile replay koruması."],
  ["Gossip Katmanı", "UDP broadcast beacon ile merkezsiz komşu keşfi ve anti-entropy senkronizasyonu."],
  ["Off-Grid Ledger", "İmzalı fiş/voucher üretimi, tek-kullanımlık nonce, çift harcama koruması, relay credit."],
  ["WAL & Depolama", "Atomik-swap yazma, Windows dahil çapraz platform dayanıklılık, Postgres/Redis üretim modu."],
  ["Faturalama Köprüsü", "Thread-safe kullanım sayacı, kalıcı defter, Stripe ve e-Fatura harness entegrasyonu."],
  ["/admin Paneli", "go:embed ile tamamen offline; canlı topoloji, WAL derinliği, WebSocket telemetri, Prometheus."],
];

const threats = [
  ["Sahte kimlik (spoofing)", "Ed25519 düğüm kimliği; her düğüm NodeID'sini imzalar"],
  ["Sybil saldırısı", "Proof-of-Work: ağa katılım hesaplama maliyeti ister"],
  ["Replay", "Nonce kayan penceresi + zaman damgası doğrulaması"],
  ["Sahte bakiye / çift harcama", "Ed25519 imzalı fiş, tek-kullanımlık nonce"],
  ["Yük gözetimi", "Zero-knowledge: içerik saklanmaz, yalnızca SHA-256 + bayt"],
];

const wan = [
  ["WAN: Direct Internet", "Düğümün kendi doğrudan WAN bağlantısı var"],
  ["WAN: Relayed via Peer", "Başka bir Aetheris exit düğümü üzerinden bağlı"],
  ["WAN: Off-Grid Mesh Only", "Dış internet yok; yalnızca yerel mesh aktif"],
];

function Product() {
  return (
    <SitePage>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Ürün</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Sekiz katman, tek çalıştırılabilir dosya
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Aetheris düğümü kurulum sihirbazı, konteyner orkestrasyonu veya dış servis
            gerektirmez. Binary'yi kopyalayın, çevre değişkenlerini verin, düğüm ağa katılır.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {layers.map(([title, body], i) => (
            <div key={title} className="bg-card/50 p-7">
              <span className="font-mono text-xs text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Güvenlik modeli</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Tehdit → savunma</h2>
          <div className="mt-10 overflow-hidden rounded-sm border border-border">
            {threats.map(([t, d], i) => (
              <div
                key={t}
                className={`grid gap-2 px-6 py-5 md:grid-cols-2 ${
                  i % 2 ? "bg-background/40" : "bg-background/70"
                }`}
              >
                <p className="font-medium text-foreground">{t}</p>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Exit node</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          İnterneti olmayan düğüm için WAN köprüsü
        </h2>
        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-center">
          <pre className="overflow-x-auto rounded-sm border border-border bg-card/50 p-6 font-mono text-[12.5px] leading-relaxed text-muted-foreground">
            <code>{`Dugum A (internet YOK)        Dugum B (exit, WAN var)
+--------------------+        +--------------------+
| Tunel Ingress      | sifreli| Tunel Egress       |  WAN
| AES-256-GCM chunk  |=======>| hedefe baglanir    | ----> Internet
| icerik B'ye kapali | multi  | yaniti geri sarar  | <----
+--------------------+  hop   +--------------------+`}</code>
          </pre>
          <div className="space-y-4">
            {wan.map(([badge, desc]) => (
              <div key={badge} className="rounded-sm border border-border bg-card/40 p-5">
                <p className="font-mono text-sm text-primary">{badge}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SitePage>
  );
}
