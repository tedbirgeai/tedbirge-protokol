import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Boxes, Radio, ShieldCheck } from "lucide-react";

import { ShellProvider, useShell } from "@/shell/ShellProvider";
import { AppsDialog } from "@/components/shell/AppsDialog";
import { RelaySettingsDialog } from "@/components/shell/RelaySettingsDialog";
import { MeshStatusDialog } from "@/components/shell/MeshStatusDialog";
import { describeNode } from "@/lib/node-runtime";

export const Route = createFileRoute("/system")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sistem Konsolu — Tedbirge OS" },
      {
        name: "description",
        content:
          "Düğüm durumu, mesh telemetrisi, röle taşıma ayarları ve kurulu uygulama paketlerinin yönetildiği Tedbirge OS sistem konsolu.",
      },
      { property: "og:title", content: "Sistem Konsolu — Tedbirge OS" },
      {
        property: "og:description",
        content: "Düğüm, mesh, röle ve uygulama paketleri tek sistem ekranında.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/system" }],
  }),
  component: SystemRoute,
});

function SystemRoute() {
  return (
    <main className="fixed inset-0 z-40 flex flex-col bg-[#06090e]">
      <ShellProvider initialApp="chats">
        <SystemConsole />
      </ShellProvider>
    </main>
  );
}

function SystemConsole() {
  const { node } = useShell();
  const status = describeNode(node);
  const [apps, setApps] = useState(false);
  const [relay, setRelay] = useState(false);
  const [mesh, setMesh] = useState(false);

  return (
    <div className="wa tbos cyber-grid flex min-h-0 flex-1 flex-col">
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--wa-border)", background: "var(--wa-panel)" }}
      >
        <h1 className="text-[19px] font-bold" style={{ color: "var(--wa-text)" }}>
          Sistem
        </h1>
        <Link to="/app" className="text-[14px]" style={{ color: "var(--wa-accent)" }}>
          Çalışma alanı
        </Link>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <section
          className="rounded-2xl p-4"
          style={{ background: "var(--wa-panel)", border: "1px solid var(--wa-border)" }}
        >
          <p className="text-[13px]" style={{ color: "var(--wa-muted)" }}>
            Düğüm durumu
          </p>
          <p className="text-[17px] font-semibold" style={{ color: "var(--wa-text)" }}>
            {status.text}
          </p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--wa-muted)" }}>
            Doğrudan eş: {status.directPeers} · Kuyruk: {status.queued}
          </p>
        </section>

        <Card
          icon={<Activity className="h-5 w-5" />}
          label="Ağ ve telemetri"
          hint="Mesh durumu, eş listesi, çekirdek ölçümleri"
          onClick={() => setMesh(true)}
        />
        <Card
          icon={<Radio className="h-5 w-5" />}
          label="Röle ayarları"
          hint="Taşıma izni ve yasal beyan"
          onClick={() => setRelay(true)}
        />
        <Card
          icon={<Boxes className="h-5 w-5" />}
          label="Uygulama paketleri"
          hint="Kurulu .tbapp paketleri ve izinleri"
          onClick={() => setApps(true)}
        />
        <p
          className="flex items-start gap-2 px-1 pt-2 text-[12px]"
          style={{ color: "var(--wa-muted)" }}
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Bu ekrandaki tüm veriler cihazınızda üretilir; hiçbir ölçüm kimliğinizle
          ilişkilendirilerek dışarı gönderilmez.
        </p>
      </div>

      <AppsDialog open={apps} onClose={() => setApps(false)} />
      <RelaySettingsDialog open={relay} onClose={() => setRelay(false)} />
      <MeshStatusDialog open={mesh} onClose={() => setMesh(false)} />
    </div>
  );
}

function Card({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wa-press flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 text-left"
      style={{ background: "var(--wa-panel)", border: "1px solid var(--wa-border)" }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--wa-accent-soft)", color: "var(--wa-accent)" }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold" style={{ color: "var(--wa-text)" }}>
          {label}
        </span>
        <span className="block truncate text-[12px]" style={{ color: "var(--wa-muted)" }}>
          {hint}
        </span>
      </span>
    </button>
  );
}
