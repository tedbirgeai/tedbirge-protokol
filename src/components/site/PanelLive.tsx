import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Canlı panolar — hiçbir örnek/sahte veri yoktur.
 * Tüm değerler devices / ir_frames tablolarındaki gerçek telemetriden okunur.
 */

const box = "rounded-sm border border-border bg-card/50 p-6";
const label = "font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export type LiveDevice = {
  id: string;
  license_id: string;
  node_id: string;
  label: string | null;
  region: string;
  carrier: string | null;
  status: string;
  kind?: string | null;
  last_seen_at: string | null;
  last_error_code?: string | null;
};

export function isDeviceOnline(d: { status: string; last_seen_at: string | null }) {
  return (
    d.status === "active" &&
    !!d.last_seen_at &&
    Date.now() - new Date(d.last_seen_at).getTime() < ONLINE_WINDOW_MS
  );
}

export function sinceLabel(iso: string | null) {
  if (!iso) return "hiç";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

const CARRIERS: { id: string; name: string }[] = [
  { id: "eth", name: "Ethernet" },
  { id: "wifi", name: "Wi-Fi" },
  { id: "cellular", name: "Hücresel" },
  { id: "satellite", name: "Uydu" },
  { id: "wigig", name: "WiGig 60 GHz" },
  { id: "fso", name: "FSO lazer" },
  { id: "halow", name: "Wi-Fi HaLow" },
  { id: "tvws", name: "TVWS" },
  { id: "lora", name: "LoRa sub-GHz" },
];

/** Taşıyıcı bazlı canlı aktif/pasif panosu. */
export function CarrierLiveBoard({ devices }: { devices: LiveDevice[] }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(
    () =>
      CARRIERS.map((c) => {
        const owned = devices.filter((d) => d.carrier === c.id);
        const online = owned.filter(isDeviceOnline);
        const lastSeen = owned
          .map((d) => d.last_seen_at)
          .filter((v): v is string => !!v)
          .sort()
          .at(-1) ?? null;
        return { ...c, total: owned.length, online: online.length, lastSeen };
      }),
    [devices],
  );

  const activeCount = rows.filter((r) => r.online > 0).length;

  return (
    <div className={box}>
      <p className={label}>Taşıyıcı panosu</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Anlık taşıyıcı durumu</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {activeCount}/9 taşıyıcı canlı · 5 dk telemetri penceresi
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const live = r.online > 0;
          return (
            <div
              key={r.id}
              className={`rounded-sm border p-4 ${
                live ? "border-primary/60 bg-primary/5" : "border-border bg-background/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12px]">{r.name}</span>
                <span
                  className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
                    live ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      live ? "animate-pulse bg-primary" : "bg-muted-foreground/50"
                    }`}
                  />
                  {live ? "aktif" : "pasif"}
                </span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {r.online}/{r.total} düğüm online · son sinyal {sinceLabel(r.lastSeen)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type IrFrame = {
  id: string;
  device_id: string;
  temp_max_c: number | null;
  temp_min_c: number | null;
  temp_avg_c: number | null;
  detections: number | null;
  alarm: boolean;
  alarm_reason: string | null;
  frame_hash: string | null;
  created_at: string;
};

/** Kızılötesi (termal) kamera canlı panosu — tek satır kurulumla sıfır sürtünme. */
export function IrCameraBoard({
  devices,
  licenseKey,
  refreshKey,
}: {
  devices: LiveDevice[];
  licenseKey?: string;
  refreshKey: number;
}) {
  const [frames, setFrames] = useState<IrFrame[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ir_frames")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    setFrames((data as IrFrame[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel("ir-frames-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ir_frames" }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const cameras = devices.filter((d) => d.kind === "ir_camera");
  const lastByDevice = useMemo(() => {
    const map: Record<string, IrFrame> = {};
    for (const f of frames) if (!map[f.device_id]) map[f.device_id] = f;
    return map;
  }, [frames]);

  const alarms = frames.filter((f) => f.alarm).slice(0, 8);

  const snippet = `curl -X POST https://tedbirge-gateway.lovable.app/api/public/telemetry \\
  -H "Content-Type: application/json" \\
  -H "X-Tedbirge-License: ${licenseKey ?? "<LISANS_ANAHTARINIZ>"}" \\
  -d '{"node_id":"ir-kamera-1","kind":"ir_camera","region":"TR","carrier":"wifi",
       "thermal":{"temp_max_c":38.4,"temp_min_c":11.2,"temp_avg_c":19.7,
                  "detections":1,"alarm":true,"alarm_reason":"insan sıcaklığı",
                  "frame_hash":"sha256:..."}}'`;

  return (
    <div className={box}>
      <p className={label}>Kızılötesi kameralar</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Termal kamera canlı akışı</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {cameras.filter(isDeviceOnline).length}/{cameras.length} kamera online
        </span>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Yükleniyor…</p>
      ) : cameras.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Henüz kızılötesi kamera bağlı değil. Aşağıdaki tek isteği kameranızın ajanından
          gönderdiğinizde kamera otomatik kaydolur ve bu pano canlı çalışmaya başlar. Görüntü
          taşınmaz; yalnızca sıcaklık metrikleri ve kare imzası saklanır.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {cameras.map((c) => {
            const f = lastByDevice[c.id];
            const live = isDeviceOnline(c);
            return (
              <div
                key={c.id}
                className={`rounded-sm border p-4 ${
                  f?.alarm ? "border-destructive/70 bg-destructive/5" : "border-border bg-background/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px]">{c.node_id}</span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.15em] ${
                      live ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {live ? "çevrimiçi" : "çevrimdışı"}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {c.label ?? "—"} · {c.region} · son kare {sinceLabel(f?.created_at ?? c.last_seen_at)}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <Metric k="maks" v={f?.temp_max_c != null ? `${f.temp_max_c}°C` : "—"} />
                  <Metric k="ort" v={f?.temp_avg_c != null ? `${f.temp_avg_c}°C` : "—"} />
                  <Metric k="min" v={f?.temp_min_c != null ? `${f.temp_min_c}°C` : "—"} />
                </div>
                <p className="mt-3 font-mono text-[11px]">
                  Tespit: {f?.detections ?? 0} ·{" "}
                  <span className={f?.alarm ? "text-destructive" : "text-muted-foreground"}>
                    {f?.alarm ? `ALARM — ${f.alarm_reason ?? "termal eşik"}` : "alarm yok"}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      )}

      {alarms.length > 0 && (
        <div className="mt-6">
          <p className={label}>Son alarmlar</p>
          <ul className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
            {alarms.map((a) => (
              <li key={a.id}>
                {new Date(a.created_at).toLocaleString("tr-TR")} ·{" "}
                {devices.find((d) => d.id === a.device_id)?.node_id ?? a.device_id.slice(0, 8)} ·{" "}
                {a.alarm_reason ?? "termal eşik"}
                {a.temp_max_c != null ? ` · ${a.temp_max_c}°C` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <p className={label}>Tek adımda bağla</p>
        <pre className="mt-3 overflow-x-auto rounded-sm border border-border bg-background/70 p-4 font-mono text-[11px] leading-relaxed">
          {snippet}
        </pre>
        <button
          onClick={() => void navigator.clipboard.writeText(snippet)}
          className="mt-3 rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
        >
          Komutu kopyala
        </button>
      </div>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/60 px-2 py-1.5">
      <span className="block text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>
  );
}
