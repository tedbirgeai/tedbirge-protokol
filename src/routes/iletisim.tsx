import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/iletisim")({
  head: () => ({
    meta: [
      { title: "Pilot ve İletişim — Aetheris Protocol" },
      {
        name: "description",
        content:
          "Aetheris ile 30 günlük saha pilotu başlatın. Mühendislik ekibimizle mesh kurulumu ve faturalama entegrasyonu için görüşme planlayın.",
      },
      { property: "og:title", content: "Aetheris — Pilot Başvurusu" },
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

function Contact() {
  const [sent, setSent] = useState(false);

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
              <h2 className="mt-3 text-2xl font-semibold">Talebiniz kaydedildi</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Bu form şu an sunucuya bağlı değil. Kalıcı kayıt ve e-posta bildirimi istersen
                bunu bir sonraki adımda ekleyebiliriz.
              </p>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <h2 className="font-mono text-sm uppercase tracking-[0.2em]">Bilgileriniz</h2>
              {[
                { id: "name", label: "Ad soyad", type: "text" },
                { id: "org", label: "Kurum", type: "text" },
                { id: "email", label: "E-posta", type: "email" },
              ].map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    type={f.type}
                    required
                    className="mt-2 w-full rounded-sm border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="msg" className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Kullanım senaryosu
                </label>
                <textarea
                  id="msg"
                  rows={5}
                  required
                  className="mt-2 w-full resize-none rounded-sm border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-sm bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
              >
                Gönder
              </button>
            </form>
          )}
        </div>
      </section>
    </SitePage>
  );
}
