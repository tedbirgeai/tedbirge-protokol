import { createFileRoute } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/urun")({
  head: () => ({
    meta: [
      { title: "Platform ve Mimari — Tedbirge Saha Ağı" },
      {
        name: "description",
        content:
          "Tedbirge Saha Ağı mimarisi: delil zinciri, mesh taşıma, sıfır-bilgi geçit, Ed25519 güvenlik kalkanı, KVKK uyum katmanı ve büro paneli.",
      },
      { property: "og:title", content: "Tedbirge Saha Ağı — Platform ve Mimari" },
      {
        property: "og:description",
        content:
          "Delil zinciri, internetsiz taşıma, sıfır-bilgi aktarım ve yapay zekâ ön değerlendirme katmanları.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Product,
});

const layers = [
  ["Delil Zinciri Motoru", "Her delil çekildiği anda Ed25519 ile imzalanır; SHA-256 özetleri birbirine bağlı zincir oluşturur, sonradan değişiklik anında görünür."],
  ["Saha Toplama Uygulaması", "Fotoğraf, video, ses, konum ve form verisi çevrimdışı kaydedilir; imza ve zaman damgası cihazda üretilir."],
  ["Mesh Taşıma Katmanı", "Kapsama yoksa cihazlar birbirine bağlanır; çok-sıçramalı yönlendirme ile veri ilk internet gören cihaza taşınır."],
  ["Sıfır-Bilgi Geçit", "AES-256-GCM uçtan uca şifreleme; ara düğümler yalnızca bayt sayısı ve özet görür, içerik hiçbir yerde açılmaz."],
  ["Güvenlik Kalkanı", "Cihaz kimliği, ağa katılım doğrulaması ve nonce kayan penceresiyle tekrar (replay) koruması."],
  ["KVKK Uyum Katmanı", "Özel nitelikli veriler için ayrı şifreleme ve erişim kaydı; her erişim denetim izine yazılır."],
  ["Tedbirge AI Analiz", "Maluliyet oranı, kusur yüzdesi, tahmini tazminat aralığı ve Türkçe dilekçe taslağı üretimi."],
  ["Büro Paneli", "Açık dosyalar, saha ekipleri, bekleyen senkronizasyon, zincir bütünlüğü ve müvekkil bildirimleri tek ekranda."],
];

const threats = [
  ["Delilin sonradan değiştirilmesi", "Zincirlenmiş SHA-256 özeti; tek bayt değişse doğrulama düşer"],
  ["Sahte cihaz / sahte ekip üyesi", "Ed25519 cihaz kimliği ve büro tarafında yetkilendirme"],
  ["Aynı delilin tekrar gönderilmesi", "Tek-kullanımlık nonce ve kayan zaman penceresi"],
  ["Taşıma sırasında içerik sızması", "Uçtan uca AES-256-GCM; ara düğüm içeriği göremez"],
  ["KVKK m.6 ihlali riski", "Özel nitelikli veri ayrı anahtarla şifrelenir, erişimler loglanır"],
  ["Kapsama kaybı nedeniyle veri kaybı", "Yerel WAL + mesh kuyruğu; sinyal gelince otomatik tamamlanır"],
];

const modes = [
  ["Mod: Doğrudan İnternet", "Cihazın kendi bağlantısı var; delil anında merkeze akar"],
  ["Mod: Komşu Üzerinden", "Ekipteki bağlantılı cihaz üzerinden şifreli aktarım yapılır"],
  ["Mod: Tam Çevrimdışı", "Bağlantı yok; delil imzalanıp kuyruğa alınır, sinyalde senkronize olur"],
];

function Product() {
  return (
    <SitePage>
      <section className="brand-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Platform</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
            Sekiz katman, tek delil zinciri
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
            Tedbirge Saha Ağı; kurulum sihirbazı, sunucu orkestrasyonu veya sürekli internet
            gerektirmez. Saha ekibi uygulamayı açar, büro paneli dosyayı hazır bulur.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {layers.map(([title, body], i) => (
            <div key={title} className="rounded-xl border border-border bg-card p-7">
              <span className="font-mono text-xs font-semibold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Güvenlik modeli</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Risk → savunma</h2>
          <div className="mt-10 overflow-hidden rounded-xl border border-border bg-background">
            {threats.map(([t, d], i) => (
              <div
                key={t}
                className={`grid gap-2 px-6 py-5 md:grid-cols-2 ${i % 2 ? "bg-muted/40" : ""}`}
              >
                <p className="font-semibold text-foreground">{t}</p>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Bağlantı modları</SectionLabel>
        <h2 className="mt-4 text-3xl font-bold tracking-tight">
          Kapsama olsa da olmasa da aynı akış
        </h2>
        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-center">
          <pre className="overflow-x-auto rounded-xl border border-border bg-card p-6 font-mono text-[12.5px] leading-relaxed text-muted-foreground">
            <code>{`Saha cihazi A (internet YOK)   Ekip cihazi B (baglanti VAR)
+--------------------------+   +--------------------------+
| Delil imzalanir          |   | Sifreli paket iletilir   |
| AES-256-GCM ile kapanir  |==>| icerik B'ye kapalidir    | ==> Tedbirge
| yerel kuyruga alinir     |   | teslim onayi geri doner  | <==   merkez
+--------------------------+   +--------------------------+`}</code>
          </pre>
          <div className="space-y-4">
            {modes.map(([badge, desc]) => (
              <div key={badge} className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-bold text-primary">{badge}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SitePage>
  );
}
