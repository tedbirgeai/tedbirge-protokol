import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { updateAiLeadStatus, rebuildLeadPlan } from "@/lib/leads.functions";
import { OFFICIAL_DRAFTS } from "@/lib/regulation";
import { AdminBusinessPlan } from "@/components/site/AdminBusinessPlan";


export const Route = createFileRoute("/_authenticated/yonetim")({
  head: () => ({
    meta: [
      { title: "Yönetim — Pilot Başvuruları | Tedbirge" },
      {
        name: "description",
        content: "Tedbirge yönetim ekranı: pilot başvurularını inceleyin, durum güncelleyin ve lisansları takip edin.",
      },
      { property: "og:title", content: "Tedbirge Yönetim Ekranı" },
      { property: "og:description", content: "Pilot başvuruları ve lisans yönetimi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

type PilotRequest = {
  id: string;
  full_name: string;
  organization: string;
  email: string;
  phone: string | null;
  node_count: number | null;
  carrier: string | null;
  use_case: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const statuses = ["new", "contacted", "pilot", "won", "lost"];
const statusLabels: Record<string, string> = {
  new: "Yeni",
  contacted: "İletişime geçildi",
  pilot: "Pilotta",
  won: "Kazanıldı",
  lost: "Kaybedildi",
};

type AiLead = {
  id: string;
  organization: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  use_case: string | null;
  carrier_need: string | null;
  node_count: string | null;
  urgency: string | null;
  qualification_score: number | null;
  summary: string | null;
  status: string;
  created_at: string;
};

function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin(user?.id);
  const [tab, setTab] = useState<"pilot" | "ai" | "docs" | "interop" | "plan">("pilot");
  const [rows, setRows] = useState<PilotRequest[]>([]);
  const [leads, setLeads] = useState<AiLead[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [leadMsg, setLeadMsg] = useState<Record<string, string>>({});
  const updateStatusFn = useServerFn(updateAiLeadStatus);
  const rebuildPlanFn = useServerFn(rebuildLeadPlan);


  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("pilot_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as PilotRequest[]) ?? []);
        setLoading(false);
      });
    supabase
      .from("ai_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setLeads((data as AiLead[]) ?? []));
  }, [isAdmin]);

  async function updateLeadStatus(id: string, status: string) {
    const prev = leads.find((x) => x.id === id)?.status;
    setLeads((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    setLeadMsg((m) => ({ ...m, [id]: "Güncelleniyor…" }));
    try {
      await updateStatusFn({ data: { leadId: id, status: status as never } });
      setLeadMsg((m) => ({ ...m, [id]: "Durum güncellendi, bildirim gönderildi." }));
    } catch (e) {
      setLeads((r) => r.map((x) => (x.id === id ? { ...x, status: prev ?? x.status } : x)));
      setLeadMsg((m) => ({
        ...m,
        [id]: e instanceof Error ? e.message : "Güncellenemedi.",
      }));
    }
  }

  async function makePlan(id: string) {
    setLeadMsg((m) => ({ ...m, [id]: "Plan üretiliyor…" }));
    try {
      await rebuildPlanFn({ data: { leadId: id } });
      setLeadMsg((m) => ({ ...m, [id]: "Plan hazır — teklif paketini açabilirsiniz." }));
    } catch (e) {
      setLeadMsg((m) => ({ ...m, [id]: e instanceof Error ? e.message : "Plan üretilemedi." }));
    }
  }



  async function updateStatus(id: string, status: string) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("pilot_requests").update({ status }).eq("id", id);
  }

  if (roleLoading) {
    return (
      <SitePage>
        <div className="mx-auto max-w-6xl px-6 py-20 text-sm text-muted-foreground">Yükleniyor…</div>
      </SitePage>
    );
  }

  if (!isAdmin) {
    return (
      <SitePage>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Yetki gerekli</SectionLabel>
          <h1 className="mt-3 text-2xl font-semibold">Bu ekrana erişiminiz yok</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Yönetim ekranı yalnızca admin rolüne sahip hesaplara açıktır.
          </p>
        </div>
      </SitePage>
    );
  }

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <SitePage>
      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {tab === "pilot"
            ? "Pilot başvuruları"
            : tab === "ai"
              ? "AI danışman talepleri"
              : tab === "plan"
                ? "İş planı geliştirme rehberi"
                : tab === "interop"
                  ? "El sıkışma haritası"
                  : "İdari belgeler & dilekçeler"}

        </h1>


        <div className="mt-6 flex gap-2 border-b border-border/60 pb-4">
          <button
            onClick={() => setTab("pilot")}
            className={`rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] ${
              tab === "pilot" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            Pilot formu ({rows.length})
          </button>
          <button
            onClick={() => setTab("ai")}
            className={`rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] ${
              tab === "ai" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            AI talepleri ({leads.length})
          </button>
          <button
            onClick={() => setTab("docs")}
            className={`rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] ${
              tab === "docs" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            İdari dilekçeler ({OFFICIAL_DRAFTS.length})
          </button>
          <button
            onClick={() => setTab("plan")}
            className={`rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] ${
              tab === "plan" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            İş planı
          </button>
        </div>

        {tab === "plan" ? (
          <AdminBusinessPlan />
        ) : tab === "docs" ? (
          <AdminOfficialDrafts />
        ) : tab === "ai" ? (
          leads.length === 0 ? (
            <p className="mt-8 text-sm text-muted-foreground">
              Henüz AI danışman üzerinden gelen talep yok.
            </p>
          ) : (
            <div className="mt-8 space-y-4">
              {leads.map((l) => (
                <div key={l.id} className="rounded-sm border border-border bg-card/50 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        {l.contact_name ?? "—"}
                        {l.organization ? ` · ${l.organization}` : ""}
                        {typeof l.qualification_score === "number" ? (
                          <span className="ml-3 rounded-sm border border-primary/50 px-2 py-0.5 font-mono text-[10px] text-primary">
                            skor {l.qualification_score}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {l.email ?? "—"}
                        {l.phone ? ` · ${l.phone}` : ""}
                        {l.country ? ` · ${l.country}` : ""}
                        {l.node_count ? ` · ${l.node_count} düğüm` : ""}
                        {l.carrier_need ? ` · ${l.carrier_need}` : ""}
                        {l.urgency ? ` · ${l.urgency}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("tr-TR")}
                      </span>
                      <select
                        value={l.status}
                        onChange={(e) => updateLeadStatus(l.id, e.target.value)}
                        className="rounded-sm border border-border bg-background px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {statusLabels[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {l.summary && (
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {l.summary}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Link
                      to="/teklif/$id"
                      params={{ id: l.id }}
                      className="rounded-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-secondary"
                    >
                      Teklif paketi
                    </Link>
                    <button
                      onClick={() => makePlan(l.id)}
                      className="rounded-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-secondary"
                    >
                      Plan üret
                    </button>
                    {leadMsg[l.id] && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {leadMsg[l.id]}
                      </span>
                    )}
                  </div>

                  {l.use_case && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {l.use_case}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
        <>
        <div className="mt-6 flex flex-wrap gap-2">

          {["all", ...statuses].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] ${
                filter === s
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground"
              }`}
            >
              {s === "all" ? `Tümü (${rows.length})` : statusLabels[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Yükleniyor…</p>
        ) : visible.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Kayıt yok.</p>
        ) : (
          <div className="mt-8 space-y-4">
            {visible.map((r) => (
              <div key={r.id} className="rounded-sm border border-border bg-card/50 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{r.full_name} · {r.organization}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ""}
                      {r.node_count ? ` · ${r.node_count} düğüm` : ""}
                      {r.carrier ? ` · ${r.carrier}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("tr-TR")}
                    </span>
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className="rounded-sm border border-border bg-background px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em]"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {statusLabels[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {r.use_case}
                </p>
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </section>
    </SitePage>
  );
}

function AdminOfficialDrafts() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mt-8">

      <SectionLabel>Yalnızca yönetici</SectionLabel>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
        İdari Belgeler &amp; Dilekçe Taslakları
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Bu taslaklar kamuya açık sayfalarda yayınlanmaz. Kurum antetli kâğıdınıza yapıştırıp boş
        alanları doldurduktan sonra ilgili kuruma sunulmak üzere hazırlanmıştır.
      </p>

      <div className="mt-8 space-y-6">
        {OFFICIAL_DRAFTS.map((d) => (
          <article key={d.id} className="overflow-hidden rounded-sm border border-border">
            <header className="flex flex-wrap items-start gap-4 border-b border-border bg-card/50 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                  {d.label}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/belgeler/tedbirge-${d.id}.pdf`}
                  download
                  className="rounded-sm bg-primary px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
                >
                  PDF indir
                </a>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(d.body).catch(() => {})}
                  className="rounded-sm border border-border px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
                >
                  Kopyala
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(open === d.id ? null : d.id)}
                  className="rounded-sm border border-border px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
                >
                  {open === d.id ? "Gizle" : "Metni gör"}
                </button>
              </div>
            </header>
            {open === d.id && (
              <pre className="overflow-x-auto whitespace-pre-wrap bg-background/70 px-5 py-5 font-mono text-[12px] leading-relaxed text-muted-foreground">
                <code>{d.body}</code>
              </pre>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

