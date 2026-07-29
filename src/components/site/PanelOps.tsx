import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  saveWebhookEndpoint,
  deleteWebhookEndpoint,
  revealWebhookSecret,
  testWebhookEndpoint,
} from "@/lib/webhooks.functions";
import {
  createOrganization,
  upsertOrganizationMember,
  removeOrganizationMember,
  assignLicenseToOrganization,
} from "@/lib/orgs.functions";

const box = "rounded-sm border border-border bg-card/50 p-6";
const label = "font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground";
const input =
  "w-full rounded-sm border border-border bg-background/70 px-3 py-2 font-mono text-[13px] outline-none focus:border-primary";
const btn =
  "rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50";
const btnPrimary =
  "rounded-sm bg-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export type BoardDevice = {
  id: string;
  license_id: string;
  node_id: string;
  label: string | null;
  region: string;
  carrier: string | null;
  status: string;
  last_seen_at: string | null;
  last_error_code?: string | null;
  last_error_at?: string | null;
};

function isOnline(d: BoardDevice) {
  return (
    d.status === "active" &&
    !!d.last_seen_at &&
    Date.now() - new Date(d.last_seen_at).getTime() < ONLINE_WINDOW_MS
  );
}

function since(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

/** 1 — Gerçek zamanlı cihaz durum panosu: online/offline, son telemetri, hata kodu. */
export function DeviceStatusBoard({
  devices,
  licenses,
  refreshKey,
}: {
  devices: BoardDevice[];
  licenses: { id: string; plan: string }[];
  refreshKey: number;
}) {
  const [filter, setFilter] = useState<"all" | "online" | "offline" | "error" | "revoked">("all");
  const [licenseId, setLicenseId] = useState("all");
  const [query, setQuery] = useState("");
  const [, setTick] = useState(0);

  // "Online" eşiği zamana bağlı olduğu için pano dakikada bir kendini tazeler.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setTick((n) => n + 1), [refreshKey]);

  const rows = useMemo(() => {
    return devices.filter((d) => {
      if (licenseId !== "all" && d.license_id !== licenseId) return false;
      if (query && !`${d.node_id} ${d.label ?? ""}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (filter === "online") return isOnline(d);
      if (filter === "offline") return d.status === "active" && !isOnline(d);
      if (filter === "error") return !!d.last_error_code;
      if (filter === "revoked") return d.status === "revoked";
      return true;
    });
  }, [devices, filter, licenseId, query]);

  const online = devices.filter(isOnline).length;
  const errored = devices.filter((d) => !!d.last_error_code).length;

  return (
    <div className={box}>
      <p className={label}>Durum panosu</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Canlı düğüm durumu</h2>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat k="Toplam" v={String(devices.length)} />
        <Stat k="Online" v={String(online)} accent />
        <Stat k="Offline" v={String(devices.filter((d) => d.status === "active").length - online)} />
        <Stat k="Hata kodlu" v={String(errored)} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "Tümü"],
            ["online", "Online"],
            ["offline", "Offline"],
            ["error", "Hatalı"],
            ["revoked", "İptal"],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`${btn} ${filter === id ? "border-primary text-primary" : ""}`}
          >
            {text}
          </button>
        ))}
        <select
          value={licenseId}
          onChange={(e) => setLicenseId(e.target.value)}
          className="rounded-sm border border-border bg-background/70 px-3 py-1.5 font-mono text-[11px]"
        >
          <option value="all">Tüm lisanslar</option>
          {licenses.map((l) => (
            <option key={l.id} value={l.id}>
              {l.plan}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Düğüm ara…"
          className="w-40 rounded-sm border border-border bg-background/70 px-3 py-1.5 font-mono text-[11px]"
        />
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Bu filtreye uyan düğüm yok.</p>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {rows.map((d) => {
            const on = isOnline(d);
            return (
              <li key={d.id} className="rounded-sm border border-border bg-background/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[13px]">{d.node_id}</span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.15em] ${
                      d.status === "revoked"
                        ? "text-muted-foreground"
                        : on
                          ? "text-primary"
                          : "text-destructive"
                    }`}
                  >
                    ● {d.status === "revoked" ? "iptal" : on ? "online" : "offline"}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {d.region} · {d.carrier ?? "—"} · son telemetri: {since(d.last_seen_at)}
                </p>
                {d.last_error_code && (
                  <p className="mt-2 font-mono text-[11px] text-destructive">
                    hata: {d.last_error_code} ({since(d.last_error_at ?? null)})
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-background/50 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{k}</p>
      <p className={`mt-1 font-mono text-lg ${accent ? "text-primary" : ""}`}>{v}</p>
    </div>
  );
}

/** 2 — Organizasyonlar, üye rolleri ve lisans bağlama. */
type Org = { id: string; name: string; slug: string; owner_id: string };
type Member = { organization_id: string; user_id: string; email: string | null; role: string };

const ORG_ROLES = [
  { id: "owner", label: "Sahip" },
  { id: "admin", label: "Yönetici" },
  { id: "operator", label: "Operatör" },
  { id: "viewer", label: "İzleyici" },
] as const;

export function OrganizationManager({
  userId,
  licenses,
  onChanged,
}: {
  userId: string | undefined;
  licenses: { id: string; plan: string; organization_id: string | null }[];
  onChanged: () => void;
}) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("operator");
  const [activeOrg, setActiveOrg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [{ data: o }, { data: m }] = await Promise.all([
      supabase.from("organizations").select("id, name, slug, owner_id").order("created_at"),
      supabase.from("organization_members").select("organization_id, user_id, email, role"),
    ]);
    setOrgs((o as Org[]) ?? []);
    setMembers((m as Member[]) ?? []);
    setActiveOrg((cur) => cur || (o?.[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    if (userId) void reload();
  }, [userId, reload]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  }

  const orgMembers = members.filter((m) => m.organization_id === activeOrg);

  return (
    <div className={box}>
      <p className={label}>Organizasyonlar</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">
        Kurum, ekip rolleri ve lisans dağıtımı
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Her organizasyona ayrı lisans bağlayabilir, rol atamalarını organizasyon seviyesinde
        yönetebilirsiniz. Üyeler yalnızca bağlı oldukları organizasyonun lisans, düğüm ve
        kayıtlarını görür.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          void run(async () => {
            await createOrganization({ data: { name: name.trim() } });
            setName("");
          });
        }}
        className="mt-5 flex flex-wrap gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Yeni organizasyon adı"
          className={`${input} max-w-xs flex-1`}
        />
        <button className={btnPrimary} disabled={busy}>
          Oluştur
        </button>
      </form>

      {orgs.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => setActiveOrg(o.id)}
                className={`${btn} ${activeOrg === o.id ? "border-primary text-primary" : ""}`}
              >
                {o.name}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <div>
              <p className={label}>Üyeler</p>
              <ul className="mt-3 space-y-2">
                {orgMembers.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between gap-3 rounded-sm border border-border bg-background/50 px-3 py-2"
                  >
                    <span className="font-mono text-[12px]">{m.email ?? m.user_id.slice(0, 8)}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                        {ORG_ROLES.find((r) => r.id === m.role)?.label ?? m.role}
                      </span>
                      {m.role !== "owner" && (
                        <button
                          className={btn}
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              removeOrganizationMember({
                                data: { organizationId: activeOrg, userId: m.user_id },
                              }),
                            )
                          }
                        >
                          Çıkar
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await upsertOrganizationMember({
                      data: {
                        organizationId: activeOrg,
                        email: email.trim(),
                        role: role as "owner" | "admin" | "operator" | "viewer",
                      },
                    });
                    setEmail("");
                  });
                }}
                className="mt-3 flex flex-wrap gap-2"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="uye@kurum.gov.tr"
                  className={`${input} max-w-[220px] flex-1`}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-sm border border-border bg-background/70 px-3 py-2 font-mono text-[12px]"
                >
                  {ORG_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button className={btn} disabled={busy || !activeOrg}>
                  Ekle / rol ata
                </button>
              </form>
            </div>

            <div>
              <p className={label}>Lisans bağlama</p>
              <ul className="mt-3 space-y-2">
                {licenses.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-3 rounded-sm border border-border bg-background/50 px-3 py-2"
                  >
                    <span className="font-mono text-[12px] uppercase">{l.plan}</span>
                    <select
                      value={l.organization_id ?? ""}
                      disabled={busy}
                      onChange={(e) =>
                        void run(() =>
                          assignLicenseToOrganization({
                            data: {
                              licenseId: l.id,
                              organizationId: e.target.value || null,
                            },
                          }),
                        )
                      }
                      className="rounded-sm border border-border bg-background/70 px-2 py-1 font-mono text-[11px]"
                    >
                      <option value="">Bağlı değil</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {error && <p className="mt-4 font-mono text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

/** 3 — Webhook bildirim adresleri. */
type Endpoint = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  last_status: number | null;
  last_delivery_at: string | null;
};

const EVENT_OPTIONS = [
  { id: "license_event", label: "Lisans / düğüm olayları" },
  { id: "field_report", label: "Saha uyarı & şikayet" },
  { id: "device_offline", label: "Düğüm offline" },
  { id: "rate_limited", label: "Hız sınırı (429)" },
] as const;

export function WebhookSettings({ userId }: { userId: string | undefined }) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<
    { id: string; event_type: string; response_code: number | null; created_at: string }[]
  >([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["license_event", "field_report"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [{ data: e }, { data: d }] = await Promise.all([
      supabase
        .from("webhook_endpoints")
        .select("id, url, events, active, last_status, last_delivery_at")
        .order("created_at"),
      supabase
        .from("webhook_deliveries")
        .select("id, event_type, response_code, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setEndpoints((e as Endpoint[]) ?? []);
    setDeliveries(d ?? []);
  }, []);

  useEffect(() => {
    if (userId) void reload();
  }, [userId, reload]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={box}>
      <p className={label}>Bildirimler</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Webhook adresleri</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Lisans olayları ve saha uyarıları seçtiğiniz HTTPS adresine imzalı olarak gönderilir.
        İmza başlığı: <code className="font-mono text-[12px]">x-tedbirge-signature: sha256=…</code>
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await saveWebhookEndpoint({
              data: { url: url.trim(), events: events as never, active: true },
            });
            setUrl("");
          });
        }}
        className="mt-5 space-y-3"
      >
        <input
          required
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://kurum.example.com/tedbirge-webhook"
          className={input}
        />
        <div className="flex flex-wrap gap-2">
          {EVENT_OPTIONS.map((o) => {
            const on = events.includes(o.id);
            return (
              <button
                type="button"
                key={o.id}
                onClick={() =>
                  setEvents((cur) =>
                    on ? cur.filter((x) => x !== o.id) : [...cur, o.id],
                  )
                }
                className={`${btn} ${on ? "border-primary text-primary" : ""}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <button className={btnPrimary} disabled={busy || events.length === 0}>
          Adresi kaydet
        </button>
      </form>

      {endpoints.length > 0 && (
        <ul className="mt-6 space-y-3">
          {endpoints.map((e) => (
            <li key={e.id} className="rounded-sm border border-border bg-background/50 p-4">
              <p className="break-all font-mono text-[12px]">{e.url}</p>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {e.events.join(", ")} · son yanıt: {e.last_status ?? "—"} ·{" "}
                {since(e.last_delivery_at)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={btn}
                  disabled={busy}
                  onClick={() => void run(() => testWebhookEndpoint({ data: { id: e.id } }))}
                >
                  Test gönder
                </button>
                <button
                  className={btn}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const { secret } = await revealWebhookSecret({ data: { id: e.id } });
                      setSecret(secret);
                    })
                  }
                >
                  İmza anahtarını göster
                </button>
                <button
                  className={btn}
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      saveWebhookEndpoint({
                        data: {
                          id: e.id,
                          url: e.url,
                          events: e.events as never,
                          active: !e.active,
                        },
                      }),
                    )
                  }
                >
                  {e.active ? "Duraklat" : "Etkinleştir"}
                </button>
                <button
                  className={btn}
                  disabled={busy}
                  onClick={() => void run(() => deleteWebhookEndpoint({ data: { id: e.id } }))}
                >
                  Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {secret && (
        <p className="mt-4 break-all rounded-sm border border-border bg-background/70 p-3 font-mono text-[12px]">
          İmza anahtarı: {secret}
        </p>
      )}

      {deliveries.length > 0 && (
        <div className="mt-6">
          <p className={label}>Son teslimatlar</p>
          <ul className="mt-3 space-y-1">
            {deliveries.map((d) => (
              <li key={d.id} className="font-mono text-[11px] text-muted-foreground">
                {new Date(d.created_at).toLocaleString("tr-TR")} · {d.event_type} ·{" "}
                <span
                  className={
                    d.response_code && d.response_code < 400 ? "text-primary" : "text-destructive"
                  }
                >
                  {d.response_code ?? "hata"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-4 font-mono text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

/** 4 — Lisans başına API kullanımı ve 429 özetleri. */
export function ApiUsagePanel({
  licenses,
  refreshKey,
}: {
  licenses: { id: string; plan: string }[];
  refreshKey: number;
}) {
  const [rows, setRows] = useState<{ license_id: string | null; status_code: number; created_at: string }[]>(
    [],
  );
  const [licenseId, setLicenseId] = useState("all");

  useEffect(() => {
    (async () => {
      const from = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data } = await supabase
        .from("api_usage_events")
        .select("license_id, status_code, created_at")
        .gte("created_at", from)
        .order("created_at", { ascending: false })
        .limit(5000);
      setRows(data ?? []);
    })();
  }, [refreshKey]);

  const filtered = licenseId === "all" ? rows : rows.filter((r) => r.license_id === licenseId);

  const days = useMemo(() => {
    const buckets: { day: string; total: number; limited: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      buckets.push({ day: d.toISOString().slice(0, 10), total: 0, limited: 0 });
    }
    const index = new Map(buckets.map((b) => [b.day, b]));
    for (const r of filtered) {
      const b = index.get(r.created_at.slice(0, 10));
      if (!b) continue;
      b.total += 1;
      if (r.status_code === 429) b.limited += 1;
    }
    return buckets;
  }, [filtered]);

  const max = Math.max(1, ...days.map((d) => d.total));
  const today = days[days.length - 1];
  const limited30 = days.reduce((a, d) => a + d.limited, 0);
  const total30 = days.reduce((a, d) => a + d.total, 0);

  return (
    <div className={box}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={label}>API kullanımı</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Lisans başına istek ve hız sınırı özeti
          </h2>
        </div>
        <select
          value={licenseId}
          onChange={(e) => setLicenseId(e.target.value)}
          className="rounded-sm border border-border bg-background/70 px-3 py-1.5 font-mono text-[11px]"
        >
          <option value="all">Tüm lisanslar</option>
          {licenses.map((l) => (
            <option key={l.id} value={l.id}>
              {l.plan}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat k="Bugün" v={String(today?.total ?? 0)} accent />
        <Stat k="30 gün" v={String(total30)} />
        <Stat k="429 bugün" v={String(today?.limited ?? 0)} />
        <Stat k="429 / 30 gün" v={String(limited30)} />
      </div>

      <div className="mt-6 flex h-32 items-end gap-[3px]">
        {days.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.total} istek · ${d.limited} × 429`}
            className="flex-1 rounded-t-sm bg-primary/30"
            style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }}
          >
            {d.limited > 0 && (
              <div
                className="w-full rounded-t-sm bg-destructive"
                style={{ height: `${(d.limited / Math.max(1, d.total)) * 100}%` }}
              />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        son 30 gün · dakikada 60 / günde 20.000 istek sınırı
      </p>
    </div>
  );
}

/** 5 — 5 düğümlü pilot lisans için adım adım saha kurulum sihirbazı. */
export function SetupWizard({
  licenseKey,
  nodeLimit,
  registered,
}: {
  licenseKey?: string;
  nodeLimit: number;
  registered: number;
}) {
  const [step, setStep] = useState(0);
  const [nodeId, setNodeId] = useState("saha-A");
  const [region, setRegion] = useState("TR");
  const [carrier, setCarrier] = useState("lora");
  const key = licenseKey ?? "LISANS-ANAHTARINIZ";

  const steps = [
    {
      title: "Düğüm kimliğini seçin",
      body: null,
      code: null,
    },
    {
      title: "Ajanı kurun",
      body: "Raspberry Pi / x86 Linux için tek satır kurulum.",
      code: `curl -fsSL https://tedbirge-gateway.lovable.app/install.sh | sh
chmod +x tedbirge-gateway && ./tedbirge-gateway --version`,
    },
    {
      title: "Yapılandırma dosyasını yazın",
      body: "Aşağıdaki içeriği /etc/tedbirge/node.env dosyasına kaydedin.",
      code: `TEDBIRGE_LICENSE_KEY=${key}
TEDBIRGE_NODE_ID=${nodeId}
TEDBIRGE_REGION=${region}
TEDBIRGE_CARRIER=${carrier}
TEDBIRGE_MESH=true
TEDBIRGE_MESH_ADDR=:7946
TEDBIRGE_TELEMETRY_URL=https://tedbirge-gateway.lovable.app/api/public/telemetry
TEDBIRGE_TELEMETRY_INTERVAL=60s`,
    },
    {
      title: "Servisi başlatın",
      body: "systemd altında kalıcı çalıştırma.",
      code: `sudo systemctl enable --now tedbirge-gateway
sudo journalctl -u tedbirge-gateway -f`,
    },
    {
      title: "Bağlantıyı doğrulayın",
      body: "İlk heartbeat gönderildiğinde düğüm panoda 'online' görünür.",
      code: `curl -X POST https://tedbirge-gateway.lovable.app/api/public/telemetry \\
  -H "Content-Type: application/json" \\
  -H "X-Tedbirge-License: ${key}" \\
  -d '{"node_id":"${nodeId}","region":"${region}","carrier":"${carrier}","rtt_ms":42}'`,
    },
  ];

  const current = steps[step];

  return (
    <div className={box}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={label}>Kurulum sihirbazı</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Pilot lisans saha kurulumu ({registered}/{nodeLimit} düğüm)
          </h2>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          Adım {step + 1} / {steps.length}
        </span>
      </div>

      <div className="mt-4 flex gap-1">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className={`h-1 flex-1 rounded-sm ${i <= step ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      <p className="mt-5 text-sm font-medium">{current.title}</p>
      {current.body && (
        <p className="mt-1 text-sm text-muted-foreground">{current.body}</p>
      )}

      {step === 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Düğüm adı
            </span>
            <input value={nodeId} onChange={(e) => setNodeId(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Bölge
            </span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={input}
            >
              {["TR", "EU", "US", "UK", "GCC", "APAC", "JP", "OTHER"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Taşıyıcı
            </span>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className={input}
            >
              {["lora", "wifi", "eth", "cellular", "satellite", "halow", "tvws", "wigig", "fso"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      )}

      {current.code && (
        <div className="mt-4 flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-sm border border-border bg-background/70 p-4 font-mono text-[12px] leading-relaxed text-muted-foreground">
            <code>{current.code}</code>
          </pre>
          <CopyBtn value={current.code} />
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button className={btn} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Geri
        </button>
        <button
          className={btnPrimary}
          disabled={step === steps.length - 1}
          onClick={() => setStep((s) => s + 1)}
        >
          İleri
        </button>
      </div>
    </div>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className={`${btn} shrink-0`}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Kopyalandı" : "Kopyala"}
    </button>
  );
}
