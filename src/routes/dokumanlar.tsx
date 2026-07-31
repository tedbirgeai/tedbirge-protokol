import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { HCL, HCL_DISCLAIMER, HCL_STATUS_LABEL, HCL_VERSION } from "@/lib/hcl";

export const Route = createFileRoute("/dokumanlar")({
  head: () => ({
    meta: [
      { title: "Dokümanlar — Tedbirge Protokol Kurulum ve CLI" },
      {
        name: "description",
        content:
          "Tedbirge kurulum, off-grid ve kurumsal çalıştırma kılavuzu, CLI komutları, çevre değişkenleri, güvenlik modeli ve doğrulama adımları — aranabilir dokümantasyon.",
      },
      { property: "og:title", content: "Tedbirge Dokümanlar" },
      {
        property: "og:description",
        content: "Kurulum, CLI komutları, çevre değişkenleri ve üretim dağıtım rehberi.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tedbirge-gateway.lovable.app/dokumanlar" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/dokumanlar" }],
  }),
  component: Docs,
});

type Entry =
  | { type: "text"; body: string }
  | { type: "code"; body: string }
  | { type: "table"; rows: [string, string][] };

type Doc = {
  id: string;
  group: string;
  title: string;
  summary: string;
  entries: Entry[];
};

/** Onaylı Donanım Listesi (HCL) — tek kaynaktan (src/lib/hcl.ts) türetilir. */
const hclDoc: Doc = {
  id: "hcl",
  group: "Donanım",
  title: `Onaylı Donanım Listesi (HCL) · ${HCL_VERSION}`,
  summary:
    "Test edilmiş ve doğrudan desteklenen taşıyıcı donanımları: Semtech SX1262 LoRa, RAK Wi-Fi HaLow, ESP32 Meshtastic, Nordic UART BLE.",
  entries: [
    { type: "text", body: HCL_DISCLAIMER },
    ...HCL.flatMap((h): Entry[] => [
      {
        type: "text",
        body: `${h.vendor} — ${h.model} · Taşıyıcı: ${h.carrier} · Bağlantı: ${h.link} · Durum: ${HCL_STATUS_LABEL[h.status]}`,
      },
      { type: "table", rows: h.specs },
      { type: "text", body: h.note },
    ]),
  ],
};

const docs: Doc[] = [
  hclDoc,
  {
    id: "baslangic",
    group: "Başlangıç",
    title: "Hızlı başlangıç",
    summary: "Tek statik binary; Node.js, dış CDN veya internet gerektirmez.",
    entries: [
      {
        type: "text",
        body: "Tedbirge Protokol ve Tedbirge CLI, CGO olmadan derlenen iki bağımsız uygulamadır. Linux amd64/arm64, Windows amd64 ve macOS amd64/arm64 hedefleri için toplam 10 binary üretilir.",
      },
      {
        type: "code",
        body: `make build      # bin/tedbirge (gateway)
make cli        # bin/tedbirge-cli
make release    # dist/ — 2 uygulama × 5 platform
make check      # fmt + vet + test
make test-race  # hermetik Docker, -race, canlı Postgres/Redis`,
      },
    ],
  },
  {
    id: "mimari",
    group: "Başlangıç",
    title: "Mimari şeması",
    summary: "Tünel motoru, mesh router, güvenlik muhafızı, gossip, off-grid defter ve WAL.",
    entries: [
      {
        type: "code",
        body: `Tunnel Proxy Engine (AES-256-GCM chunk)
        ↓
Mesh Router (Dijkstra · RTT × taşıyıcı ağırlığı)
        ↓
Security Guard (Ed25519 · PoW · replay penceresi)
        ↓
Gossip Discovery → Off-Grid Ledger → WAL
        ↓
/admin panosu (tek binary, canlı WebSocket)`,
      },
      {
        type: "text",
        body: "Yönlendirici en düşük RTT × taşıyıcı ağırlığı maliyetli yolu seçer. Bir taşıyıcı düştüğünde bearer yöneticisi öncelik sırasına göre devreder: Ethernet → Wi-Fi/WAN → USB tethering → SoftAP mesh → LoRa seri → BLE mesh.",
      },
    ],
  },
  {
    id: "offgrid",
    group: "Kurulum",
    title: "Off-grid saha kurulumu",
    summary: "Üç düğümlü kayıpsız çok-sıçramalı mesh; internet gerekmez.",
    entries: [
      {
        type: "code",
        body: `# Düğüm A (röle noktası)
TEDBIRGE_MESH=true TEDBIRGE_MESH_NODE_ID=saha-A \\
TEDBIRGE_MESH_ADDR=:7946 tedbirge

# Düğüm B (ara röle, A tohum komşu)
TEDBIRGE_MESH=true TEDBIRGE_MESH_NODE_ID=saha-B \\
TEDBIRGE_MESH_ADDR=:7946 \\
TEDBIRGE_MESH_SEEDS=10.0.0.1:7946 tedbirge`,
      },
    ],
  },
  {
    id: "kurumsal",
    group: "Kurulum",
    title: "Kurumsal üretim kurulumu",
    summary: "Postgres, WAL, Prometheus metrikleri ve token korumalı panel.",
    entries: [
      {
        type: "code",
        body: `TEDBIRGE_STORE=postgres \\
TEDBIRGE_DATABASE_DSN="postgres://...:5432/tedbirge" \\
TEDBIRGE_WAL_ENABLED=true \\
TEDBIRGE_METRICS=true TEDBIRGE_METRICS_TOKEN=<gizli> \\
TEDBIRGE_ADMIN=true TEDBIRGE_ADMIN_TOKEN=<gizli> \\
TEDBIRGE_MESH=true TEDBIRGE_MESH_ADDR=:7946 \\
tedbirge`,
      },
      {
        type: "text",
        body: "Panel: https://<host>/admin?token=… · Metrikler: /metrics · Dağıtım dosyaları: deploy/tedbirge.service (systemd) ve deploy/docker-compose.prod.yml. /metrics ucu müşteri tanımlayıcıları ve kullanım hacimleri içerdiğinden ticari olarak hassastır; token verilmezse geçit bu ucu açmaz.",
      },
    ],
  },
  {
    id: "wan",
    group: "Kurulum",
    title: "WAN durumu ve exit node",
    summary: "Tam izolasyon (0-WAN) veya komşu üzerinden internet köprüsü.",
    entries: [
      {
        type: "code",
        body: `TEDBIRGE_WAN_CHECK=true
TEDBIRGE_WAN_TARGETS=1.1.1.1:53,8.8.8.8:53
TEDBIRGE_EXIT_PEER=<komşu-düğüm-id>
TEDBIRGE_EXIT_NODE=true`,
      },
      {
        type: "table",
        rows: [
          ["WAN: Direct Internet", "yeşil — düğümün kendi WAN erişimi var"],
          ["WAN: Relayed via Peer", "mavi — trafik exit node üzerinden köprüleniyor"],
          ["WAN: Off-Grid Mesh Only", "sarı — tam izolasyon, yalnızca mesh"],
        ],
      },
    ],
  },
  {
    id: "env-core",
    group: "Yapılandırma",
    title: "Çevre değişkenleri — çekirdek ve kalıcılık",
    summary: "Dinleme adresi, API anahtarları, depolama, WAL ve Redis.",
    entries: [
      {
        type: "table",
        rows: [
          ["TEDBIRGE_LISTEN", "Geçidin dinlediği adres"],
          ["TEDBIRGE_API_KEYS", "Kiracı API anahtarları (virgülle)"],
          ["TEDBIRGE_RECEIPT_SECRET", "Fiş imzalama sırrı"],
          ["TEDBIRGE_STORE", "memory | postgres"],
          ["TEDBIRGE_DATABASE_DSN", "Postgres bağlantı dizesi"],
          ["TEDBIRGE_WAL_ENABLED / _DIR", "Write-ahead log dayanıklılığı ve dizini"],
          ["TEDBIRGE_REDIS_ADDR / _PASSWORD / _DB", "Dağıtık hız sınırlama"],
        ],
      },
    ],
  },
  {
    id: "env-mesh",
    group: "Yapılandırma",
    title: "Çevre değişkenleri — mesh, yönlendirme ve limitler",
    summary: "Mesh kimliği, tohum komşular, rota tanımı ve zaman aşımları.",
    entries: [
      {
        type: "table",
        rows: [
          ["TEDBIRGE_MESH", "Mesh katmanını etkinleştirir (true/false)"],
          ["TEDBIRGE_MESH_NODE_ID", "Düğümün ağdaki benzersiz kimliği"],
          ["TEDBIRGE_MESH_ADDR", "Mesh dinleme adresi, örn. :7946"],
          ["TEDBIRGE_MESH_SEEDS", "Tohum komşu adres listesi (virgülle)"],
          ["TEDBIRGE_ROUTES", "name=type@url[;backup=NAME][;health=/path] — direct|edge|peering"],
          ["TEDBIRGE_FORWARD_TIMEOUT_SEC", "İletim zaman aşımı"],
          ["TEDBIRGE_MAX_PAYLOAD_BYTES", "Azami yük boyutu"],
          ["TEDBIRGE_RATE_LIMIT_PER_MIN / _BURST", "Dakikalık istek limiti ve ani yük payı"],
          ["TEDBIRGE_HEALTHPROBE / _INTERVAL_SEC", "Sağlık yoklaması ve failover"],
          ["TEDBIRGE_SHUTDOWN_GRACE_SEC", "Zarif kapanma süresi"],
        ],
      },
    ],
  },
  {
    id: "env-tls",
    group: "Yapılandırma",
    title: "Çevre değişkenleri — TLS ve mTLS",
    summary: "Sertifika yükleme, sıcak yenileme ve istemci kimlik doğrulama.",
    entries: [
      {
        type: "table",
        rows: [
          ["TEDBIRGE_TLS_CERT / _KEY", "Sunucu sertifikası ve anahtarı"],
          ["TEDBIRGE_TLS_RELOAD_SEC", "Sertifika sıcak yenileme aralığı"],
          ["TEDBIRGE_TLS_CLIENT_AUTH", "\"\" | optional | require"],
          ["TEDBIRGE_TLS_CLIENT_CA", "İstemci sertifikalarını doğrulayan CA"],
        ],
      },
    ],
  },
  {
    id: "env-billing",
    group: "Yapılandırma",
    title: "Çevre değişkenleri — faturalama ve röle kredisi",
    summary: "Kullanım webhook'u, e-Fatura köprüsü ve röle kredisi katsayıları.",
    entries: [
      {
        type: "table",
        rows: [
          ["TEDBIRGE_BILLING_WEBHOOK_URL / _SECRET", "Kullanım olaylarının gönderileceği uç"],
          ["TEDBIRGE_EINVOICE_URL / _API_KEY", "e-Fatura entegratör uçları"],
          ["TEDBIRGE_CREDIT_PER_BYTE", "Taşınan bayt başına röle kredisi (kripto değildir)"],
          ["TEDBIRGE_CREDIT_MAX_PER_PERIOD", "Dönem başına azami kredi"],
          ["TEDBIRGE_USAGE_THRESHOLDS", "Kullanım eşiği uyarıları"],
        ],
      },
      {
        type: "text",
        body: "Röle kredisi bir kripto varlık veya token değildir; yalnızca faturada indirim olarak mahsuplaşan, Ed25519 imzalı fişlerle ispatlanan bir kullanım alacağıdır.",
      },
    ],
  },
  {
    id: "cli",
    group: "CLI",
    title: "CLI komutları",
    summary: "Anahtar üretimi, mesh demoları, rota hesabı ve exit node testi.",
    entries: [
      {
        type: "table",
        rows: [
          ["tedbirge-cli keygen", "Ed25519 düğüm kimliği üretir"],
          ["tedbirge-cli mesh-demo", "3 düğümlü kayıpsız çok-sıçramalı teslim"],
          ["tedbirge-cli p2p-demo", "0-WAN mesaj ve dosya takası"],
          ["tedbirge-cli exit-demo", "Exit node üzerinden WAN köprüsü"],
          ["tedbirge-cli route -links \"A-B:10:ethernet,B-C:20:lora\" -from A -to C", "Dijkstra yol hesabını gösterir"],
        ],
      },
    ],
  },
  {
    id: "guvenlik",
    group: "Güvenlik",
    title: "Tehdit modeli",
    summary: "Kimlik sahteciliği, Sybil, replay, çift harcama ve içerik gözetimi.",
    entries: [
      {
        type: "table",
        rows: [
          ["Kimlik sahteciliği (spoofing)", "Ed25519 düğüm kimliği"],
          ["Sybil saldırısı", "Proof-of-Work katılım maliyeti"],
          ["Yeniden oynatma (replay)", "Nonce kayan penceresi + zaman damgası"],
          ["Sahte bakiye / çift harcama", "İmzalı fiş (voucher) + nonce"],
          ["Yük gözetimi", "Sıfır bilgi: yalnızca SHA-256 ve bayt sayısı"],
        ],
      },
    ],
  },
  {
    id: "kvkk",
    group: "Güvenlik",
    title: "Zero-KVKK RF katmanı",
    summary: "RF ve seri taşımada IP/MAC kullanılmaz; hedef özeti 60 saniyede döner.",
    entries: [
      {
        type: "text",
        body: "Çerçeve yapısı: 1 bayt sihirli bayrak + 8 bayt dönen hedef özeti + 12 bayt AES nonce + AES-256-GCM yük. Röle düğümleri hedefi ilişkilendiremez, GCM etiketi bütünlüğü doğrular.",
      },
      {
        type: "text",
        body: "Bu, taşıma katmanında kişisel veri açığa çıkmamasını sağlar. Uygulama katmanında taşınan içerik kişisel veri içeriyorsa KVKK/GDPR yükümlülükleri uygulama sahibine aittir.",
      },
    ],
  },
  {
    id: "regulasyon",
    group: "Güvenlik",
    title: "Spektrum ve regülasyon uyumu",
    summary: "ETSI EN 300 220, FCC Part 15, BTK KET ve 5651 sayılı kanun notları.",
    entries: [
      {
        type: "text",
        body: "AB ve Türkiye'de 868 MHz SRD bandı için ETSI EN 300 220 ve ERC/REC 70-03 sınırları geçerlidir (genel SRD ~25 mW/14 dBm ERP; bazı alt bantlarda görev döngüsüyle 500 mW'a kadar). 915 MHz Türkiye ve AB'de genel SRD kullanımına kapalıdır. ABD/Kanada'da 902–928 MHz FCC Part 15 kapsamında ~1 W'a kadar izinlidir.",
      },
      {
        type: "text",
        body: "TVWS (470–790 MHz) kullanımı ETSI EN 301 598 ve BTK kanal koordinasyonu gerektirir. Lisanslı spektrumda veri taşıyan AM/FM yayın ve izinsiz uydu dinleme, 5809 sayılı kanun ile TCK 132–140 kapsamında suç oluşturduğundan taşıyıcı listesinden bilinçli olarak çıkarılmıştır.",
      },
      {
        type: "text",
        body: "Ed25519 imzalı yerel fişler, exit node trafik hacmi için kriptografik inkâr edilemezlik sağlar; ancak 5651 sayılı kanunun log saklama ve erişim engelleme yükümlülüklerini kendiliğinden karşılamaz. Exit node işleten taraf kendi yükümlülüklerini ayrıca değerlendirmelidir. Bu içerik mühendislik-düzenleme referansıdır, hukuki tavsiye değildir.",
      },
    ],
  },
  {
    id: "dogrulama",
    group: "Doğrulama",
    title: "Doğrulama durumu (v0.6a)",
    summary: "CI kontrol listesi ve çapraz derleme sonuçları.",
    entries: [
      {
        type: "table",
        rows: [
          ["gofmt -l .", "temiz"],
          ["go vet ./...", "temiz"],
          ["go test -race -count=1 ./...", "tüm paketler geçti"],
          ["Çok-sıçramalı 3 düğüm (B üzerinden C)", "kayıpsız teslim"],
          ["Entegrasyon (PostgreSQL 16)", "geçti"],
          ["Cross-compile (5 platform × 2 uygulama)", "10/10 binary"],
          ["/admin tek binary + WebSocket", "canlı"],
        ],
      },
    ],
  },
];

const REPORT_FILES: { format: string; label: string; meta: string; href: string }[] = [
  {
    format: "PDF",
    label: "Tam rapor (13 sayfa)",
    meta: "Yönetici özeti + 11 başlık · ~122 KB",
    href: "/raporlar/tedbirge-gateway-nihai-fizibilite-raporu.pdf",
  },
  {
    format: "DOCX",
    label: "Word sürümü",
    meta: "Düzenlenebilir metin · ~50 KB",
    href: "/raporlar/tedbirge-gateway-nihai-fizibilite-raporu.docx",
  },
  {
    format: "PPTX",
    label: "Yönetim sunumu (10 slayt)",
    meta: "Yatırımcı / kurul sunumu · ~48 KB",
    href: "/raporlar/tedbirge-gateway-nihai-fizibilite-sunum.pptx",
  },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-sm border border-border bg-card/50 p-5 font-mono text-[13px] leading-relaxed text-muted-foreground">
      <code>{children}</code>
    </pre>
  );
}

function Docs() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    if (!s) return docs;
    return docs.filter((d) => {
      const hay = [
        d.title,
        d.summary,
        d.group,
        ...d.entries.map((e) =>
          e.type === "table" ? e.rows.flat().join(" ") : e.body,
        ),
      ]
        .join(" ")
        .toLocaleLowerCase("tr");
      return hay.includes(s);
    });
  }, [q]);

  const groups = useMemo(() => {
    const map = new Map<string, Doc[]>();
    for (const d of filtered) {
      map.set(d.group, [...(map.get(d.group) ?? []), d]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <SitePage>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <SectionLabel>Dokümanlar</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Kurulumdan üretime
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Tek statik binary; Node.js, dış CDN veya internet gerektirmez. Aşağıdaki bölümler
            off-grid saha, kurumsal veri merkezi, güvenlik ve regülasyon uyumunu kapsar.
          </p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Dokümanlarda ara: mesh, TLS, LoRa, faturalama…"
            className="mt-8 w-full max-w-md rounded-sm border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          {q && (
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              {filtered.length} bölüm eşleşti
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <SectionLabel>Kurumsal Rapor</SectionLabel>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            Bütünsel Nihai Fizibilite ve Strateji Raporu
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Finansal fizibilite, GTM, operasyon, teknik ölçeklenebilirlik, risk, sertifikasyon ve
            12 aylık yol haritasını kapsayan 11 başlıklı rapor. Sürüm 1.0.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {REPORT_FILES.map((f) => (
              <a
                key={f.href}
                href={f.href}
                download
                className="group rounded-sm border border-border bg-card/50 p-5 transition-colors hover:border-primary"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                  {f.format}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">{f.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{f.meta}</p>
                <p className="mt-3 font-mono text-xs text-muted-foreground group-hover:text-foreground">
                  İndir →
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>


      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {groups.map(([group, items]) => (
              <div key={group}>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                  {group}
                </p>
                <ul className="mt-3 space-y-2">
                  {items.map((d) => (
                    <li key={d.id}>
                      <a
                        href={`#${d.id}`}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {d.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-14">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              “{q}” için sonuç bulunamadı. Farklı bir terim deneyin.
            </p>
          )}
          {groups.map(([group, items]) => (
            <div key={group} className="space-y-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary lg:hidden">
                {group}
              </p>
              {items.map((d) => (
                <article key={d.id} id={d.id} className="scroll-mt-24">
                  <h2 className="text-xl font-semibold tracking-tight">{d.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{d.summary}</p>
                  <div className="mt-5 space-y-4">
                    {d.entries.map((e, i) =>
                      e.type === "code" ? (
                        <Code key={i}>{e.body}</Code>
                      ) : e.type === "text" ? (
                        <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                          {e.body}
                        </p>
                      ) : (
                        <div key={i} className="overflow-hidden rounded-sm border border-border">
                          {e.rows.map(([k, v], j) => (
                            <div
                              key={k}
                              className={`grid gap-1 px-5 py-4 md:grid-cols-2 ${j % 2 ? "bg-card/30" : "bg-card/60"}`}
                            >
                              <code className="font-mono text-[13px] break-words text-primary">{k}</code>
                              <span className="text-sm text-muted-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      ),
                    )}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SitePage>
  );
}
