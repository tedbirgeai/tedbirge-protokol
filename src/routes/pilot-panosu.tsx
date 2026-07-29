import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { pilotChecklist, pilotGroups, type PilotCheckItem } from "@/lib/pilot-checklist";

const TITLE = "Pilot Uyum Panosu — Kontrol Listesi, Kanıt Zinciri ve PDF Raporu";
const DESC =
  "Tedbirge Gateway pilot kurulumları için takip panosu: 23 maddelik uyum kontrol listesi, dosya karması ile kanıt taşıma zinciri, ilerleme takibi ve tek tıkla PDF uyum raporu.";
const URL = "https://artisan-project-studio.lovable.app/pilot-panosu";

export const Route = createFileRoute("/pilot-panosu")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PilotBoard,
});

type Status = "bekliyor" | "devam" | "tamam" | "uygulanmaz";

type Evidence = {
  name: string;
  size: number;
  hash: string;
  at: string;
};

type Entry = { status: Status; note: string; evidence: Evidence[] };

type BoardState = {
  site: string;
  operator: string;
  startedAt: string;
  entries: Record<string, Entry>;
};

const STORAGE_KEY = "tedbirge.pilot-board.v1";

const statusLabels: Record<Status, string> = {
  bekliyor: "Bekliyor",
  devam: "Devam ediyor",
  tamam: "Tamam",
  uygulanmaz: "Uygulanmaz",
};

const statusClass: Record<Status, string> = {
  bekliyor: "text-muted-foreground",
  devam: "text-amber-400",
  tamam: "text-primary",
  uygulanmaz: "text-muted-foreground/70",
};

function emptyState(): BoardState {
  return {
    site: "",
    operator: "",
    startedAt: new Date().toISOString().slice(0, 10),
    entries: Object.fromEntries(
      pilotChecklist.map((i) => [i.id, { status: "bekliyor" as Status, note: "", evidence: [] }]),
    ),
  };
}

async function sha256(file: File) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function PilotBoard() {
  const [state, setState] = useState<BoardState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BoardState;
        const base = emptyState();
        setState({ ...base, ...parsed, entries: { ...base.entries, ...parsed.entries } });
      }
    } catch {
      /* bozuk kayıt yok sayılır */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const stats = useMemo(() => {
    const all = pilotChecklist.map((i) => state.entries[i.id]?.status ?? "bekliyor");
    const applicable = all.filter((s) => s !== "uygulanmaz").length || 1;
    const done = all.filter((s) => s === "tamam").length;
    const evidenceCount = pilotChecklist.reduce(
      (n, i) => n + (state.entries[i.id]?.evidence.length ?? 0),
      0,
    );
    return {
      done,
      applicable,
      pct: Math.round((done / applicable) * 100),
      evidenceCount,
      blocked: all.filter((s) => s === "bekliyor").length,
    };
  }, [state]);

  function update(id: string, patch: Partial<Entry>) {
    setState((s) => ({ ...s, entries: { ...s.entries, [id]: { ...s.entries[id], ...patch } } }));
  }

  async function addEvidence(id: string, files: FileList | null) {
    if (!files?.length) return;
    const added: Evidence[] = [];
    for (const file of Array.from(files)) {
      added.push({
        name: file.name,
        size: file.size,
        hash: await sha256(file),
        at: new Date().toISOString(),
      });
    }
    setState((s) => ({
      ...s,
      entries: {
        ...s.entries,
        [id]: { ...s.entries[id], evidence: [...s.entries[id].evidence, ...added] },
      },
    }));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tedbirge-pilot-${state.site || "saha"}-${state.startedAt}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BoardState;
        const base = emptyState();
        setState({ ...base, ...parsed, entries: { ...base.entries, ...parsed.entries } });
      } catch {
        alert("Dosya okunamadı: geçerli bir pano yedeği değil.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60 print:hidden">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <SectionLabel>Pilot uyum panosu</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Kontrol listesi, kanıt zinciri ve PDF raporu tek ekranda
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tüm veriler yalnızca bu cihazın tarayıcısında saklanır; sunucuya hiçbir dosya
            yüklenmez. Kanıt dosyaları yüklenmez, SHA-256 karmaları hesaplanıp zincire işlenir —
            dosyanın kendisi sizde kalır, bütünlüğü kanıtlanabilir.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 print:py-0">
        <div className="rounded-sm border border-border bg-card/30 p-6 print:border-0 print:bg-transparent print:p-0">
          <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Pilot sahası
              </span>
              <input
                value={state.site}
                onChange={(e) => setState({ ...state, site: e.target.value })}
                placeholder="Örn. Kahramanmaraş saha-A"
                className="mt-2 w-full rounded-sm border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Sorumlu operatör
              </span>
              <input
                value={state.operator}
                onChange={(e) => setState({ ...state, operator: e.target.value })}
                placeholder="Ad soyad / kurum"
                className="mt-2 w-full rounded-sm border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Başlangıç tarihi
              </span>
              <input
                type="date"
                value={state.startedAt}
                onChange={(e) => setState({ ...state, startedAt: e.target.value })}
                className="mt-2 w-full rounded-sm border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="mt-8 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-4">
            {[
              ["Tamamlanan", `${stats.done}/${stats.applicable}`],
              ["İlerleme", `%${stats.pct}`],
              ["Kanıt kaydı", String(stats.evidenceCount)],
              ["Bekleyen madde", String(stats.blocked)],
            ].map(([k, v]) => (
              <div key={k} className="bg-background/60 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  {k}
                </p>
                <p className="mt-2 text-2xl font-semibold">{v}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${stats.pct}%` }}
              role="progressbar"
              aria-valuenow={stats.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="rounded-sm bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              PDF raporu al
            </button>
            <button
              onClick={exportJson}
              className="rounded-sm border border-border px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Yedek indir (.json)
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="rounded-sm border border-border px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Yedek yükle
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => importJson(e.target.files)}
            />
            <button
              onClick={() => {
                if (confirm("Pano sıfırlansın mı? Tüm kayıtlar silinir.")) setState(emptyState());
              }}
              className="rounded-sm border border-border px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground hover:bg-secondary"
            >
              Sıfırla
            </button>
          </div>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            PDF: açılan yazdırma penceresinde hedef olarak “PDF olarak kaydet” seçin.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        {pilotGroups.map((group) => {
          const items = pilotChecklist.filter((i) => i.group === group);
          return (
            <div key={group} className="mt-12 first:mt-0">
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{group}</h2>
              <div className="mt-4 space-y-px overflow-hidden rounded-sm border border-border bg-border">
                {items.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    entry={state.entries[item.id]}
                    onStatus={(status) => update(item.id, { status })}
                    onNote={(note) => update(item.id, { note })}
                    onEvidence={(files) => addEvidence(item.id, files)}
                    onRemoveEvidence={(hash) =>
                      update(item.id, {
                        evidence: state.entries[item.id].evidence.filter((e) => e.hash !== hash),
                      })
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-14 flex flex-wrap gap-3 print:hidden">
          <Link
            to="/izinler"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Devlet izinleri
          </Link>
          <Link
            to="/turkiye-mevzuat"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Türkiye mevzuatı
          </Link>
          <Link
            to="/saha"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Saha erişimi
          </Link>
        </div>
      </section>
    </SitePage>
  );
}

function Row({
  item,
  entry,
  onStatus,
  onNote,
  onEvidence,
  onRemoveEvidence,
}: {
  item: PilotCheckItem;
  entry: Entry;
  onStatus: (s: Status) => void;
  onNote: (n: string) => void;
  onEvidence: (f: FileList | null) => void;
  onRemoveEvidence: (hash: string) => void;
}) {
  const e = entry ?? { status: "bekliyor" as Status, note: "", evidence: [] };
  return (
    <article className="bg-background/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            {item.id} · {item.authority}
          </p>
          <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.requirement}</p>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            Beklenen kanıt: {item.evidence}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`font-mono text-[11px] uppercase tracking-[0.15em] ${statusClass[e.status]}`}>
            {statusLabels[e.status]}
          </span>
          <select
            value={e.status}
            onChange={(ev) => onStatus(ev.target.value as Status)}
            className="rounded-sm border border-border bg-background/60 px-2 py-1.5 text-xs outline-none focus:border-primary print:hidden"
          >
            {(Object.keys(statusLabels) as Status[]).map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <textarea
        value={e.note}
        onChange={(ev) => onNote(ev.target.value)}
        placeholder="Not, ölçüm değeri, belge numarası…"
        rows={2}
        className="mt-4 w-full rounded-sm border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary print:hidden">
          Kanıt ekle
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(ev) => {
              onEvidence(ev.target.files);
              ev.target.value = "";
            }}
          />
        </label>
        {e.evidence.length === 0 && (
          <span className="font-mono text-[11px] text-muted-foreground">Kanıt kaydı yok</span>
        )}
      </div>

      {e.evidence.length > 0 && (
        <ul className="mt-3 space-y-2">
          {e.evidence.map((ev) => (
            <li
              key={ev.hash}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm border border-border/60 bg-card/40 px-3 py-2 font-mono text-[11px] text-muted-foreground"
            >
              <span className="text-foreground">{ev.name}</span>
              <span>{(ev.size / 1024).toFixed(1)} KB</span>
              <span>{new Date(ev.at).toLocaleString("tr-TR")}</span>
              <span className="break-all">sha256:{ev.hash}</span>
              <button
                onClick={() => onRemoveEvidence(ev.hash)}
                className="ml-auto text-muted-foreground hover:text-foreground print:hidden"
              >
                kaldır
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
