import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "Sertifikasyon & Test Matrisi — Taşıyıcı Bazlı Uygunluk";
const DESC =
  "Tedbirge Protokol taşıyıcılarının geçmesi gereken radyo, EMC, güvenlik ve kripto testleri; ülke bazlı onay rejimleri ve henüz kapsanmayan taşıyıcı boşlukları.";
const URL = "https://tedbirge-gateway.lovable.app/sertifikasyon";

export const Route = createFileRoute("/sertifikasyon")({
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
  component: Certification,
});

type Row = {
  carrier: string;
  radio: string;
  emc: string;
  safety: string;
  extra: string;
};

const tests: Row[] = [
  {
    carrier: "Ethernet / LAN",
    radio: "Radyo testi yok — kablolu arayüz",
    emc: "EN 55032/55035 Class B · FCC Part 15 Subpart B · CISPR 32",
    safety: "IEC/EN 62368-1 · PoE için IEEE 802.3af/at yalıtım testi",
    extra: "IEEE 802.3 uyumluluk (BER, kablo uzunluğu, auto-MDIX)",
  },
  {
    carrier: "Wi-Fi 2.4 / 5 GHz",
    radio: "EN 300 328 (2.4) · EN 301 893 (5, DFS/TPC) · FCC 15.247 / 15.407 · RSS-247",
    emc: "EN 301 489-1/-17",
    safety: "EN 62368-1 · EN 50665 / EN 62311 RF maruziyet (SAR gerekirse FCC KDB 447498)",
    extra: "Wi-Fi Alliance sertifikası (logo kullanımı için) · DFS master/client testi",
  },
  {
    carrier: "Hücresel 4G/5G",
    radio: "3GPP TS 36.521 / 38.521 RF · TS 36.523 protokol",
    emc: "EN 301 489-52",
    safety: "EN 62368-1 · SAR (EN 62209 / FCC KDB)",
    extra: "GCF veya PTCRB sertifikası + operatör onayı (Vodafone/AT&T/DT vb.)",
  },
  {
    carrier: "Uydu (Starlink/VSAT köprüsü)",
    radio: "Terminal üreticisinin onayı esas — Tedbirge yalnızca IP köprüsü",
    emc: "Köprü cihazı için EN 55032/55035",
    safety: "EN 62368-1",
    extra: "Yer terminali ruhsatı / landing rights ulusal düzenleyiciden alınır (ITU RR Md. 18)",
  },
  {
    carrier: "WiGig 60 GHz (802.11ad/ay)",
    radio: "EN 302 567 · FCC Part 15.255 · RSS-210 Annex",
    emc: "EN 301 489-1/-17",
    safety: "EN 62368-1 · mmWave maruziyet: IEC 62232 / FCC KDB 680106",
    extra: "Anten kazancı & EIRP maskesi ölçümü · dış mekân montaj rüzgâr/IP testi",
  },
  {
    carrier: "FSO lazer optik",
    radio: "Spektrum testi yok — optik bant",
    emc: "EN 55032/55035 (elektronik kısım)",
    safety: "IEC/EN 60825-1 lazer sınıflandırması (Class 1/1M hedef) · FDA/CDRH 21 CFR 1040.10 bildirimi (ABD)",
    extra: "Görüş hattı link bütçesi, sis/yağmur zayıflama doğrulaması, otomatik güç kapatma (APR)",
  },
  {
    carrier: "Wi-Fi HaLow (802.11ah)",
    radio: "EN 300 220-1/-2 (863–868) · FCC 15.247 (902–928) · RSS-247",
    emc: "EN 301 489-3",
    safety: "EN 62368-1 · EN 62311",
    extra: "Görev döngüsü / LBT+AFA ölçümü · WFA HaLow sertifikası (isteğe bağlı)",
  },
  {
    carrier: "TVWS 470–790 MHz",
    radio: "EN 301 598 (beyaz alan cihazı) · FCC Part 15 Subpart H",
    emc: "EN 301 489-1",
    safety: "EN 62368-1",
    extra: "Geolokasyon veri tabanı bağlantısı zorunlu · komşu kanal koruma oranı testi · ulusal koordinasyon (TR'de çerçeve yok)",
  },
  {
    carrier: "LoRa 868 / 915 MHz",
    radio: "EN 300 220-2 (kategori 2 alıcı) · FCC 15.247 frekans atlama · RSS-247",
    emc: "EN 301 489-3",
    safety: "EN 62368-1 · EN 62311",
    extra: "Görev döngüsü zorlaması ölçümü · LoRaWAN kullanılacaksa LoRa Alliance sertifikası",
  },
  {
    carrier: "Zero-KVKK RF çerçeveleme (yazılım katmanı)",
    radio: "Taşıyıcının radyo onayına tabi — ayrı radyo testi yok",
    emc: "—",
    safety: "—",
    extra:
      "Kripto doğrulama: NIST CAVP (AES-GCM, SHA-2, Ed25519) · hedefe göre FIPS 140-3 veya Common Criteria EAL2+ · bağımsız sızma testi",
  },
];

const approvals = [
  { r: "Türkiye", body: "BTK / TSE", mark: "CE + BTK piyasa gözetimi", note: "RED 2014/53/EU uyumlaştırılmış; sub-GHz 868 MHz SRD, 915 MHz kapalı" },
  { r: "Avrupa Birliği", body: "Notified Body / öz beyan", mark: "CE (RED)", note: "Uyumlaştırılmış standart kullanılmazsa NB dosyası zorunlu" },
  { r: "Birleşik Krallık", body: "Approved Body", mark: "UKCA", note: "Ofcom IR 2030 arayüz gereksinimleri" },
  { r: "ABD", body: "TCB + FCC ID", mark: "FCC Part 15", note: "Kasıtlı yayıcı için sertifikasyon, kablolu için SDoC" },
  { r: "Kanada", body: "CB / ISED", mark: "IC ID", note: "RSS-247, RSS-Gen, ICES-003" },
  { r: "Japonya", body: "MIC kayıtlı sertifikasyon kurumu", mark: "Giteki (技適)", note: "920 MHz LBT zorunlu; onaysız RF kullanımı suç" },
  { r: "Güney Kore", body: "RRA", mark: "KC", note: "917–923.5 MHz ISM" },
  { r: "Çin", body: "SRRC + CCC", mark: "SRRC / CMIIT ID", note: "470–510 MHz ve 779–787 MHz; 868 MHz yasak" },
  { r: "Hindistan", body: "TEC / WPC", mark: "MTCTE + ETA", note: "865–867 MHz lisanssız; şifreleme kısıtları takip edilmeli" },
  { r: "Brezilya", body: "ANATEL", mark: "Homologação", note: "902–907.5 / 915–928 MHz" },
  { r: "Avustralya / YZ", body: "ACMA / RSM", mark: "RCM", note: "915–928 MHz LIPD class licence" },
  { r: "Körfez", body: "TDRA (BAE) · CST (S.A.)", mark: "Yerel tip onayı", note: "CE dosyası kabul edilir, yerel kayıt şart" },
  { r: "Güney Afrika", body: "ICASA", mark: "ICASA TA", note: "868 MHz SRD; TVWS pilot çerçevesi mevcut" },
  { r: "Rusya / EAEU", body: "GKRCh", mark: "EAC", note: "868.7–869.2 MHz; kripto için FSB bildirimi" },
];

const gaps = [
  {
    t: "Sub-GHz bant boşlukları",
    b: "Mevcut profiller 868 ve 915 MHz üzerine kurulu. Japonya 920–923 MHz (LBT), Kore 917–923.5 MHz, Çin 470–510 MHz, Hindistan 865–867 MHz ve Brezilya 902–907.5 MHz için ayrı frekans planı ve görev döngüsü/LBT davranışı tanımlı değil.",
  },
  {
    t: "NB-IoT / LTE-M",
    b: "Hücresel taşıyıcı yalnızca 4G/5G tethering olarak var. Sayaç, sensör ve kamu altyapısı projelerinde standart olan NB-IoT / LTE-M düşük güç profili eksik.",
  },
  {
    t: "DECT NR+ (1880–1920 MHz)",
    b: "ETSI'nin lisanssız, mesh-yerel 5G standardı. AB, UK ve birçok APAC ülkesinde lisanssız; kritik altyapı mesh'i için doğrudan rakip teknoloji — kapsanmıyor.",
  },
  {
    t: "CBRS 3.5 GHz ve paylaşımlı yerel 5G",
    b: "ABD CBRS (3550–3700), Almanya 3.7–3.8 GHz kampüs, Japonya yerel 5G, UK Shared Access. Sanayi ve liman sahalarında ihale şartı olabiliyor; profil yok.",
  },
  {
    t: "HF/VHF NVIS ve PMR veri",
    b: "Afet senaryosunda 100–500 km menzil için HF NVIS veri modemi (ör. 2–12 MHz) ve TETRA/DMR veri köprüsü eksik. Bu bantlar lisanslıdır; kamu kurumu ortaklığı gerektirir.",
  },
  {
    t: "6 GHz (Wi-Fi 6E/7) ve UWB",
    b: "5925–7125 MHz AB/ABD'de lisanssız; TR'de kısmen açıldı. Yüksek kapasiteli iç mekân omurgası için değerlendirilmeli.",
  },
  {
    t: "Akustik / sualtı ve PLC",
    b: "Liman, baraj ve enerji dağıtımı senaryolarında sualtı akustik modem ve enerji hattı haberleşmesi (IEEE 1901 / G.hn) niş ama savunulabilir taşıyıcılar.",
  },
];

const risks = [
  "Sertifikasyon cihaz bazlıdır: Tedbirge yazılım olarak dağıtıldığında onay yükümlülüğü, radyoyu içeren donanımı piyasaya süren tarafa aittir. Referans donanım satılırsa yükümlülük Tedbirge Protokol'e geçer.",
  "Yazılım tanımlı radyo (SDR) kullanan bir çıktı, FCC/RED kapsamında 'yazılımla değiştirilebilir radyo' sayılır; güç ve frekans parametrelerinin son kullanıcı tarafından değiştirilememesi teknik olarak kanıtlanmalıdır.",
  "Şifreleme, Wassenaar Kategori 5 Bölüm 2 kapsamındadır; bazı ülkelerde (Çin, Hindistan, Rusya) ayrıca ithalat/kullanım bildirimi gerekir.",
  "Kamu ve afet ihalelerinde çoğunlukla MIL-STD-810H çevresel, IP66/67 ve IEC 61000-4 seri bağışıklık testleri şart koşulur; bunlar radyo onayının ötesindedir.",
];

function Certification() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Sertifikasyon & test</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Her taşıyıcının geçmesi gereken testler ve dünya genelindeki onay rejimleri
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Lisanssız olmak "test gerekmez" demek değildir. Aşağıda her taşıyıcı için radyo,
            EMC, güvenlik ve kripto test setleri; ardından ülke bazlı onay makamları ve
            henüz kapsamadığımız taşıyıcı boşlukları listelenir.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>1 · Taşıyıcı test matrisi</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Radyo, EMC, güvenlik, kripto</h2>
        <div className="mt-10 overflow-x-auto rounded-sm border border-border">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-card/60 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="px-5 py-4">Taşıyıcı</th>
                <th className="px-5 py-4">Radyo / spektrum testi</th>
                <th className="px-5 py-4">EMC</th>
                <th className="px-5 py-4">Elektriksel & maruziyet güvenliği</th>
                <th className="px-5 py-4">Ek zorunluluk</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.carrier} className="border-t border-border/60 align-top">
                  <td className="px-5 py-4 font-medium text-foreground">{t.carrier}</td>
                  <td className="px-5 py-4 text-muted-foreground">{t.radio}</td>
                  <td className="px-5 py-4 text-muted-foreground">{t.emc}</td>
                  <td className="px-5 py-4 text-muted-foreground">{t.safety}</td>
                  <td className="px-5 py-4 text-muted-foreground">{t.extra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Tüm RF taşıyıcılar için ortak taban: RED 2014/53/EU Md. 3.1(a) güvenlik, 3.1(b) EMC,
          3.2 spektrum verimliliği ve 2022/30 sayılı delege tüzük ile zorunlu hâle gelen
          3.3(d/e/f) siber güvenlik gereklilikleri (EN 18031-1/-2/-3).
        </p>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>2 · Ülke bazlı onay rejimleri</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Aynı donanım, farklı işaret ve dosya
          </h2>
          <div className="mt-10 overflow-x-auto rounded-sm border border-border">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-background/60 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="px-5 py-4">Ülke / bölge</th>
                  <th className="px-5 py-4">Onay makamı</th>
                  <th className="px-5 py-4">İşaret</th>
                  <th className="px-5 py-4">Not</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.r} className="border-t border-border/60 align-top">
                    <td className="px-5 py-4 font-medium text-foreground">{a.r}</td>
                    <td className="px-5 py-4 text-muted-foreground">{a.body}</td>
                    <td className="px-5 py-4 font-mono text-[12px] text-primary">{a.mark}</td>
                    <td className="px-5 py-4 text-muted-foreground">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>3 · Kapsam boşlukları</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">
          Dokuz taşıyıcının dışında kalan ve değerlendirilmesi gereken katmanlar
        </h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {gaps.map((g) => (
            <article key={g.t} className="bg-background/60 p-7">
              <h3 className="text-lg font-semibold">{g.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{g.b}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <SectionLabel>4 · Risk notları</SectionLabel>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            Bilinmesi gereken yükümlülük sınırları
          </h2>
          <ul className="mt-8 space-y-4">
            {risks.map((r) => (
              <li key={r} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-muted-foreground">
            Bu sayfa bilgilendirme amaçlıdır ve hukuki görüş değildir. Konuşlanmadan önce ilgili
            ulusal düzenleyicinin yürürlükteki metni ve akredite test laboratuvarının kapsam
            belgesi esas alınmalıdır.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/turkiye-mevzuat"
              className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Türkiye mevzuatı
            </Link>
            <Link
              to="/uyumluluk"
              className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Spektrum matrisi
            </Link>
            <Link
              to="/iletisim"
              className="rounded-sm bg-primary px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              Ülke profili talep et
            </Link>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
