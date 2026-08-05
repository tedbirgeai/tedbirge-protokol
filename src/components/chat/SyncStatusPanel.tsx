/**
 * EŞİTLEME DURUMU
 * ------------------------------------------------------------------
 * Cihazlar arası şifreli sohbet eşitlemesinin sağlık ekranı: son
 * eşitleme zamanı, bulut oturumu, kasa boyutu, son hata ve elle
 * "Şimdi eşitle" düğmesi. Hata varsa sohbet listesinin üstünde uyarı
 * şeridi gösterilir.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, CloudOff, Cloud, RotateCcw } from "lucide-react";
import {
  formatBytes,
  fullResync,
  getSyncState,
  onSyncStateChange,
  syncNow,
  syncStatusLabel,
  type SyncState,
} from "@/lib/chat/history-sync";
import { getSyncLog, onSyncLogChange, type SyncLogEntry } from "@/lib/chat/sync-log";
import { pressFeedback } from "@/lib/chat/sounds";

function useSyncState(): SyncState {
  const [snap, setSnap] = useState<SyncState>(() => getSyncState());
  useEffect(() => {
    const update = () => setSnap({ ...getSyncState() });
    update();
    return onSyncStateChange(update);
  }, []);
  return snap;
}

function useSyncLog(): SyncLogEntry[] {
  const [rows, setRows] = useState<SyncLogEntry[]>([]);
  useEffect(() => {
    const update = () => setRows([...getSyncLog()]);
    update();
    return onSyncLogChange(update);
  }, []);
  return rows;
}

const LEVEL_COLOR: Record<SyncLogEntry["level"], string> = {
  bilgi: "var(--wa-muted)",
  uyarı: "#b45309",
  hata: "#b91c1c",
};

/** Ayarlar > Eşitleme sekmesi içeriği. */
export function SyncStatusSection() {
  const s = useSyncState();
  const log = useSyncLog();
  return (
    <section className="mt-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {s.cloudSession ? (
          <Cloud className="h-4 w-4" aria-hidden />
        ) : (
          <CloudOff className="h-4 w-4" aria-hidden />
        )}
        Eşitleme durumu
      </h3>
      <p className="mt-1 text-xs" style={{ color: "var(--wa-muted)" }}>
        Sohbetleriniz, mesajlarınız, okundu bilgisi ve arama geçmişiniz cihazınızda şifrelenir ve
        yalnızca şifreli hâliyle hesabınıza yedeklenir. Aynı numarayla girdiğiniz her cihazda
        kendiliğinden görünür.
      </p>

      <dl className="mt-3 space-y-2 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: "var(--wa-muted)" }}>Son eşitleme</dt>
          <dd className="font-medium">
            {s.lastOkAt ? new Date(s.lastOkAt).toLocaleString("tr-TR") : "Henüz yok"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: "var(--wa-muted)" }}>Bulut oturumu</dt>
          <dd className="font-medium">{s.cloudSession ? "Bağlı" : "Yok"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt style={{ color: "var(--wa-muted)" }}>Kasa boyutu</dt>
          <dd className="font-medium">
            {formatBytes(s.bytes)} · {s.chunks} paket
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt style={{ color: "var(--wa-muted)" }}>Son hata</dt>
          <dd className={`max-w-[60%] text-right font-medium ${s.lastError ? "text-destructive" : ""}`}>
            {s.lastError || "Yok"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            void syncNow();
          }}
          disabled={s.running}
          className="wa-press inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-[14px] font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--wa-accent)" }}
        >
          <RefreshCw className={`h-4 w-4 ${s.running ? "animate-spin" : ""}`} aria-hidden />
          {s.running ? "Eşitleniyor…" : "Şimdi eşitle"}
        </button>
        <button
          type="button"
          onClick={() => {
            pressFeedback();
            void fullResync();
          }}
          disabled={s.running}
          className="wa-press inline-flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-[14px] font-semibold disabled:opacity-60"
          style={{ border: "1px solid var(--wa-line, currentColor)" }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Tam yeniden eşitle
        </button>
      </div>

      <p className="mt-3 text-[11px]" style={{ color: "var(--wa-muted)" }}>
        {syncStatusLabel(s)}
      </p>

      <HealthSection />

      <h4 className="mt-5 text-[13px] font-semibold">Eşitleme günlüğü (son 20 olay)</h4>

      <ul className="mt-2 space-y-1 text-[12px]">
        {log.length === 0 && (
          <li style={{ color: "var(--wa-muted)" }}>Henüz kayıt yok.</li>
        )}
        {log.map((e) => (
          <li key={`${e.at}-${e.step}-${e.detail}`} className="flex gap-2">
            <span className="shrink-0 tabular-nums" style={{ color: "var(--wa-muted)" }}>
              {new Date(e.at).toLocaleTimeString("tr-TR")}
            </span>
            <span className="min-w-0 flex-1" style={{ color: LEVEL_COLOR[e.level] }}>
              <strong className="font-medium">{e.step}</strong>
              {e.detail ? ` — ${e.detail}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Sohbet listesinin üstünde görünen hata şeridi. */
export function SyncWarningBar() {
  const s = useSyncState();
  if (!s.lastError) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-destructive/10 px-3 py-2 text-[12px] text-destructive"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">Eşitleme hatası: {s.lastError}</span>
      <button
        type="button"
        onClick={() => {
          pressFeedback();
          void syncNow();
        }}
        className="wa-press shrink-0 rounded-lg px-2 py-1 font-semibold"
        style={{ border: "1px solid currentColor" }}
      >
        Yeniden dene
      </button>
    </div>
  );
}
