import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "Tedbirge Gateway — Carrier-Agnostic Zero-Knowledge Mesh Transport";
const DESC =
  "Tedbirge Gateway is a single-binary, carrier-agnostic zero-knowledge tunnel gateway and mesh SDK. Nine physical transports, AES-256-GCM, Ed25519, works fully off-grid.";
const URL = "https://artisan-project-studio.lovable.app/en";

export const Route = createFileRoute("/en")({
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
    links: [
      { rel: "canonical", href: URL },
      { rel: "alternate", hrefLang: "tr", href: "https://artisan-project-studio.lovable.app/" },
      { rel: "alternate", hrefLang: "en", href: URL },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Tedbirge Gateway",
          applicationCategory: "NetworkApplication",
          operatingSystem: "Linux, Windows, macOS",
          description: DESC,
          url: URL,
          offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
          publisher: { "@type": "Organization", name: "Mehmet DİNÇ (Tedbirge Gateway)" },
        }),
      },
    ],
  }),
  component: EnglishOverview,
});

const modules = [
  {
    name: "Tedbirge Gateway",
    body: "Tunnel proxy engine and exit node. AES-256-GCM chunk encryption, zero-knowledge accounting, WAN bridging.",
  },
  {
    name: "Tedbirge Loop",
    body: "Mesh routing and gossip ring. Dijkstra multi-hop path selection, neighbour discovery, TTL and loop prevention.",
  },
  {
    name: "Tedbirge Off-Grid",
    body: "Accounting layer without internet. Ed25519-signed receipts, relay credit, double-spend protection, deferred settlement.",
  },
];

const carriers = [
  "Ethernet",
  "Wi-Fi",
  "Cellular",
  "Satellite",
  "WiGig 60 GHz",
  "FSO Laser",
  "Wi-Fi HaLow",
  "TVWS",
  "LoRa",
];

const facts = [
  ["Deployment", "One static binary. No Node.js, no CDN, no external database, no runtime downloads."],
  ["Platforms", "Linux (amd64/arm64), Windows, macOS. CGO-free cross-compilation."],
  ["Cryptography", "AES-256-GCM, Ed25519 node identity, SHA-256 digests, replay-protection window."],
  ["Privacy", "Payload is never stored. Metering keeps only a SHA-256 digest and byte count."],
  ["Licensing", "Community (free, single node) · Enterprise (per-node subscription) · Operator (custom scope)"],
  ["Availability", "Worldwide, within legal limits. Export-control and spectrum policies published."],
];

const useCases = [
  ["Disaster response", "Field teams keep routing traffic when towers and backhaul are gone."],
  ["Critical infrastructure", "Energy, mining and pipeline sites bridge isolated segments without new hardware."],
  ["Field logistics", "Convoys and remote depots stay reachable across whichever transport is alive."],
  ["ISPs & integrators", "Embed the SDK to add resilient multi-carrier failover to existing networks."],
];

function EnglishOverview() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <SectionLabel>English overview</SectionLabel>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            Network infrastructure that keeps working when the internet does not
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tedbirge Gateway is a carrier-agnostic, zero-knowledge tunnel gateway and mesh SDK.
            It runs as a single static binary on hardware you already own, across nine physical
            transports, with no cloud dependency.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              to="/iletisim"
              className="rounded-sm bg-primary px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              Request a pilot
            </Link>
            <Link
              to="/demo"
              className="rounded-sm border border-border px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Live demo
            </Link>
            <a
              href="/tedbirge-teknik-ozet.md"
              download
              className="rounded-sm border border-border px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Technical brief
            </a>
          </div>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            9 transports · 0 dependencies · AES-256-GCM · Ed25519
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Product family</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Three modules, one binary</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-3">
          {modules.map((m) => (
            <article key={m.name} className="bg-card/50 p-7">
              <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.15em] text-primary">
                {m.name}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Transport matrix</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Nine physical layers, one routing plane
          </h2>
          <div className="mt-10 flex flex-wrap gap-3">
            {carriers.map((c) => (
              <span
                key={c}
                className="rounded-sm border border-border bg-background/60 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-foreground"
              >
                {c}
              </span>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Sub-GHz and white-space transports ship disabled by default and are unlocked only per
            regional profile. See the{" "}
            <Link to="/uyumluluk" className="text-foreground underline underline-offset-4">
              spectrum &amp; compliance matrix
            </Link>{" "}
            and the{" "}
            <Link to="/ihracat-uyum" className="text-foreground underline underline-offset-4">
              export-control statement
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Where it is used</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Deployment scenarios</h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {useCases.map(([t, b]) => (
            <article key={t} className="bg-card/50 p-7">
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{b}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Fact sheet</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            What you get, precisely
          </h2>
          <dl className="mt-10 divide-y divide-border/60 overflow-hidden rounded-sm border border-border">
            {facts.map(([k, v]) => (
              <div key={k} className="grid gap-2 bg-background/60 px-6 py-5 md:grid-cols-[200px_1fr]">
                <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">{k}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <pre className="mt-8 overflow-x-auto rounded-sm border border-border bg-background/70 p-5 font-mono text-[12px] leading-relaxed text-muted-foreground">
            <code>{`# Node A — field relay
TEDBIRGE_MESH=true \\
TEDBIRGE_MESH_NODE_ID=field-A \\
TEDBIRGE_MESH_ADDR=:7946 tedbirge-gateway

# Node B — seeds from A
TEDBIRGE_MESH=true \\
TEDBIRGE_MESH_SEEDS=10.0.0.1:7946 tedbirge-gateway

# Verify
tedbirge-cli mesh-demo   # 3 nodes, lossless
tedbirge-cli p2p-demo    # 0-WAN exchange
tedbirge-cli exit-demo   # WAN bridge`}</code>
          </pre>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Security posture</SectionLabel>
        <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
          A claim without stated limits is not a claim
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Payload confidentiality, node authentication and replay protection are in scope.
          Metadata resistance, anonymity and endpoint compromise are explicitly out of scope —
          all of it is written down.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            to="/guvenlik"
            className="rounded-sm border border-border px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Threat model
          </Link>
          <Link
            to="/fiyatlandirma"
            className="rounded-sm border border-border px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Pricing
          </Link>
          <Link
            to="/iletisim"
            className="rounded-sm bg-primary px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            Talk to engineering
          </Link>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          Vendor: Mehmet DİNÇ (Tedbirge Gateway), Türkiye · tedbirge34@gmail.com ·{" "}
          <Link to="/" className="text-foreground underline underline-offset-4">
            Türkçe sürüm
          </Link>
        </p>
      </section>
    </SitePage>
  );
}
