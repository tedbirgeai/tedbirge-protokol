import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tedbirge Protokol — Off-Grid Mesh ve Sıfır-Bilgi Ağ Geçidi" },
      {
        name: "description",
        content:
          "Taşıyıcı-bağımsız mesh SDK ve sıfır-bilgi tünel geçidi. Tek statik binary, LoRa/Wi-Fi/Ethernet, Ed25519 güvenlik ve kullanım bazlı faturalama.",
      },
      { property: "og:title", content: "Tedbirge Protokol — Off-Grid Mesh Ağ Geçidi" },
      {
        property: "og:description",
        content:
          "İnternet olmadan çalışan kurumsal mesh altyapısı: çok-sıçramalı yönlendirme, zero-knowledge tünel, kullanım bazlı faturalama.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const stats = [
  { value: "5 platform", label: "cross-compile binary" },
  { value: "0 bağımlılık", label: "Node.js / CDN yok" },
  { value: "9 taşıyıcı", label: "Ethernet · Wi-Fi · LoRa · Uydu · FSO · TVWS" },
  { value: "AES-256", label: "GCM uçtan uca tünel" },
];

const features = [
  {
    tag: "MESH",
    title: "Çok-sıçramalı Dijkstra yönlendirme",
    body: "A → C doğrudan yoksa paket B üzerinden hop-by-hop taşınır. En düşük RTT × taşıyıcı ağırlığı maliyetli yol otomatik seçilir; TTL ve loop-prevention yerleşiktir.",
  },
  {
    tag: "GÜVENLİK",
    title: "Ağ içi sıfır-bilgi kalkanı",
    body: "Ed25519 düğüm kimliği, katılım için Proof-of-Work, nonce kayan penceresiyle replay koruması. Taşınan yükün içeriği asla saklanmaz — yalnızca SHA-256 ve bayt sayımı.",
  },
  {
    tag: "OFF-GRID",
    title: "İnternetsiz bakiye muhasebesi",
    body: "Röle düğümleri taşıdıkları baytlar için Ed25519 imzalı fiş keser. Bağlantı sıfır olsa bile relay credit matematiksel olarak kanıtlanır ve sonradan mahsuplaşır.",
  },
  {
    tag: "BİLLING",
    title: "Thread-safe kullanım sayacı",
    body: "Kalıcı faturalama defteri, WAL dayanıklı kuyruk, Redis dağıtık hız sınırlama ve Stripe / e-Fatura köprüsü ile kullanım bazlı gelir modeli.",
  },
  {
    tag: "EXIT NODE",
    title: "Komşu üzerinden WAN köprüsü",
    body: "İnterneti olmayan düğüm, WAN erişimli komşuya şifreli mesh üzerinden çıkar. Exit düğüm yalnızca hedef adresi bilir, içeriği değil.",
  },
  {
    tag: "OPS",
    title: "Gömülü offline panel",
    body: "go:embed ile tek binary içinde /admin paneli: canlı mesh topolojisi, WAL derinliği, geçiş hızı, kredi dökümü, WebSocket telemetri ve Prometheus metrikleri.",
  },
];

const useCases = [
  {
    title: "Savunma & Kamu",
    body: "Altyapısız sahada komuta-kontrol trafiği: merkezi sunucu ve DNS gerekmeden çok-sıçramalı şifreli iletişim.",
  },
  {
    title: "Enerji & Maden",
    body: "Kapsama dışı tesislerde IoT telemetrisi LoRa üzerinden toplanır, WAN'lı tek düğümden merkeze aktarılır.",
  },
  {
    title: "Afet & İnsani Yardım",
    body: "Şebeke çöktüğünde saatler içinde kurulan yerel mesh; 0-WAN mesaj ve dosya takası saha ekipleri arasında sürer.",
  },
  {
    title: "Telekom & ISP",
    body: "Alternatif PHY taşıyıcılarla son-kilometre kapsaması ve kullanım bazlı faturalanan yönetilen ağ hizmeti.",
  },
];

function Index() {
  return (
    <SitePage>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-70" aria-hidden />
        <div
          className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            v0.6a — turnkey
          </div>

          <h1 className="mt-7 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight text-foreground md:text-6xl">
            İnternet olmadığında da{" "}
            <span className="text-primary">çalışan ağ altyapısı</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tedbirge; taşıyıcı-bağımsız (PHY-agnostic), sıfır-bilgi bir tünel geçidi ve mesh
            SDK'sıdır. Çöldeki off-grid saha cihazından kurumsal veri merkezine kadar tek
            statik binary ile çalışır.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/iletisim"
              className="rounded-sm bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              Pilot başvurusu
            </Link>
            <Link
              to="/urun"
              className="rounded-sm border border-border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
            >
              Mimariyi incele
            </Link>
          </div>

          <div className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-background/80 px-5 py-6">
                <p className="font-mono text-xl text-primary">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>Yetenekler</SectionLabel>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Sahada kanıtlanmış altı çekirdek katman
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="bg-card/60 p-7 transition-colors hover:bg-card">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
                {f.tag}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* MODULES */}
      <section className="border-y border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>Ürün ailesi</SectionLabel>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Tedbirge Protokol&apos;ün üç modülü
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Tedbirge Gateway",
                body: "Tünel proxy motoru ve exit node: AES-256-GCM chunk şifreleme, zero-knowledge ölçüm ve WAN köprüsü. Tek statik binary olarak çalışır.",
              },
              {
                name: "Tedbirge Loop",
                body: "Mesh yönlendirme ve gossip halkası: Dijkstra çok-sıçramalı yol seçimi, komşu keşfi, TTL ve loop-prevention.",
              },
              {
                name: "Tedbirge Off-Grid",
                body: "İnternetsiz muhasebe katmanı: Ed25519 imzalı fiş, relay credit, çift harcama koruması ve sonradan mahsuplaşma.",
              },
            ].map((m) => (
              <div key={m.name} className="rounded-sm border border-border bg-card/50 p-7">
                <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-primary">
                  {m.name}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ARCHITECTURE */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>Mimari</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Tek binary, tam yığın
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Tünel proxy motoru, mesh router, güvenlik kalkanı, gossip keşfi, off-grid defter,
              WAL ve yönetim paneli aynı çalıştırılabilir dosyada gelir. Cross-compilation CGO
              gerektirmez; Linux (amd64/arm64), Windows ve macOS için statik çıktı üretilir.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                "Tünel Proxy Motoru — AES-256-GCM chunk, zero-knowledge ölçüm",
                "Mesh Router — Dijkstra, TTL, taşıyıcı seçimi",
                "Güvenlik Kalkanı — Ed25519 · PoW · replay penceresi",
                "Gossip — merkezsiz keşif ve anti-entropy",
                "Off-Grid Ledger — imzalı fiş / voucher",
                "WAL — atomik-swap, çapraz platform",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-sm border border-border bg-background/80 p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="size-2 rounded-full bg-accent" />
              off-grid deployment
            </div>
            <pre className="mt-5 overflow-x-auto font-mono text-[13px] leading-relaxed text-muted-foreground">
              <code>{`# Düğüm A — sahra röle noktası
TEDBIRGE_MESH=true \\
TEDBIRGE_MESH_NODE_ID=saha-A \\
TEDBIRGE_MESH_ADDR=:7946 tedbirge-gateway

# Düğüm B — A'yı tohum komşu alır
TEDBIRGE_MESH_SEEDS=10.0.0.1:7946 \\
tedbirge-gateway

# Doğrulama
tedbirge-cli mesh-demo   # 3 düğüm, kayıpsız
tedbirge-cli p2p-demo    # 0-WAN takas
tedbirge-cli exit-demo   # WAN köprüsü`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>Kullanım alanları</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Kapsamanın bittiği yerde başlar
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {useCases.map((u) => (
            <div key={u.title} className="rounded-sm border border-border bg-card/40 p-7">
              <h3 className="text-lg font-semibold">{u.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/afet-kamu"
            className="rounded-sm border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
          >
            Afet & kamu senaryosu
          </Link>
          <Link
            to="/karsilastirma"
            className="rounded-sm border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
          >
            Alternatiflerle karşılaştır
          </Link>
        </div>
      </section>


      {/* CTA */}
      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Kendi sahanızda 30 günlük pilot
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Mühendislik ekibimizle birlikte üç düğümlük bir mesh kurun, kullanım sayacını
              faturalama sisteminize bağlayın.
            </p>
          </div>
          <Link
            to="/iletisim"
            className="rounded-sm bg-primary px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            Görüşme planla
          </Link>
        </div>
      </section>
    </SitePage>
  );
}
