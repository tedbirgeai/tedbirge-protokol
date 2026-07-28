import { createFileRoute } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/dokumanlar")({
  head: () => ({
    meta: [
      { title: "Dokümanlar — Tedbirge Saha Ağı Kurulum ve CLI" },
      {
        name: "description",
        content:
          "Tedbirge Saha Ağı kurulum kılavuzu: git bash komutları, saha ve büro dağıtımı, çevre değişkenleri, CLI komutları ve doğrulama adımları.",
      },
      { property: "og:title", content: "Tedbirge Saha Ağı Dokümanlar" },
      {
        property: "og:description",
        content: "Git bash kurulum komutları, CLI referansı, çevre değişkenleri ve üretim dağıtımı.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Docs,
});

const envs = [
  ["TEDBIRGE_MESH", "Saha mesh katmanını etkinleştirir (true/false)"],
  ["TEDBIRGE_NODE_ID", "Saha cihazının ağdaki benzersiz kimliği"],
  ["TEDBIRGE_MESH_ADDR", "Mesh dinleme adresi, örn. :7946"],
  ["TEDBIRGE_MESH_SEEDS", "Komşu cihaz adres listesi (virgülle)"],
  ["TEDBIRGE_STORE", "memory | postgres"],
  ["TEDBIRGE_DATABASE_DSN", "Postgres bağlantı dizesi"],
  ["TEDBIRGE_WAL_ENABLED", "Çevrimdışı kuyruk dayanıklılığı"],
  ["TEDBIRGE_CHAIN_KEY", "Delil zinciri imza anahtarı (Ed25519)"],
  ["TEDBIRGE_ADMIN / _TOKEN", "Büro paneli ve erişim jetonu"],
  ["TEDBIRGE_METRICS / _TOKEN", "Prometheus /metrics ucu"],
];

const cli = [
  ["tedbirge-cli keygen", "Cihaz için Ed25519 kimliği üretir"],
  ["tedbirge-cli chain-verify", "Delil zincirinin bütünlüğünü doğrular"],
  ["tedbirge-cli mesh-demo", "3 cihazlı kayıpsız çok-sıçramalı teslim"],
  ["tedbirge-cli sync-demo", "Çevrimdışı toplanan delilin senkronizasyonu"],
  ["tedbirge-cli case-export", "Dosyayı imza kanıtlarıyla dışa aktarır"],
];

const checks = [
  ["gofmt -l .", "temiz"],
  ["go vet ./...", "temiz"],
  ["go test -race -count=1 ./...", "tüm paketler geçti"],
  ["Delil zinciri bütünlük testi", "kırılma tespiti başarılı"],
  ["Çok-sıçramalı 3 cihaz teslimi", "kayıpsız"],
  ["Entegrasyon (PostgreSQL 16)", "geçti"],
  ["Cross-compile (5 platform × 2 uygulama)", "10/10 binary"],
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-card p-5 font-mono text-[13px] leading-relaxed text-muted-foreground">
      <code>{children}</code>
    </pre>
  );
}

function Docs() {
  return (
    <SitePage>
      <section className="brand-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionLabel>Dokümanlar</SectionLabel>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            Kurulumdan üretime
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-primary-foreground/80">
            Tek statik binary; Node.js, dış CDN veya sürekli internet gerektirmez. Aşağıdaki
            adımlar hem çevrimdışı saha hem de büro/veri merkezi kurulumunu kapsar. Tüm
            komutlar Git Bash üzerinde çalıştırılabilir.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-14 px-6 py-16">
        <Block title="0. Depoyu alma (Git Bash)">
          <Code>{`# Git Bash penceresinde
git clone https://github.com/tedbirgeai/aetheris.git tedbirge-saha-agi
cd tedbirge-saha-agi

git checkout -b feature/tedbirge-rebrand
go version   # go1.22+ bekleniyor`}</Code>
        </Block>

        <Block title="1. Derleme">
          <Code>{`make build      # bin/tedbirge-gateway
make cli        # bin/tedbirge-cli
make release    # dist/ - 2 uygulama x 5 platform
make test-race  # hermetik Docker, -race, canli Postgres/Redis`}</Code>
        </Block>

        <Block title="2. Çevrimdışı saha kurulumu">
          <Code>{`# Cihaz A (kaza yeri, internet yok)
TEDBIRGE_MESH=true TEDBIRGE_NODE_ID=saha-A \\
TEDBIRGE_MESH_ADDR=:7946 ./bin/tedbirge-gateway

# Cihaz B (baglantili, A komsu olarak eklenir)
TEDBIRGE_MESH=true TEDBIRGE_NODE_ID=saha-B \\
TEDBIRGE_MESH_ADDR=:7946 \\
TEDBIRGE_MESH_SEEDS=10.0.0.1:7946 ./bin/tedbirge-gateway`}</Code>
        </Block>

        <Block title="3. Büro / üretim kurulumu">
          <Code>{`TEDBIRGE_STORE=postgres \\
TEDBIRGE_DATABASE_DSN="postgres://...:5432/tedbirge" \\
TEDBIRGE_WAL_ENABLED=true \\
TEDBIRGE_CHAIN_KEY=<ed25519-anahtar> \\
TEDBIRGE_METRICS=true TEDBIRGE_METRICS_TOKEN=<gizli> \\
TEDBIRGE_ADMIN=true TEDBIRGE_ADMIN_TOKEN=<gizli> \\
TEDBIRGE_MESH=true TEDBIRGE_MESH_ADDR=:7946 \\
./bin/tedbirge-gateway`}</Code>
          <p className="mt-4 text-sm text-muted-foreground">
            Panel: <code className="text-primary">https://&lt;host&gt;/admin?token=…</code> ·
            Metrikler: <code className="text-primary">/metrics</code> · Dağıtım dosyaları:{" "}
            <code className="text-primary">deploy/tedbirge.service</code>,{" "}
            <code className="text-primary">deploy/docker-compose.prod.yml</code>
          </p>
        </Block>

        <Block title="4. Çevre değişkenleri">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {envs.map(([k, v], i) => (
              <div
                key={k}
                className={`grid gap-1 px-5 py-4 md:grid-cols-2 ${i % 2 ? "bg-muted/40" : ""}`}
              >
                <code className="font-mono text-[13px] text-primary">{k}</code>
                <span className="text-sm text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="5. CLI komutları">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {cli.map(([k, v], i) => (
              <div
                key={k}
                className={`grid gap-1 px-5 py-4 md:grid-cols-2 ${i % 2 ? "bg-muted/40" : ""}`}
              >
                <code className="font-mono text-[13px] text-primary">{k}</code>
                <span className="text-sm text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="6. Doğrulama durumu">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {checks.map(([k, v], i) => (
              <div
                key={k}
                className={`flex flex-wrap items-center justify-between gap-2 px-5 py-4 ${
                  i % 2 ? "bg-muted/40" : ""
                }`}
              >
                <span className="text-sm text-foreground">{k}</span>
                <span className="font-mono text-xs font-semibold text-accent">{v}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="7. Sürüm etiketleme (Git Bash)">
          <Code>{`git add -A
git commit -m "feat: tedbirge marka kimligi ve delil zinciri konumlandirmasi"
git tag -a v1.0.0-tedbirge -m "Tedbirge Saha Agi ilk surum"
git push origin feature/tedbirge-rebrand --tags`}</Code>
        </Block>
      </section>
    </SitePage>
  );
}
