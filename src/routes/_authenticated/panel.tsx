import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { getPaddleEnvironment } from "@/lib/paddle";
import { createPortalSession } from "@/utils/payments.functions";
import { setDeviceStatus as setDeviceStatusFn, deleteDevice } from "@/lib/devices.functions";
import { NodeCreator, LicenseEventLog, FieldReports } from "@/components/site/PanelSections";
import {
  DeviceStatusBoard,
  OrganizationManager,
  WebhookSettings,
  ApiUsagePanel,
  SetupWizard,
} from "@/components/site/PanelOps";
import { CarrierLiveBoard, IrCameraBoard, isDeviceOnline, sinceLabel } from "@/components/site/PanelLive";
import { RelayChainWizard, QueueBoard, LinkAlertBoard, FailoverSettings } from "@/components/site/PanelMesh";
import { QrNodeEnroll, E2eeKeyBoard, OutageLog, CalibrationTest } from "@/components/site/PanelSecure";
import { HealthCards, LiveFeed, KeyRotation, CalibrationReports } from "@/components/site/PanelSystem";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { usePanelRole, ROLE_LABEL } from "@/hooks/usePanelRole";
import { buildMeshPlan } from "@/lib/mesh-plan";
import { BrowserNodeCard } from "@/components/site/BrowserNodeCard";
import { CarrierBridgeCard } from "@/components/site/CarrierBridgeCard";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Müşteri Paneli — Tedbirge Protokol" },
      {
        name: "description",
        content: "Tedbirge lisans anahtarlarınızı, düğümlerinizi ve sistem sağlığınızı tek ekrandan yönetin.",
      },
      { property: "og:title", content: "Tedbirge Müşteri Paneli" },
      { property: "og:description", content: "Lisans, düğüm, canlı akış ve sistem sağlığı yönetimi." },
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
  organization_id: string | null;
};

type Device = {
  id: string;
  license_id: string;
  node_id: string;
  label: string | null;
  region: string;
  carrier: string | null;
  firmware: string | null;
  kind: string | null;
  status: string;
  last_seen_at: string | null;
  last_error_code: string | null;
  last_error_at: string | null;
  role: string | null;
  failover_group: string | null;
  failover_priority: number | null;
  is_backup: boolean | null;
  active_uplink: boolean | null;
};

type TabId = "genel" | "dugumler" | "canli" | "mesh" | "kalibrasyon" | "guvenlik" | "yonetim";

const TABS: { id: TabId; label: string; needs?: "operate" | "manage" }[] = [
  { id: "genel", label: "Genel bakış" },
  { id: "dugumler", label: "Düğümler" },
  { id: "canli", label: "Canlı akış" },
  { id: "mesh", label: "Mesh & kurulum", needs: "operate" },
  { id: "kalibrasyon", label: "Kalibrasyon" },
  { id: "guvenlik", label: "Güvenlik" },
  { id: "yonetim", label: "Yönetim", needs: "manage" },
];

/** Cep telefonunun paneldeki rolünü netleştiren bilgi kartı.
 *  Telefon bir düğüm değil, yönetim/izleme istasyonudur. */
function MobileStationCard() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const sahaLink = origin ? `${origin}/saha` : "https://tedbirge-gateway.lovable.app/saha";

  return (
    <div className="rounded-sm border border-primary/30 bg-primary/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Cep telefonu / tablet</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Uygulamayı telefona ekleyin</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Telefon ve tablet, yukarıdaki <strong className="text-foreground">tarayıcı düğümü</strong> ile donanımsız çalışan gerçek bir düğüme dönüşür; ayrıca yönetim/izleme istasyonudur. Uzun menzil (LoRa/HaLow/TVWS) istiyorsanız o taşıyıcıya ait radyo modülünü ayrıca eklersiniz.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Bilgisayardaki düğümü başlatın (lisans anahtarı + node-id ile).</li>
            <li>Telefonda aşağıdaki linki açın ve “Ana ekrana ekle” deyin.</li>
            <li>Paneldeki düğüm “çevrimiçi” olur; telefondan izleyin.</li>
          </ol>
        </div>
        <div className="min-w-[16rem] rounded-sm border border-border bg-card/50 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Mobil erişim linki</p>
          <p className="mt-2 break-all font-mono text-sm text-foreground">{sahaLink}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={sahaLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm bg-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary-foreground"
            >
              Telefonda aç
            </a>
            <button
              onClick={() => void navigator.clipboard.writeText(sahaLink)}
              className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Linki kopyala
            </button>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            iPhone kullanıyorsanız Safari ile açıp paylaş menüsünden “Ana Ekrana Ekle” seçin. Android’de Chrome menüden “Uygulamayı yükle” yeterlidir.
          </p>
        </div>
      </div>
    </div>
  );
}

const RADIO_CARRIERS = new Set(["lora", "halow", "tvws", "wifi", "wigig", "fso"]);

function likelyGateway(d: Device) {
  const id = d.node_id.toLowerCase();
  return d.role === "gateway" || id.startsWith("ev") || id.startsWith("home") || id.startsWith("gw");
}

function FieldRealityCard({ devices }: { devices: Device[] }) {
  const [browserOnline, setBrowserOnline] = useState(true);

  useEffect(() => {
    const sync = () => setBrowserOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const online = devices.filter((d) => isDeviceOnline(d));
  const radioOnline = online.filter((d) => typeof d.carrier === "string" && RADIO_CARRIERS.has(d.carrier));
  const gatewayOnline = online.some(likelyGateway);
  const relayOnline = online.filter((d) => d.role === "relay").length;
  const edgeOnline = online.some((d) => d.role === "edge");
  const sixKm = buildMeshPlan({ carrierId: "lora", terrainId: "suburb", heightId: "roof", distanceKm: 6 });
  const fifteenKm = buildMeshPlan({ carrierId: "lora", terrainId: "suburb", heightId: "roof", distanceKm: 15 });

  const oneReady = browserOnline && gatewayOnline && edgeOnline && radioOnline.length >= 2;
  const sixReady = oneReady && relayOnline >= sixKm.relays && radioOnline.length >= sixKm.totalNodes;
  const fifteenReady = oneReady && relayOnline >= fifteenKm.relays && radioOnline.length >= fifteenKm.totalNodes;

  const blocker = !browserOnline
    ? "Telefon şu anda buluta bağlı değil; gördüğünüz kırmızı şerit PWA önbelleğini gösterir, mesh taşıma başladığını göstermez."
    : !gatewayOnline
      ? "Çevrimiçi ev köprüsü görünmüyor. Önce evdeki gateway ajanı telemetri göndermeli."
      : !edgeOnline
        ? "Saha ucu görünmüyor. Telefon tek başına edge değildir; yanında/araçta ayrı radyo düğümü gerekir."
        : relayOnline === 0
          ? "Ara röle yok. Wi‑Fi menzili dışına çıkınca 6 km / 15 km taşıma başlamaz."
          : "Zincir kısmen hazır; mesafe için gereken röle sayısını canlı düğüm sayısıyla eşleştirin.";

  return (
    <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-destructive">Saha bağlantısı teşhisi</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Taşıyıcılar neden devreye girmedi?</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Taşıyıcı seçmek yazılım kaydıdır; gerçek taşıma için her taşıyıcıda fiziksel radyo donanımı,
        anten, güç ve çevrimiçi telemetri gerekir. iPhone PWA, LoRa/HaLow/TVWS radyosu gibi çalışamaz.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RealityMetric k="Telefon bulut" v={browserOnline ? "bağlı" : "kopuk"} ok={browserOnline} />
        <RealityMetric k="Gateway" v={gatewayOnline ? "online" : "yok"} ok={gatewayOnline} />
        <RealityMetric k="Röle" v={`${relayOnline} online`} ok={relayOnline > 0} />
        <RealityMetric k="Saha ucu" v={edgeOnline ? "online" : "yok"} ok={edgeOnline} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Readiness label="1 km saha" ready={oneReady} detail="Gateway + saha radyo düğümü gerekir." />
        <Readiness
          label="6 km LoRa"
          ready={sixReady}
          detail={`${sixKm.totalNodes} fiziksel düğüm / ${sixKm.relays} röle gerekir.`}
        />
        <Readiness
          label="15 km LoRa"
          ready={fifteenReady}
          detail={`${fifteenKm.totalNodes} fiziksel düğüm / ${fifteenKm.relays} röle gerekir.`}
        />
      </div>

      <p className="mt-5 rounded-sm border border-border bg-background/60 p-4 text-sm leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Asıl kaynak:</strong> {blocker}
      </p>
    </div>
  );
}

function RealityMetric({ k, v, ok }: { k: string; v: string; ok: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-background/60 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{k}</p>
      <p className={`mt-1 font-mono text-sm ${ok ? "text-primary" : "text-destructive"}`}>● {v}</p>
    </div>
  );
}

function Readiness({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em]">{label}</span>
        <span className={`font-mono text-[10px] uppercase ${ready ? "text-primary" : "text-destructive"}`}>
          {ready ? "hazır" : "hazır değil"}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Panel() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin(user?.id);
  const { role, canOperate, canManage } = usePanelRole(user?.id);
  const [tab, setTab] = useState<TabId>("genel");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadDevices = useCallback(async () => {
    const [{ data }, { data: lic }] = await Promise.all([
      supabase.from("devices").select("*").order("created_at", { ascending: true }),
      supabase.from("licenses").select("*").order("created_at", { ascending: false }),
    ]);
    setDevices((data as Device[]) ?? []);
    setLicenses((lic as License[]) ?? []);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => void reloadDevices())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "telemetry_samples" }, () =>
        setRefreshKey((k) => k + 1),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, reloadDevices]);

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

  const onlineCount = devices.filter((d) => isDeviceOnline(d)).length;

  const visibleTabs = useMemo(
    () => TABS.filter((t) => (t.needs === "manage" ? canManage : t.needs === "operate" ? canOperate : true)),
    [canManage, canOperate],
  );

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) setTab("genel");
  }, [visibleTabs, tab]);

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

  const liteLicenses = licenses.map((l) => ({ id: l.id, plan: l.plan, node_limit: l.node_limit }));
  const keyedLicenses = licenses.map((l) => ({
    id: l.id,
    plan: l.plan,
    node_limit: l.node_limit,
    license_key: l.license_key,
  }));

  return (
    <SitePage>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <SectionLabel>Müşteri paneli</SectionLabel>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{user?.email}</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              {ROLE_LABEL[role]} · {onlineCount}/{devices.length} düğüm çevrimiçi
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/yonetim"
              className="shrink-0 rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Yönetim ekranı
            </Link>
          )}
        </header>

        {/* Sekmeli gezinme: uzun kaydırma yerine tek tıkla bölüm değişimi. */}
        <nav className="sticky top-0 z-20 -mx-4 mt-6 border-b border-border bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`shrink-0 rounded-sm px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="mt-8 space-y-8">
          {tab === "genel" && (
            <>
              <EasyConsole compact />
              <BrowserNodeCard licenseKey={licenses[0]?.license_key} />
              <MobileStationCard />
              <FieldRealityCard devices={devices} />
              <HealthCards refreshKey={refreshKey} />


              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-sm border border-border bg-card/50 p-6">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Abonelik</p>
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
                        Aktif aboneliğiniz yok. Community sürümünü ücretsiz kullanabilir veya Enterprise
                        aboneliği başlatabilirsiniz.
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
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Lisanslar</p>
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
                          <p className="mt-3 break-all font-mono text-[12px] text-foreground">{l.license_key}</p>
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
                          </div>
                          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                            Anahtar yenileme “Güvenlik” sekmesindedir.
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-sm border border-border bg-card/50 p-6">
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
            </>
          )}

          {tab === "dugumler" && (
            <>
              {canOperate && (
                <>
                  <NodeCreator licenses={liteLicenses} usedByLicense={usedByLicense} onCreated={reloadDevices} />
                  <QrNodeEnroll licenses={liteLicenses} onChanged={reloadDevices} refreshKey={refreshKey} />
                </>
              )}

              <DeviceStatusBoard
                devices={devices}
                licenses={licenses.map((l) => ({ id: l.id, plan: l.plan }))}
                refreshKey={refreshKey}
              />

              <CarrierLiveBoard devices={devices} />

              <CarrierBridgeCard licenseKey={licenses[0]?.license_key} />

              <div className="rounded-sm border border-border bg-card/50 p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Cihazlar (düğümler)
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight">Lisansa bağlı saha düğümleri</h2>
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
                    Henüz düğüm kaydı yok. Bir düğüm lisans anahtarınızla telemetri uç noktasına ilk isteği
                    gönderdiğinde otomatik olarak burada listelenir.
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
                          {canOperate && <th className="px-4 py-3">İşlem</th>}
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
                              {d.status !== "active" ? (
                                <span className="text-muted-foreground">iptal</span>
                              ) : isDeviceOnline(d) ? (
                                <span className="flex items-center gap-1.5 text-primary">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                                  çevrimiçi
                                </span>
                              ) : (
                                <span className="text-muted-foreground">çevrimdışı</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {d.last_seen_at
                                ? `${new Date(d.last_seen_at).toLocaleString("tr-TR")} · ${sinceLabel(d.last_seen_at)}`
                                : "telemetri bekleniyor"}
                            </td>
                            {canOperate && (
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
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "canli" && (
            <>
              <LiveFeed />
              <LinkAlertBoard refreshKey={refreshKey} />
              <QueueBoard licenses={keyedLicenses} refreshKey={refreshKey} />
              <OutageLog refreshKey={refreshKey} />
              <IrCameraBoard devices={devices} licenseKey={licenses[0]?.license_key} refreshKey={refreshKey} />
            </>
          )}

          {tab === "mesh" && (
            <>
              <SetupWizard
                licenseKey={licenses[0]?.license_key}
                nodeLimit={licenses[0]?.node_limit ?? 5}
                registered={devices.length}
              />
              <RelayChainWizard licenses={keyedLicenses} devices={devices} onProvisioned={reloadDevices} />
              <FailoverSettings devices={devices} onUpdated={reloadDevices} />
            </>
          )}

          {tab === "kalibrasyon" && (
            <>
              <CalibrationTest refreshKey={refreshKey} />
              <CalibrationReports refreshKey={refreshKey} />
            </>
          )}

          {tab === "guvenlik" && (
            <>
              <KeyRotation licenses={keyedLicenses} canManage={canManage} onRotated={reloadDevices} />
              <E2eeKeyBoard refreshKey={refreshKey} />
              <FieldReports devices={devices.map((d) => ({ id: d.id, node_id: d.node_id }))} isAdmin={isAdmin} />
            </>
          )}

          {tab === "yonetim" && canManage && (
            <>
              <ApiUsagePanel licenses={licenses.map((l) => ({ id: l.id, plan: l.plan }))} refreshKey={refreshKey} />
              <WebhookSettings userId={user?.id} />
              <OrganizationManager
                userId={user?.id}
                licenses={licenses.map((l) => ({
                  id: l.id,
                  plan: l.plan,
                  organization_id: l.organization_id,
                }))}
                onChanged={reloadDevices}
              />
              <LicenseEventLog refreshKey={refreshKey} />
            </>
          )}
        </div>
      </section>
    </SitePage>
  );
}

function quickStart(key?: string) {
  const licenseKey = key ?? "LISANS-ANAHTARINIZ";
  return [
    {
      title: "Ajanı tek komutla indirin",
      code: "curl -fsSL https://tedbirge-gateway.lovable.app/install.sh | sh",
    },
    {
      title: "Lisans ve düğüm kimliğini tanımlayın",
      code: `export TEDBIRGE_LICENSE_KEY=${licenseKey}
export TEDBIRGE_NODE_ID=ev-01
export TEDBIRGE_REGION=TR
export TEDBIRGE_CARRIER=auto`,
    },
    {
      title: "Heartbeat'i başlatın ve taşıyıcıyı doğrulayın",
      code: `./tedbirge-gateway oneshot
./tedbirge-cli carriers

./tedbirge-gateway`,
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
