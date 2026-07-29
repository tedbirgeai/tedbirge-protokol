import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

type NodeId = "A" | "B" | "C";

const NODES: { id: NodeId; label: string; x: number; y: number; carrier: string }[] = [
  { id: "A", label: "saha-A", x: 14, y: 72, carrier: "LoRa" },
  { id: "B", label: "röle-B", x: 50, y: 22, carrier: "Wi-Fi" },
  { id: "C", label: "exit-C", x: 86, y: 72, carrier: "Uydu / WAN" },
];

function pos(id: NodeId | undefined) {
  const n = NODES.find((x) => x.id === id) ?? NODES[0];
  return { x: n.x, y: n.y };
}

function MeshLink({
  from,
  to,
  active,
  dashed,
}: {
  from: NodeId;
  to: NodeId;
  active: boolean;
  dashed?: boolean;
}) {
  const a = pos(from);
  const b = pos(to);
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      strokeWidth={0.5}
      strokeDasharray={dashed ? "2 2" : undefined}
      className={active ? "stroke-primary" : "stroke-border"}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/80 px-5 py-4">
      <p className="font-mono text-sm text-primary">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function MeshDemo() {
  const [mounted, setMounted] = useState(false);
  const [relayUp, setRelayUp] = useState(true);
  const [directLink, setDirectLink] = useState(false);
  const [running, setRunning] = useState(true);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [bytes, setBytes] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [dropped, setDropped] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);


  const path: NodeId[] | null = useMemo(() => {
    if (relayUp) return ["A", "B", "C"];
    if (directLink) return ["A", "C"];
    return null;
  }, [relayUp, directLink]);

  useEffect(() => {
    if (!mounted || !running || !path) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => p + dt * 0.55);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [mounted, running, path]);

  useEffect(() => {
    if (progress < 1) return;
    setProgress(0);
    if (!path) return;
    const chunk = 4096 + Math.floor(Math.random() * 4096);
    setBytes((b) => b + chunk);
    setDelivered((d) => d + 1);
    const hops = path.join(" → ");
    setLog((l) =>
      [
        `[${new Date().toLocaleTimeString("tr-TR")}] chunk teslim · ${hops} · ${chunk} B · sha256 ${Math.random()
          .toString(16)
          .slice(2, 10)}`,
        ...l,
      ].slice(0, 8),
    );
  }, [progress, path]);

  useEffect(() => {
    if (!mounted || path) return;
    const t = setInterval(() => {
      setDropped((d) => d + 1);
      setLog((l) =>
        [`[${new Date().toLocaleTimeString("tr-TR")}] yol yok · paket kuyruğa alındı (WAL)`, ...l].slice(
          0,
          8,
        ),
      );
    }, 1600);
    return () => clearInterval(t);
  }, [mounted, path]);

  const packet = useMemo(() => {
    if (!mounted || !path) return null;
    const segments = path.length - 1;
    const t = Math.min(progress, 0.999) * segments;
    const i = Math.floor(t);
    const f = t - i;
    const a = pos(path[i]);
    const b = pos(path[i + 1]);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }, [mounted, progress, path]);

  function reset() {
    setRelayUp(true);
    setDirectLink(false);
    setProgress(0);
    setBytes(0);
    setDelivered(0);
    setDropped(0);
    setLog([]);
  }

  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <SectionLabel>Canlı demo</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Üç düğümlük mesh&apos;i tarayıcıda deneyin
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Kurulum yapmadan, röle düğümünü kapatıp yolun nasıl yeniden hesaplandığını görün. Bu
            simülasyon <span className="text-foreground">tedbirge-cli mesh-demo</span> komutunun
            davranışını görselleştirir.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-sm border border-border bg-card/40 p-6">
          <div className="relative aspect-[16/10] w-full">
            <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
              <MeshLink from="A" to="B" active={relayUp} />
              <MeshLink from="B" to="C" active={relayUp} />
              <MeshLink from="A" to="C" active={!relayUp && directLink} dashed />
              {NODES.map((n) => (
                <g key={n.id}>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={4.2}
                    className={
                      n.id === "B" && !relayUp
                        ? "fill-muted stroke-border"
                        : "fill-primary/20 stroke-primary"
                    }
                    strokeWidth={0.6}
                  />
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={1.5}
                    className={n.id === "B" && !relayUp ? "fill-muted-foreground" : "fill-primary"}
                  />
                </g>
              ))}
              {packet && <circle cx={packet.x} cy={packet.y} r={1.8} className="fill-accent" />}
            </svg>
            {NODES.map((n) => (
              <div
                key={n.id}
                className="pointer-events-none absolute -translate-x-1/2 text-center"
                style={{ left: `${n.x}%`, top: `${n.y + 7}%` }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-foreground">
                  {n.label}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">{n.carrier}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setRelayUp((v) => !v)}
              className="rounded-sm border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
            >
              {relayUp ? "Röle B'yi kapat" : "Röle B'yi aç"}
            </button>
            <button
              onClick={() => setDirectLink((v) => !v)}
              className="rounded-sm border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
            >
              {directLink ? "Uydu yedeğini kapat" : "Uydu yedeğini aç"}
            </button>
            <button
              onClick={() => setRunning((v) => !v)}
              className="rounded-sm border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
            >
              {running ? "Duraklat" : "Devam et"}
            </button>
            <button
              onClick={reset}
              className="rounded-sm bg-primary px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              Sıfırla
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border">
            <Metric label="aktif yol" value={path ? path.join("→") : "yok"} />
            <Metric label="teslim chunk" value={String(delivered)} />
            <Metric label="taşınan bayt" value={bytes.toLocaleString("tr-TR")} />
            <Metric label="kuyruğa alınan" value={String(dropped)} />
          </div>

          <div className="rounded-sm border border-border bg-background/70 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Telemetri akışı
            </p>
            <ul className="mt-4 space-y-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {log.length === 0 ? <li>bekleniyor…</li> : log.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>

          <div className="rounded-sm border border-border bg-card/40 p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Simülasyon içerik taşımaz; gerçek sistemde olduğu gibi yalnızca bayt sayımı ve
              bütünlük özeti raporlanır.
            </p>
            <Link
              to="/iletisim"
              className="mt-4 inline-block rounded-sm bg-primary px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              Gerçek pilot başlat
            </Link>
          </div>
        </div>
      </section>
    </SitePage>
  );
}

export default MeshDemo;
