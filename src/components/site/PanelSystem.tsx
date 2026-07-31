import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSystemHealth } from "@/lib/health.functions";
import { rotateLicenseKey, rotateDeviceKeys, listKeyRotations } from "@/lib/licenses.functions";

const box = "rounded-sm border border-border bg-card/50 p-6";
const label = "font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground";
const btn =
  "rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50";

type Health = Awaited<ReturnType<typeof getSystemHealth>>;

function Head({ label: l, title, hint }: { label: string; title: string; hint?: string }) {
  return (
    <div>
      <p className={label}>{l}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ageLabel(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds} sn`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} dk`;
  return `${Math.round(seconds / 3600)} sa`;
}

/** 1 — Sistem sağlık kartları (tek uç noktadan). */
export function HealthCards({ refreshKey }: { refreshKey: number }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setHealth(await getSystemHealth());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sağlık verisi alınamadı.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const t = setInterval(() => void load(), 20000);
    return () => clearInterval(t);
  }, [load]);

  const tone =
    health?.status === "kritik"
      ? "border-destructive text-destructive"
      : health?.status === "uyari"
        ? "border-primary/60 text-primary"
        : "border-primary text-primary";

  const cards = health
    ? [
        { k: "Çevrimiçi düğüm", v: `${health.nodes.online}/${health.nodes.total}` },
        { k: "Son telemetri yaşı", v: ageLabel(health.telemetry.ageSeconds) },
        { k: "Kuyruk gecikmesi", v: ageLabel(health.queue.lagSeconds) },
        { k: "Teslimat oranı", v: `${health.queue.deliveryRatePct}%` },
        { k: "Bekleyen mesaj", v: health.queue.pending },
        { k: "Açık kesinti", v: health.outages.open },
        { k: "24s telemetri", v: health.telemetry.samples24h },
        { k: "24s 429", v: health.api.rateLimited24h },
      ]
    : [];

  return (
    <div className={box}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Head
          label="Sistem sağlığı"
          title="Tek bakışta canlı durum"
          hint="Kuyruk gecikmesi, teslimat oranı ve son telemetri yaşı 20 saniyede bir tek uç noktadan yenilenir."
        />
        <div className="flex items-center gap-2">
          {health && (
            <span className={`rounded-sm border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] ${tone}`}>
              {health.status}
            </span>
          )}
          <button onClick={() => void load()} disabled={busy} className={btn}>
            {busy ? "Yenileniyor…" : "Yenile"}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-xs text-destructive">{error}</p>}

      {health ? (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map((c) => (
            <div key={c.k} className="rounded-sm border border-border bg-background p-4 text-center">
              <p className="text-2xl font-semibold">{c.v}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{c.k}</p>
            </div>
          ))}
        </div>
      ) : (
        !error && <p className="mt-4 text-sm text-muted-foreground">Yükleniyor…</p>
      )}

      {health && (
        <p className="mt-4 font-mono text-[10px] text-muted-foreground">
          Üretim zamanı: {new Date(health.generatedAt).toLocaleTimeString("tr-TR")} · Uç nokta:
          GET /api/public/health (X-Tedbirge-License)
        </p>
      )}
    </div>
  );
}

type FeedItem = { id: string; at: string; kind: string; text: string };

/** 2 — Gerçek zamanlı olay akışı: düğüm, kuyruk, kesinti, alarm. */
export function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [connected, setConnected] = useState(false);
  const counter = useRef(0);

  const push = useCallback((kind: string, text: string) => {
    counter.current += 1;
    setItems((prev) =>
      [{ id: `${Date.now()}-${counter.current}`, at: new Date().toISOString(), kind, text }, ...prev].slice(0, 60),
    );
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("panel-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, (p) => {
        const row = (p.new ?? p.eventType) as Record<string, unknown>;
        push("düğüm", `${row?.node_id ?? "düğüm"} · ${row?.status ?? p.eventType}`);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "telemetry_samples" }, (p) => {
        const row = p.new as Record<string, unknown>;
        push("telemetri", `rtt ${row?.rtt_ms ?? "—"} ms · kayıp ${row?.packet_loss_pct ?? "—"}%`);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mesh_messages" }, (p) => {
        const row = p.new as Record<string, unknown>;
        push("kuyruk", `${row?.origin_node ?? "—"} → ${row?.target_node ?? "yayın"} · ${row?.status ?? ""}`);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "outage_events" }, (p) => {
        const row = p.new as Record<string, unknown>;
        push("kesinti", `${row?.node_id ?? "—"} · ${row?.layer ?? ""} · ${row?.resolved ? "kapandı" : "açık"}`);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "link_alerts" }, (p) => {
        const row = p.new as Record<string, unknown>;
        push("alarm", `${row?.node_id ?? "—"} · ${row?.layer ?? ""} · ${row?.state ?? ""}`);
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [push]);

  return (
    <div className={box}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Head
          label="Canlı akış"
          title="Düğüm, kuyruk ve kesinti olayları anında"
          hint="Veritabanı değişiklikleri websocket üzerinden anlık düşer; sayfa yenilemeye gerek yoktur."
        />
        <span
          className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] ${
            connected ? "border-primary text-primary" : "border-border text-muted-foreground"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "animate-pulse bg-primary" : "bg-muted-foreground"}`} />
          {connected ? "bağlı" : "bağlanıyor"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Akış açık. Bir düğüm telemetri gönderdiğinde veya kuyrukta hareket olduğunda olaylar burada belirir.
        </p>
      ) : (
        <ul className="mt-5 max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2 text-xs">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">{i.kind}</span>
              <span className="flex-1 truncate text-muted-foreground">{i.text}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {new Date(i.at).toLocaleTimeString("tr-TR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 3 — Anahtar rotasyonu ve güvenli yenileme. */
export function KeyRotation({
  licenses,
  canManage,
  onRotated,
}: {
  licenses: { id: string; plan: string; license_key: string }[];
  canManage: boolean;
  onRotated: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<
    { id: string; event: string; detail: string | null; created_at: string }[]
  >([]);

  const load = useCallback(async () => {
    try {
      setHistory((await listKeyRotations()) as never);
    } catch {
      /* geçmiş okunamazsa kart yine çalışır */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function rotateLicense(id: string) {
    setBusy(id);
    setError(null);
    try {
      await rotateLicenseKey({ data: { licenseId: id } });
      setMsg("Lisans anahtarı yenilendi. Eski anahtarla bağlanan düğümler reddedilir.");
      onRotated();
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yenilenemedi.");
    } finally {
      setBusy(null);
      setConfirmId(null);
    }
  }

  async function rotateKeys(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await rotateDeviceKeys({ data: { licenseId: id } });
      setMsg(`${res.rotated} düğümün şifreleme anahtarı iptal edildi. QR ile yeniden kaydedin.`);
      onRotated();
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "İptal edilemedi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={box}>
      <Head
        label="Anahtar rotasyonu"
        title="Lisans ve düğüm anahtarlarını güvenle yenileyin"
        hint="Lisans anahtarı yenilenince eski anahtar anında geçersizdir. Düğüm anahtarı rotasyonunda özel anahtar sunucuya hiç gelmez; cihaz yeni çiftini kendisi üretir."
      />

      {!canManage && (
        <p className="mt-4 rounded-sm border border-border px-3 py-2 text-xs text-muted-foreground">
          Rotasyon yalnızca yönetici rolüyle yapılabilir.
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {licenses.map((l) => (
          <li key={l.id} className="rounded-sm border border-border bg-background/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-primary">{l.plan}</span>
              <span className="break-all font-mono text-[11px] text-muted-foreground">
                {l.license_key.slice(0, 8)}…{l.license_key.slice(-6)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {confirmId === l.id ? (
                <>
                  <button onClick={() => rotateLicense(l.id)} disabled={busy === l.id} className={btn}>
                    {busy === l.id ? "Yenileniyor…" : "Evet, yenile"}
                  </button>
                  <button onClick={() => setConfirmId(null)} className={btn}>
                    Vazgeç
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmId(l.id)} disabled={!canManage} className={btn}>
                  Lisans anahtarını yenile
                </button>
              )}
              <button onClick={() => rotateKeys(l.id)} disabled={!canManage || busy === l.id} className={btn}>
                Düğüm anahtarlarını iptal et
              </button>
            </div>
          </li>
        ))}
        {licenses.length === 0 && <p className="text-sm text-muted-foreground">Lisans yok.</p>}
      </ul>

      {msg && <p className="mt-4 text-xs text-primary">{msg}</p>}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {history.length > 0 && (
        <ul className="mt-5 space-y-2">
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 text-xs">
              <span className="font-mono text-[11px]">{h.event}</span>
              <span className="flex-1 truncate text-muted-foreground">{h.detail}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {new Date(h.created_at).toLocaleString("tr-TR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Run = {
  id: string;
  carrier: string;
  terrain: string;
  antenna_height: string;
  sample_count: number;
  model_hop_km: number;
  calibrated_hop_km: number;
  mae_km: number | null;
  bias_km: number | null;
  accuracy_pct: number | null;
  verdict: string;
  created_at: string;
};

/** 4 — Kalibrasyon raporları: CSV ve yazdırılabilir PDF. */
export function CalibrationReports({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Run[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("calibration_runs")
      .select(
        "id, carrier, terrain, antenna_height, sample_count, model_hop_km, calibrated_hop_km, mae_km, bias_km, accuracy_pct, verdict, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as Run[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  function csv() {
    const header =
      "tarih,tasiyici,arazi,anten,olcum,model_km,kalibre_km,mae_km,sapma_km,isabet_pct,karar\n";
    const body = rows
      .map((r) =>
        [
          r.created_at,
          r.carrier,
          r.terrain,
          r.antenna_height,
          r.sample_count,
          r.model_hop_km,
          r.calibrated_hop_km,
          r.mae_km ?? "",
          r.bias_km ?? "",
          r.accuracy_pct ?? "",
          r.verdict,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tedbirge-kalibrasyon-raporu.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function pdf() {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    const esc = (s: unknown) =>
      String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
    const trs = rows
      .map(
        (r) => `<tr>
          <td>${esc(new Date(r.created_at).toLocaleString("tr-TR"))}</td>
          <td>${esc(r.carrier)} / ${esc(r.terrain)} / ${esc(r.antenna_height)}</td>
          <td>${esc(r.sample_count)}</td>
          <td>${esc(r.model_hop_km)}</td>
          <td>${esc(r.calibrated_hop_km)}</td>
          <td>${esc(r.mae_km ?? "—")}</td>
          <td>${esc(r.accuracy_pct ?? 0)}%</td>
          <td>${esc(r.verdict)}</td>
        </tr>`,
      )
      .join("");
    w.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8">
      <title>Tedbirge Protokol — Model Kalibrasyon Raporu</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;margin:32px;color:#111}
        h1{font-size:20px;margin:0 0 4px}
        p.meta{font-size:12px;color:#555;margin:0 0 20px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
        th{background:#f2f2f2;text-transform:uppercase;letter-spacing:.06em;font-size:10px}
        footer{margin-top:24px;font-size:10px;color:#666}
      </style></head><body>
      <h1>Tedbirge Protokol — Model Kalibrasyon Raporu</h1>
      <p class="meta">Üretim: ${esc(new Date().toLocaleString("tr-TR"))} · Kayıt sayısı: ${rows.length} · Yöntem: leave-one-out çapraz doğrulama (gerçek saha ölçümleri)</p>
      <table><thead><tr>
        <th>Tarih</th><th>Taşıyıcı / arazi / anten</th><th>Ölçüm</th><th>Model km</th>
        <th>Kalibre km</th><th>MAE km</th><th>İsabet</th><th>Karar</th>
      </tr></thead><tbody>${trs || '<tr><td colspan="8">Kayıt yok</td></tr>'}</tbody></table>
      <footer>Mehmet DİNÇ — Tedbirge Protokol · Bu rapor gerçek saha ölçümlerinden üretilmiştir.</footer>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className={box}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Head
          label="Kalibrasyon raporu"
          title="Test sonuçlarını CSV veya PDF olarak indirin"
          hint="Rapor yalnızca kaydedilmiş gerçek kalibrasyon koşularından üretilir."
        />
        <div className="flex gap-2">
          <button onClick={csv} disabled={rows.length === 0} className={btn}>
            CSV indir
          </button>
          <button onClick={pdf} disabled={rows.length === 0} className={btn}>
            PDF üret
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Henüz kalibrasyon koşusu yok. “Kalibrasyon” sekmesinden test çalıştırın.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.slice(0, 10).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border px-3 py-2 text-xs">
              <span className="font-mono">
                {r.carrier} · {r.terrain} · {r.antenna_height}
              </span>
              <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("tr-TR")}</span>
              <span className={r.verdict === "gecti" ? "text-primary" : "text-muted-foreground"}>
                {r.accuracy_pct ?? 0}% · {r.verdict}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
