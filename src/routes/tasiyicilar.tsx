import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { CarrierBridgeCard } from "@/components/site/CarrierBridgeCard";

export const Route = createFileRoute("/tasiyicilar")({
  head: () => ({
    meta: [
      { title: "10 Taşıyıcı — Tedbirge Off-Grid Fiziksel Katmanlar" },
      {
        name: "description",
        content:
          "Tedbirge Protokol'ün desteklediği on taşıyıcı: OpenWrt WSS yerel geçit, Ethernet, Wi-Fi, hücresel, uydu, WiGig 60GHz, FSO lazer, Wi-Fi HaLow, TVWS ve LoRa ISM.",
      },
      { property: "og:title", content: "Tedbirge Taşıyıcı Matrisi" },
      {
        property: "og:description",
        content: "Menzil, bant genişliği, gecikme ve yasal statüsüyle on fiziksel taşıyıcı.",
      },

      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tedbirge-gateway.lovable.app/tasiyicilar" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/tasiyicilar" }],
  }),
  component: Carriers,
});

type Carrier = {
  no: string;
  name: string;
  kind: string;
  band: string;
  range: string;
  bandwidth: string;
  latency: string;
  status: "ACTIVE" | "INTERFACE" | "STUB";
  license: string;
  use: string;
};

const carriers: Carrier[] = [
  {
    no: "01",
    name: "Ethernet / LAN",
    kind: "ethernet",
    band: "Kablolu IP",
    range: "100 m (Cat6 segment)",
    bandwidth: "1–10 Gbps",
    latency: "~0.2 ms",
    status: "ACTIVE",
    license: "Lisans gerekmez",
    use: "Veri merkezi ve bina içi omurga; failover önceliği en yüksek taşıyıcı.",
  },
  {
    no: "02",
    name: "Wi-Fi / WAN uplink",
    kind: "wifi_wan",
    band: "2.4 / 5 GHz ISM",
    range: "30–150 m",
    bandwidth: "50 Mbps – 1 Gbps",
    latency: "~2 ms",
    status: "ACTIVE",
    license: "Lisanssız ISM (ITU RR 5.150)",
    use: "Standart IP uplink; UDP broadcast ile otomatik komşu keşfi.",
  },
  {
    no: "03",
    name: "Hücresel 4G/5G tethering",
    kind: "usb_tethering",
    band: "Operatör lisanslı",
    range: "Operatör kapsaması",
    bandwidth: "10–500 Mbps",
    latency: "20–60 ms",
    status: "ACTIVE",
    license: "Operatör aboneliği",
    use: "Tethering IP verdiğinde şeffaf çalışır; modem sürücüsü gerekmez.",
  },
  {
    no: "04",
    name: "Uydu (Starlink / VSAT köprüsü)",
    kind: "satellite_licensed",
    band: "Ku / Ka bandı",
    range: "Global",
    bandwidth: "20–300 Mbps",
    latency: "25–600 ms",
    status: "ACTIVE",
    license: "Yalnızca abonelikli terminal",
    use: "Ethernet köprüsü üzerinden şeffaf IP uplink; izinsiz dinleme kapsam dışıdır.",
  },
  {
    no: "05",
    name: "WiGig 60 GHz (802.11ad)",
    kind: "wigig_60ghz_802_11ad",
    band: "57–66 GHz · 4 kanal",
    range: "300 m dış / 10 m iç",
    bandwidth: "0.385–2.31 Gbps (MCS'ye göre)",
    latency: "~0.5 ms",
    status: "INTERFACE",
    license: "Lisanssız",
    use: "Bina içi son 100 metre ve iki bina arası kısa mesafe fiber-hızı omurga.",
  },
  {
    no: "06",
    name: "FSO lazer optik",
    kind: "fso_laser_optical",
    band: "785 / 850 / 1550 nm",
    range: "100 m – 5 km",
    bandwidth: "100 Mbps – 10 Gbps",
    latency: "~1.0 ms",
    status: "INTERFACE",
    license: "Spektrum lisansı gerekmez",
    use: "Görüş hattı gerektiren gigabit köprü; sis −%60, yağmur −%40 zayıflama.",
  },
  {
    no: "07",
    name: "Wi-Fi HaLow (802.11ah)",
    kind: "wifi_halow_802_11ah",
    band: "863–868 MHz (AB/TR) · 902–928 MHz (ABD)",
    range: "2 km (MCS0) – 200 m (MCS9)",
    bandwidth: "150 kbps – 7.8 Mbps",
    latency: "~15 ms",
    status: "INTERFACE",
    license: "SRD lisanssız",
    use: "Off-grid IoT ve saha ağları; LoRa'dan hızlı, Wi-Fi'den çok daha uzun menzil.",
  },
  {
    no: "08",
    name: "TVWS 470–790 MHz",
    kind: "tvws_470_790mhz",
    band: "UHF beyaz alan · 8 MHz kanal · 40 kanal",
    range: "LoRa'nın 5–10 katı",
    bandwidth: "802.11af kanal bazlı",
    latency: "10–40 ms",
    status: "STUB",
    license: "ETSI EN 301 598 · maks. 36 dBm ERP · BTK kanal koordinasyonu gerekir",
    use: "Bina ve tepe arkası penetrasyon gerektiren uzun mesafe saha bağlantısı.",
  },
  {
    no: "09",
    name: "LoRa 868/915 MHz ISM",
    kind: "lora_usb_serial",
    band: "868 MHz (AB/TR) · 915 MHz (ABD)",
    range: "2–15 km (SF ve arazi bağımlı)",
    bandwidth: "222 bayt/çerçeve @ SF7/125 kHz",
    latency: "0.5–3 s",
    status: "INTERFACE",
    license: "ISM · görev döngüsü sınırlarına tabi",
    use: "Tam off-grid mesh omurgası; RadioHead RH_RF95 uyumlu çerçeveleme, SX1262 dongle.",
  },
  {
    no: "10",
    name: "OpenWrt / WSS yerel geçit",
    kind: "openwrt-gateway",
    band: "Duvar içi IP (Ethernet · PLC · MoCA · Wi-Fi)",
    range: "Bina/site geneli — şebeke beslemeli 7/24 düğüm",
    bandwidth: "50 Mbps – 1 Gbps",
    latency: "~10 ms",
    status: "ACTIVE",
    license: "Lisans gerekmez · kapalı devre (egress kilitli)",
    use: "Ev/bina geçidi olarak sürekli açık röle; şifreli zarfı WSS üzerinden taşır, genel internete NAT/proxy yapmaz.",
  },
];


const statusLabel: Record<Carrier["status"], string> = {
  ACTIVE: "Üretimde aktif",
  INTERFACE: "Sürücü arayüzü hazır",
  STUB: "Regülasyon bekliyor",
};

const statusClass: Record<Carrier["status"], string> = {
  ACTIVE: "bg-primary/15 text-primary",
  INTERFACE: "bg-accent/15 text-accent-foreground",
  STUB: "bg-muted text-muted-foreground",
};

function Carriers() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    if (!s) return carriers;
    return carriers.filter((c) =>
      [c.name, c.kind, c.band, c.use, c.license].join(" ").toLocaleLowerCase("tr").includes(s),
    );
  }, [q]);

  return (
    <SitePage>
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionLabel>Taşıyıcı matrisi</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Dokuz taşıyıcı, tek yönlendirici
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
            Tedbirge Protokol her bağlantıyı <span className="text-foreground">RTT × taşıyıcı ağırlığı</span>{" "}
            maliyetiyle puanlar ve en ucuz yolu Dijkstra ile seçer. Bir taşıyıcı düşerse trafik
            kesintisiz olarak bir sonrakine devreder.
          </p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Taşıyıcı, frekans veya kullanım ara…"
            className="mt-8 w-full max-w-md rounded-sm border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((c) => (
            <article key={c.no} className="rounded-sm border border-border bg-card/40 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-primary">{c.no}</span>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight">{c.name}</h2>
                  <code className="font-mono text-[11px] text-muted-foreground">{c.kind}</code>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${statusClass[c.status]}`}
                >
                  {statusLabel[c.status]}
                </span>
              </div>

              <dl className="mt-5 space-y-2 text-sm">
                {[
                  ["Bant", c.band],
                  ["Menzil", c.range],
                  ["Bant genişliği", c.bandwidth],
                  ["Gecikme", c.latency],
                  ["Yasal statü", c.license],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6">
                    <dt className="shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="text-right font-mono text-[12px] text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 border-t border-border/60 pt-4 text-sm leading-relaxed text-muted-foreground">
                {c.use}
              </p>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Eşleşen taşıyıcı bulunamadı.</p>
        )}
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionLabel>Taşıyıcıyı canlıya al</SectionLabel>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Kendi modemini bağla — direk dikmeden
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Hibrit model gereği donanım üretmiyoruz. Elinizde hâlihazırda bulunan LoRa, HaLow,
            TVWS, WiGig, FSO veya uydu modemini USB (Web Serial) ya da Bluetooth ile bağlayın;
            gerçek RSSI/SNR ölçümü okunur ve o taşıyıcı panoda aktif olur.
          </p>
          <div className="mt-8">
            <CarrierBridgeCard />
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <SectionLabel>Onuncu katman</SectionLabel>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Zero-KVKK efemer RF çerçeveleme
          </h2>
          <p className="mt-4 text-muted-foreground">
            RF ve seri taşıyıcılarda IP/MAC hiç kullanılmaz. Çerçeve; 1 bayt sihirli bayrak,
            60 saniyede bir dönen 8 baytlık hedef özeti, 12 baytlık AES nonce ve AES-256-GCM
            yükünden oluşur. Röle düğümleri hedefi ilişkilendiremez; taşıma katmanında kişisel
            veri açığa çıkmaz.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Uyarı: taşıma katmanı anonimliği, uygulama katmanındaki KVKK/GDPR yükümlülüklerini
            ortadan kaldırmaz. 915 MHz Türkiye ve AB'de genel SRD kullanımına kapalıdır; saha
            kurulumlarında 868 MHz bandı ve ETSI EN 300 220 güç sınırları esastır.
          </p>
        </div>
      </section>
    </SitePage>
  );
}
