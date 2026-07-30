import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { describeNode, startNode, stopNode, useNodeRuntime } from "@/lib/node-runtime";

const FALLBACK_ORIGIN = "https://tedbirge-gateway.lovable.app";
const FREE_NODE_QUOTA = 5;
const SEEN_KEY = "tedbirge.easy.seen-nodes";

/** Arka planda tutulan ücretsiz düğüm defteri (kullanıcıya sadece "2 / 5" olarak görünür). */
function useNodeQuota(selfId: string, peerIds: string[]) {
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SEEN_KEY);
      setSeen(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setSeen([]);
    }
  }, []);

  useEffect(() => {
    const next = Array.from(new Set([...seen, ...(selfId ? [selfId] : []), ...peerIds])).slice(
      0,
      FREE_NODE_QUOTA,
    );
    if (next.length !== seen.length) {
      setSeen(next);
      try {
        window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
    }
  }, [selfId, peerIds.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { used: seen.length, limit: FREE_NODE_QUOTA };
}

function Light({ ok, warn, label, value }: { ok: boolean; warn?: boolean; label: string; value: string }) {
  const tone = ok ? "bg-primary" : warn ? "bg-amber-400" : "bg-destructive";
  return (
    <div className="flex items-center gap-3 rounded-sm border border-border bg-card/50 px-4 py-3">
      <span className={`h-3 w-3 shrink-0 rounded-full ${tone} ${ok ? "animate-pulse" : ""}`} aria-hidden />
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

/**
 * Geleneksel modem/SaaS paneli hissi veren basit konsol.
 * Arka plandaki kriptografi, imza ve mesh el sıkışmaları gizlidir;
 * kullanıcı yalnızca 3 adım ve ışıkları görür.
 */
export function EasyConsole({ compact = false }: { compact?: boolean }) {
  const state = useNodeRuntime();
  const status = describeNode(state);
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const joinLink = `${origin}/katil`;

  useEffect(() => {
    QRCode.toDataURL(joinLink, { width: 420, margin: 1, color: { dark: "#e8ecff", light: "#00000000" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [joinLink]);

  const peerIds = useMemo(() => state.peers.map((p) => p.nodeId), [state.peers]);
  const quota = useNodeQuota(state.nodeId, peerIds);

  const step = !state.running ? 1 : status.directPeers === 0 ? 2 : 3;

  async function toggle() {
    setBusy(true);
    try {
      if (state.running) stopNode();
      else await startNode();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* kullanıcı elle kopyalar */
    }
  }

  return (
    <div className="rounded-sm border border-border bg-card/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Kurulum sihirbazı</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Ağınızı 3 adımda kurun</h2>
        </div>
        <span className="rounded-sm border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Adım {step} / 3
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Light
          ok={state.running && state.online}
          warn={state.running && !state.online}
          label="Ağ durumu"
          value={state.running ? (state.online ? "Güvenli ve aktif" : "Çevrimdışı · kuyrukta") : "Kapalı"}
        />
        <Light
          ok={quota.used > 1}
          warn={quota.used === 1}
          label="Bağlı düğüm"
          value={`${quota.used} / ${quota.limit} (ücretsiz hak)`}
        />
        <Light
          ok={status.directPeers > 0}
          warn={state.running && status.directPeers === 0}
          label="Bağlantı"
          value={status.text}
        />
      </div>

      <ol className="mt-6 space-y-3">
        <WizardStep
          n={1}
          done={state.running}
          active={step === 1}
          title="Bu cihazı ağa katın"
          body="Tek tıkla çalışır. Anahtar üretimi, imza ve şifreli el sıkışma arka planda otomatik yapılır."
          action={
            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className="rounded-sm bg-primary px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {state.running ? "Ağı durdur" : "Ağı başlat"}
            </button>
          }
        />
        <WizardStep
          n={2}
          done={status.directPeers > 0}
          active={step === 2}
          title="Yeni düğüm ekleyin"
          body="Karşı cihazda bu bağlantıyı açmak yeterli; kayıt, ödeme ya da kod yok."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copy}
                className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-foreground hover:border-primary/60"
              >
                {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Tedbirge güvenli ağa katıl: ${joinLink}`)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-foreground hover:border-primary/60"
              >
                WhatsApp ile gönder
              </a>
            </div>
          }
        />
        <WizardStep
          n={3}
          done={step === 3}
          active={step === 3}
          title="Bağlantıları görün"
          body="Ağ profili, kapsama planı ve ayrıntılı izleme panelden yönetilir."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/panel"
                className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-foreground hover:border-primary/60"
              >
                Bağlantıları gör
              </Link>
              <Link
                to="/kapsama"
                className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-foreground hover:border-primary/60"
              >
                Ağ profili
              </Link>
            </div>
          }
        />
      </ol>

      {!compact && (
        <div className="mt-6 grid gap-6 border-t border-border/60 pt-6 md:grid-cols-[auto_1fr]">
          <div className="rounded-sm border border-border bg-background/60 p-4">
            {qr ? (
              <img src={qr} alt="Tedbirge güvenli ağa katılma QR kodu" className="h-40 w-40" />
            ) : (
              <div className="h-40 w-40 animate-pulse rounded-sm bg-muted" aria-hidden />
            )}
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Yakındaki cihazlar için
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Telefon kamerasıyla okutan herkes “Ağa Hoş Geldiniz” ekranına düşer ve tek dokunuşla
              zincire katılır. Ücretsiz hak dolduğunda yükseltme adımı otomatik önerilir.
            </p>
            <p className="mt-3 break-all font-mono text-xs text-foreground">{joinLink}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function WizardStep({
  n,
  title,
  body,
  action,
  done,
  active,
}: {
  n: number;
  title: string;
  body: string;
  action: React.ReactNode;
  done: boolean;
  active: boolean;
}) {
  return (
    <li
      className={`rounded-sm border p-4 transition-colors ${
        active ? "border-primary/50 bg-primary/5" : "border-border bg-background/40"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs ${
              done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {done ? "✓" : n}
          </span>
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        </div>
        <div>{action}</div>
      </div>
    </li>
  );
}
