import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "Devlet İzinleri ve Ruhsatlar — Tedbirge Gateway Çalışma İzni";
const DESC =
  "Tedbirge Gateway'i Türkiye'de aktif çalıştırmak için hangi kurumdan hangi izin, belge veya bildirim gerekir? BTK yetkilendirme, telsiz kurma izni, frekans tahsisi, KVKK VERBİS, ETBİS, ihracat kontrolü ve kamu alım belgeleri madde madde.";
const URL = "https://tedbirge-gateway.lovable.app/izinler";

export const Route = createFileRoute("/izinler")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Permits,
});

type Permit = {
  name: string;
  body: string;
  needed: "Gerekmez" | "Koşullu" | "Gerekli";
  when: string;
  how: string;
  time: string;
};

const permits: Permit[] = [
  {
    name: "İşletmeci yetkilendirmesi (bildirim / kullanım hakkı)",
    body: "BTK",
    needed: "Koşullu",
    when:
      "Yalnızca üçüncü kişilere bedelli/kamuya açık elektronik haberleşme hizmeti sunulursa gerekir. Kapalı devre kurum içi kullanımda gerekmez.",
    how: "BTK e-Devlet başvurusu · 5809 s. Kanun m.8 kapsamında bildirim veya kullanım hakkı",
    time: "Bildirim: ~1 ay · Kullanım hakkı: 2–6 ay",
  },
  {
    name: "Telsiz kurma ve kullanma izni / ruhsatnamesi",
    body: "BTK",
    needed: "Koşullu",
    when:
      "KEGY kapsamındaki lisanssız bantlarda (868 MHz SRD, 2.4/5 GHz, 60 GHz) izin gerekmez. Tahsisli bant, yüksek güç veya harici anten ile yönlü link kurulursa ruhsat gerekir.",
    how: "BTK Telsiz İşlemleri · kurulum dosyası, cihaz uygunluk beyanı, koordinat ve anten bilgisi",
    time: "1–3 ay",
  },
  {
    name: "Frekans tahsisi",
    body: "BTK Spektrum Yönetimi",
    needed: "Gerekmez",
    when:
      "Varsayılan TR profili yalnızca lisanssız bantları ve müşterinin mevcut hücresel/uydu aboneliklerini kullanır. Tahsisli bant talebi olursa müşteri adına başvurulur.",
    how: "Frekans tahsis talep formu · teknik gerekçe raporu",
    time: "3–6 ay (talep halinde)",
  },
  {
    name: "Cihaz piyasaya arz uygunluğu (TDDY/RED + EMC + LVD, CE)",
    body: "Sanayi ve Teknoloji Bakanlığı · BTK",
    needed: "Koşullu",
    when:
      "Salt yazılım satışında yükümlülük yoktur; yük donanım üreticisi/ithalatçısındadır. Referans donanım paketi satılırsa Tedbirge'ye geçer.",
    how: "Onaylanmış kuruluş + akredite laboratuvar testleri · AB Uygunluk Beyanı · teknik dosya (10 yıl)",
    time: "2–4 ay",
  },
  {
    name: "Yer/erişim sağlayıcı faaliyet belgesi (5651)",
    body: "BTK · Erişim Sağlayıcıları Birliği",
    needed: "Koşullu",
    when:
      "Türkiye'de kamuya internet erişimi sağlanırsa alınır. Kurum içi kapalı mesh ve exit node kullanımında gerekmez.",
    how: "BTK faaliyet belgesi başvurusu · trafik bilgisi saklama altyapısı taahhüdü",
    time: "1–2 ay",
  },
  {
    name: "VERBİS kaydı",
    body: "KVKK Kurumu",
    needed: "Koşullu",
    when:
      "Yıllık çalışan sayısı 50'den az ve mali bilanço 25 milyon TL altındaki, ana faaliyeti özel nitelikli veri işleme olmayan veri sorumluları kayıttan muaftır. Eşik aşılırsa kayıt zorunludur.",
    how: "verbis.kvkk.gov.tr · veri envanteri, saklama-imha politikası, irtibat kişisi",
    time: "1–2 hafta",
  },
  {
    name: "ETBİS kaydı (e-ticaret bilgi sistemi)",
    body: "Ticaret Bakanlığı",
    needed: "Gerekli",
    when:
      "Kendi alan adı üzerinden çevrim içi lisans/abonelik satışı yapılacağı için e-ticaret hizmet sağlayıcı olarak kayıt zorunludur.",
    how: "e-Devlet · ETBİS kayıt formu · alan adı doğrulama",
    time: "1–2 hafta",
  },
  {
    name: "Ticari elektronik ileti izni (İYS)",
    body: "Ticaret Bakanlığı · İleti Yönetim Sistemi",
    needed: "Koşullu",
    when: "Pazarlama amaçlı e-posta/SMS gönderilecekse onaylar İYS'ye yüklenmelidir.",
    how: "iys.org.tr üzerinden marka kaydı ve onay yükleme",
    time: "1 hafta",
  },
  {
    name: "Çift kullanım / kripto ihracat beyanı",
    body: "Ticaret Bakanlığı · Dışişleri Bakanlığı",
    needed: "Gerekli",
    when:
      "Wassenaar Kat. 5 Böl. 2 kapsamındaki şifreleme yazılımının yurt dışına lisanslanmasında son kullanıcı beyanı ve yaptırım listesi taraması zorunludur.",
    how: "Son kullanıcı beyanı · liste taraması · 5 yıl kayıt saklama",
    time: "İşlem başına 1–5 gün",
  },
  {
    name: "Şahıs firması vergi ve fatura yükümlülüğü",
    body: "Gelir İdaresi Başkanlığı",
    needed: "Gerekli",
    when: "Yurt içi/yurt dışı lisans satışında e-Arşiv fatura ve KDV/stopaj yükümlülüğü.",
    how: "Vergi dairesi mükellefiyeti · e-Arşiv fatura entegratörü",
    time: "Kurulu",
  },
  {
    name: "Yerli Malı Belgesi · TSE Hizmet Yeterlilik",
    body: "TOBB · TSE",
    needed: "Koşullu",
    when: "Kamu ihalelerinde %15 fiyat avantajı ve teknik şartname uygunluğu için istenir.",
    how: "Sanayi/ticaret odası eksper raporu · TSE HYB denetimi",
    time: "2–3 ay",
  },
  {
    name: "AFAD pilot protokolü",
    body: "AFAD · İl AFAD müdürlükleri",
    needed: "Koşullu",
    when:
      "Afet tatbikatı veya kamu sahasında pilot yapılacaksa yazılı protokol ve olağanüstü hal frekans talimatına uyum gerekir.",
    how: "Pilot protokol taslağı · kapsam ve taşıyıcı listesi ekli",
    time: "1–2 ay",
  },
];

const summary = [
  {
    t: "Bugünkü satış modeli için zorunlu olanlar",
    b: "ETBİS kaydı, vergi/e-Arşiv fatura düzeni, çift kullanım ihracat beyanı ve (pazarlama iletisi gönderilecekse) İYS. Bunların dışında yazılımın kendisini satmak ve kurum içi kullanmak için ön izin gerekmez.",
  },
  {
    t: "Lisanssız bantta çalışırken izin gerekmez",
    b: "BTK KEGY kapsamındaki 868 MHz SRD (25 mW e.r.p., %1 görev döngüsü), 2.4/5 GHz Wi-Fi ve 60 GHz bantlarında CE/TDDY belgeli cihazla çalışmak için telsiz ruhsatı aranmaz. Tedbirge TR profili bu sınırlara imzalı yapılandırma ile kilitlidir.",
  },
  {
    t: "İzin eşiğini aşan üç senaryo",
    b: "(1) Üçüncü kişilere kamuya açık haberleşme/internet hizmeti sunmak, (2) tahsisli frekans veya güç tavanı üstü yönlü link kurmak, (3) referans donanımı kendi adınıza piyasaya arz etmek. Bu üçünde sırasıyla BTK yetkilendirmesi, telsiz ruhsatı ve CE/TDDY uygunluk yükü doğar.",
  },
  {
    t: "Yurt dışı",
    b: "Her ülkede spektrum kuralı yereldir; hedef ülke profili spektrum matrisinde tanımlıdır. Kripto ihracatında Türkiye beyanına ek olarak alıcı ülkenin ithalat kısıtı (ör. Rusya FSB bildirimi, Çin ticari şifreleme rejimi) kontrol edilir.",
  },
];

function Permits() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>İzin & ruhsat</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Sistemi çalıştırmak için devletten hangi izni almalıyız?
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Kısa cevap: yazılımı geliştirmek, satmak ve lisanssız bantlarda kurum içi
            çalıştırmak için ön izin gerekmez. İzin eşiği; kamuya hizmet sunma, tahsisli
            frekans ve donanım arzı senaryolarında doğar. Aşağıda kurum kurum tablo.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {summary.map((s) => (
            <article key={s.t} className="bg-background/60 p-7">
              <h2 className="text-base font-semibold">{s.t}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.b}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>İzin matrisi</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Belge, kurum, gereklilik ve süre
          </h2>
          <div className="mt-10 overflow-x-auto rounded-sm border border-border">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-card/60 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="px-5 py-4">Belge / izin</th>
                  <th className="px-5 py-4">Kurum</th>
                  <th className="px-5 py-4">Durum</th>
                  <th className="px-5 py-4">Ne zaman gerekir</th>
                  <th className="px-5 py-4">Nasıl alınır</th>
                  <th className="px-5 py-4">Süre</th>
                </tr>
              </thead>
              <tbody>
                {permits.map((p) => (
                  <tr key={p.name} className="border-t border-border/60 align-top">
                    <td className="px-5 py-4 font-medium text-foreground">{p.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{p.body}</td>
                    <td className="px-5 py-4 font-mono text-[12px] text-primary">{p.needed}</td>
                    <td className="px-5 py-4 text-muted-foreground">{p.when}</td>
                    <td className="px-5 py-4 text-muted-foreground">{p.how}</td>
                    <td className="px-5 py-4 font-mono text-[12px] text-muted-foreground">
                      {p.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Kaynaklar: 5809 s. Elektronik Haberleşme Kanunu, BTK Kısa Mesafe Erişimli Telsiz
            Cihazları Yönetmeliği, BTK Telsiz Ekipmanları Yönetmeliği (2014/53/AB), 5651 s.
            Kanun, 6698 s. KVKK ve VERBİS tebliğleri, 6563 s. Kanun ve ETBİS Yönetmeliği,
            Wassenaar Düzenlemesi Kategori 5 Bölüm 2. Bilgilendirme amaçlıdır; hukuki görüş
            yerine geçmez.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/pilot-panosu"
            className="rounded-sm bg-primary px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            Pilot uyum panosu
          </Link>
          <Link
            to="/turkiye-mevzuat"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Türkiye mevzuatı
          </Link>
          <Link
            to="/sertifikasyon"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Sertifikasyon & test
          </Link>
        </div>
      </section>
    </SitePage>
  );
}
