import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  describeNode,
  pingNodePeers,
  startNode,
  stopNode,
  useNodeRuntime,
} from "@/lib/node-runtime";

const PROFILE_KEY = "tedbirge.network.profile";

export type NetworkTab = "peers" | "profile" | "add" | "alerts";

type Profile = { name: string; mode: "ev" | "isyeri" | "saha"; autoStart: boolean };

const DEFAULT_PROFILE: Profile = { name: "Ağım", mode: "ev", autoStart: true };

function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile({ ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) });
    } catch {
      /* private mode */
    }
  }, []);
  function save(next: Profile) {
    setProfile(next);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }
  return { profile, save };
}

type AlertItem = { id: string; at: number; tone: "ok" | "warn" | "bad"; text: string };

/** Bağlantı/çevrimiçilik değişimlerini güvenli durum bildirimi olarak biriktirir. */
function useStatusAlerts() {
  const state = useNodeRuntime();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const prev = useRef<{ running: boolean; online: boolean; peers: number } | null>(null);

  const peers = state.peers.filter((p) => p.direct).length;

  useEffect(() => {
    const now = { running: state.running, online: state.online, peers };
    const before = prev.current;
    prev.current = now;
    if (!before) return;
    const push = (tone: AlertItem["tone"], text: string) =>
      setAlerts((a) =>
        [{ id: `${Date.now()}-${text}`, at: Date.now(), tone, text }, ...a].slice(0, 30),
      );

    if (before.running !== now.running)
      push(
        now.running ? "ok" : "warn",
        now.running ? "Ağ başlatıldı · şifreli oturum açıldı" : "Ağ durduruldu",
      );
    if (before.online !== now.online)
      push(
        now.online ? "ok" : "bad",
        now.online
          ? "Bağlantı geri geldi · kuyruk boşaltılıyor"
          : "Çevrimdışı · mesajlar kuyruğa alınıyor",
      );
    if (before.peers !== now.peers)
      push(now.peers > before.peers ? "ok" : "warn", `Bağlı eş sayısı: ${now.peers}`);
  }, [state.running, state.online, peers]);

  return alerts;
}

export function NetworkModal({
  open,
  onOpenChange,
  tab = "peers",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tab?: NetworkTab;
}) {
  const state = useNodeRuntime();
  const status = describeNode(state);
  const { profile, save } = useProfile();
  const alerts = useStatusAlerts();
  const [active, setActive] = useState<NetworkTab>(tab);
  const [origin, setOrigin] = useState("https://tedbirge-gateway.lovable.app");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setActive(tab), [tab, open]);
  useEffect(() => setOrigin(window.location.origin), []);

  const joinLink = `${origin}/katil`;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(joinLink, {
      width: 420,
      margin: 1,
      color: { dark: "#e8ecff", light: "#00000000" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [joinLink, open]);

  useEffect(() => {
    if (open) pingNodePeers();
  }, [open]);

  const lastSeen = useMemo(
    () =>
      state.lastHeartbeatAt ? new Date(state.lastHeartbeatAt).toLocaleTimeString("tr-TR") : "—",
    [state.lastHeartbeatAt],
  );

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
      /* elle kopyalanır */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Ağ yönetimi</DialogTitle>
          <DialogDescription>
            {status.text} · kuyrukta {status.queued} mesaj · son sinyal {lastSeen}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={active} onValueChange={(v) => setActive(v as NetworkTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="peers">Bağlantılar</TabsTrigger>
            <TabsTrigger value="profile">Ağ profili</TabsTrigger>
            <TabsTrigger value="add">Düğüm ekle</TabsTrigger>
            <TabsTrigger value="alerts">Bildirimler</TabsTrigger>
          </TabsList>

          <TabsContent value="peers" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-card/50 px-4 py-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  Bu cihaz
                </p>
                <p className="break-all text-sm text-foreground">{state.nodeId || "—"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => pingNodePeers()}
                  className="rounded-sm border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:border-primary/60"
                >
                  Yenile
                </button>
                <button
                  type="button"
                  onClick={toggle}
                  disabled={busy}
                  className="rounded-sm bg-primary px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50"
                >
                  {state.running ? "Durdur" : "Başlat"}
                </button>
              </div>
            </div>

            {state.peers.length === 0 ? (
              <p className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
                Henüz bağlı eş yok. “Düğüm ekle” sekmesinden bağlantıyı paylaşın; karşı cihaz
                açtığında burada anında listelenir.
              </p>
            ) : (
              <ul className="space-y-2">
                {state.peers.map((p) => (
                  <li
                    key={p.nodeId}
                    className="flex items-center justify-between gap-3 rounded-sm border border-border bg-background/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{p.nodeId}</p>
                      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                        {p.direct ? "Doğrudan şifreli bağlantı" : "Röle üzerinden"} · {p.state}
                      </p>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.direct ? "bg-primary" : "bg-amber-400"}`}
                      aria-hidden
                    />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Ağ adı
              </span>
              <input
                value={profile.name}
                onChange={(e) => save({ ...profile, name: e.target.value })}
                className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </label>
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Kullanım profili
              </span>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(["ev", "isyeri", "saha"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => save({ ...profile, mode: m })}
                    className={`rounded-sm border px-3 py-2 text-sm capitalize ${
                      profile.mode === m
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {m === "isyeri" ? "İş yeri" : m === "ev" ? "Ev" : "Saha"}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-sm border border-border px-4 py-3">
              <input
                type="checkbox"
                checked={profile.autoStart}
                onChange={(e) => save({ ...profile, autoStart: e.target.checked })}
              />
              <span className="text-sm text-muted-foreground">
                Cihaz açıldığında ağa otomatik katıl (anahtarlar cihazda kalır)
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              Profil bu cihazda saklanır; kimlik ve anahtar üretimi arka planda otomatik yürür.
            </p>
          </TabsContent>

          <TabsContent value="add" className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="rounded-sm border border-border bg-background/60 p-4">
              {qr ? (
                <img src={qr} alt="Tedbirge güvenli ağa katılma QR kodu" className="h-40 w-40" />
              ) : (
                <div className="h-40 w-40 animate-pulse rounded-sm bg-muted" aria-hidden />
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Karşı cihazda bu bağlantıyı açmak yeterli. Kayıt, ödeme veya kod yok; zincir
                otomatik büyür.
              </p>
              <p className="break-all font-mono text-xs text-foreground">{joinLink}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] hover:border-primary/60"
                >
                  {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Tedbirge güvenli ağa katıl: ${joinLink}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] hover:border-primary/60"
                >
                  WhatsApp ile gönder
                </a>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4 space-y-2">
            {alerts.length === 0 ? (
              <p className="rounded-sm border border-dashed border-border p-4 text-sm text-muted-foreground">
                Henüz bildirim yok. Ağ durumu değiştiğinde (bağlantı kopması, yeni eş, kuyruk
                boşalması) burada anında görünür.
              </p>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-sm border border-border bg-background/40 px-4 py-3"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      a.tone === "ok"
                        ? "bg-primary"
                        : a.tone === "warn"
                          ? "bg-amber-400"
                          : "bg-destructive"
                    }`}
                    aria-hidden
                  />
                  <p className="text-sm text-foreground">{a.text}</p>
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                    {new Date(a.at).toLocaleTimeString("tr-TR")}
                  </span>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
