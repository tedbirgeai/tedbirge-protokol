import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createDevice,
  createFieldReport,
  updateFieldReport,
} from "@/lib/devices.functions";
import { friendlyError, normalizeNodeId } from "@/lib/friendly-error";


const REGIONS = ["TR", "EU", "US", "UK", "GCC", "APAC", "JP", "OTHER"] as const;
const CARRIERS = [
  { id: "lora", label: "LoRa (sub-GHz)" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "eth", label: "Ethernet" },
  { id: "cellular", label: "Hücresel" },
  { id: "satellite", label: "Uydu" },
  { id: "halow", label: "Wi-Fi HaLow" },
  { id: "tvws", label: "TVWS" },
  { id: "wigig", label: "WiGig" },
  { id: "fso", label: "FSO lazer" },
] as const;

const box = "rounded-sm border border-border bg-card/50 p-6";
const label = "font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground";
const input =
  "w-full rounded-sm border border-border bg-background/70 px-3 py-2 font-mono text-[13px] outline-none focus:border-primary";
const btn =
  "rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50";
const btnPrimary =
  "rounded-sm bg-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50";

/** Tek adımda düğüm oluşturma — lisans seçimi, ad, bölge, taşıyıcı. */
export function NodeCreator({
  licenses,
  usedByLicense,
  onCreated,
}: {
  licenses: { id: string; plan: string; node_limit: number }[];
  usedByLicense: Record<string, number>;
  onCreated: () => void;
}) {
  const [licenseId, setLicenseId] = useState(licenses[0]?.id ?? "");
  const [nodeId, setNodeId] = useState("");
  const [labelText, setLabelText] = useState("");
  const [region, setRegion] = useState<string>("TR");
  const [carrier, setCarrier] = useState<string>("lora");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!licenseId && licenses[0]) setLicenseId(licenses[0].id);
  }, [licenses, licenseId]);

  const license = licenses.find((l) => l.id === licenseId);
  const used = license ? (usedByLicense[license.id] ?? 0) : 0;
  const remaining = license ? license.node_limit - used : 0;

  const suggestion = useMemo(() => `saha-${String.fromCharCode(65 + used)}`, [used]);

  const effectiveNodeId = normalizeNodeId(nodeId) || suggestion;
  const nodeIdValid = effectiveNodeId.length >= 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nodeIdValid) {
      setError("Düğüm adı en az 2 karakter olmalı (örn. saha-A).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createDevice({
        data: {
          licenseId,
          nodeId: effectiveNodeId,
          label: labelText.trim() || undefined,
          region: region as (typeof REGIONS)[number],
          carrier: carrier as (typeof CARRIERS)[number]["id"],
        },
      });
      setNodeId("");
      setLabelText("");
      setDone(true);
      setTimeout(() => setDone(false), 2500);
      onCreated();
    } catch (err) {
      setError(friendlyError(err, "Düğüm oluşturulamadı."));
    } finally {
      setBusy(false);
    }
  }


  if (licenses.length === 0) return null;

  return (
    <div className={box}>
      <p className={label}>Yeni düğüm</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Üç alanda düğüm ekleyin</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Kalan düğüm hakkı: <span className="font-mono text-foreground">{remaining}</span> /{" "}
        {license?.node_limit ?? 0}. Düğüm oluşturduğunuzda aynı adla telemetri gönderen cihaz
        otomatik eşleşir.
      </p>
      <p className="mt-2 rounded-sm border border-border bg-background/50 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Eski düğümleri silmek zorunda değilsiniz.</strong>{" "}
        Çevrimdışı görünen bir düğüm sadece son 5 dakikada telemetri göndermemiş demektir; cihaz
        tekrar açıldığında kendiliğinden çevrimiçi olur. Silme işlemi yalnızca düğüm hakkınız
        dolduğunda ya da o düğümü kalıcı olarak kullanmayacaksanız gerekir. Aynı adı tekrar
        kullanmak isterseniz önce eskisini silin.
      </p>


      <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
        {licenses.length > 1 && (
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Lisans
            </span>
            <select
              value={licenseId}
              onChange={(e) => setLicenseId(e.target.value)}
              className={`mt-1 ${input}`}
            >
              {licenses.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.plan} · {l.node_limit} düğüm
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Düğüm adı
          </span>
          <input
            value={nodeId}
            onChange={(e) => setNodeId(normalizeNodeId(e.target.value))}
            placeholder={suggestion}
            maxLength={64}
            aria-invalid={!nodeIdValid}
            className={`mt-1 ${input}`}
          />
          <p
            className={`mt-1 font-mono text-[11px] ${nodeIdValid ? "text-muted-foreground" : "text-destructive"}`}
          >
            {nodeIdValid
              ? `Kayıt adı: ${effectiveNodeId} · en az 2 karakter, harf/rakam/tire`
              : "En az 2 karakter yazın (örn. ev-01)."}
          </p>
        </div>

        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Konum etiketi (opsiyonel)
          </span>
          <input
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
            placeholder="Sakarya / Adapazarı röle"
            maxLength={120}
            className={`mt-1 ${input}`}
          />
        </div>
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Bölge profili
          </span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={`mt-1 ${input}`}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Taşıyıcı
          </span>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className={`mt-1 ${input}`}
          >
            {CARRIERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || remaining <= 0 || !nodeIdValid}
            className={btnPrimary}
          >
            {busy ? "Oluşturuluyor…" : "Düğümü oluştur"}
          </button>

          {done && <span className="font-mono text-[11px] text-primary">Düğüm eklendi.</span>}
          {remaining <= 0 && (
            <span className="font-mono text-[11px] text-muted-foreground">
              Düğüm limiti dolu — plan yükseltmesi gerekir.
            </span>
          )}
          {error && <span className="font-mono text-[11px] text-destructive">{error}</span>}
        </div>
      </form>
    </div>
  );
}

type LicenseEvent = {
  id: string;
  event: string;
  detail: string | null;
  actor: string;
  created_at: string;
};

const EVENT_TR: Record<string, string> = {
  device_created: "Düğüm oluşturuldu",
  device_auto_registered: "Düğüm otomatik kaydedildi",
  device_revoked: "Düğüm iptal edildi",
  device_reactivated: "Düğüm yeniden açıldı",
  device_deleted: "Düğüm silindi",
  license_key_rotated: "Lisans anahtarı yenilendi",
};

/** Lisans olay günlüğü. */
export function LicenseEventLog({ refreshKey }: { refreshKey: number }) {
  const [events, setEvents] = useState<LicenseEvent[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("license_events")
        .select("id, event, detail, actor, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (active) setEvents((data as LicenseEvent[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <div className={box}>
      <p className={label}>Lisans olay günlüğü</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">Son 30 olay</h2>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Henüz kayıtlı olay yok.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 pb-3"
            >
              <div>
                <p className="text-sm">{EVENT_TR[e.event] ?? e.event}</p>
                {e.detail && (
                  <p className="font-mono text-[11px] text-muted-foreground">{e.detail}</p>
                )}
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {new Date(e.created_at).toLocaleString("tr-TR")} · {e.actor}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type FieldReport = {
  id: string;
  severity: string;
  category: string;
  title: string;
  detail: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const CATEGORIES = [
  { id: "coverage", label: "Kapsama / menzil" },
  { id: "hardware", label: "Donanım arızası" },
  { id: "interference", label: "Girişim / parazit" },
  { id: "power", label: "Enerji / batarya" },
  { id: "permit", label: "İzin / mevzuat" },
  { id: "other", label: "Diğer" },
] as const;

const SEVERITY_TR: Record<string, string> = {
  info: "bilgi",
  warning: "uyarı",
  critical: "kritik",
};

const STATUS_TR: Record<string, string> = {
  open: "açık",
  in_progress: "işlemde",
  resolved: "çözüldü",
  dismissed: "kapatıldı",
};

/** Saha uyarı / şikayet bildirimi ve listesi. */
export function FieldReports({
  devices,
  isAdmin,
}: {
  devices: { id: string; node_id: string }[];
  isAdmin: boolean;
}) {
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [severity, setSeverity] = useState("warning");
  const [category, setCategory] = useState("coverage");
  const [deviceId, setDeviceId] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("field_reports")
      .select("id, severity, category, title, detail, status, admin_note, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setReports((data as FieldReport[]) ?? []);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("field-reports-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "field_reports" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createFieldReport({
        data: {
          deviceId: deviceId || undefined,
          severity: severity as "info" | "warning" | "critical",
          category: category as (typeof CATEGORIES)[number]["id"],
          title: title.trim(),
          detail: detail.trim(),
        },
      });
      setTitle("");
      setDetail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bildirim gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await updateFieldReport({
      data: { reportId: id, status: status as "open" | "in_progress" | "resolved" | "dismissed" },
    });
    await load();
  }

  return (
    <div className={box}>
      <p className={label}>Saha uyarı / şikayet</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">
        Sahadan gelen sorunları buradan bildirin
      </h2>

      <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-3">
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={input}>
          <option value="info">Bilgi</option>
          <option value="warning">Uyarı</option>
          <option value="critical">Kritik</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={input}>
          <option value="">Düğüm seçilmedi</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.node_id}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kısa başlık"
          maxLength={160}
          required
          className={`md:col-span-3 ${input}`}
        />
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Ne oldu, nerede, ne zaman? (en az 10 karakter)"
          maxLength={4000}
          required
          rows={3}
          className={`md:col-span-3 ${input}`}
        />
        <div className="md:col-span-3 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Gönderiliyor…" : "Bildirim gönder"}
          </button>
          {error && <span className="font-mono text-[11px] text-destructive">{error}</span>}
        </div>
      </form>

      {reports.length > 0 && (
        <ul className="mt-6 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-sm border border-border bg-background/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
                  {SEVERITY_TR[r.severity] ?? r.severity} · {r.category}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {STATUS_TR[r.status] ?? r.status} ·{" "}
                  {new Date(r.created_at).toLocaleString("tr-TR")}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">{r.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>
              {r.admin_note && (
                <p className="mt-2 font-mono text-[11px] text-primary">Not: {r.admin_note}</p>
              )}
              {isAdmin && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {["in_progress", "resolved", "dismissed"].map((s) => (
                    <button key={s} onClick={() => setStatus(r.id, s)} className={btn}>
                      {STATUS_TR[s]}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
