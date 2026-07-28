import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/iletisim")({
  head: () => ({
    meta: [
      { title: "Pilot ve İletişim — Tedbirge Protokol" },
      {
        name: "description",
        content:
          "Tedbirge ile 30 günlük saha pilotu başlatın. Mühendislik ekibimizle mesh kurulumu ve faturalama entegrasyonu için görüşme planlayın.",
      },
      { property: "og:title", content: "Tedbirge — Pilot Başvurusu" },
      {
        property: "og:description",
        content: "Üç düğümlük mesh pilotu ve kullanım bazlı faturalama entegrasyonu için iletişime geçin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

const carriers = [
  "Ethernet / LAN",
  "Wi-Fi / WAN",
  "Hücresel 4G/5G",
  "Uydu (Starlink/VSAT)",
  "WiGig 60 GHz",
  "FSO lazer optik",
  "Wi-Fi HaLow",
  "TVWS 470–790 MHz",
  "LoRa 868 MHz ISM",
  "Henüz belirlemedik",
];

function Contact() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    organization: "",
    email: "",
    phone: "",
    node_count: "",
    carrier: "",
    use_case: "",
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { error } = await supabase.from("pilot_requests").insert({
        full_name: form.full_name.trim().slice(0, 120),
        organization: form.organization.trim().slice(0, 160),
        email: form.email.trim().slice(0, 200),
        phone: form.phone.trim().slice(0, 40) || null,
        node_count: form.node_count ? Number(form.node_count) : null,
        carrier: form.carrier || null,
        use_case: form.use_case.trim().slice(0, 4000),
        user_id: sessionData.session?.user.id ?? null,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Başvuru kaydedilemedi, lütfen tekrar deneyin.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SitePage>
      <section className="mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-2">
        <div>
          <SectionLabel>Pilot başvurusu</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Sahanızda 30 gün, üç düğüm
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Kullanım senaryonuzu anlatın; taşıyıcı seçimi, topoloji ve faturalama entegrasyonu
            için bir mimari taslağıyla dönelim.
          </p>

          <div className="mt-10 space-y-4">
            {[
              ["01", "Keşif görüşmesi", "Saha koşulları, mesafe, mevcut taşıyıcılar ve trafik profili."],
              ["02", "Pilot kurulumu", "Üç düğümlük mesh, panel erişimi ve doğrulama testleri."],
              ["03", "Ticarileşme", "Kullanım sayacının faturalama sisteminize bağlanması."],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-5 rounded-sm border border-border bg-card/40 p-5">
                <span className="font-mono text-sm text-primary">{n}</span>
                <div>
                  <p className="font-medium">{t}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-sm border border-border bg-card/50 p-8">
          {sent ? (
            <div className="flex h-full min-h-72 flex-col items-start justify-center">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
                Alındı
              </span>
              <h2 className="mt-3 text-2xl font-semibold">Başvurunuz kaydedildi</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Talebiniz sistemimize düştü. Ekibimiz iki iş günü içinde e-posta ile dönüş yapacak.
              </p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <h2 className="font-mono text-sm uppercase tracking-[0.2em]">Bilgileriniz</h2>

              <Field label="Ad soyad" value={form.full_name} onChange={set("full_name")} required />
              <Field label="Kurum" value={form.organization} onChange={set("organization")} required />
              <Field label="E-posta" type="email" value={form.email} onChange={set("email")} required />
              <Field label="Telefon" value={form.phone} onChange={set("phone")} />
              <Field
                label="Tahmini düğüm sayısı"
                type="number"
                value={form.node_count}
                onChange={set("node_count")}
              />

              <div>
                <label className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Öncelikli taşıyıcı
                </label>
                <select
                  value={form.carrier}
                  onChange={(e) => set("carrier")(e.target.value)}
                  className="mt-2 w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Seçiniz</option>
                  {carriers.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Kullanım senaryosu
                </label>
                <textarea
                  rows={5}
                  required
                  maxLength={4000}
                  value={form.use_case}
                  onChange={(e) => set("use_case")(e.target.value)}
                  className="mt-2 w-full resize-none rounded-sm border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-sm bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Gönderiliyor…" : "Gönder"}
              </button>

              <p className="text-xs text-muted-foreground">
                Formu göndererek verilerinizin Gizlilik Bildirimi kapsamında işlenmesini kabul
                edersiniz.
              </p>
            </form>
          )}
        </div>
      </section>
    </SitePage>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
