import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { CARRIERS, TERRAIN, HEIGHTS } from "@/lib/mesh-plan";
import { createNodeEnrollment, revokeNodeEnrollment, setDeviceE2ee } from "@/lib/enrollment.functions";
import { runCalibrationTest } from "@/lib/calibration.functions";
import { friendlyError, normalizeNodeId } from "@/lib/friendly-error";


type LicenseLite = { id: string; plan: string; node_limit: number };

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

/** 1 — QR ile düğüm ekle. */
export function QrNodeEnroll({
  licenses,
  onChanged,
  refreshKey,
}: {
  licenses: LicenseLite[];
  onChanged: () => void;
  refreshKey: number;
}) {
  const [licenseId, setLicenseId] = useState(licenses[0]?.id ?? "");
  const [nodeId, setNodeId] = useState("");
  const [label, setLabel] = useState("");
  const [role, setRole] = useState<"gateway" | "relay" | "edge">("edge");
  const [carrier, setCarrier] = useState("lora");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<{ url: string; image: string; nodeId: string; expiresAt: string } | null>(
    null,
  );
  const [pending, setPending] = useState<
    { id: string; node_id: string; status: string; expires_at: string; created_at: string }[]
  >([]);

  useEffect(() => {
    if (!licenseId && licenses[0]) setLicenseId(licenses[0].id);
  }, [licenses, licenseId]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("node_enrollments")
      .select("id, node_id, status, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setPending(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel("node-enrollments")
      .on("postgres_changes", { event: "*", schema: "public", table: "node_enrollments" }, () => {
        void load();
        onChanged();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, onChanged]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await createNodeEnrollment({
        data: {
          licenseId,
          nodeId: normalizeNodeId(nodeId),
          label: label.trim() || undefined,
          role,
          carrier: carrier as never,
          region: "TR",
          ttlMinutes: 30,
        },
      });
      const url = `${window.location.origin}/kayit?t=${encodeURIComponent(res.token)}`;
      const image = await QRCode.toDataURL(url, { width: 320, margin: 1 });
      setQr({ url, image, nodeId: res.nodeId, expiresAt: res.expiresAt });
      setNodeId("");
      setLabel("");
      void load();
    } catch (e) {
      setError(friendlyError(e, "Davet oluşturulamadı."));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      await revokeNodeEnrollment({ data: { id } });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İptal edilemedi.");
    }
  }

  return (
    <Card>
      <Head
        label="QR ile düğüm ekle"
        title="Telefonla tara, düğüm 10 saniyede kayıtlı"
        hint="Davet 30 dakika geçerli ve tek kullanımlıktır. Cihaz kendi şifreleme anahtarını üretir; özel anahtar cihazdan çıkmaz."
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
                  {l.plan} · limit {l.node_limit}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-muted-foreground">Düğüm adı</span>
              <input
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                placeholder="saha-01"
                maxLength={48}
                className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Etiket</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Sakarya sahası"
                maxLength={80}
                className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-muted-foreground">Rol</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="gateway">Ev köprüsü</option>
                <option value="relay">Ara röle</option>
                <option value="edge">Saha ucu</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Taşıyıcı</span>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
              >
                {CARRIERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            onClick={create}
            disabled={busy || !licenseId || nodeId.trim().length < 2}
            className="w-full rounded-sm bg-primary px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Üretiliyor…" : "QR daveti üret"}
          </button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="rounded-sm border border-primary/40 bg-background p-5 text-center">
          {qr ? (
            <>
              <img src={qr.image} alt={`${qr.nodeId} düğüm kaydı QR kodu`} className="mx-auto h-52 w-52" />
              <p className="mt-3 font-mono text-xs text-primary">{qr.nodeId}</p>
              <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{qr.url}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Geçerlilik: {new Date(qr.expiresAt).toLocaleTimeString("tr-TR")}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(qr.url)}
                className="mt-3 rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
              >
                Bağlantıyı kopyala
              </button>
            </>
          ) : (
            <p className="py-16 text-sm text-muted-foreground">
              Davet ürettiğinizde QR kodu burada belirir. Telefon kamerasıyla okutun.
            </p>
          )}
        </div>
      </div>

      {pending.length > 0 && (
        <ul className="mt-6 space-y-2">
          {pending.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 text-xs"
            >
              <span className="font-mono">{p.node_id}</span>
              <span className="text-muted-foreground">
                {p.status} · {new Date(p.expires_at).toLocaleString("tr-TR")}
              </span>
              {p.status === "pending" && (
                <button
                  onClick={() => revoke(p.id)}
                  className="rounded-sm border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-secondary"
                >
                  İptal
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** 2 — Uçtan uca şifreleme anahtar panosu. */
export function E2eeKeyBoard({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<
    { id: string; node_id: string; e2ee: boolean; key_fingerprint: string | null; key_updated_at: string | null }[]
  >([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("devices")
      .select("id, node_id, e2ee, key_fingerprint, key_updated_at")
      .order("created_at", { ascending: true });
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function toggle(id: string, enabled: boolean) {
    setBusy(id);
    setError(null);
    try {
      await setDeviceE2ee({ data: { deviceId: id, enabled } });
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, e2ee: enabled } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Güncellenemedi.");
    } finally {
      setBusy(null);
    }
  }

  const secured = rows.filter((r) => r.e2ee).length;

  return (
    <Card>
      <Head
        label="Uçtan uca şifreleme"
        title="ECDH P-256 + AES-256-GCM"
        hint="Mesaj gövdesi düğümde şifrelenir, hedefte çözülür. Sunucu yalnızca şifreli zarfı taşır; içeriği okuyamaz."
      />

      <p className="mt-4 font-mono text-xs text-muted-foreground">
        Şifreli düğüm: <span className="text-primary">{secured}</span> / {rows.length}
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Henüz düğüm yok.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border px-3 py-2 text-xs"
            >
              <span className="font-mono">{r.node_id}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {r.key_fingerprint ?? "anahtar yok — QR ile kaydedin"}
              </span>
              <button
                onClick={() => toggle(r.id, !r.e2ee)}
                disabled={busy === r.id}
                className={`rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] disabled:opacity-50 ${
                  r.e2ee ? "border-primary text-primary" : "border-border hover:bg-secondary"
                }`}
              >
                {r.e2ee ? "şifreli" : "açık"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </Card>
  );
}

/** 3 — Kesinti olay kaydı. */
export function OutageLog({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<
    {
      id: string;
      node_id: string;
      layer: string;
      started_at: string;
      ended_at: string | null;
      duration_seconds: number | null;
      failover_to: string | null;
      cause: string | null;
      resolved: boolean;
    }[]
  >([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("outage_events")
      .select("id, node_id, layer, started_at, ended_at, duration_seconds, failover_to, cause, resolved")
      .order("started_at", { ascending: false })
      .limit(100);
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const channel = supabase
      .channel("outage-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "outage_events" }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const open = rows.filter((r) => !r.resolved).length;
  const totalMinutes = Math.round(
    rows.reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0) / 60,
  );

  function exportCsv() {
    const header = "node_id,layer,started_at,ended_at,duration_seconds,failover_to,cause\n";
    const body = rows
      .map((r) =>
        [r.node_id, r.layer, r.started_at, r.ended_at ?? "", r.duration_seconds ?? "", r.failover_to ?? "", r.cause ?? ""]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tedbirge-kesinti-kaydi.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Head
          label="Kesinti olay kaydı"
          title="Her kopma ve dönüş kayıt altında"
          hint="Başlangıç, bitiş, süre, düşen katman ve devralan yedek düğüm kalıcı olarak saklanır."
        />
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
        >
          CSV indir
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[
          { k: "Toplam olay", v: rows.length },
          { k: "Açık kesinti", v: open },
          { k: "Toplam dakika", v: totalMinutes },
        ].map((s) => (
          <div key={s.k} className="rounded-sm border border-border bg-background p-4">
            <p className="text-2xl font-semibold">{s.v}</p>
            <p className="text-[11px] text-muted-foreground">{s.k}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Henüz kesinti kaydı yok.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.slice(0, 20).map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 text-xs"
            >
              <span className="font-mono">
                {r.node_id} · {r.layer}
              </span>
              <span className="text-muted-foreground">
                {new Date(r.started_at).toLocaleString("tr-TR")}
                {r.ended_at ? ` → ${new Date(r.ended_at).toLocaleTimeString("tr-TR")}` : " → sürüyor"}
              </span>
              <span className={r.resolved ? "text-primary" : "text-destructive"}>
                {r.duration_seconds != null ? `${Math.round(r.duration_seconds / 60)} dk` : "açık"}
                {r.failover_to ? ` · ${r.failover_to}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** 4 — Model kalibrasyon testi. */
export function CalibrationTest({ refreshKey }: { refreshKey: number }) {
  const [carrier, setCarrier] = useState("lora");
  const [terrain, setTerrain] = useState("suburb");
  const [height, setHeight] = useState("roof");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runCalibrationTest>> | null>(null);
  const [history, setHistory] = useState<
    { id: string; carrier: string; terrain: string; accuracy_pct: number | null; verdict: string; created_at: string }[]
  >([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("calibration_runs")
      .select("id, carrier, terrain, accuracy_pct, verdict, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setHistory(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const verdictLabel = useMemo(
    () => ({
      gecti: "GEÇTİ",
      sinirda: "SINIRDA",
      kaldi: "KALDI",
      yetersiz_veri: "YETERSİZ VERİ",
    }),
    [],
  );

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await runCalibrationTest({
        data: { carrier: carrier as never, terrain: terrain as never, antennaHeight: height as never },
      });
      setResult(res);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test çalıştırılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Head
        label="Model kalibrasyon testi"
        title="Menzil modeli sahada ne kadar isabetli?"
        hint="Her gerçek ölçüm sırayla dışarıda bırakılır; model kalan verilerle o ölçümü doğru tahmin edebiliyor mu ölçülür."
      />

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <label className="block text-sm">
          <span className="text-muted-foreground">Taşıyıcı</span>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
          >
            {CARRIERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Arazi</span>
          <select
            value={terrain}
            onChange={(e) => setTerrain(e.target.value)}
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
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm"
          >
            {HEIGHTS.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={run}
          disabled={busy}
          className="mt-6 h-10 rounded-sm bg-primary px-4 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Test ediliyor…" : "Testi çalıştır"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      {result && (
        <div className="mt-5 rounded-sm border border-primary/40 bg-background p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            Sonuç: {verdictLabel[result.verdict]}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5 text-center">
            {[
              { k: "ölçüm", v: result.sampleCount },
              { k: "isabet %", v: result.accuracyPct },
              { k: "model km", v: result.modelHopKm },
              { k: "kalibre km", v: result.calibratedHopKm },
              { k: "MAE km", v: result.maeKm },
            ].map((s) => (
              <div key={s.k}>
                <p className="text-xl font-semibold">{s.v}</p>
                <p className="text-[11px] text-muted-foreground">{s.k}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Sapma: {result.biasKm} km ·{" "}
            {result.verdict === "yetersiz_veri"
              ? "Anlamlı test için en az 4 saha ölçümü gerekir (/kapsama sayfasından girin)."
              : "Sonuç kalıcı olarak kaydedildi."}
          </p>
        </div>
      )}

      {history.length > 0 && (
        <ul className="mt-5 space-y-2">
          {history.map((h) => (
            <li
              key={h.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 text-xs"
            >
              <span className="font-mono">
                {h.carrier} · {h.terrain}
              </span>
              <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("tr-TR")}</span>
              <span className={h.verdict === "gecti" ? "text-primary" : "text-muted-foreground"}>
                {h.accuracy_pct ?? 0}% · {h.verdict}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
