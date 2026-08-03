import { createFileRoute, Link } from "@tanstack/react-router";
import { BatteryCharging, Sun, Zap, Radio, Smartphone, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/kablosuz-sarj")({
  head: () => ({
    meta: [
      { title: "Kablosuz Şarj Çözümleri — Tedbirge Protocol" },
      {
        name: "description",
        content:
          "Saha düğümleri, telefon ve tabletler için kablosuz şarj seçenekleri: Qi2 mıknatıslı şarj, güneş + LiFePO4 otonomi, NFC ve RF hasat sınırları.",
      },
      { property: "og:title", content: "Kablosuz Şarj Çözümleri — Tedbirge Protocol" },
      {
        property: "og:description",
        content:
          "Hangi cihaz hangi yöntemle kablosuz şarj olur? Qi2, güneş enerjisi, indüktif saha kutusu ve RF hasat karşılaştırması.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/kablosuz-sarj" }],
  }),
  component: WirelessChargingPage,
});

type Option = {
  icon: typeof Zap;
  title: string;
  power: string;
  range: string;
  devices: string;
  verdict: string;
  detail: string;
};

const OPTIONS: Option[] = [
  {
    icon: Smartphone,
    title: "Qi2 / MagSafe mıknatıslı ped",
    power: "15-25 W",
    range: "0-8 mm",
    devices: "Telefon, tablet (Qi destekli), kulaklık, saha terminali",
    verdict: "Önerilen — cep ve tablet için birincil yöntem",
    detail:
      "Mıknatıslı hizalama sayesinde hizalama kaybı yok; verim %70-80. Taşınabilir 10.000 mAh Qi2 power-bank ile ekip üyesi cihazını çantadan çıkarmadan şarj eder. Tabletlerin çoğunda Qi yoktur; bu durumda Qi alıcı yaması (USB-C uçlu ince alıcı) ile kablosuz hale getirilir.",
  },
  {
    icon: Sun,
    title: "Güneş + LiFePO4 (düğüm otonomisi)",
    power: "20-50 W panel / 12,8 V 20 Ah",
    range: "Sabit saha kutusu",
    devices: "Mesh düğümü, röle, LoRa/HaLow modemi",
    verdict: "Ana enerji kaynağı — 3-5 gün güneşsiz otonomi",
    detail:
      "Düğüm tipik 2-5 W çeker. MPPT şarj kontrolcüsü + BMS + sıcaklık kesme (-20/+55 °C). Enerji verileri telemetriye düşer: battery_pct, charge_source, estimated_runtime_h. Panelde pil < %20 olduğunda bakım kartı açılır.",
  },
  {
    icon: BatteryCharging,
    title: "Kapalı kutu indüktif şarj (IP67)",
    power: "5-15 W",
    range: "0-4 cm (kapak kalınlığı dahil)",
    devices: "Sızdırmaz saha düğümü kutuları",
    verdict: "Bakım kolaylığı — conta hiç açılmaz",
    detail:
      "Alıcı bobin kutunun içine, verici dışına gelir. Teknisyen kutuyu açmadan şarj eder; IP sınıfı ve conta ömrü korunur. Yabancı cisim algılama (FOD) zorunludur.",
  },
  {
    icon: Radio,
    title: "NFC kablosuz güç (WLC)",
    power: "0,5-1 W",
    range: "0-2 cm",
    devices: "Sensör düğümleri, etiketler, kapı/kilit modülleri",
    verdict: "Yalnızca düşük güçlü sensörler",
    detail:
      "NFC Forum WLC standardı. Telefonu sensöre dokundurarak hem veri okunur hem küçük pil beslenir. Mesh düğümü beslemez.",
  },
  {
    icon: Zap,
    title: "Uzak mesafe RF hasat",
    power: "µW-mW",
    range: "1-10 m",
    devices: "Pasif sensörler",
    verdict: "Vaat edilmez — telefon/tablet şarj etmez",
    detail:
      "Serbest uzay kaybı nedeniyle metrelerce mesafede watt seviyesi güç aktarımı pratik değildir ve çoğu ülkede EIRP sınırlarını aşar. Pazarlama iddiası olarak kullanılmaz.",
  },
];

function WirelessChargingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Enerji katmanı
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
        Kablosuz şarj çözümleri
      </h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Kısa cevap: <strong className="text-foreground">evet</strong> — cep telefonu, tablet ve saha
        terminalleri kablosuz şarj edilebilir; bunun için Qi/Qi2 indüktif katman kullanılır. Ancak
        kablosuz şarj bir <em>enerji kaynağı</em> değil, <em>bakım ve sızdırmazlık kolaylığıdır</em>
        . Sahadaki asıl kaynak güneş + LiFePO4'tür.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {OPTIONS.map((o) => (
          <article key={o.title} className="rounded-sm border border-border bg-card p-6">
            <o.icon className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold text-foreground">{o.title}</h2>
            <dl className="mt-3 space-y-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              <div className="flex justify-between gap-4">
                <dt>Güç</dt>
                <dd className="text-foreground">{o.power}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Mesafe</dt>
                <dd className="text-foreground">{o.range}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Cihazlar</dt>
                <dd className="max-w-[60%] text-right text-foreground">{o.devices}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm font-medium text-primary">{o.verdict}</p>
            <p className="mt-2 text-sm text-muted-foreground">{o.detail}</p>
          </article>
        ))}
      </div>

      <section className="mt-12 rounded-sm border border-primary/40 bg-primary/5 p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Afet anı: ek donanım almadan hibrit şarj
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Dürüst sınır: <strong className="text-foreground">Wi-Fi sinyaliyle telefon şarj
          edilemez.</strong> Bir Wi-Fi anteninden metrelerce ötede hasat edilen güç mikrowatt
          seviyesindedir; telefonun ihtiyacı ise watt seviyesidir — arada yaklaşık bir milyon kat
          fark vardır. Buna karşılık, sahadaki ekiplerin <em>cebindeki cihazlarla</em>, hiçbir yeni
          donanım satın almadan kurabileceği gerçek bir hibrit enerji zinciri vardır:
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Ters kablosuz şarj (telefondan telefona):</strong>{" "}
            Çoğu güncel Android cihaz (Samsung "Wireless PowerShare", Pixel, Xiaomi) sırt sırta
            verilerek 4,5-7,5 W ile başka bir telefonu veya kulaklığı besler. Ek donanım gerekmez;
            ekipteki dolu cihaz, kritik düğüm telefonunu ayakta tutar.
          </li>
          <li>
            <strong className="text-foreground">USB-C'den USB-C güç paylaşımı (OTG):</strong> Elde
            var olan tek bir C-C kabloyla telefon/tablet/dizüstü birbirini besler. Dizüstü
            bilgisayar sahadaki en büyük pil bankasıdır: 50-80 Wh kapasite, 3-5 telefon dolumu.
          </li>
          <li>
            <strong className="text-foreground">Araç ve jeneratör köprüsü:</strong> Araç USB/12 V
            çıkışı, rölanti dahil, saha kutusunu ve terminalleri besleyebilir. Araç aynı zamanda
            hareketli röle noktasıdır.
          </li>
          <li>
            <strong className="text-foreground">Yazılım tarafı — enerji bütçesi:</strong> Cihaz
            "Tasarruf Kipi"ne alındığında ekran parlaklığı, arka plan senkronizasyonu ve tarama
            sıklığı düşürülür; menzil taraması periyodik uykuya alınır. Tipik kazanç: %35-60 daha
            uzun saha ömrü.
          </li>
          <li>
            <strong className="text-foreground">Rol dönüşümü:</strong> Pili %15'in altına düşen
            cihaz otomatik olarak "röle" rolünden çıkıp "uç" rolüne geçer; yönlendirme yükü dolu
            cihazlara kayar. Böylece ağ, en zayıf pili tüketmeden ayakta kalır.
          </li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          Sonuç: afet anında enerji sorunu "havadan şarj" ile değil,{" "}
          <strong className="text-foreground">
            cihazlar arası güç paylaşımı + yazılımsal enerji bütçesi
          </strong>{" "}
          ile çözülür. Bu ikisi zaten elinizdeki donanımla mümkündür.
        </p>
      </section>

      <section className="mt-12 rounded-sm border border-border bg-card p-6">

        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden /> Önerilen kurulum
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Sabit düğüm: 30 W güneş paneli + MPPT + 12,8 V 20 Ah LiFePO4 + BMS.</li>
          <li>Kutu içine 15 W Qi alıcı, dışına mıknatıslı hizalama halkası (kapak hiç açılmaz).</li>
          <li>
            Saha ekibi için 10.000 mAh Qi2 power-bank — telefon ve tablet çantadan çıkarılmadan şarj
            olur.
          </li>
          <li>Şarj yönetimi ayrı MCU'da; sıcaklık kesme ve hücre dengeleme zorunlu.</li>
          <li>
            Enerji telemetrisi mesh üzerinden panele düşer; pil %20 altında bakım uyarısı üretilir.
          </li>
          <li>
            Uyum: WPC (Qi) sertifikalı modül, CE/RED + EMC testi. 100-205 kHz bandı ek lisans
            gerektirmez.
          </li>
        </ol>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        Enerji verileri saha panosunda izlenir:{" "}
        <Link to="/pilot-panosu" className="text-primary underline">
          pilot panosu
        </Link>
        .
      </p>
    </main>
  );
}
