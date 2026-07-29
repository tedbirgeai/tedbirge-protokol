import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";

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
  const [tab, setTab] = useState<"pilot" | "ai">("pilot");
  const [rows, setRows] = useState<PilotRequest[]>([]);
  const [leads, setLeads] = useState<AiLead[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

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
    setLeads((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("ai_leads").update({ status }).eq("id", id);
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
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Pilot başvuruları</h1>

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
      </section>
    </SitePage>
  );
}
