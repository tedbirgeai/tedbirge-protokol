import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CARRIERS,
  TERRAIN,
  HEIGHTS,
  buildMeshPlan,
  agentSnippet,
  type Measurement,
} from "@/lib/mesh-plan";
import {
  provisionRelayChain,
  updateNodeTopology,
  acknowledgeLinkAlert,
} from "@/lib/mesh.functions";

type LicenseLite = { id: string; plan: string; node_limit: number; license_key: string };
type DeviceLite = {
  id: string;
  node_id: string;
  label: string | null;
  license_id: string;
  role?: string | null;
  failover_group?: string | null;
  failover_priority?: number | null;
  is_backup?: boolean | null;
  active_uplink?: boolean | null;
  last_seen_at: string | null;
  status: string;
};

const ROLE_LABEL: Record<string, string> = {
  gateway: "Ev köprüsü",
  relay: "Ara röle",
  edge: "Saha ucu",
};

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-sm border border-border bg-card/50 p-6">{children}</div>;
}

function Head({ label, title, hint }: { label: string; title: string; hint?: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** 1 — Otomatik röle zinciri kurulum akışı. */
export function RelayChainWizard({
  licenses,
  devices,
  onProvisioned,
}: {
  licenses: LicenseLite[];
  devices: DeviceLite[];
  onProvisioned: () => void;
}) {
  const [licenseId, setLicenseId] = useState(licenses[0]?.id ?? "");
  const [carrierId, setCarrierId] = useState("lora");
  const [terrainId, setTerrainId] = useState("suburb");
  const [heightId, setHeightId] = useState("roof");
  const [distanceKm, setDistanceKm] = useState(6);
  const [prefix, setPrefix] = useState("zincir");
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!licenseId && licenses[0]) setLicenseId(licenses[0].id);
  }, [licenses, licenseId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("field_measurements")
        .select("carrier, terrain, antenna_height, distance_km, link_ok")
        .limit(500);
      if (!alive) return;
      setMeasurements(
        (data ?? []).map((m) => ({
          carrier: m.carrier,
          terrain: m.terrain,
          antenna_height: m.antenna_height,
          distance_km: Number(m.distance_km),
          link_ok: m.link_ok,
        })),
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  const plan = useMemo(
    () => buildMeshPlan({ carrierId, terrainId, heightId, distanceKm, measurements }),
    [carrierId, terrainId, heightId, distanceKm, measurements],
  );

  const license = licenses.find((l) => l.id === licenseId);
  const used = devices.filter((d) => d.license_id === licenseId).length;
  const capacityOk = !license || plan.totalNodes <= license.node_limit;

  async function provision() {
    if (!licenseId) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await provisionRelayChain({
        data: { licenseId, carrierId, terrainId, heightId, distanceKm, prefix, region: "TR" },
      });
      setResult(
        `${res.totalNodes} düğüm hazır (${res.created.length} yeni, ${res.existing.length} mevcut) · ${res.relays} röle · atlama ${res.hopKm.toFixed(2)} km`,
      );
      onProvisioned();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zincir oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Head
        label="Adım 1 · Otomatik zincir"
        title="Ev köprüsü + ara röle + saha ucu"
        hint="Mesafeyi girin; gereken röle sayısını sistem hesaplar ve tüm düğümleri tek tıkla oluşturur."
      />

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted-foreground">Lisans</span>
            <select
              value={licenseId}
              onChange={(e) => setLicenseId(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
            >
              {licenses.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.plan} · limit {l.node_limit} · kayıtlı {devices.filter((d) => d.license_id === l.id).length}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Taşıyıcı</span>
            <select
              value={carrierId}
              onChange={(e) => setCarrierId(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
            >
              {CARRIERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-muted-foreground">Arazi</span>
              <select
                value={terrainId}
                onChange={(e) => setTerrainId(e.target.value)}
                className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
              >
                {TERRAIN.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Anten</span>
              <select
                value={heightId}
                onChange={(e) => setHeightId(e.target.value)}
                className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
              >
                {HEIGHTS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-muted-foreground">
              Mesafe: <strong className="text-foreground">{distanceKm} km</strong>
            </span>
            <input
              type="range"
              min={1}
              max={50}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="mt-3 w-full accent-primary"
            />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Düğüm ön eki</span>
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
              maxLength={20}
              className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm"
            />
          </label>
        </div>

        <div className="rounded-sm border border-primary/40 bg-background p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Önerilen zincir</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold">{plan.hopKm.toFixed(1)}</p>
              <p className="text-[11px] text-muted-foreground">km / atlama</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-primary">{plan.relays}</p>
              <p className="text-[11px] text-muted-foreground">röle</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{plan.totalNodes}</p>
              <p className="text-[11px] text-muted-foreground">toplam düğüm</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {plan.sampleCount > 0
              ? `${plan.sampleCount} gerçek saha ölçümü ile kalibre edildi (model: ${plan.modelHopKm.toFixed(1)} km).`
              : "Henüz saha ölçümü yok; katalog değerleri kullanılıyor."}
          </p>

          <ol className="mt-4 space-y-2 text-sm">
            {plan.chain.map((n) => (
              <li key={n.nodeId} className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2">
                <span className="font-mono text-xs">
                  {prefix}-{n.nodeId}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {ROLE_LABEL[n.role]} · {n.distanceKm} km
                </span>
              </li>
            ))}
          </ol>

          {!capacityOk && (
            <p className="mt-3 rounded-sm border border-destructive/50 p-2 text-[11px] text-destructive">
              Bu plan lisans limitini aşıyor ({license?.node_limit} düğüm). Röleleri daha yüksek noktaya taşıyın veya planı yükseltin.
            </p>
          )}

          <button
            onClick={provision}
            disabled={busy || !licenseId || !capacityOk}
            className="mt-4 w-full rounded-sm bg-primary px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Kuruluyor…" : "Zinciri oluştur"}
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Kayıtlı düğüm: {used}/{license?.node_limit ?? "—"}
          </p>
          {result && <p className="mt-3 text-xs text-primary">{result}</p>}
          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </div>
      </div>

      <pre className="mt-6 overflow-x-auto rounded-sm border border-border bg-background p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
{agentSnippet(plan, license?.license_key ?? "<LISANS_ANAHTARINIZ>").replace(/--node-id (\S+)/g, `--node-id ${prefix}-$1`)}
      </pre>
    </Card>
  );
}

/** 2 — Store-and-forward kuyruk panosu. */
export function QueueBoard({ licenses, refreshKey }: { licenses: LicenseLite[]; refreshKey: number }) {
  const [rows, setRows] = useState<
    { id: string; origin_node: string; target_node: string | null; status: string; priority: number; queued_at: string; delivered_at: string | null }[]
  >([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("mesh_messages")
      .select("id, origin_node, target_node, status, priority, queued_at, delivered_at")
      .order("queued_at", { ascending: false })
      .limit(50);
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel("mesh-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "mesh_messages" }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const queued = rows.filter((r) => r.status === "queued").length;
  const delivering = rows.filter((r) => r.status === "delivering").length;
  const delivered = rows.filter((r) => r.status === "delivered").length;
  const licenseKey = licenses[0]?.license_key ?? "<LISANS_ANAHTARINIZ>";

  return (
    <Card>
      <Head
        label="Adım 2 · Store-and-forward"
        title="Kalıcı mesaj kuyruğu"
        hint="İnternet koptuğunda mesajlar kaybolmaz; bağlantı gelince öncelik sırasıyla teslim edilir."
      />

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[
          { k: "Kuyrukta", v: queued },
          { k: "İletiliyor", v: delivering },
          { k: "Teslim", v: delivered },
        ].map((s) => (
          <div key={s.k} className="rounded-sm border border-border bg-background p-4">
            <p className="text-2xl font-semibold">{s.v}</p>
            <p className="text-[11px] text-muted-foreground">{s.k}</p>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <ul className="mt-5 space-y-2">
          {rows.slice(0, 10).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 text-xs">
              <span className="font-mono">
                {r.origin_node} → {r.target_node ?? "yayın"}
              </span>
              <span className="text-muted-foreground">
                p{r.priority} · {new Date(r.queued_at).toLocaleString("tr-TR")}
              </span>
              <span
                className={
                  r.status === "delivered"
                    ? "text-primary"
                    : r.status === "queued"
                      ? "text-muted-foreground"
                      : "text-foreground"
                }
              >
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-5 rounded-sm border border-border bg-background p-4">
        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Düğüm ajanı kuyruk komutları
        </summary>
        <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground">
{`# Bağlantı gelince biriken mesajları yükle
curl -s https://tedbirge-gateway.lovable.app/api/public/queue \\
  -H "X-Tedbirge-License: ${licenseKey}" -H "Content-Type: application/json" \\
  -d '{"action":"enqueue","node_id":"saha-01","messages":[{"target_node":"ev-01","priority":3,"payload":{"text":"konum"}}]}'

# Hedef düğüm kuyruğu çeker
curl -s .../api/public/queue -H "X-Tedbirge-License: ${licenseKey}" \\
  -d '{"action":"fetch","node_id":"ev-01","limit":50}'

# Teslim onayı (mesaj kalıcı olarak kapanır)
curl -s .../api/public/queue -H "X-Tedbirge-License: ${licenseKey}" \\
  -d '{"action":"ack","node_id":"ev-01","ids":["<mesaj-id>"]}'`}
        </pre>
      </details>
    </Card>
  );
}

/** 3 — Katman bazlı kopma/dönüş alarm panosu. */
export function LinkAlertBoard({ refreshKey }: { refreshKey: number }) {
  const [alerts, setAlerts] = useState<
    {
      id: string;
      node_id: string;
      layer: string;
      state: string;
      detail: string | null;
      failover_to: string | null;
      acknowledged: boolean;
      detected_at: string;
      resolved_at: string | null;
    }[]
  >([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("link_alerts")
      .select("id, node_id, layer, state, detail, failover_to, acknowledged, detected_at, resolved_at")
      .order("detected_at", { ascending: false })
      .limit(40);
    setAlerts(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel("link-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "link_alerts" }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const active = alerts.filter((a) => a.state === "down" && !a.resolved_at);

  async function ack(id: string) {
    setBusy(id);
    try {
      await acknowledgeLinkAlert({ data: { id } });
      setAlerts((as) => as.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <Head
        label="Adım 3 · Anlık alarm"
        title="Kopma / geri dönüş izleme"
        hint="Hangi katmanın düştüğü (köprü / röle / uç) ve devralan yedek düğüm anlık gösterilir."
      />

      {active.length > 0 ? (
        <div className="mt-5 rounded-sm border border-destructive/60 bg-destructive/10 p-4">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-destructive">
            {active.length} aktif kesinti
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {active.map((a) => (
              <li key={a.id}>
                <strong>{ROLE_LABEL[a.layer] ?? a.layer}</strong> · {a.node_id}
                {a.failover_to ? ` → devralan: ${a.failover_to}` : " · yedek yok"}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-5 rounded-sm border border-border bg-background p-4 text-sm text-muted-foreground">
          Aktif kesinti yok — tüm katmanlar çevrimiçi.
        </p>
      )}

      {alerts.length > 0 && (
        <ul className="mt-5 space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 text-xs"
            >
              <span className="font-mono">
                <span className={a.state === "down" ? "text-destructive" : "text-primary"}>
                  {a.state === "down" ? "DÜŞTÜ" : "GERİ DÖNDÜ"}
                </span>{" "}
                · {a.node_id} · {ROLE_LABEL[a.layer] ?? a.layer}
              </span>
              <span className="text-muted-foreground">
                {new Date(a.detected_at).toLocaleString("tr-TR")}
                {a.detail ? ` · ${a.detail}` : ""}
              </span>
              {!a.acknowledged && (
                <button
                  onClick={() => ack(a.id)}
                  disabled={busy === a.id}
                  className="rounded-sm border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
                >
                  {busy === a.id ? "…" : "okundu"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** 5 — Rol ve otomatik failover ayarları. */
export function FailoverSettings({
  devices,
  onUpdated,
}: {
  devices: DeviceLite[];
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(
    deviceId: string,
    patch: { role?: "gateway" | "relay" | "edge"; failoverGroup?: string | null; failoverPriority?: number; isBackup?: boolean },
  ) {
    setBusy(deviceId);
    setError(null);
    try {
      await updateNodeTopology({ data: { deviceId, ...patch } });
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Güncellenemedi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <Head
        label="Adım 5 · Otomatik failover"
        title="Yedek köprü / röle devralma"
        hint="Aynı yedeklilik grubundaki düğümlerden önceliği en düşük sayı olan çevrimiçi düğüm, birincil düştüğünde uplink'i otomatik devralır."
      />

      {devices.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Önce düğüm oluşturun.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {devices.map((d) => (
            <div
              key={d.id}
              className="grid gap-3 rounded-sm border border-border bg-background p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center"
            >
              <div>
                <p className="font-mono text-sm">{d.node_id}</p>
                <p className="text-[11px] text-muted-foreground">
                  {d.label ?? "—"} · {d.active_uplink ? "aktif uplink" : "beklemede"}
                </p>
              </div>
              <select
                value={d.role ?? "edge"}
                onChange={(e) => update(d.id, { role: e.target.value as "gateway" | "relay" | "edge" })}
                disabled={busy === d.id}
                className="rounded-sm border border-border bg-card px-2 py-1.5 text-xs"
              >
                <option value="gateway">Ev köprüsü</option>
                <option value="relay">Ara röle</option>
                <option value="edge">Saha ucu</option>
              </select>
              <input
                defaultValue={d.failover_group ?? ""}
                placeholder="grup adı"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (d.failover_group ?? "")) update(d.id, { failoverGroup: v || null });
                }}
                className="rounded-sm border border-border bg-card px-2 py-1.5 font-mono text-xs"
              />
              <input
                type="number"
                min={1}
                max={999}
                defaultValue={d.failover_priority ?? 100}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v && v !== (d.failover_priority ?? 100)) update(d.id, { failoverPriority: v });
                }}
                className="rounded-sm border border-border bg-card px-2 py-1.5 font-mono text-xs"
              />
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(d.is_backup)}
                  onChange={(e) => update(d.id, { isBackup: e.target.checked })}
                  className="accent-primary"
                />
                yedek
              </label>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </Card>
  );
}
