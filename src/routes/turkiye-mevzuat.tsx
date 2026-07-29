import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "Türkiye Mevzuat Uyumu — BTK, KVKK, TSE ve Kamu Kuralları";
const DESC =
  "Tedbirge Gateway'in Türkiye'deki yasal çerçeveye tam uyumu: 5809 sayılı Elektronik Haberleşme Kanunu, BTK telsiz ve KEGY kuralları, TDDY/EMC/LVD işaretlemesi, KVKK 6698, 5651, 6563 ve kamu alım gereklilikleri.";
const URL = "https://artisan-project-studio.lovable.app/turkiye-mevzuat";

export const Route = createFileRoute("/turkiye-mevzuat")({
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
  component: TurkeyRegulation,
});

type Item = {
  law: string;
  authority: string;
  scope: string;
  status: string;
  action: string;
};

const framework: Item[] = [
  {
    law: "5809 s. Elektronik Haberleşme Kanunu",
    authority: "BTK",
    scope:
      "Elektronik haberleşme hizmeti sunumu, şebeke işletimi, telsiz kurma ve kullanma esasları.",
    status: "Uyumlu — yetkilendirme gerektirmeyen kapsam",
    action:
      "Tedbirge yazılımı üçüncü kişilere kamuya açık haberleşme hizmeti satmaz; müşteri kendi kapalı devre şebekesini işletir. Kamuya hizmet sunulacaksa müşteri BTK'dan işletmeci yetkilendirmesi alır.",
  },
  {
    law: "Telsiz Ekipmanları Yönetmeliği (2014/53/AB — TDDY/RED)",
    authority: "BTK · Sanayi ve Teknoloji Bakanlığı",
    scope: "Radyo arayüzü içeren cihazların piyasaya arzı, CE işareti ve uygunluk beyanı.",
    status: "Kapsam dışı (salt yazılım) — donanımda OEM sorumlu",
    action:
      "Tedbirge radyo donanımı üretmez veya sevk etmez. Referans donanım paketi talep edilirse TDDY uygunluk beyanı, teknik dosya ve CE işaretlemesi üretici/ithalatçı sıfatıyla tamamlanır.",
  },
  {
    law: "Kısa Mesafe Erişimli Telsiz Cihazları Yönetmeliği (KEGY)",
    authority: "BTK",
    scope:
      "Lisanssız/izinsiz kullanılabilen frekans bantları, azami çıkış gücü ve görev döngüsü tavanları.",
    status: "Uyumlu — TR profili varsayılan",
    action:
      "TEDBIRGE_REGION=TR profili 868 MHz SRD bandını 25 mW e.r.p. ve %1 görev döngüsü ile sınırlar; 2.4/5 GHz Wi-Fi ve 60 GHz KEGY tavanlarına bağlıdır. Wi-Fi HaLow (900 MHz) ve TVWS Türkiye'de üretim yapılandırmasında kapalıdır.",
  },
  {
    law: "Frekans Tahsis / Milli Frekans Planı",
    authority: "BTK",
    scope: "Bant kullanım hakları, tahsisli bantlarda kullanım izni.",
    status: "Uyumlu — tahsisli bant kullanılmaz",
    action:
      "Varsayılan yapılandırmada yalnızca lisanssız bantlar ve müşterinin mevcut abonelikleri (hücresel, uydu) kullanılır. Tahsisli bant gerekiyorsa frekans tahsis başvurusu müşteri adına yapılır.",
  },
  {
    law: "EMC Yönetmeliği (2014/30/AB) · Alçak Gerilim Yönetmeliği (2014/35/AB)",
    authority: "Sanayi ve Teknoloji Bakanlığı",
    scope: "Elektromanyetik uyumluluk ve elektriksel güvenlik.",
    status: "Kapsam dışı (salt yazılım)",
    action:
      "Donanım tedarikinde EN 55032/55035 ve EN 62368-1 test raporları akredite laboratuvardan alınır ve teknik dosyaya eklenir.",
  },
  {
    law: "Elektromanyetik Alan Şiddeti Limit Değerleri Yönetmeliği",
    authority: "BTK",
    scope: "İnsanların maruz kaldığı EM alan şiddeti limitleri ve güvenlik mesafesi.",
    status: "Uyumlu — düşük güç sınıfı",
    action:
      "Lisanssız bant güç tavanları limit değerlerin altındadır. Yönlü 60 GHz veya harici anten kullanılan kurulumlarda güvenlik mesafesi hesabı kurulum dosyasına eklenir.",
  },
  {
    law: "6698 s. Kişisel Verilerin Korunması Kanunu (KVKK)",
    authority: "KVKK Kurumu",
    scope: "Kişisel veri işleme, aydınlatma, veri güvenliği ve yurt dışına aktarım.",
    status: "Uyumlu — sıfır-bilgi mimari",
    action:
      "Tünel içeriği saklanmaz; yalnızca SHA-256 özeti ve bayt sayacı tutulur. Web sitesi tarafında toplanan pilot başvurusu verileri için aydınlatma metni ve açık rıza akışı yayımlanmıştır; VERBİS yükümlülüğü eşik aşıldığında yerine getirilir.",
  },
  {
    law: "Elektronik Haberleşme Sektöründe Kişisel Verilerin İşlenmesi ve Gizliliğin Korunması Yönetmeliği",
    authority: "BTK",
    scope: "Trafik ve konum verisi, haberleşmenin gizliliği.",
    status: "Uyumlu — trafik verisi üretilmez",
    action:
      "Sistem abone bazlı trafik kaydı, konum kaydı veya içerik kaydı tutmaz. İşletmeci sıfatıyla kullanan müşteriler kendi kayıt yükümlülüklerini kendi katmanlarında yerine getirir.",
  },
  {
    law: "5651 s. İnternet Ortamında Yapılan Yayınların Düzenlenmesi Hakkında Kanun",
    authority: "BTK · Erişim Sağlayıcıları Birliği",
    scope: "Erişim/yer sağlayıcı yükümlülükleri, trafik bilgisi saklama.",
    status: "Müşteri sorumluluğu — teknik destek sağlanır",
    action:
      "Tedbirge erişim sağlayıcı değildir. Türkiye'de kamuya internet erişimi sağlamak için kullanılırsa müşteri erişim sağlayıcı yükümlülüklerinden sorumludur; gerekli log arayüzü opsiyonel modül olarak sağlanır.",
  },
  {
    law: "6563 s. Elektronik Ticaretin Düzenlenmesi · Mesafeli Sözleşmeler Yönetmeliği",
    authority: "Ticaret Bakanlığı",
    scope: "Ticari elektronik ileti, ön bilgilendirme, cayma hakkı, satıcı künyesi.",
    status: "Uyumlu",
    action:
      "Satıcı künyesi (Mehmet DİNÇ — Tedbirge Gateway), kullanım koşulları, gizlilik bildirimi ve iade politikası sitede yayımlanmıştır; dijital içerikte cayma hakkı istisnası ayrıca bildirilir.",
  },
  {
    law: "Çift Kullanımlı Malzeme ve Teknoloji İhracat Kontrolü",
    authority: "Ticaret Bakanlığı · Dışişleri Bakanlığı",
    scope: "Wassenaar Kategori 5 Bölüm 2 kapsamındaki kriptografik yazılım ihracatı.",
    status: "Uyumlu — beyan süreci işletiliyor",
    action:
      "Kurumsal lisanslarda son kullanıcı beyanı alınır, yaptırım listeleri taranır ve kayıtlar en az 5 yıl saklanır. Ayrıntı: İhracat kontrolü sayfası.",
  },
  {
    law: "5070 s. Elektronik İmza Kanunu",
    authority: "BTK",
    scope: "Elektronik imzanın hukuki geçerliliği.",
    status: "Bilgi — Ed25519 hukuki e-imza değildir",
    action:
      "Off-Grid fişlerindeki Ed25519 imzaları teknik bütünlük kanıtıdır; nitelikli elektronik imza yerine geçmez. Hukuki bağlayıcılık gereken senaryolarda nitelikli sertifika entegrasyonu ayrıca kurulur.",
  },
  {
    law: "4734 s. Kamu İhale Kanunu · Yerli Malı Tebliği",
    authority: "KİK · TOBB · Sanayi ve Teknoloji Bakanlığı",
    scope: "Kamu alımlarında yerlilik oranı ve fiyat avantajı.",
    status: "Hazırlık aşamasında",
    action:
      "Yazılım tamamen Türkiye'de geliştirilmektedir; Yerli Malı Belgesi başvurusu ve TSE Hizmet Yeterlilik Belgesi süreci planlanmıştır.",
  },
  {
    law: "Afet ve Acil Durum Haberleşmesi (AFAD/TAMP)",
    authority: "AFAD · İçişleri Bakanlığı",
    scope: "Afet anında haberleşme sürekliliği ve kamu koordinasyonu.",
    status: "Pilot kapsamında",
    action:
      "Afet senaryolarında altyapısız mesh çalışma modu; kamu kurumlarıyla pilot protokolü kapsamında BTK'nın olağanüstü hal frekans talimatlarına uyulur.",
  },
  {
    law: "Bilgi ve İletişim Güvenliği Rehberi (Cumhurbaşkanlığı Genelgesi 2019/12)",
    authority: "Cumhurbaşkanlığı Dijital Dönüşüm Ofisi",
    scope: "Kamu kurumlarında kritik veri ve kriptografi kuralları.",
    status: "Uyumlu tasarım",
    action:
      "Veri yurt içinde kalır, anahtarlar müşteri kontrolündedir, harici bulut bağımlılığı yoktur. Kritik kurum kurulumlarında rehberin varlık gruplandırma ve sızma testi maddeleri uygulanır.",
  },
  {
    law: "TS ISO/IEC 27001 · Ortak Kriterler (TSE/TÜBİTAK BİLGEM)",
    authority: "TSE · TÜBİTAK BİLGEM OKTEM",
    scope: "Bilgi güvenliği yönetim sistemi ve ürün güvenlik değerlendirmesi.",
    status: "Yol haritasında",
    action:
      "Kurumsal satış eşiği aşıldığında ISO 27001 belgelendirmesi; kamu/savunma alımı halinde Ortak Kriterler EAL2+ değerlendirmesi hedeflenmektedir.",
  },
];

const checklist = [
  {
    t: "Pilot öncesi: yazılı kapsam",
    b: "Pilot alanı, kullanılacak taşıyıcılar ve frekans bantları protokolde yazılı olarak sabitlenir; kapsam dışı taşıyıcı üretim profilinde kapalı bırakılır.",
  },
  {
    t: "Donanım: CE + TDDY belgeli cihaz",
    b: "Sahada yalnızca Türkiye'de piyasaya arz edilmiş, CE işaretli ve TDDY uygunluk beyanı bulunan radyo cihazları kullanılır. Belgesiz veya SDR ile güç/frekansı değiştirilebilen cihaz sahaya çıkarılmaz.",
  },
  {
    t: "Yapılandırma: bölge kilidi",
    b: "TEDBIRGE_REGION=TR profili operatör tarafından değiştirilemeyecek şekilde imzalı yapılandırma ile dağıtılır; görev döngüsü bütçesi çalışma zamanında zorlanır.",
  },
  {
    t: "Veri: KVKK envanteri",
    b: "Pilotta işlenen kişisel veri kalemleri, saklama süresi ve imha planı kişisel veri envanterine işlenir; aydınlatma metni katılımcılara sunulur.",
  },
  {
    t: "Kayıt: 5 yıllık dosya",
    b: "Kurulum dosyası, uygunluk beyanları, EM alan hesabı, son kullanıcı beyanı ve pilot raporu en az 5 yıl arşivlenir; denetimde ibraz edilir.",
  },
  {
    t: "Olay: bildirim süreleri",
    b: "Kişisel veri ihlali KVKK Kurumuna 72 saat içinde, hizmet kesintileri sözleşmede tanımlı süre içinde müşteriye bildirilir.",
  },
];

const openPoints = [
  "Wi-Fi HaLow (802.11ah) ve TVWS için Türkiye'de yürürlükte bir lisanssız çerçeve bulunmadığından bu iki taşıyıcı TR profilinde kapalıdır; BTK düzenlemesi yayımlanana kadar açılmayacaktır.",
  "Kamuya açık haberleşme hizmeti sunacak müşteriler için BTK işletmeci yetkilendirmesi gerekir; bu yükümlülük yazılım sağlayıcısına değil hizmeti sunan tarafa aittir.",
  "Referans donanım satışına geçilmesi halinde TDDY/EMC/LVD uygunluk yükü Tedbirge'ye geçer; bu adım öncesi akredite laboratuvar ve onaylanmış kuruluş anlaşması yapılacaktır.",
  "FSO lazer bağlantılarında IEC 60825-1 Class 1M sınırının aşılmaması ve iş sağlığı güvenliği risk değerlendirmesinin yapılması kurulum ekibinin sorumluluğundadır.",
  "Kripto ihracat beyanı Türkiye'den yapılan yurt dışı satışlar için de geçerlidir; AB dışına kurumsal lisans satışında Ticaret Bakanlığı çift kullanım listesi kontrolü zorunludur.",
];

function TurkeyRegulation() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Türkiye mevzuatı</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Pilot ülkemiz Türkiye — mevzuat madde madde karşılanmıştır
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tedbirge Gateway'in ilk konuşlanma alanı Türkiye'dir. Aşağıda BTK, Sanayi ve
            Teknoloji Bakanlığı, KVKK Kurumu, Ticaret Bakanlığı ve AFAD çerçevesindeki
            yükümlülükler; her biri için ürünün konumu ve alınan aksiyon listelenmiştir.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>1 · Mevzuat matrisi</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Kanun, düzenleyici, kapsam ve durumumuz
        </h2>
        <div className="mt-10 overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-card/60 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="px-5 py-4">Mevzuat</th>
                <th className="px-5 py-4">Kurum</th>
                <th className="px-5 py-4">Kapsam</th>
                <th className="px-5 py-4">Durum</th>
                <th className="px-5 py-4">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {framework.map((f) => (
                <tr key={f.law} className="border-t border-border/60 align-top">
                  <td className="px-5 py-4 font-medium text-foreground">{f.law}</td>
                  <td className="px-5 py-4 text-muted-foreground">{f.authority}</td>
                  <td className="px-5 py-4 text-muted-foreground">{f.scope}</td>
                  <td className="px-5 py-4 font-mono text-[12px] text-primary">{f.status}</td>
                  <td className="px-5 py-4 text-muted-foreground">{f.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>2 · Pilot kontrol listesi</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Türkiye'de saha kurulumu öncesi altı zorunlu adım
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
            {checklist.map((c) => (
              <article key={c.t} className="bg-background/60 p-7">
                <h3 className="text-base font-semibold">{c.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
              </article>
            ))}
          </div>
          <pre className="mt-8 overflow-x-auto rounded-sm border border-border bg-background/70 p-5 font-mono text-[12px] leading-relaxed text-muted-foreground">
            <code>{`# Türkiye pilot profili — BTK KEGY sınırlarına kilitli
TEDBIRGE_REGION=TR
TEDBIRGE_CARRIERS=eth,wifi,cellular,satellite,wigig,fso,lora
TEDBIRGE_LORA_BAND=868
TEDBIRGE_LORA_TX_MW=25
TEDBIRGE_LORA_DUTY_CYCLE=0.01
TEDBIRGE_HALOW=off          # BTK çerçevesi yok
TEDBIRGE_TVWS=off           # beyaz alan düzenlemesi yok
TEDBIRGE_REGION_LOCK=signed # operatör tarafından değiştirilemez`}</code>
          </pre>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <SectionLabel>3 · Açık noktalar</SectionLabel>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">
          Saklamadığımız sınırlar ve devam eden başvurular
        </h2>
        <ul className="mt-8 space-y-4">
          {openPoints.map((p) => (
            <li key={p} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Kaynaklar: 5809 s. Elektronik Haberleşme Kanunu, BTK Telsiz Ekipmanları Yönetmeliği
          (2014/53/AB), BTK Kısa Mesafe Erişimli Telsiz Cihazları Yönetmeliği, BTK EM Alan
          Şiddeti Limit Değerleri Yönetmeliği, 6698 s. KVKK, 5651 s. Kanun, 6563 s. Kanun ve
          Mesafeli Sözleşmeler Yönetmeliği, Cumhurbaşkanlığı 2019/12 Genelgesi. Bu sayfa
          bilgilendirme amaçlıdır, hukuki görüş yerine geçmez; yürürlükteki metin esastır.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/uyumluluk"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Spektrum matrisi
          </Link>
          <Link
            to="/sertifikasyon"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            Sertifikasyon & test
          </Link>
          <Link
            to="/ihracat-uyum"
            className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
          >
            İhracat kontrolü
          </Link>
          <Link
            to="/iletisim"
            className="rounded-sm bg-primary px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
          >
            Pilot uyum dosyası talep et
          </Link>
        </div>
      </section>
    </SitePage>
  );
}
