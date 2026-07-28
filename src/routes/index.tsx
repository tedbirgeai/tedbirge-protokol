import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tedbirge Saha Ağı — Kaza Yerinden Dosyaya Delil Altyapısı" },
      {
        name: "description",
        content:
          "Trafik ve iş kazası dosyalarında delili kaza yerinden hukuk bürosuna kesintisiz taşıyan KVKK uyumlu, internetsiz çalışan sıfır-bilgi altyapısı. Tedbirge® tescilli teknolojisi.",
      },
      { property: "og:title", content: "Tedbirge Saha Ağı — Delil Zinciri Altyapısı" },
      {
        property: "og:description",
        content:
          "Kapsama olmayan kaza yerinde toplanan delil, imzalı zincirle bozulmadan tazminat dosyasına ulaşır.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const stats = [
  { value: "0 kapsama", label: "internetsiz saha çalışması" },
  { value: "KVKK m.6", label: "özel nitelikli veri uyumu" },
  { value: "Ed25519", label: "imzalı delil zinciri" },
  { value: "24 saat", label: "dosyanın hukukçuya ulaşması" },
];

const features = [
  {
    tag: "DELİL",
    title: "Kaza yerinde bozulmaz delil zinciri",
    body: "Fotoğraf, tutanak, ses kaydı ve konum verisi çekildiği anda Ed25519 ile imzalanır ve SHA-256 özeti zincire yazılır. Dosya sonradan değiştirilirse zincir kırılır; mahkemeye sunulan kayıt bütünlüğü kanıtlanabilir olur.",
  },
  {
    tag: "OFF-GRID",
    title: "Kapsama olmasa da çalışır",
    body: "Kaza yeri şehirlerarası yolda, şantiyede veya maden sahasında olabilir. Cihazlar birbirine LoRa / Wi-Fi Direct ile mesh kurar; ilk internet gören cihaz üzerinden tüm dosyalar merkeze akar.",
  },
  {
    tag: "KVKK",
    title: "Sıfır-bilgi taşıma katmanı",
    body: "Ara düğümler taşıdıkları veriyi göremez; yalnızca bayt sayısı ve özet tutulur. Sağlık raporu gibi özel nitelikli veriler AES-256-GCM ile uçtan uca şifreli kalır.",
  },
  {
    tag: "AI",
    title: "Tedbirge AI ile otomatik ön değerlendirme",
    body: "Merkeze ulaşan belgeler yapay zekâ analizine düşer: maluliyet oranı, kusur yüzdesi ve tahmini tazminat aralığı hesaplanır, Türkçe dilekçe taslağı üretilir.",
  },
  {
    tag: "TAKİP",
    title: "Müvekkil için şeffaf süreç",
    body: "Delilin toplandığı andan dilekçenin sunulduğu ana kadar her adım WhatsApp bildirimi ve online işlem ekranıyla müvekkile yansır.",
  },
  {
    tag: "OPS",
    title: "Büro için tek panel",
    body: "Saha ekipleri, açık dosyalar, bekleyen senkronizasyonlar ve delil bütünlüğü durumu tek ekranda; kurulum gerektirmeyen gömülü yönetim paneli.",
  },
];

const uniques = [
  {
    title: "Rakiplerde olmayan: kopmayan delil zinciri",
    body: "Piyasadaki hukuk yazılımları delili büroya ulaştıktan sonra kayıt altına alır. Tedbirge, imzayı delilin doğduğu saniyede kaza yerinde atar — aradaki boşluk itiraz edilebilir tek noktadır ve biz onu kapatıyoruz.",
  },
  {
    title: "Rakiplerde olmayan: kapsamasız çalışma",
    body: "Şantiye ve karayolu kazalarının önemli kısmı kapsama dışında yaşanır. Mesh katmanı sayesinde ekip veri kaybetmeden çalışır; senkronizasyon ilk sinyalde otomatik tamamlanır.",
  },
  {
    title: "Rakiplerde olmayan: uçtan uca gizlilik",
    body: "Veri taşıyan hiçbir bileşen içeriği okuyamaz. KVKK m.6 kapsamındaki sağlık ve maluliyet verileri için denetime hazır, teknik olarak kanıtlanmış bir gizlilik modeli.",
  },
];

const useCases = [
  {
    title: "Trafik kazası tazminatı",
    body: "Olay yerinde çekilen kare, kaza tespit tutanağı ve hastane evrakı imzalı olarak dosyaya bağlanır; ön değerlendirme aynı gün çıkar.",
  },
  {
    title: "İş kazası ve şantiye",
    body: "Kapsama dışı şantiyede toplanan iş güvenliği kayıtları, tanık beyanları ve fotoğraflar mesh üzerinden kayıpsız merkeze ulaşır.",
  },
  {
    title: "Eksper ve keşif ekipleri",
    body: "Sahadaki eksper raporu, ölçüm ve görsel kanıt tek akışta imzalanır; büro tarafında manuel dosyalama ortadan kalkar.",
  },
  {
    title: "Anlaşmalı hukuk büroları",
    body: "Tedbirge ağındaki bürolar, delil bütünlüğü doğrulanmış dosyaları hazır ön analizle devralır.",
  },
];

function Index() {
  return (
    <SitePage>
      {/* HERO */}
      <section className="brand-hero relative overflow-hidden text-primary-foreground">
        <div className="grid-bg absolute inset-0 opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/12 px-3.5 py-1.5 text-xs font-semibold tracking-wide">
            <span className="size-2 rounded-full bg-accent" />
            Tedbirge® Saha Ağı — kurumsal altyapı
          </div>

          <h1 className="mt-7 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
            Delil kaza yerinde doğar,{" "}
            <span className="text-accent">bozulmadan dosyaya ulaşır</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/80">
            Trafik ve iş kazası tazminatı süreçlerinde en kırılgan halka, delilin sahadan
            büroya taşındığı andır. Tedbirge Saha Ağı bu halkayı internet olmadan çalışan,
            KVKK uyumlu ve imzalı bir zincire dönüştürür.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/iletisim"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Pilot başvurusu
            </Link>
            <Link
              to="/urun"
              className="rounded-lg border border-primary-foreground/30 px-6 py-3 text-sm font-semibold transition-colors hover:bg-primary-foreground/10"
            >
              Platformu incele
            </Link>
          </div>

          <div className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl bg-primary-foreground/15 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-primary/90 px-5 py-6 backdrop-blur">
                <p className="font-mono text-lg font-semibold text-accent">{s.value}</p>
                <p className="mt-1 text-xs text-primary-foreground/75">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>Yetenekler</SectionLabel>
        <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          Tazminat dosyasını uçtan uca ayakta tutan altı katman
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-xl border border-border bg-card p-7 transition-shadow hover:shadow-lg"
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                {f.tag}
              </span>
              <h3 className="mt-4 text-lg font-bold text-foreground">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* UNIQUE */}
      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>Neden benzersiz</SectionLabel>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            Bu nişte kimsenin kapatmadığı üç boşluk
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {uniques.map((u, i) => (
              <div key={u.title} className="rounded-xl border border-border bg-background p-7">
                <span className="font-mono text-sm font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg font-bold">{u.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FLOW */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>Akış</SectionLabel>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              Sahadan dilekçeye tek hat
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Delil toplama, imzalama, taşıma, doğrulama, yapay zekâ analizi ve dilekçe üretimi
              aynı zincirin halkalarıdır. Hiçbir adımda dosya elle kopyalanmaz, hiçbir adımda
              içerik ara bir sunucuda açılmaz.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                "Saha uygulaması — delili çekildiği anda imzalar",
                "Mesh taşıma — kapsama yoksa komşu cihaz üzerinden iletir",
                "Sıfır-bilgi geçit — içerik açılmadan merkeze aktarır",
                "Bütünlük doğrulama — zincir kırıksa dosya işaretlenir",
                "Tedbirge AI — maluliyet, kusur ve tazminat aralığı",
                "Dilekçe taslağı — avukat inceler ve imzalar",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="size-2 rounded-full bg-accent" />
              saha kurulumu
            </div>
            <pre className="mt-5 overflow-x-auto font-mono text-[13px] leading-relaxed text-muted-foreground">
              <code>{`# Ekip cihazi A - kaza yeri
TEDBIRGE_MESH=true \\
TEDBIRGE_NODE_ID=saha-A \\
TEDBIRGE_MESH_ADDR=:7946 tedbirge-gateway

# Ekip cihazi B - A'yi komsu alir
TEDBIRGE_MESH_SEEDS=10.0.0.1:7946 \\
tedbirge-gateway

# Dogrulama
tedbirge-cli chain-verify   # delil zinciri
tedbirge-cli mesh-demo      # 3 cihaz, kayipsiz
tedbirge-cli sync-demo      # 0-internet aktarim`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="border-t border-border bg-muted/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>Kullanım alanları</SectionLabel>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Tazminat dosyasının doğduğu her yer
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {useCases.map((u) => (
              <div key={u.title} className="rounded-xl border border-border bg-background p-7">
                <h3 className="text-lg font-bold">{u.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="brand-hero text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Büronuzda 30 günlük saha pilotu
            </h2>
            <p className="mt-3 max-w-xl text-primary-foreground/80">
              Üç cihazlık bir saha ekibiyle başlayın; delil zincirini ve yapay zekâ ön
              değerlendirmesini kendi dosyalarınızda görün.
            </p>
          </div>
          <Link
            to="/iletisim"
            className="rounded-lg bg-accent px-7 py-3.5 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Görüşme planla
          </Link>
        </div>
      </section>
    </SitePage>
  );
}
