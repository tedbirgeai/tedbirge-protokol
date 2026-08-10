/** Sistem sağlık hesaplaması — tamamen gerçek tablo verisinden türetilir. */

type AnyClient = {
  // Supabase sorgu zinciri jenerik tipleri burada taşınamıyor.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type HealthReport = {
  generatedAt: string;
  status: "saglikli" | "uyari" | "kritik";
  nodes: { total: number; online: number; offline: number; revoked: number };
  telemetry: { lastSeenAt: string | null; ageSeconds: number | null; samples24h: number };
  queue: {
    pending: number;
    delivered24h: number;
    failed24h: number;
    lagSeconds: number;
    deliveryRatePct: number;
  };
  outages: { open: number; total24h: number };
  api: { requests24h: number; rateLimited24h: number };
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function computeHealth(
  client: AnyClient,
  licenseIds: string[],
): Promise<HealthReport> {
  const now = Date.now();
  const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const empty = licenseIds.length === 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inList = <T>(q: T): T => (empty ? q : (q as any).in("license_id", licenseIds));

  const [devicesRes, samplesRes, queueRes, outagesRes, apiRes] = await Promise.all([
    empty
      ? { data: [] }
      : client.from("devices").select("status, last_seen_at").in("license_id", licenseIds),
    empty
      ? { data: [] }
      : inList(client.from("telemetry_samples").select("created_at").gte("created_at", since)),
    empty
      ? { data: [] }
      : inList(
          client
            .from("mesh_messages")
            .select("status, queued_at, delivered_at, created_at")
            .gte("created_at", since),
        ),
    empty ? { data: [] } : inList(client.from("outage_events").select("resolved, started_at")),
    empty
      ? { data: [] }
      : inList(
          client
            .from("api_usage_events")
            .select("status_code, created_at")
            .gte("created_at", since),
        ),
  ]);

  const devices = (devicesRes.data ?? []) as { status: string; last_seen_at: string | null }[];
  const online = devices.filter(
    (d) =>
      d.status === "active" &&
      d.last_seen_at &&
      now - new Date(d.last_seen_at).getTime() < ONLINE_WINDOW_MS,
  ).length;
  const revoked = devices.filter((d) => d.status !== "active").length;

  const lastSeen =
    devices
      .map((d) => d.last_seen_at)
      .filter((v): v is string => !!v)
      .sort()
      .pop() ?? null;

  const queue = (queueRes.data ?? []) as {
    status: string;
    queued_at: string | null;
    delivered_at: string | null;
  }[];
  const pendingRows = queue.filter((m) => m.status === "queued" || m.status === "pending");
  const delivered = queue.filter((m) => m.status === "delivered").length;
  const failed = queue.filter((m) => m.status === "failed" || m.status === "expired").length;
  const oldestPending = pendingRows
    .map((m) => (m.queued_at ? new Date(m.queued_at).getTime() : now))
    .sort((a, b) => a - b)[0];

  const outages = (outagesRes.data ?? []) as { resolved: boolean; started_at: string }[];
  const api = (apiRes.data ?? []) as { status_code: number }[];

  const totalDeliverable = delivered + failed;
  const deliveryRatePct =
    totalDeliverable === 0 ? 100 : Math.round((delivered / totalDeliverable) * 1000) / 10;
  const ageSeconds = lastSeen ? Math.round((now - new Date(lastSeen).getTime()) / 1000) : null;
  const lagSeconds = oldestPending ? Math.round((now - oldestPending) / 1000) : 0;
  const openOutages = outages.filter((o) => !o.resolved).length;

  const critical = devices.length > 0 && online === 0;
  const warn =
    openOutages > 0 ||
    deliveryRatePct < 95 ||
    lagSeconds > 300 ||
    (ageSeconds !== null && ageSeconds > 600) ||
    pendingRows.length > 50;

  return {
    generatedAt: new Date(now).toISOString(),
    status: critical ? "kritik" : warn ? "uyari" : "saglikli",
    nodes: { total: devices.length, online, offline: devices.length - online - revoked, revoked },
    telemetry: {
      lastSeenAt: lastSeen,
      ageSeconds,
      samples24h: (samplesRes.data ?? []).length,
    },
    queue: {
      pending: pendingRows.length,
      delivered24h: delivered,
      failed24h: failed,
      lagSeconds,
      deliveryRatePct,
    },
    outages: {
      open: openOutages,
      total24h: outages.filter((o) => new Date(o.started_at).getTime() >= now - 24 * 60 * 60 * 1000)
        .length,
    },
    api: {
      requests24h: api.length,
      rateLimited24h: api.filter((e) => e.status_code === 429).length,
    },
  };
}
