import { useState } from "react";
import { Link } from "@tanstack/react-router";

type CommerceLicense = {
  id: string;
  plan: string;
  status: string;
  node_limit: number;
  license_key: string;
  current_period_end: string | null;
};

type CommerceSubscription = {
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
} | null;

/** Abonelik, lisans/API anahtarı, kullanım limiti ve plan yönetimi. */
export function PanelCommerce({
  subscription,
  licenses,
  deviceCountByLicense,
  onOpenPortal,
  portalBusy,
}: {
  subscription: CommerceSubscription;
  licenses: CommerceLicense[];
  deviceCountByLicense: Record<string, number>;
  onOpenPortal: () => void;
  portalBusy: boolean;
}) {
  const activeSub =
    !!subscription &&
    ["active", "trialing", "past_due"].includes(subscription.status) &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-border bg-card/50 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Ticarileştirme</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Abonelik ve lisans yönetimi</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-border bg-background/60 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Mevcut plan
            </p>
            {subscription ? (
              <div className="mt-3 space-y-2 text-sm">
                <Row k="Ürün" v={subscription.product_id} />
                <Row k="Fiyat" v={subscription.price_id} />
                <Row k="Durum" v={activeSub ? "Aktif" : subscription.status} />
                <Row
                  k="Dönem sonu"
                  v={
                    subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString("tr-TR")
                      : "—"
                  }
                />
                <Row
                  k="Yenileme"
                  v={subscription.cancel_at_period_end ? "dönem sonunda durur" : "otomatik"}
                />
                <button
                  onClick={onOpenPortal}
                  disabled={portalBusy}
                  className="mt-3 w-full rounded-sm border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary disabled:opacity-50"
                >
                  {portalBusy ? "Açılıyor…" : "Faturalama portalını aç"}
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Şu anda <strong className="text-foreground">Community</strong> planındasınız: 5 düğüme
                  kadar ücretsiz, topluluk desteği ve tam mesh yeteneği.
                </p>
                <Link
                  to="/fiyatlandirma"
                  className="mt-4 inline-block rounded-sm bg-primary px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground"
                >
                  Enterprise'a yükselt
                </Link>
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <PlanCard
              name="Community"
              current={!activeSub}
              points={["5 düğüm", "Tüm taşıyıcı köprüleri", "Topluluk desteği", "Temel API limiti"]}
            />
            <PlanCard
              name="Pro"
              current={activeSub && subscription?.product_id === "tedbirge_pro"}
              points={[
                "6–24 düğüm kotası",
                "Öncelikli API limiti + webhook",
                "Kesinti/olay günlüğü ve uyum raporu",
                "E-posta desteği (1 iş günü)",
              ]}
            />
            <PlanCard
              name="Enterprise"
              current={activeSub && subscription?.product_id === "tedbirge_enterprise"}
              points={[
                "Sınırsız düğüm ve organizasyon",
                "Öncelikli API limiti + webhook",
                "SLA'lı destek ve pilot mühendisliği",
                "Uyum raporlaması",
              ]}
            />
          </div>

        </div>
      </div>

      <div className="rounded-sm border border-border bg-card/50 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          API anahtarları ve kullanım limitleri
        </p>
        {licenses.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Henüz lisans anahtarı üretilmedi. Abonelik başladığında anahtar burada görünür.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {licenses.map((l) => {
              const used = deviceCountByLicense[l.id] ?? 0;
              const pct = Math.min(100, Math.round((used / Math.max(1, l.node_limit)) * 100));
              return (
                <li key={l.id} className="rounded-sm border border-border bg-background/60 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-[0.15em] text-primary">{l.plan}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{l.status}</span>
                  </div>
                  <KeyField value={l.license_key} />
                  <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                    Düğüm kullanımı: {used} / {l.node_limit}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  {l.current_period_end && (
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                      Geçerlilik: {new Date(l.current_period_end).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/api-dokumantasyon"
            className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
          >
            API dokümantasyonu
          </Link>
          <Link
            to="/fiyatlandirma"
            className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Plan karşılaştırması
          </Link>
        </div>
      </div>
    </div>
  );
}

function KeyField({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3">
      <p className="break-all font-mono text-[12px] text-foreground">
        {shown ? value : `${value.slice(0, 6)}${"•".repeat(Math.max(0, value.length - 10))}${value.slice(-4)}`}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => setShown((s) => !s)}
          className="rounded-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-secondary"
        >
          {shown ? "Gizle" : "Göster"}
        </button>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="rounded-sm border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] hover:bg-secondary"
        >
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </div>
  );
}

function PlanCard({ name, current, points }: { name: string; current: boolean; points: string[] }) {
  return (
    <div
      className={`rounded-sm border p-5 ${current ? "border-primary/50 bg-primary/5" : "border-border bg-background/60"}`}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground">{name}</p>
        {current && (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">mevcut plan</span>
        )}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {points.map((p) => (
          <li key={p}>· {p}</li>
        ))}
      </ul>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-[13px] text-foreground">{v}</span>
    </div>
  );
}
