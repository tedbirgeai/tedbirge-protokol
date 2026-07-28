import { createFileRoute } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/dokumanlar")({
  head: () => ({
    meta: [
      { title: "Dokümanlar — Tedbirge Protokol Kurulum ve CLI" },
      {
        name: "description",
        content:
          "Tedbirge kurulum, off-grid ve kurumsal çalıştırma kılavuzu, CLI komutları, çevre değişkenleri ve doğrulama adımları.",
      },
      { property: "og:title", content: "Tedbirge Dokümanlar" },
      {
        property: "og:description",
        content: "Kurulum, CLI komutları, çevre değişkenleri ve üretim dağıtım rehberi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Docs,
});

const envs = [
  ["TEDBIRGE_MESH", "Mesh katmanını etkinleştirir (true/false)"],
  ["TEDBIRGE_MESH_NODE_ID", "Düğümün ağdaki benzersiz kimliği"],
  ["TEDBIRGE_MESH_ADDR", "Mesh dinleme adresi, örn. :7946"],
  ["TEDBIRGE_MESH_SEEDS", "Tohum komşu adres listesi (virgülle)"],
  ["TEDBIRGE_STORE", "memory | postgres"],
  ["TEDBIRGE_DATABASE_DSN", "Postgres bağlantı dizesi"],
  ["TEDBIRGE_WAL_ENABLED", "Write-ahead log dayanıklılığı"],
  ["TEDBIRGE_ADMIN / _TOKEN", "Gömülü panel ve erişim jetonu"],
  ["TEDBIRGE_METRICS / _TOKEN", "Prometheus /metrics ucu"],
];

const cli = [
  ["tedbirge-cli keygen", "Ed25519 düğüm kimliği üretir"],
  ["tedbirge-cli mesh-demo", "3 düğümlü kayıpsız çok-sıçramalı teslim"],
  ["tedbirge-cli p2p-demo", "0-WAN mesaj ve dosya takası"],
  ["tedbirge-cli exit-demo", "Exit node üzerinden WAN köprüsü"],
  ["tedbirge-cli route -links ...", "Dijkstra yol hesabını gösterir"],
];

const checks = [
  ["gofmt -l .", "temiz"],
  ["go vet ./...", "temiz"],
  ["go test -race -count=1 ./...", "tüm paketler geçti"],
  ["Çok-sıçramalı 3 düğüm (B üzerinden C)", "kayıpsız teslim"],
  ["Entegrasyon (PostgreSQL 16)", "geçti"],
  ["Cross-compile (5 platform × 2 uygulama)", "10/10 binary"],
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-sm border border-border bg-card/50 p-5 font-mono text-[13px] leading-relaxed text-muted-foreground">
      <code>{children}</code>
    </pre>
  );
}

function Docs() {
  return (
    <SitePage>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionLabel>Dokümanlar</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Kurulumdan üretime
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Tek statik binary; Node.js, dış CDN veya internet gerektirmez. Aşağıdaki adımlar
            hem off-grid saha hem kurumsal veri merkezi kurulumunu kapsar.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-14 px-6 py-16">
        <Block title="1. Derleme">
          <Code>{`make build      # bin/tedbirge (gateway)
make cli        # bin/tedbirge-cli
make release    # dist/ — 2 uygulama × 5 platform
make test-race  # hermetik Docker, -race, canlı Postgres/Redis`}</Code>
        </Block>

        <Block title="2. Off-grid saha kurulumu">
          <Code>{`# Düğüm A (röle noktası)
TEDBIRGE_MESH=true TEDBIRGE_MESH_NODE_ID=saha-A \\
TEDBIRGE_MESH_ADDR=:7946 tedbirge-gateway

# Düğüm B (ara röle, A tohum komşu)
TEDBIRGE_MESH=true TEDBIRGE_MESH_NODE_ID=saha-B \\
TEDBIRGE_MESH_ADDR=:7946 \\
TEDBIRGE_MESH_SEEDS=10.0.0.1:7946 tedbirge-gateway`}</Code>
        </Block>

        <Block title="3. Kurumsal üretim kurulumu">
          <Code>{`TEDBIRGE_STORE=postgres \\
TEDBIRGE_DATABASE_DSN="postgres://...:5432/tedbirge" \\
TEDBIRGE_WAL_ENABLED=true \\
TEDBIRGE_METRICS=true TEDBIRGE_METRICS_TOKEN=<gizli> \\
TEDBIRGE_ADMIN=true TEDBIRGE_ADMIN_TOKEN=<gizli> \\
TEDBIRGE_MESH=true TEDBIRGE_MESH_ADDR=:7946 \\
tedbirge-gateway`}</Code>
          <p className="mt-4 text-sm text-muted-foreground">
            Panel: <code className="text-primary">https://&lt;host&gt;/admin?token=…</code> ·
            Metrikler: <code className="text-primary">/metrics</code> · Dağıtım dosyaları:{" "}
            <code className="text-primary">deploy/tedbirge.service</code>,{" "}
            <code className="text-primary">deploy/docker-compose.prod.yml</code>
          </p>
        </Block>

        <Block title="4. Çevre değişkenleri">
          <div className="overflow-hidden rounded-sm border border-border">
            {envs.map(([k, v], i) => (
              <div
                key={k}
                className={`grid gap-1 px-5 py-4 md:grid-cols-2 ${i % 2 ? "bg-card/30" : "bg-card/60"}`}
              >
                <code className="font-mono text-[13px] text-primary">{k}</code>
                <span className="text-sm text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="5. CLI komutları">
          <div className="overflow-hidden rounded-sm border border-border">
            {cli.map(([k, v], i) => (
              <div
                key={k}
                className={`grid gap-1 px-5 py-4 md:grid-cols-2 ${i % 2 ? "bg-card/30" : "bg-card/60"}`}
              >
                <code className="font-mono text-[13px] text-primary">{k}</code>
                <span className="text-sm text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="6. Doğrulama durumu (v0.6a)">
          <div className="overflow-hidden rounded-sm border border-border">
            {checks.map(([k, v], i) => (
              <div
                key={k}
                className={`flex flex-wrap items-center justify-between gap-2 px-5 py-4 ${
                  i % 2 ? "bg-card/30" : "bg-card/60"
                }`}
              >
                <span className="text-sm text-foreground">{k}</span>
                <span className="font-mono text-xs text-primary">{v}</span>
              </div>
            ))}
          </div>
        </Block>
      </section>
    </SitePage>
  );
}
