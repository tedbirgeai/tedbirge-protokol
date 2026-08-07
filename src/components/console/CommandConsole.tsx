import { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Boxes,
  BrainCircuit,
  ChevronRight,
  CircleDot,
  Command,
  Cpu,
  Filter,
  Gauge,
  KeyRound,
  Layers,
  Lock,
  Mic,
  Paperclip,
  Plus,
  Radio,
  Radar,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Signal,
  Sparkles,
  Waves,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACTIVE_TUNNELS,
  AI_INSIGHTS,
  CHANNELS,
  HEALTH_METRICS,
  MESSAGES,
  NETWORK_NODES,
  type Channel,
  type ChannelState,
  type ConsoleMessage,
  type NodeStatus,
} from "@/lib/console-data";

/* ------------------------------------------------------------------ */
/* Küçük yardımcı sunum bileşenleri                                    */
/* ------------------------------------------------------------------ */

const STATE_META: Record<ChannelState, { label: string; dot: string; text: string; ring: string }> = {
  aktif: { label: "Aktif", dot: "bg-primary", text: "text-primary", ring: "shadow-[0_0_8px_0] shadow-primary/70" },
  senkronize: { label: "Senkronize", dot: "bg-accent", text: "text-accent", ring: "shadow-[0_0_8px_0] shadow-accent/60" },
  mesh: { label: "Mesh Bağlı", dot: "bg-chart-4", text: "text-chart-4", ring: "shadow-[0_0_8px_0] shadow-chart-4/60" },
};

const NODE_META: Record<NodeStatus, { label: string; dot: string; text: string }> = {
  online: { label: "Çevrimiçi", dot: "bg-primary", text: "text-primary" },
  degraded: { label: "Zayıf", dot: "bg-chart-4", text: "text-chart-4" },
  offline: { label: "Çevrimdışı", dot: "bg-destructive", text: "text-muted-foreground" },
};

function GlassPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/70 bg-card/40 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function StateBadge({ state }: { state: ChannelState }) {
  const meta = STATE_META[state];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">
      <span className={cn("size-1.5 rounded-full", meta.dot, meta.ring)} aria-hidden />
      <span className={meta.text}>{meta.label}</span>
    </span>
  );
}

function StatChip({ icon: Icon, label, value }: { icon: typeof Signal; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/30 px-2.5 py-1.5">
      <Icon className="size-3.5 text-primary" aria-hidden />
      <div className="leading-tight">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SOL SÜTUN — Navigasyon & Ağ Durumu                                  */
/* ------------------------------------------------------------------ */

function LeftRail() {
  const online = NETWORK_NODES.filter((n) => n.status === "online").length;
  return (
    <aside className="flex w-full flex-col gap-4 overflow-y-auto p-4">
      {/* Marka + geri dönüş */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          Çıkış
        </Link>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
          <CircleDot className="size-3 animate-pulse" aria-hidden /> Canlı
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="grid size-10 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-[0_0_16px_-4px] shadow-primary/50">
          <Command className="size-5" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-foreground">Komuta Konsolu</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Tedbirge Protocol</p>
        </div>
      </div>

      {/* Ağ sağlığı göstergeleri */}
      <GlassPanel className="p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Ağ Sağlığı</p>
          <Gauge className="size-3.5 text-primary" aria-hidden />
        </div>
        <div className="space-y-3">
          {HEALTH_METRICS.map((m) => (
            <div key={m.id}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{m.label}</span>
                <span className="font-mono text-[11px] font-semibold text-foreground">
                  {m.value}
                  {m.unit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary shadow-[0_0_10px_0] shadow-primary/50"
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Protokol düğümleri */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Protokol Düğümleri</p>
          <span className="font-mono text-[10px] text-primary">{online}/{NETWORK_NODES.length}</span>
        </div>
        <div className="space-y-1.5">
          {NETWORK_NODES.map((n) => {
            const meta = NODE_META[n.status];
            return (
              <button
                key={n.id}
                type="button"
                className="group flex w-full items-center gap-3 rounded-lg border border-transparent bg-background/20 px-2.5 py-2 text-left transition-colors hover:border-border/60 hover:bg-background/40"
              >
                <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} aria-hidden />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs font-medium text-foreground">{n.label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{n.code} · {n.layer}</p>
                </div>
                <div className="shrink-0 text-right leading-tight">
                  <p className="font-mono text-[10px] text-foreground">{n.status === "offline" ? "—" : `${n.latencyMs}ms`}</p>
                  <p className="font-mono text-[9px] text-muted-foreground">{n.peers} eş</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aktif tüneller */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Aktif Tüneller</p>
          <Radio className="size-3.5 text-primary" aria-hidden />
        </div>
        <div className="space-y-1.5">
          {ACTIVE_TUNNELS.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/20 px-2.5 py-2">
              <Lock className="size-3 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] text-foreground">
                  {t.from} <ChevronRight className="inline size-3 text-muted-foreground" aria-hidden /> {t.to}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{t.carrier} · {t.hops} atlama</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-semibold text-primary">{t.throughput}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sistem simgeleri */}
      <div className="mt-auto flex items-center justify-around rounded-xl border border-border/60 bg-background/30 p-2">
        {[Wifi, Waves, Radar, Cpu, Shield].map((Icon, i) => (
          <button
            key={i}
            type="button"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Icon className="size-4" aria-hidden />
          </button>
        ))}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* ORTA SÜTUN — Akıllı Sohbet & Protokol Akışı                         */
/* ------------------------------------------------------------------ */

const FILTERS: { id: "all" | ChannelState; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "aktif", label: "Aktif" },
  { id: "senkronize", label: "Senkronize" },
  { id: "mesh", label: "Mesh" },
];

function ChannelColumn({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ChannelState>("all");

  const list = useMemo(() => {
    return CHANNELS.filter((c) => {
      const matchesFilter = filter === "all" || c.state === filter;
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [query, filter]);

  return (
    <div className="flex h-full flex-col border-x border-border/60">
      {/* Başlık + arama */}
      <div className="border-b border-border/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Protokol Akışı</h2>
          </div>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            aria-label="Yeni kanal"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kanal, düğüm veya etiket ara…"
            className="w-full rounded-lg border border-border/60 bg-background/40 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Akıllı filtre */}
        <div className="mt-3 flex items-center gap-1.5">
          <Filter className="size-3.5 text-muted-foreground" aria-hidden />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                filter === f.id
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/60 bg-background/30 text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kanal listesi */}
      <div className="flex-1 overflow-y-auto p-2">
        {list.length === 0 && (
          <p className="px-3 py-8 text-center font-mono text-[11px] text-muted-foreground">Eşleşen kanal yok.</p>
        )}
        <div className="space-y-1">
          {list.map((c) => (
            <ChannelRow key={c.id} channel={c} active={c.id === activeId} onSelect={() => onSelect(c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChannelRow({ channel, active, onSelect }: { channel: Channel; active: boolean; onSelect: () => void }) {
  const meta = STATE_META[channel.state];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        active
          ? "border-primary/40 bg-primary/10 shadow-[0_0_0_1px] shadow-primary/20"
          : "border-transparent hover:border-border/60 hover:bg-background/40",
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary shadow-[0_0_8px_0] shadow-primary/70" aria-hidden />}
      <div className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border font-mono text-[11px] font-semibold", active ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 bg-background/40 text-muted-foreground")}>
        {channel.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-foreground">{channel.name}</p>
          <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{channel.lastActivity}</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{channel.preview}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <StateBadge state={channel.state} />
          {channel.unread > 0 && (
            <span className={cn("grid min-w-4 place-items-center rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold text-primary-foreground", meta.dot)}>
              {channel.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* SAĞ SÜTUN — Derinlemesine İletişim & Konsol                         */
/* ------------------------------------------------------------------ */

function MessageBubble({ message }: { message: ConsoleMessage }) {
  if (message.role === "system") {
    return (
      <div className="my-1 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur">
          <ShieldCheck className="size-3 text-primary" aria-hidden />
          {message.body}
        </span>
      </div>
    );
  }
  const self = message.role === "self";
  return (
    <div className={cn("flex w-full", self ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%] rounded-2xl border px-3.5 py-2.5", self ? "border-primary/30 bg-primary/15" : "border-border/60 bg-card/50 backdrop-blur")}>
        {!self && <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary">{message.author}</p>}
        <p className="text-[13px] leading-relaxed text-foreground">{message.body}</p>
        <div className="mt-1 flex items-center justify-end gap-1">
          <span className="font-mono text-[9px] text-muted-foreground">{message.time}</span>
          {self && message.status === "read" && <span className="font-mono text-[9px] text-primary">✓✓</span>}
          {self && message.status === "delivered" && <span className="font-mono text-[9px] text-muted-foreground">✓✓</span>}
          {self && message.status === "sent" && <span className="font-mono text-[9px] text-muted-foreground">✓</span>}
        </div>
      </div>
    </div>
  );
}

function ConversationColumn({ channel }: { channel: Channel }) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const thread = useMemo(() => MESSAGES.filter((m) => m.channelId === channel.id), [channel.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [channel.id]);

  return (
    <div className="flex h-full flex-col">
      {/* Oturum başlığı + şifreleme göstergesi */}
      <header className="flex items-center justify-between gap-4 border-b border-border/60 bg-card/30 px-5 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 font-mono text-xs font-semibold text-primary">
            {channel.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{channel.name}</h2>
              <StateBadge state={channel.state} />
            </div>
            <p className="truncate font-mono text-[10px] text-muted-foreground">{channel.handle} · {channel.members} üye</p>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <StatChip icon={Signal} label="Gecikme" value="42ms" />
          <StatChip icon={Boxes} label="Atlama" value="4" />
        </div>
      </header>

      {/* Şifreleme anahtarı şeridi */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-background/40 px-5 py-1.5">
        <KeyRound className="size-3.5 text-primary" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Oturum Anahtarı</span>
        <span className="font-mono text-[10px] text-primary">{channel.cipher}</span>
        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-primary">
          <Lock className="size-3" aria-hidden /> Uçtan uca şifreli
        </span>
      </div>

      {/* Mesaj akışı */}
      <div ref={scrollRef} className="wa-chat-bg relative flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
        {thread.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-[11px] text-muted-foreground">Bu kanalda henüz mesaj yok.</p>
          </div>
        ) : (
          thread.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      {/* Yazma alanı */}
      <div className="border-t border-border/60 bg-card/30 p-3 backdrop-blur-xl">
        <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-background/40 p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/25">
          <button type="button" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary" aria-label="Dosya ekle">
            <Paperclip className="size-4" aria-hidden />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={1}
            placeholder="Şifreli mesaj yaz…"
            className="max-h-28 flex-1 resize-none bg-transparent py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button type="button" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary" aria-label="Sesli mesaj">
            <Mic className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_16px_-4px] shadow-primary/60 transition-transform hover:scale-105 active:scale-95"
            aria-label="Gönder"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Sağ kenar — AI destekli anlık analiz paneli */
function InsightRail({ channel }: { channel: Channel }) {
  return (
    <aside className="hidden w-full flex-col gap-4 overflow-y-auto border-l border-border/60 p-4 xl:flex">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
          <BrainCircuit className="size-4" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-foreground">AI Analiz</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Anlık değerlendirme</p>
        </div>
      </div>

      {/* Oturum özeti */}
      <GlassPanel className="p-3.5">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <Sparkles className="size-3 text-primary" aria-hidden /> Oturum Özeti
        </p>
        <p className="text-[12px] leading-relaxed text-foreground">
          <span className="text-primary">{channel.name}</span> kanalı stabil. Trafik ikincil röle üzerinden dengeleniyor, kapsama son 5 dakikada iyileşti.
        </p>
      </GlassPanel>

      {/* Analiz kartları */}
      <div className="space-y-2.5">
        {AI_INSIGHTS.map((ins) => {
          const tone =
            ins.kind === "risk"
              ? { icon: Activity, chip: "text-destructive", label: "Risk" }
              : ins.kind === "signal"
                ? { icon: Signal, chip: "text-accent", label: "Sinyal" }
                : { icon: Shield, chip: "text-primary", label: "Aksiyon" };
          const Icon = tone.icon;
          return (
            <GlassPanel key={ins.id} className="p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em]", tone.chip)}>
                  <Icon className="size-3" aria-hidden /> {tone.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">%{ins.confidence}</span>
              </div>
              <p className="text-[12px] font-semibold text-foreground">{ins.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{ins.detail}</p>
            </GlassPanel>
          );
        })}
      </div>

      {/* Şifreleme durumu */}
      <GlassPanel className="mt-auto p-3.5">
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <KeyRound className="size-3 text-primary" aria-hidden /> Anahtar Durumu
        </p>
        <div className="space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Şema</span>
            <span className="text-foreground">{channel.cipher}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Parmak izi</span>
            <span className="text-primary">A3:F1:9C:2E</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rotasyon</span>
            <span className="text-foreground">6 sa önce</span>
          </div>
        </div>
      </GlassPanel>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Ana yerleşim — 3 sütunlu komuta yapısı                              */
/* ------------------------------------------------------------------ */

export function CommandConsole() {
  const [activeId, setActiveId] = useState<string>(CHANNELS[0].id);
  const active = CHANNELS.find((c) => c.id === activeId) ?? CHANNELS[0];

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Arka plan dokusu: grid + neon glow */}
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="pointer-events-none absolute -left-40 -top-40 size-96 rounded-full bg-primary/20 blur-[120px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 right-10 size-96 rounded-full bg-accent/15 blur-[120px]" aria-hidden />

      {/* Üst neon şerit */}
      <div className="relative z-10 h-px w-full bg-gradient-to-r from-transparent via-primary/70 to-transparent" aria-hidden />

      <div className="relative z-10 grid h-full min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(300px,360px)_1fr] xl:grid-cols-[300px_360px_1fr_320px]">
        {/* Sol sütun */}
        <div className="hidden min-h-0 border-r border-border/60 md:block">
          <LeftRail />
        </div>

        {/* Orta sütun */}
        <div className="hidden min-h-0 md:block">
          <ChannelColumn activeId={activeId} onSelect={setActiveId} />
        </div>

        {/* Sağ ana sütun */}
        <div className="min-h-0">
          <ConversationColumn channel={active} />
        </div>

        {/* Sağ kenar analiz */}
        <div className="min-h-0">
          <InsightRail channel={active} />
        </div>
      </div>
    </div>
  );
}
