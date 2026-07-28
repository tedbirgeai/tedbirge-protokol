import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/iletisim")({
  head: () => ({
    meta: [
      { title: "Pilot ve İletişim — Tedbirge Saha Ağı" },
      {
        name: "description",
        content:
          "Tedbirge Saha Ağı ile 30 günlük saha pilotu başlatın. Delil zinciri kurulumu ve büro entegrasyonu için görüşme planlayın.",
      },
      { property: "og:title", content: "Tedbirge Saha Ağı — Pilot Başvurusu" },
      {
        property: "og:description",
        content: "Üç cihazlık saha pilotu ve büro paneli entegrasyonu için iletişime geçin.",
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
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
            Büronuzda 30 gün, üç saha cihazı
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Dosya akışınızı anlatın; saha ekibi kurgusu, delil zinciri ve büro paneli
            entegrasyonu için bir uygulama planıyla dönelim.
          </p>

          <div className="mt-10 space-y-4">
            {[
              ["01", "Keşif görüşmesi", "Dosya tipleri, saha koşulları ve mevcut iş akışınız."],
              ["02", "Pilot kurulumu", "Üç cihazlık saha ekibi, büro paneli ve doğrulama testleri."],
              ["03", "Yaygınlaştırma", "Tedbirge AI ön değerlendirmesinin dosya akışına bağlanması."],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-5 rounded-xl border border-border bg-card p-5">
                <span className="font-mono text-sm font-bold text-primary">{n}</span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          {sent ? (
            <div className="flex h-full min-h-72 flex-col items-start justify-center">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                Alındı
              </span>
              <h2 className="mt-3 text-2xl font-bold">Talebiniz kaydedildi</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Bu form şu an sunucuya bağlı değil. Kalıcı kayıt ve e-posta bildirimi
                istersen bir sonraki adımda ekleyebiliriz.
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
              <h2 className="text-sm font-bold uppercase tracking-[0.18em]">Bilgileriniz</h2>
              {[
                { id: "name", label: "Ad soyad", type: "text" },
                { id: "org", label: "Büro / kurum", type: "text" },
                { id: "email", label: "E-posta", type: "email" },
              ].map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    type={f.type}
                    required
                    className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="msg" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Dosya akışınız
                </label>
                <textarea
                  id="msg"
                  rows={5}
                  required
                  className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-accent px-5 py-3 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90"
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
