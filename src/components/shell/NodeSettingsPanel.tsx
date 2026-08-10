/**
 * DAHİLİ DÜĞÜM VE SİSTEM AYARLARI (Web-OS)
 * ------------------------------------------------------------------
 * Kurumsal /izinler sayfasının yerine geçen, Dark Cyber temalı yerel
 * ayar paneli. Tüm değerler cihazın kendi çalışma zamanından okunur;
 * hiçbir ölçüm dışarı gönderilmez.
 */

import { useCallback, useEffect, useState } from "react";
import { Bell, Cpu, HardDrive, KeyRound, RefreshCw, Trash2 } from "lucide-react";

import { useNodeRuntime, pingNodePeers } from "@/lib/node-runtime";
import { activeKernelProvider } from "@/kernel/boot";
import { kernelMetrics, onKernelTelemetry } from "@/kernel/telemetry";
import { kernelHealth, onKernelHealth } from "@/kernel/supervisor";
import {
  DB_NAME,
  DB_VERSION,
  countPackets,
  storageInfo,
  requestPersistentStorage,
  listConversations,
  listAllMessages,
  listPeers,
  type StorageEstimateInfo,
} from "@/lib/store/idb";

const PREF_KEY = "tedbirge.ui.prefs";

type Prefs = { sound: boolean; vibrate: boolean; focus: boolean };

function readPrefs(): Prefs {
  if (typeof window === "undefined") return { sound: true, vibrate: true, focus: false };
  try {
    return { sound: true, vibrate: true, focus: false, ...JSON.parse(window.localStorage.getItem(PREF_KEY) ?? "{}") };
  } catch {
    return { sound: true, vibrate: true, focus: false };
  }
}

function bytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-[#090e18] p-3">
      <div className="mb-2 flex items-center gap-2 font-osmono text-[11px] font-bold uppercase tracking-wider text-slate-300">
        <span className="text-cyan-400">{icon}</span>
        {title}
      </div>
      <div className="space-y-1.5 font-osmono text-[11px]">{children}</div>
    </section>
  );
}

function Row({ k, v, tone = "text-slate-200" }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="shrink-0 text-slate-500">{k}</span>
      <span className={`min-w-0 break-all text-right ${tone}`}>{v}</span>
    </div>
  );
}

function Action({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-[11px] font-medium transition-colors ${
        danger
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Toggle({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-left text-[11px] text-slate-300"
    >
      <span>{label}</span>
      <span
        className={`h-4 w-8 shrink-0 rounded-full border transition-colors ${
          on ? "border-emerald-500/50 bg-emerald-500/40" : "border-slate-700 bg-slate-800"
        }`}
      >
        <span
          className={`block h-3.5 w-3.5 rounded-full bg-slate-100 transition-transform ${
            on ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export function NodeSettingsPanel() {
  const node = useNodeRuntime();
  const [, force] = useState(0);
  const [storage, setStorage] = useState<StorageEstimateInfo | null>(null);
  const [queued, setQueued] = useState<number>(0);
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());
  const [notice, setNotice] = useState<string | null>(null);
  const [perm, setPerm] = useState<string>("default");

  useEffect(() => {
    const off = onKernelTelemetry(() => force((n) => n + 1));
    return () => {
      off();
    };
  }, []);
  useEffect(() => {
    const off = onKernelHealth(() => force((n) => n + 1));
    return () => {
      off();
    };
  }, []);


  const refresh = useCallback(() => {
    void storageInfo().then(setStorage);
    void countPackets().then(setQueued);
  }, []);

  useEffect(() => {
    refresh();
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
  }, [refresh]);

  const savePrefs = (next: Prefs) => {
    setPrefs(next);
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  const metrics = kernelMetrics();
  const health = kernelHealth();

  const backup = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      conversations: await listConversations(),
      messages: await listAllMessages(),
      peers: await listPeers(),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `tedbirge-yedek-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Yerel yedek indirildi (cihazınızdan çıkmadı).");
  };

  const wipe = () => {
    if (!window.confirm("Bu cihazdaki tüm yerel veriler silinecek. Devam edilsin mi?")) return;
    try {
      window.indexedDB.deleteDatabase(DB_NAME);
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      /* depo kullanılamıyor */
    }
    window.location.reload();
  };

  return (
    <div className="my-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
      {notice ? (
        <p className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-osmono text-[11px] text-emerald-300">
          {notice}
        </p>
      ) : null}

      <Section icon={<KeyRound className="h-3.5 w-3.5" />} title="P2P düğüm yapılandırması">
        <Row k="DÜĞÜM KİMLİĞİ:" v={node.nodeId || "—"} />
        <Row k="MESH KANALI:" v="tedbirge-signal" />
        <Row
          k="KEŞİF:"
          v={node.discovery === "local" ? "yerel ağ" : node.discovery === "none" ? "kapalı" : node.discovery}
          tone="text-cyan-400"
        />
        <Row k="ANAHTAR PARMAK İZİ:" v={node.fingerprint || "üretiliyor"} />
        <Row k="ŞİFRELEME:" v="AES-256-GCM · X25519 anahtar değişimi" tone="text-emerald-400" />
        <Row k="DOĞRUDAN EŞ:" v={String(node.peers.filter((p) => p.direct).length)} />
        <div className="pt-2">
          <Action label="Eşleri yeniden tara" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => pingNodePeers()} />
        </div>
      </Section>

      <Section icon={<Cpu className="h-3.5 w-3.5" />} title="Çekirdek (Wasm runtime) durumu">
        <Row
          k="ETKİN SAĞLAYICI:"
          v={activeKernelProvider() === "wasm" ? "WebAssembly çekirdek" : "TypeScript çekirdek"}
          tone="text-cyan-400"
        />
        <Row
          k="SAĞLIK:"
          v={health.health}
          tone={health.health === "healthy" ? "text-emerald-400" : "text-amber-400"}
        />
        <Row k="GÖNDERİLEN:" v={String(metrics.sent)} />
        <Row k="BAŞARISIZ:" v={String(metrics.failed)} tone={metrics.failed ? "text-rose-400" : undefined} />
        <Row k="ORT. GÖNDERİM:" v={`${metrics.avgSendMs} ms`} />
        <Row k="SON HATA:" v={metrics.lastError ?? "yok"} />
      </Section>

      <Section icon={<HardDrive className="h-3.5 w-3.5" />} title="Yerel veri ve depolama">
        <Row k="VERİTABANI:" v={`${DB_NAME} · v${DB_VERSION}`} />
        <Row k="KUYRUKTAKİ PAKET:" v={String(queued)} />
        <Row k="KULLANIM:" v={storage ? `${bytes(storage.usage)} / ${bytes(storage.quota)}` : "ölçülüyor"} />
        <Row
          k="KALICI DEPOLAMA:"
          v={storage?.persisted ? "açık" : "kapalı"}
          tone={storage?.persisted ? "text-emerald-400" : "text-amber-400"}
        />
        <div className="flex flex-wrap gap-2 pt-2">
          <Action label="Yedek al" icon={<HardDrive className="h-3.5 w-3.5" />} onClick={() => void backup()} />
          <Action
            label="Kalıcı depolama iste"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() =>
              void requestPersistentStorage().then((ok) => {
                setNotice(ok ? "Kalıcı depolama açıldı." : "Tarayıcı kalıcı depolamayı reddetti.");
                refresh();
              })
            }
          />
          <Action label="Yerel veriyi temizle" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={wipe} danger />
        </div>
      </Section>

      <Section icon={<Bell className="h-3.5 w-3.5" />} title="Arayüz ve bildirim tercihleri">
        <Row k="BİLDİRİM İZNİ:" v={perm} tone={perm === "granted" ? "text-emerald-400" : "text-amber-400"} />
        {perm !== "granted" ? (
          <div className="pb-1 pt-1">
            <Action
              label="Bildirimlere izin ver"
              icon={<Bell className="h-3.5 w-3.5" />}
              onClick={() => void Notification.requestPermission().then(setPerm)}
            />
          </div>
        ) : null}
        <Toggle label="Arama ve mesaj sesi" on={prefs.sound} onToggle={() => savePrefs({ ...prefs, sound: !prefs.sound })} />
        <Toggle label="Titreşim" on={prefs.vibrate} onToggle={() => savePrefs({ ...prefs, vibrate: !prefs.vibrate })} />
        <Toggle label="Yoğun mod (sessiz)" on={prefs.focus} onToggle={() => savePrefs({ ...prefs, focus: !prefs.focus })} />
      </Section>
    </div>
  );
}
