import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { BrowserNodeCard } from "@/components/site/BrowserNodeCard";
import { CarrierBridgeCard } from "@/components/site/CarrierBridgeCard";

const TITLE = "Saha Erişimi — Tedbirge Gateway'e Ücretsiz Tarayıcı Erişimi";
const DESC =
  "Sahadaki ekipler Tedbirge Gateway'i kurulum yapmadan tarayıcıdan test etsin: ücretsiz erişim linki, QR kod ve telefon, tablet ya da bilgisayara uygulama olarak ekleme adımları.";
const CANONICAL = "https://tedbirge-gateway.lovable.app/saha";
const FALLBACK_ORIGIN = "https://tedbirge-gateway.lovable.app";

export const Route = createFileRoute("/saha")({
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
  component: FieldAccess,
});

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

const steps = [
  {
    t: "Android · Chrome",
    b: "Linki tarayıcıya yapıştırın → sağ üstteki ⋮ menüsü → “Uygulamayı yükle” veya “Ana ekrana ekle”. Uygulama simgesi ana ekrana düşer, tam ekran açılır.",
  },
  {
    t: "iPhone / iPad · Safari",
    b: "Linki Safari'de açın → alttaki paylaş simgesi → “Ana Ekrana Ekle” → Ekle. Chrome değil Safari kullanılmalıdır.",
  },
  {
    t: "Windows / macOS · Chrome, Edge",
    b: "Adres çubuğunun sağındaki yükleme simgesine tıklayın veya menüden “Uygulamayı yükle” deyin. Masaüstü kısayolu oluşur.",
  },
  {
    t: "Kurulumsuz kullanım",
    b: "Hiçbir şey yüklemek istemeyen ekipler linki doğrudan tarayıcıda açıp kullanabilir. Hesap, ödeme veya abonelik gerekmez.",
  },
];

function FieldAccess() {
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    QRCode.toDataURL(`${origin}/saha`, {
      width: 512,
      margin: 1,
      color: { dark: "#e8ecff", light: "#00000000" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [origin]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const link = `${origin}/saha`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-10 md:py-14">
          <SectionLabel>Saha erişimi · kayıt gerekmez</SectionLabel>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
            Bu cihazı şimdi düğüme dönüştür
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Aşağıdaki “Düğümü başlat” düğmesine basın. Hesap, ödeme veya kurulum yok; aynı linki
            açan diğer cihazlarla doğrudan (P2P) eşleşir, bağlantı koparsa paketler kuyruğa alınır.
          </p>
          <div className="mt-6">
            <EasyConsole />
          </div>
          <div className="mt-6">
            <BrowserNodeCard />
          </div>
          <div className="mt-6">
            <CarrierBridgeCard />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-border/60">
        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <SectionLabel>Ekibe gönder</SectionLabel>
          <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight md:text-3xl">
            Ücretsiz, kurulumsuz erişim linki
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Aşağıdaki linki paylaşın; Tedbirge Gateway saha arayüzü, canlı mesh simülasyonu ve
            pilot uyum panosu anında açılır. Kayıt, ödeme veya abonelik yok.
          </p>


          <div className="mt-10 grid gap-8 rounded-sm border border-border bg-card/40 p-7 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                Ücretsiz erişim linki
              </p>
              <p className="mt-3 break-all font-mono text-lg text-foreground">{link}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={copy}
                  className="rounded-sm bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
                >
                  {copied ? "Kopyalandı" : "Linki kopyala"}
                </button>
                {installEvent && (
                  <button
                    onClick={() => {
                      installEvent.prompt();
                      setInstallEvent(null);
                    }}
                    className="rounded-sm border border-primary/60 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary hover:bg-primary/10"
                  >
                    Uygulama olarak yükle
                  </button>
                )}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Tedbirge Gateway saha erişimi: ${link}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-sm border border-border px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
                >
                  Ekibe gönder
                </a>
              </div>
            </div>
            {qr && (
              <img
                src={qr}
                alt="Tedbirge Gateway saha erişim linkinin QR kodu"
                width={200}
                height={200}
                loading="lazy"
                className="mx-auto size-[200px] rounded-sm border border-border/60 bg-background/40 p-2"
              />
            )}
          </div>
        </div>
      </section>


      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Cihaza ekleme</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Telefon, tablet ve bilgisayara ücretsiz kurulum
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Tedbirge Gateway arayüzü bir web uygulamasıdır (PWA). Mağaza gerekmez, güncellemeler
          otomatik gelir, simge ana ekranda durur.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {steps.map((s) => (
            <article key={s.t} className="bg-background/60 p-7">
              <h3 className="text-base font-semibold">{s.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.b}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Sahada ne test edilir</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Üç dakikalık saha turu</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                to: "/demo" as const,
                t: "Canlı mesh simülasyonu",
                b: "Üç düğümlü ağı çalıştırın, röleyi düşürün, yolun yeniden kurulmasını izleyin.",
              },
              {
                to: "/pilot-panosu" as const,
                t: "Pilot uyum panosu",
                b: "Kontrol listesini doldurun, kanıt karması alın, PDF raporu üretin.",
              },
              {
                to: "/tasiyicilar" as const,
                t: "Taşıyıcı matrisi",
                b: "Sahadaki fiziksel katmanı seçin, menzil ve yasal sınırı doğrulayın.",
              },
            ].map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="rounded-sm border border-border bg-background/60 p-7 transition-colors hover:border-primary/60"
              >
                <h3 className="text-base font-semibold">{c.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
              </Link>
            ))}
          </div>
          <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
            Saha arayüzü ücretsizdir ve değerlendirme amaçlıdır. Gerçek düğüm kurulumu için
            lisanslı sürüm ve pilot protokolü gerekir; sahada radyo çalıştırırken izin ve
            spektrum kurallarına uyulmalıdır.
          </p>
        </div>
      </section>
    </SitePage>
  );
}
