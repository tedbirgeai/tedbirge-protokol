import { Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { PROTOCOL_LAYERS } from "@/lib/protocol-layers";
import { AppGetPanel } from "@/components/site/AppGetPanel";

/** Kurumsal tanıtım sayfası gövdesi — hem "/" hem "/kurumsal" tarafından kullanılır. */
const stats = [
  { value: "2 tıkla", label: "kurulum — dosya indirme yok" },
  { value: "%99,9", label: "hedeflenen bağlantı sürekliliği" },
  { value: "10 taşıyıcı", label: "Yerel geçit · Ethernet · Wi-Fi · LoRa · Uydu · Hücresel" },
  { value: "E2EE", label: "uçtan uca şifreli, sıfır-bilgi" },
];

const benefits = [
  {
    tag: "SÜREKLILIK",
    title: "Hat koptuğunda oturum düşmez",
    body: "Bağlantı zayıfladığında trafik en hızlı alternatif taşıyıcıya otomatik geçer. Ekipleriniz kesintiyi fark etmez, müdahale gerekmez.",
  },
  {
    tag: "GÜVENLİK",
    title: "Uçtan uca şifreli, sıfır-bilgi",
    body: "Veriniz yalnızca gönderen ve alan cihazda okunabilir. Ara noktalar içeriği göremez; sistem yalnızca hacim bilgisini tutar.",
  },
  {
    tag: "ÇEVRİMDIŞI",
    title: "İnternetsiz sahada veri kaybı yok",
    body: "Bağlantı yokken ölçüm ve mesajlar cihazda güvenle bekler; hat geldiğinde kayıpsız biçimde merkeze aktarılır.",
  },
  {
    tag: "KOLAYLIK",
    title: "Kurulum dosyası ve terminal yok",
    body: "Bilgisayar, tablet veya telefonda tarayıcıyı açın, “Ağı başlat” deyin. Kimlik, şifreleme ve doğrulama arka planda tamamlanır.",
  },
  {
    tag: "GÖRÜNÜRLÜK",
    title: "Tek ekranda canlı teşhis",
    body: "Gecikme, teslim oranı ve kuyruk durumu anlık izlenir; sorun büyümeden uyarı alır, raporunu tek tıkla dışa aktarırsınız.",
  },
  {
    tag: "YÖNETİM",
    title: "Rol bazlı kurumsal panel",
    body: "Yönetici, operatör ve izleyici yetkileri ayrıdır. Lisans, kota, olay günlüğü ve kurumsal teklif üretimi aynı panelde.",
  },
];

const useCases = [
  {
    title: "Savunma & Kamu",
    body: "Altyapısız sahada komuta-kontrol trafiği: merkezi sunucu gerekmeden şifreli ve kesintisiz iletişim.",
  },
  {
    title: "Enerji & Maden",
    body: "Kapsama dışı tesislerde saha ölçümleri toplanır, bağlantısı olan tek noktadan merkeze aktarılır.",
  },
  {
    title: "Afet & İnsani Yardım",
    body: "Şebeke çöktüğünde saatler içinde kurulan yerel ağ; internet olmadan mesaj ve dosya paylaşımı sürer.",
  },
  {
    title: "Telekom & ISP",
    body: "Alternatif taşıyıcılarla son-kilometre kapsaması ve kullanım bazlı faturalanan yönetilen hizmet.",
  },
];

export function MarketingHome() {
  return (
    <SitePage>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-70" aria-hidden />
        <div
          className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Resilience-as-a-Service
          </div>

          <h1 className="mt-7 max-w-3xl text-4xl leading-[1.08] font-semibold tracking-tight text-foreground md:text-6xl">
            İnternet kesilse de{" "}
            <span className="text-primary">çalışmaya devam eden ağ</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tedbirge Protocol, kurumunuzun bağlantı sürekliliğini yedi katmanla güvence altına alır.
            Kurulum dosyası, terminal veya anahtar yönetimi yok: tarayıcınızı açın, iki tıkla ağa
            katılın. Şifreleme ve doğrulama arka planda otomatik çalışır.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/chat"
              className="rounded-sm bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sohbete katıl / Uygulama
            </Link>
            <Link
              to="/kur"
              className="rounded-sm border border-border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
            >
              2 tıkla başlat
            </Link>
            <Link
              to="/protokol"
              className="rounded-sm border border-border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
            >
              7 katmanı incele
            </Link>
            <Link
              to="/iletisim"
              className="rounded-sm border border-border px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
            >
              Pilot başvurusu
            </Link>
          </div>

          <div className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-background/80 px-5 py-6">
                <p className="font-mono text-xl text-primary">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AppGetPanel />

      {/* 7 LAYERS */}
      <section className="border-b border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>Tedbirge Protocol</SectionLabel>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Tek çatı, yedi katman
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Her katman tek bir işi yapar ve birbirini yedekler. Karmaşık olan her şey arka planda;
            sizin tarafınızda yalnızca açık isimler ve hızlı aksiyonlar var.
          </p>

          <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
            {PROTOCOL_LAYERS.map((l) => (
              <Link
                key={l.name}
                to={l.action.to}
                className="group bg-background/70 p-7 transition-colors hover:bg-card"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] text-primary">
                    {l.n}
                  </span>
                  <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-primary">
                    {l.name}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{l.tagline}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{l.body}</p>
                <span className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground group-hover:text-primary">
                  {l.action.label} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>Neden Tedbirge</SectionLabel>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Kurumsal ağ ekipleri için altı somut kazanım
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((f) => (
            <article key={f.title} className="bg-card/60 p-7 transition-colors hover:bg-card">
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
                {f.tag}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>Nasıl çalışır</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Üç adım, sıfır teknik bilgi
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Kurulum sihirbazı sizi üç adımda ağa alır. Güvenli kimlik oluşturma, cihaz doğrulama
              ve şifreli bağlantı kurulumu arka planda otomatik tamamlanır.
            </p>
            <ol className="mt-7 space-y-4 text-sm">
              {[
                ["1", "Ağı başlatın", "Tarayıcıda tek düğmeye basın; cihaz saniyeler içinde ağın parçası olur."],
                ["2", "Cihaz ekleyin", "Bağlantıyı paylaşın veya karekodu okutun; karşı taraf tek dokunuşla katılır."],
                ["3", "İzleyin", "Panelde bağlı cihazlar, gecikme ve uyarılar canlı görünür."],
              ].map(([n, t, b]) => (
                <li key={n} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] text-primary">
                    {n}
                  </span>
                  <span>
                    <span className="block font-medium text-foreground">{t}</span>
                    <span className="mt-1 block text-muted-foreground">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/kur"
                className="rounded-sm bg-primary px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
              >
                Kurulum sihirbazı
              </Link>
              <Link
                to="/demo"
                className="rounded-sm border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
              >
                Tarayıcıda dene
              </Link>
            </div>
          </div>

          <div className="rounded-sm border border-border bg-background/80 p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Arka planda otomatik
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                "Güvenli cihaz kimliği ve doğrulanmış düğüm rozeti",
                "Uçtan uca şifreleme ve sıfır-bilgi ölçüm",
                "En iyi taşıyıcıya otomatik geçiş (failover)",
                "Çevrimdışı kuyruk ve kayıpsız senkronizasyon",
                "Yasal uyum: BTK yayın süresi sınırı, KVKK ve 5651 çerçevesi",
                "Kurtarma anahtarıyla cihaz değişiminde kimlik taşıma",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-muted-foreground">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              Bu işlemler için ayar yapmanız, anahtar kopyalamanız veya komut çalıştırmanız
              gerekmez. Panelde yalnızca sonuçları görürsünüz.
            </p>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <SectionLabel>Kullanım alanları</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Kapsamanın bittiği yerde başlar
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {useCases.map((u) => (
            <div key={u.title} className="rounded-sm border border-border bg-card/40 p-7">
              <h3 className="text-lg font-semibold">{u.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/afet-kamu"
            className="rounded-sm border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
          >
            Afet & kamu senaryosu
          </Link>
          <Link
            to="/karsilastirma"
            className="rounded-sm border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-secondary"
          >
            Alternatiflerle karşılaştır
          </Link>
        </div>
      </section>

      {/* PROOF */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionLabel>Doğrulanmış davranış</SectionLabel>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Referans yerine kendi sahanızda ölçüm
          </h2>
          <p className="mt-5 max-w-2xl text-muted-foreground">
            Müşteri logosu göstermiyoruz. Onun yerine, iddialarımızı kendi cihazınızda
            tekrarlayabileceğiniz üç testle kanıtlıyoruz.
          </p>
          <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-3">
            {[
              {
                cmd: "Çok düğümlü aktarım",
                result: "3 cihaz · kayıpsız",
                note: "Cihazlar birbirine doğrudan ulaşamasa bile veri komşu üzerinden eksiksiz iletilir.",
              },
              {
                cmd: "İnternetsiz paylaşım",
                result: "0 bağlantı · dosya takası",
                note: "Hat tamamen kapalıyken iki cihaz arasında güvenli aktarım ve kayıt.",
              },
              {
                cmd: "Çıkış noktası köprüsü",
                result: "komşu üzerinden internet",
                note: "Bağlantısı olmayan cihaz, komşu çıkış noktası üzerinden şifreli olarak dışarı çıkar.",
              },
            ].map((t) => (
              <div key={t.cmd} className="bg-background/70 p-7">
                <p className="font-mono text-[12px] text-primary">{t.cmd}</p>
                <p className="mt-3 text-sm font-medium">{t.result}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/demo"
              className="rounded-sm bg-primary px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              Tarayıcıda dene
            </Link>
            <Link
              to="/fiyatlandirma"
              className="rounded-sm border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
            >
              RaaS paketleri
            </Link>
            <Link
              to="/rehber"
              className="rounded-sm border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:bg-secondary"
            >
              Mühendislik rehberleri
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Kendi sahanızda 30 günlük pilot
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Mühendislik ekibimizle üç cihazlık bir ağ kurun, süreklilik ölçümlerini kendi
              raporunuzla doğrulayın.
            </p>
          </div>
          <Link
            to="/iletisim"
            className="rounded-sm bg-primary px-7 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            Görüşme planla
          </Link>
        </div>
      </section>
    </SitePage>
  );
}
