import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import type { LeadPlan } from "@/lib/lead-plan";

export const Route = createFileRoute("/_authenticated/teklif/$id")({
  head: () => ({
    meta: [
      { title: "Teklif / Başvuru Paketi — Tedbirge Gateway" },
      {
        name: "description",
        content:
          "AI Danışman görüşmesinden üretilen pilot teklif ve başvuru paketi: takvim, belge kontrol listesi ve kanıt taşıma yönlendirmesi.",
      },
      { property: "og:title", content: "Teklif / Başvuru Paketi" },
      { property: "og:description", content: "Pilot takvimi ve belge kontrol listesi." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Proposal,
});

type Lead = {
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
  plan: LeadPlan | null;
};

function buildMarkdown(lead: Lead): string {
  const p = lead.plan;
  const lines = [
    `# Tedbirge Gateway — Pilot Teklif / Başvuru Paketi`,
    ``,
    `**Kurum:** ${lead.organization ?? "—"}`,
    `**İlgili kişi:** ${lead.contact_name ?? "—"}`,
    `**İletişim:** ${lead.email ?? "—"}${lead.phone ? ` · ${lead.phone}` : ""}`,
    `**Bölge:** ${lead.country ?? "—"}`,
    `**Düğüm / taşıyıcı:** ${lead.node_count ?? "—"} · ${lead.carrier_need ?? "—"}`,
    `**Aciliyet:** ${lead.urgency ?? "—"}`,
    `**Uygunluk skoru:** ${lead.qualification_score ?? "—"}`,
    `**Paket no:** ${lead.id}`,
    `**Tarih:** ${new Date(lead.created_at).toLocaleString("tr-TR")}`,
    ``,
    `## Talep özeti`,
    lead.summary ?? "—",
    ``,
    `## Kullanım senaryosu`,
    lead.use_case ?? "—",
  ];
  if (p) {
    lines.push(``, `## Planlama özeti`, p.ozet, ``, `## Takvim`);
    p.adimlar.forEach((s, i) =>
      lines.push(`${i + 1}. **${s.hafta} — ${s.baslik}** (${s.sorumlu}): ${s.aciklama}`),
    );
    lines.push(``, `## Belge kontrol listesi`);
    p.belgeler.forEach((d) =>
      lines.push(`- [ ] **${d.belge}** — ${d.kurum} ${d.zorunlu ? "(zorunlu)" : "(opsiyonel)"} — ${d.not}`),
    );
    lines.push(``, `## Riskler`);
    p.riskler.forEach((r) => lines.push(`- ${r}`));
  }
  lines.push(
    ``,
    `## Kanıt taşıma`,
    `Belgelerin SHA-256 karmalarını Pilot Uyum Panosu üzerinden kayıt altına alın: https://tedbirge-gateway.lovable.app/pilot-panosu`,
    ``,
    `Mehmet DİNÇ (Tedbirge Gateway) — Türkiye`,
  );
  return lines.join("\n");
}

function Proposal() {
  const { id } = useParams({ from: "/_authenticated/teklif/$id" });
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin(user?.id);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("ai_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setLead((data as unknown as Lead) ?? null);
        setLoading(false);
      });
  }, [isAdmin, id]);

  function download() {
    if (!lead) return;
    const blob = new Blob([buildMarkdown(lead)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tedbirge-teklif-${lead.id.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (roleLoading || loading) {
    return (
      <SitePage>
        <div className="mx-auto max-w-4xl px-6 py-20 text-sm text-muted-foreground">Yükleniyor…</div>
      </SitePage>
    );
  }

  if (!isAdmin) {
    return (
      <SitePage>
        <div className="mx-auto max-w-4xl px-6 py-20">
          <SectionLabel>Yetki gerekli</SectionLabel>
          <h1 className="mt-3 text-2xl font-semibold">Bu pakete erişiminiz yok</h1>
        </div>
      </SitePage>
    );
  }

  if (!lead) {
    return (
      <SitePage>
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h1 className="text-2xl font-semibold">Paket bulunamadı</h1>
          <Link to="/yonetim" className="mt-4 inline-block text-sm text-primary underline">
            Yönetime dön
          </Link>
        </div>
      </SitePage>
    );
  }

  const plan = lead.plan;

  return (
    <SitePage>
      <section className="mx-auto max-w-4xl px-6 py-14 print:max-w-none print:px-0 print:py-0">
        {/* Baskıya özel antetli başlık */}
        <div className="print-only print-block mb-6 border-b-2 pb-3">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[13pt] font-semibold uppercase tracking-[0.18em]">
                TEDBİRGE GATEWAY
              </p>
              <p className="font-mono text-[8pt] uppercase tracking-[0.14em]">
                Mehmet DİNÇ · Türkiye · tedbirge34@gmail.com
              </p>
            </div>
            <div className="text-right font-mono text-[8pt] uppercase tracking-[0.12em]">
              <p>Pilot Teklif / Başvuru Paketi</p>
              <p>Paket no {lead.id.slice(0, 8)}</p>
              <p>{new Date(lead.created_at).toLocaleDateString("tr-TR")}</p>
            </div>
          </div>
        </div>

        <div className="print-hide">
          <SectionLabel>Teklif / Başvuru paketi</SectionLabel>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight print:mt-0 print:text-[16pt]">
          {lead.organization ?? lead.contact_name ?? "Pilot talebi"}
        </h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground print-hide">
          Paket no {lead.id.slice(0, 8)} · {new Date(lead.created_at).toLocaleString("tr-TR")} ·
          Mehmet DİNÇ (Tedbirge Gateway)
        </p>

        <div className="mt-6 flex flex-wrap gap-3 print-hide">
          <button
            onClick={() => window.print()}
            className="rounded-sm bg-primary px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-primary-foreground"
          >
            PDF olarak kaydet
          </button>
          <button
            onClick={download}
            className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Markdown indir
          </button>
          <Link
            to="/pilot-panosu"
            className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Kanıt taşımaya git
          </Link>
          <Link
            to="/yonetim"
            className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Yönetime dön
          </Link>
        </div>

        <div className="print-block mt-8 grid gap-3 rounded-sm border border-border bg-card/40 p-6 text-sm sm:grid-cols-2 print:mt-4 print:grid-cols-2 print:gap-2 print:p-3">
          <Field label="İlgili kişi" value={lead.contact_name} />
          <Field label="E-posta" value={lead.email} />
          <Field label="Telefon" value={lead.phone} />
          <Field label="Bölge" value={lead.country} />
          <Field label="Düğüm sayısı" value={lead.node_count} />
          <Field label="Taşıyıcı ihtiyacı" value={lead.carrier_need} />
          <Field label="Aciliyet" value={lead.urgency} />
          <Field
            label="Uygunluk skoru"
            value={lead.qualification_score != null ? String(lead.qualification_score) : null}
          />
        </div>


        {lead.summary && (
          <Block title="Talep özeti">
            <p className="whitespace-pre-wrap">{lead.summary}</p>
          </Block>
        )}
        {lead.use_case && (
          <Block title="Kullanım senaryosu">
            <p className="whitespace-pre-wrap text-muted-foreground">{lead.use_case}</p>
          </Block>
        )}

        {!plan ? (
          <Block title="Plan">
            <p className="text-muted-foreground">
              Bu talep için otomatik plan üretilmemiş. Yönetim ekranındaki “Plan üret” düğmesini
              kullanabilirsiniz.
            </p>
          </Block>
        ) : (
          <>
            <Block title="Planlama özeti">
              <p className="whitespace-pre-wrap">{plan.ozet}</p>
            </Block>

            <Block title="Kurum / izin / pilot takvimi">
              <ol className="space-y-4">
                {plan.adimlar.map((s, i) => (
                  <li key={i} className="border-l-2 border-primary/50 pl-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
                      {s.hafta}
                    </p>
                    <p className="mt-1 font-medium">{s.baslik}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.aciklama}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      Sorumlu: {s.sorumlu}
                    </p>
                  </li>
                ))}
              </ol>
            </Block>

            <Block title="Belge kontrol listesi">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="py-2 pr-3">Belge</th>
                      <th className="py-2 pr-3">Kurum</th>
                      <th className="py-2 pr-3">Durum</th>
                      <th className="py-2">Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.belgeler.map((d, i) => (
                      <tr key={i} className="border-b border-border/50 align-top">
                        <td className="py-2 pr-3 font-medium">☐ {d.belge}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{d.kurum}</td>
                        <td className="py-2 pr-3 font-mono text-[11px]">
                          {d.zorunlu ? "ZORUNLU" : "OPSİYONEL"}
                        </td>
                        <td className="py-2 text-muted-foreground">{d.not}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Toplanan belgelerin bütünlüğünü{" "}
                <Link to="/pilot-panosu" className="text-primary underline">
                  Pilot Uyum Panosu
                </Link>{" "}
                üzerinden SHA-256 kanıt zinciri ile kayıt altına alın; dosyalar sunucuya yüklenmez.
              </p>
            </Block>

            {plan.riskler.length > 0 && (
              <Block title="Riskler">
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {plan.riskler.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </Block>
            )}
          </>
        )}

        <p className="mt-10 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          Bu paket AI Danışman görüşmesinden otomatik üretilmiştir; bağlayıcı teklif değildir.
          Nihai kapsam ve fiyat pilot değerlendirmesi sonrası netleşir. Mehmet DİNÇ (Tedbirge
          Gateway), Türkiye.
        </p>
      </section>
    </SitePage>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print-block mt-10 print:mt-5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary print:text-[9pt]">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
