import { useEffect, useMemo, useState } from "react";
import {
  connectGnss,
  connectModbus,
  connectVeDirect,
  disconnectEnergySource,
  mergedReading,
  refreshEnergySupport,
  setEnergyLicense,
  useEnergyBridge,
} from "@/lib/energy/bridge";
import { MODBUS_PROFILES, GNSS_QUALITY_LABEL } from "@/lib/energy/protocol";
import {
  DEFAULT_DESIGN,
  computeBudget,
  energyAlarms,
  estimateRuntimeH,
  suggestedNodeRole,
  type SiteDesign,
} from "@/lib/energy/budget";

const box = "rounded-sm border border-border bg-card/60 p-5";
const label = "font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground";
const input =
  "w-full rounded-sm border border-border bg-background/70 px-3 py-2 font-mono text-[13px] outline-none focus:border-primary";
const btn =
  "rounded-sm border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50";
const btnPrimary =
  "rounded-sm bg-primary px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50";

const ROLE_TEXT = { role: "Röle", uc: "Uç düğüm", uyku: "Tasarruf kipi" } as const;

/**
 * Enerji & saha donanımı katmanı (12).
 * Sol taraf: gerçek donanım köprüsü (VE.Direct / Modbus / GNSS).
 * Sağ taraf: enerji bütçesi ve otonomi hesabı — donanım olmadan da çalışır.
 */
export function PanelEnergy({ licenseKey }: { licenseKey?: string }) {
  const { sources, supported } = useEnergyBridge();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [design, setDesign] = useState<SiteDesign>(DEFAULT_DESIGN);
  const [profileId, setProfileId] = useState(MODBUS_PROFILES[0].id);

  useEffect(() => {
    refreshEnergySupport();
  }, []);
  useEffect(() => {
    setEnergyLicense(licenseKey);
  }, [licenseKey]);

  const list = Object.values(sources);
  const reading = useMemo(() => mergedReading(sources), [sources]);
  const budget = useMemo(() => computeBudget(design), [design]);
  const alarms = reading ? energyAlarms(reading, design) : [];
  const runtimeH = reading ? estimateRuntimeH(reading, design) : null;
  const role = suggestedNodeRole(reading?.soc);
  const gnss = list.find((s) => s.kind === "gnss")?.fix ?? null;

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      const text = e instanceof Error ? e.message : "Bağlantı kurulamadı.";
      setMsg(text.includes("No port selected") ? "Cihaz seçilmedi." : text);
    } finally {
      setBusy(null);
    }
  };

  const setNum = (key: keyof SiteDesign) => (v: string) =>
    setDesign((d) => ({ ...d, [key]: Number(v) || 0 }) as SiteDesign);

  return (
    <div className="space-y-6">
      <div className={box}>
        <p className={label}>Katman 12 · Enerji ve saha donanımı</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Saha enerji köprüsü</h2>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Sahadaki güneş şarj kontrolcüsü, hibrit invertör/akü paketi ve konum alıcısı USB
          üzerinden doğrudan tarayıcıya bağlanır. Köprü <strong className="text-foreground">yalnızca
          okur</strong>; hiçbir cihaza komut yazılmaz. Donanım yoksa hiçbir değer üretilmez.
        </p>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          Web Serial: {supported.serial ? "destekleniyor" : "bu tarayıcıda yok (Chrome/Edge masaüstü)"} ·{" "}
          {list.length} kaynak bağlı
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            className={btnPrimary}
            disabled={!supported.serial || busy !== null || Boolean(sources["vedirect"])}
            onClick={() => run("vedirect", connectVeDirect)}
          >
            {sources["vedirect"] ? "Victron bağlı" : "Victron VE.Direct bağla"}
          </button>

          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="rounded-sm border border-border bg-background/70 px-3 py-2 font-mono text-[11px]"
          >
            {MODBUS_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            className={btn}
            disabled={!supported.serial || busy !== null || Boolean(sources[`modbus:${profileId}`])}
            onClick={() => run("modbus", () => connectModbus(profileId))}
          >
            Modbus bağla
          </button>

          <button
            className={btn}
            disabled={!supported.serial || busy !== null || Boolean(sources["gnss"])}
            onClick={() => run("gnss", () => connectGnss())}
          >
            {sources["gnss"] ? "GNSS bağlı" : "GNSS / RTK bağla"}
          </button>
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          {MODBUS_PROFILES.find((p) => p.id === profileId)?.hint}
        </p>
        {msg && <p className="mt-3 text-xs text-destructive">{msg}</p>}
      </div>

      {list.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((s) => (
            <div key={s.id} className={box}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={label}>{s.kind === "gnss" ? "Konum" : "Enerji"}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{s.name}</p>
                </div>
                <button className={btn} onClick={() => void disconnectEnergySource(s.id)}>
                  Ayır
                </button>
              </div>
              <div className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
                <Row k="Kare" v={String(s.frames)} />
                <Row k="Panele yazım" v={String(s.uploaded)} />
                <Row k="Son veri" v={s.lastFrameAt ? new Date(s.lastFrameAt).toLocaleTimeString("tr-TR") : "—"} />
                {s.lastLine && <Row k="Son satır" v={s.lastLine} />}
              </div>
              {s.error && <p className="mt-2 text-xs text-destructive">{s.error}</p>}
            </div>
          ))}
        </div>
      )}

      {reading && (
        <div className={box}>
          <p className={label}>Canlı ölçüm</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric k="Akü doluluk" v={reading.soc !== undefined ? `%${reading.soc}` : "—"} />
            <Metric k="Akü gerilimi" v={reading.batteryV !== undefined ? `${reading.batteryV} V` : "—"} />
            <Metric k="Panel gücü" v={reading.pvW !== undefined ? `${reading.pvW} W` : "—"} />
            <Metric k="Yük" v={reading.loadW !== undefined ? `${reading.loadW} W` : "—"} />
            <Metric k="Akım" v={reading.batteryA !== undefined ? `${reading.batteryA} A` : "—"} />
            <Metric k="Sıcaklık" v={reading.tempC !== undefined ? `${reading.tempC} °C` : "—"} />
            <Metric k="Kalan çalışma" v={runtimeH !== null ? `${runtimeH} sa` : "şarjda / hesaplanamıyor"} />
            <Metric k="Önerilen rol" v={`${ROLE_TEXT[role.role]}`} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{role.reason}</p>

          {alarms.length > 0 && (
            <ul className="mt-4 space-y-2">
              {alarms.map((a) => (
                <li
                  key={a.text}
                  className={`rounded-sm border px-3 py-2 text-xs ${
                    a.level === "kritik"
                      ? "border-destructive/50 text-destructive"
                      : a.level === "uyari"
                        ? "border-primary/50 text-foreground"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  <span className="font-mono uppercase tracking-[0.15em]">{a.level}</span> · {a.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {gnss && (
        <div className={box}>
          <p className={label}>Konum sabitlemesi</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric k="Enlem" v={gnss.lat.toFixed(6)} />
            <Metric k="Boylam" v={gnss.lon.toFixed(6)} />
            <Metric k="Rakım" v={gnss.altM !== undefined ? `${gnss.altM} m` : "—"} />
            <Metric k="Kalite" v={GNSS_QUALITY_LABEL[gnss.quality ?? 0] ?? "—"} />
            <Metric k="Uydu" v={gnss.sats !== undefined ? String(gnss.sats) : "—"} />
            <Metric k="HDOP" v={gnss.hdop !== undefined ? String(gnss.hdop) : "—"} />
          </div>
        </div>
      )}

      <div className={box}>
        <p className={label}>Enerji bütçesi ve otonomi</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Saha kurulumundan önce panel, akü ve yükleri girin; sistemin güneşsiz kaç gün ayakta
          kalacağını ve eksik kapasiteyi hesaplar.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field k="Panel gücü (Wp)" v={design.panelWp} on={setNum("panelWp")} />
          <Field k="Günlük güneşlenme (sa)" v={design.sunHours} on={setNum("sunHours")} step="0.1" />
          <Field k="Akü gerilimi (V)" v={design.batteryV} on={setNum("batteryV")} step="0.1" />
          <Field k="Akü kapasitesi (Ah)" v={design.batteryAh} on={setNum("batteryAh")} />
          <Field k="Deşarj derinliği (%)" v={design.dodPct} on={setNum("dodPct")} />
          <Field k="Sistem verimi (%)" v={design.efficiencyPct} on={setNum("efficiencyPct")} />
        </div>

        <p className={`${label} mt-6`}>Yükler</p>
        <div className="mt-2 space-y-2">
          {design.loads.map((l, i) => (
            <div key={l.id} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-4">
              <span className="text-xs text-foreground">{l.label}</span>
              <input
                className={input}
                type="number"
                value={l.watts}
                aria-label={`${l.label} gücü (W)`}
                onChange={(e) =>
                  setDesign((d) => {
                    const loads = [...d.loads];
                    loads[i] = { ...loads[i], watts: Number(e.target.value) || 0 };
                    return { ...d, loads };
                  })
                }
              />
              <input
                className={input}
                type="number"
                value={l.hours}
                aria-label={`${l.label} günlük süre (saat)`}
                onChange={(e) =>
                  setDesign((d) => {
                    const loads = [...d.loads];
                    loads[i] = { ...loads[i], hours: Number(e.target.value) || 0 };
                    return { ...d, loads };
                  })
                }
              />
              <label className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(l.critical)}
                  onChange={(e) =>
                    setDesign((d) => {
                      const loads = [...d.loads];
                      loads[i] = { ...loads[i], critical: e.target.checked };
                      return { ...d, loads };
                    })
                  }
                />
                kritik yük
              </label>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric k="Günlük tüketim" v={`${budget.dailyLoadWh} Wh`} />
          <Metric k="Günlük üretim" v={`${budget.dailyHarvestWh} Wh`} />
          <Metric k="Net denge" v={`${budget.netWh} Wh`} />
          <Metric k="Kullanılabilir akü" v={`${budget.usableWh} Wh`} />
          <Metric k="Otonomi" v={`${budget.autonomyDays} gün`} />
          <Metric k="Kritik yük otonomisi" v={`${budget.criticalAutonomyDays} gün`} />
          <Metric k="Gereken panel" v={`${budget.requiredPanelWp} Wp`} />
          <Metric k="3 gün için akü" v={`${budget.requiredBatteryAh} Ah`} />
        </div>

        <p
          className={`mt-4 font-mono text-[11px] uppercase tracking-[0.18em] ${
            budget.verdict === "yeterli"
              ? "text-primary"
              : budget.verdict === "sinirda"
                ? "text-foreground"
                : "text-destructive"
          }`}
        >
          Sonuç: {budget.verdict}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {budget.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{k}</span>
      <span className="max-w-[65%] truncate text-right text-foreground">{v}</span>
    </div>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/40 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{k}</p>
      <p className="mt-1 font-mono text-sm text-foreground">{v}</p>
    </div>
  );
}

function Field({
  k,
  v,
  on,
  step,
}: {
  k: string;
  v: number;
  on: (value: string) => void;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{k}</span>
      <input
        className={`${input} mt-1`}
        type="number"
        step={step}
        value={v}
        onChange={(e) => on(e.target.value)}
      />
    </label>
  );
}
