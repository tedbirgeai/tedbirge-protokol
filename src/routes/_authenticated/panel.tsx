import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { getPaddleEnvironment } from "@/lib/paddle";
import { createPortalSession } from "@/utils/payments.functions";
import { rotateLicenseKey } from "@/lib/licenses.functions";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";


export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Müşteri Paneli — Tedbirge Protokol" },
      {
        name: "description",
        content: "Tedbirge lisans anahtarlarınızı, abonelik durumunuzu ve pilot başvurularınızı yönetin.",
      },
      { property: "og:title", content: "Tedbirge Müşteri Paneli" },
      { property: "og:description", content: "Lisans, abonelik ve pilot yönetimi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Panel,
});

type Subscription = {
  id: string;
  paddle_subscription_id: string;
  paddle_customer_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

type License = {
  id: string;
  plan: string;
  status: string;
  node_limit: number;
  license_key: string;
  current_period_end: string | null;
};

type Device = {
  id: string;
  license_id: string;
  node_id: string;
  label: string | null;
  region: string;
  carrier: string | null;
  firmware: string | null;
  status: string;
  last_seen_at: string | null;
};

function Panel() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin(user?.id);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadDevices = useCallback(async () => {
    const { data } = await supabase
      .from("devices")
      .select("*")
      .order("created_at", { ascending: true });
    setDevices((data as Device[]) ?? []);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: subs }, { data: lic }, { data: dev }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("environment", getPaddleEnvironment())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("licenses").select("*").order("created_at", { ascending: false }),
        supabase.from("devices").select("*").order("created_at", { ascending: true }),
      ]);
      if (!active) return;
      setSubscription((subs as Subscription | null) ?? null);
      setLicenses((lic as License[]) ?? []);
      setDevices((dev as Device[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Gerçek zamanlı telemetri: düğüm ve ölçüm değişikliklerini anında yansıtır.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("panel-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        () => void reloadDevices(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "telemetry_samples" },
        () => setRefreshKey((k) => k + 1),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, reloadDevices]);

  async function rotate(licenseId: string) {
    setBusyId(licenseId);
    try {
      const { licenseKey } = await rotateLicenseKey({ data: { licenseId } });
      setLicenses((ls) => ls.map((l) => (l.id === licenseId ? { ...l, license_key: licenseKey } : l)));
      setRefreshKey((k) => k + 1);
    } finally {
      setBusyId(null);
    }
  }

  async function setDeviceStatus(id: string, status: "active" | "revoked") {
    setBusyId(id);
    try {
      await setDeviceStatusFn({ data: { deviceId: id, status } });
      setDevices((ds) => ds.map((d) => (d.id === id ? { ...d, status } : d)));
      setRefreshKey((k) => k + 1);
    } finally {
      setBusyId(null);
    }
  }

  async function removeDevice(id: string) {
    setBusyId(id);
    try {
      await deleteDevice({ data: { deviceId: id } });
      setDevices((ds) => ds.filter((d) => d.id !== id));
      setRefreshKey((k) => k + 1);
    } finally {
      setBusyId(null);
    }
  }

  const usedByLicense = devices.reduce<Record<string, number>>((acc, d) => {
    acc[d.license_id] = (acc[d.license_id] ?? 0) + 1;
    return acc;
  }, {});




  async function openPortal() {
    if (!subscription) return;
    setPortalBusy(true);
    try {
      const { url } = await createPortalSession({
        data: {
          customerId: subscription.paddle_customer_id,
          subscriptionId: subscription.paddle_subscription_id,
          environment: getPaddleEnvironment(),
        },
      });
      window.open(url, "_blank");
    } finally {
      setPortalBusy(false);
    }
  }

  const active =
    subscription &&
    ["active", "trialing", "past_due"].includes(subscription.status) &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  return (
    <SitePage>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Müşteri paneli</SectionLabel>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {user?.email}
            </h1>
          </div>
          {isAdmin && (
            <Link
              to="/yonetim"
              className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Yönetim ekranı
            </Link>
          )}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-sm border border-border bg-card/50 p-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Abonelik
            </p>
            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground">Yükleniyor…</p>
            ) : subscription ? (
              <div className="mt-4 space-y-2 text-sm">
                <Row k="Plan" v={subscription.product_id} />
                <Row k="Fiyat" v={subscription.price_id} />
                <Row k="Durum" v={active ? "Aktif" : subscription.status} />
                <Row
                  k="Dönem sonu"
                  v={
                    subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString("tr-TR")
                      : "—"
                  }
                />
                <button
                  onClick={openPortal}
                  disabled={portalBusy}
                  className="mt-4 w-full rounded-sm border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
                >
                  {portalBusy ? "Açılıyor…" : "Abonelik yönetimi"}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Aktif aboneliğiniz yok. Community sürümünü ücretsiz kullanabilir veya
                  Enterprise aboneliği başlatabilirsiniz.
                </p>
                <Link
                  to="/fiyatlandirma"
                  className="mt-4 inline-block rounded-sm bg-primary px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground"
                >
                  Planları gör
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-sm border border-border bg-card/50 p-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Lisanslar
            </p>
            {licenses.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Henüz lisans anahtarı üretilmedi. Abonelik başladığında anahtar burada görünür.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {licenses.map((l) => (
                  <li key={l.id} className="rounded-sm border border-border bg-background/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-[0.15em] text-primary">
                        {l.plan}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">{l.status}</span>
                    </div>
                    <p className="mt-3 break-all font-mono text-[12px] text-foreground">
                      {l.license_key}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                      Düğüm limiti: {l.node_limit} · kayıtlı:{" "}
                      {devices.filter((d) => d.license_id === l.id).length}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CopyButton value={l.license_key} label="Anahtarı kopyala" />
                      <button
                        onClick={() => downloadLicense(l)}
                        className="rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
                      >
                        .env indir
                      </button>
                      <button
                        onClick={() => rotate(l.id)}
                        disabled={busyId === l.id}
                        className="rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
                      >
                        {busyId === l.id ? "Yenileniyor…" : "Anahtarı yenile"}
                      </button>
                    </div>
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                      Anahtar yenilendiğinde eski anahtarla bağlanan düğümler reddedilir.
                    </p>

                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-sm border border-border bg-card/50 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Cihazlar (düğümler)
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Lisansa bağlı saha düğümleri
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/saha-raporu"
                className="rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
              >
                Saha raporu
              </Link>
              <Link
                to="/api-dokumantasyon"
                className="rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
              >
                Telemetri API'si
              </Link>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Yükleniyor…</p>
          ) : devices.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Henüz düğüm kaydı yok. Bir düğüm lisans anahtarınızla telemetri uç noktasına ilk
              isteği gönderdiğinde otomatik olarak burada listelenir.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-sm border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-background/60 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Düğüm</th>
                    <th className="px-4 py-3">Bölge / taşıyıcı</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Son görülme</th>
                    <th className="px-4 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-mono text-[12px]">
                        {d.node_id}
                        {d.label && (
                          <span className="block text-[11px] text-muted-foreground">{d.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">
                        {d.region} · {d.carrier ?? "—"}
                        {d.firmware && <span className="block text-[11px]">v{d.firmware}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] uppercase">
                        <span className={d.status === "active" ? "text-primary" : "text-muted-foreground"}>
                          {d.status === "active" ? "aktif" : "iptal"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString("tr-TR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              setDeviceStatus(d.id, d.status === "active" ? "revoked" : "active")
                            }
                            disabled={busyId === d.id}
                            className="rounded-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
                          >
                            {d.status === "active" ? "İptal et" : "Yeniden aç"}
                          </button>
                          <button
                            onClick={() => removeDevice(d.id)}
                            disabled={busyId === d.id}
                            className="rounded-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>



        <div className="mt-8 rounded-sm border border-border bg-card/50 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Hızlı başlangıç
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            Lisansınızı üç komutta devreye alın
          </h2>
          <ol className="mt-6 space-y-6">
            {quickStart(licenses[0]?.license_key).map((step, i) => (
              <li key={step.title}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-primary">0{i + 1}</span>
                  <p className="text-sm font-medium">{step.title}</p>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <pre className="flex-1 overflow-x-auto rounded-sm border border-border bg-background/70 p-4 font-mono text-[12px] leading-relaxed text-muted-foreground">
                    <code>{step.code}</code>
                  </pre>
                  <CopyButton value={step.code} label="Kopyala" />
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/dokumanlar"
              className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Dokümanlar
            </Link>
            <a
              href="/tedbirge-teknik-ozet.md"
              download
              className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Teknik özet (.md)
            </a>
          </div>
        </div>
      </section>
    </SitePage>
  );
}

function quickStart(key?: string) {
  const licenseKey = key ?? "LISANS-ANAHTARINIZ";
  return [
    {
      title: "Binary'yi çalıştırılabilir yapın",
      code: "chmod +x tedbirge-gateway && ./tedbirge-gateway --version",
    },
    {
      title: "Lisansı ortam değişkeni olarak tanımlayın",
      code: `export TEDBIRGE_LICENSE_KEY=${licenseKey}`,
    },
    {
      title: "Mesh düğümünü başlatın ve doğrulayın",
      code: `TEDBIRGE_MESH=true TEDBIRGE_MESH_NODE_ID=saha-A \\
TEDBIRGE_MESH_ADDR=:7946 tedbirge-gateway

tedbirge-cli mesh-demo`,
    },
  ];
}

function downloadLicense(l: License) {
  const content = `# Tedbirge Gateway lisans yapılandırması
TEDBIRGE_LICENSE_KEY=${l.license_key}
TEDBIRGE_LICENSE_PLAN=${l.plan}
TEDBIRGE_NODE_LIMIT=${l.node_limit}
`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tedbirge.env";
  a.click();
  URL.revokeObjectURL(url);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className="shrink-0 rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
    >
      {done ? "Kopyalandı" : label}
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-[13px] text-foreground">{v}</span>
    </div>
  );
}
