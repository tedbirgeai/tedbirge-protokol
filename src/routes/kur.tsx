import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { EasyConsole } from "@/components/site/EasyConsole";
import { NextStep } from "@/components/site/NextStep";

const TITLE = "Kolay Kurulum — Tedbirge Gateway Ağınızı 3 Adımda Kurun";
const DESC =
  "Tedbirge Gateway kurulum sihirbazı: tek tıkla ağı başlatın, yeni düğüm ekleyin ve bağlantı durumunu yeşil/kırmızı göstergelerle izleyin. Kriptografi arka planda otomatik çalışır.";
const CANONICAL = "https://tedbirge-gateway.lovable.app/kur";

export const Route = createFileRoute("/kur")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: Setup,
});

const CARDS = [
  {
    t: "Görünmez kriptografi",
    b: "Cihaz kimliği, imzalar ve 256-bit uçtan uca şifreleme cihazın kendi belleğinde üretilir. Bulut bağımlılığı yoktur; kullanıcı hiçbir anahtar görmez.",
  },
  {
    t: "Otomatik 5 düğüm hakkı",
    b: "Ağa katılan her yeni cihaza arka planda ücretsiz düğüm hakkı tanımlanır ve yerel güvenli deftere işlenir. Hak dolunca yükseltme yolu gösterilir.",
  },
  {
    t: "Yasal trafik izolasyonu",
    b: "Sistem genel internet dağıtmaz; yalnızca izole güvenli haberleşme ağı taşır. Düğüm sahibi 5651 kapsamında sağlayıcı konumuna düşmez.",
  },
];

function Setup() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-6 py-10 md:py-14">
          <SectionLabel>Kolay kurulum · kayıt gerekmez</SectionLabel>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
            Ağınızı 3 adımda kurun
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Terminal, komut ya da anahtar yönetimi yok. Klasik bir modem paneli kadar basit:
            başlatın, cihaz ekleyin, ışıklara bakın. Karmaşık her şey arka planda otonom çalışır.
          </p>
          <div className="mt-6">
            <EasyConsole />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <SectionLabel>Arka planda ne oluyor?</SectionLabel>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.t} className="rounded-sm border border-border bg-card/50 p-5">
              <p className="text-sm font-semibold text-foreground">{c.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Ayrıntılı yönetim için{" "}
          <Link to="/panel" className="text-primary hover:underline">
            müşteri paneline
          </Link>{" "}
          geçin ya da{" "}
          <Link to="/mevzuat" className="text-primary hover:underline">
            regülasyon merkezini
          </Link>{" "}
          inceleyin.
        </p>
      </section>
      <NextStep to="/panel" title="Ağınızı yönetmeye geçin" description="Düğüm durumu, telemetri ve lisans olaylarını müşteri panelinden izleyin." />
    </SitePage>
  );
}
