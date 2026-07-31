import { BUSINESS_PLAN, BUSINESS_PLAN_VERSION } from "@/lib/business-plan";

/** Salt-okunur kurumsal iş planı rehberi. Veri yazma/okuma yapmaz. */
export function AdminBusinessPlan() {
  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-sm border border-primary/40 bg-primary/5 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          Salt-okunur kurumsal doküman · {BUSINESS_PLAN_VERSION}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Bu sekme yalnızca referans amaçlıdır; hiçbir kayıt oluşturmaz veya değiştirmez.
          İş planı; 7 katmanlı Tedbirge Protocol mimarisi ve Resilience-as-a-Service modeli
          esas alınarak hazırlanmıştır.
        </p>
      </div>

      {BUSINESS_PLAN.map((s) => (
        <article key={s.id} className="rounded-sm border border-border bg-card/50 p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{s.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
          <ul className="mt-4 space-y-2">
            {s.items.map((it) => (
              <li key={it} className="flex gap-3 text-sm leading-relaxed text-foreground">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}

      <p className="text-xs text-muted-foreground">
        Not: Tasarruf, süreklilik ve SLA oranları saha ölçümü yapılmadan pazarlama
        materyalinde iddia edilmez.
      </p>
    </div>
  );
}
