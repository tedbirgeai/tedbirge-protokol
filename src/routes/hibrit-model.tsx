import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/hibrit-model")({
  head: () => ({
    meta: [
      { title: "Hibrit Overlay Modeli — Tedbirge Protokol" },
      {
        name: "description",
        content:
          "Tedbirge direk dikmez, kablo döşemez, uydu fırlatmaz. Mevcut internet ve mevcut modemler üzerine kurulan hibrit overlay ile veri taşıma maliyetini düşürür. Emsal firmalar ve gerçek ölçüm yöntemi.",
      },
      { property: "og:title", content: "Hibrit Overlay Modeli — Tedbirge Protokol" },
      {
        property: "og:description",
        content:
          "Asset-light overlay: telekom rakip değil taşıyıcıdır. Emsal firmalar, tasarruf mekanizmaları ve dürüst ölçüm çerçevesi.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tedbirge-gateway.lovable.app/hibrit-model" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/hibrit-model" }],
  }),
  component: HybridModel,
});

const PILLARS = [
  {
    t: "Direk dikmeyiz",
    d: "Kule, kazı, ruhsat, saha ekibi yok. Sermaye yoğun altyapı telekom operatörünün işidir; biz o altyapının üzerinde çalışırız.",
  },
  {
    t: "Kablo döşemeyiz",
    d: "Deniz altı ve yer altı fiber milyar dolarlık yatırımdır. Tedbirge o fiberin taşıdığı baytı azaltır ve yolunu kısaltır.",
  },
  {
    t: "Uydu fırlatmayız",
    d: "Uydu bir taşıyıcıdır, ürün değil. Terminali olan müşteri terminalini köprüler; biz üstünde tünel ve mesh mantığını çalıştırırız.",
  },
  {
    t: "Telekom rakip değil taşıyıcıdır",
    d: "Operatörün kapasitesini tüketmeyiz, verimli kullanırız. Satış kanalı olarak da operatörle aynı masada oturabiliriz.",
  },
];

const MECHANISMS = [
  {
    k: "Yol optimizasyonu (overlay routing)",
    d: "BGP'nin seçtiği yol çoğu zaman en hızlı yol değildir. Düğümler arası ölçüme dayalı çok-sıçramalı yol seçimi gecikmeyi düşürür.",
    ref: "Cloudflare Argo, Teridion",
  },
  {
    k: "Eşler arası dağıtım (P2P offload)",
    d: "Aynı içeriği isteyen cihazlar birbirinden alır; çıkış (egress) trafiği ve CDN faturası düşer.",
    ref: "Peer5, Streamroot (Lumen), Hive Streaming",
  },
  {
    k: "Yinelenen veri eleme + sıkıştırma",
    d: "Tekrar eden bloklar özet (hash) ile referanslanır; tekrarlı veri senaryolarında taşınan bayt katlarca azalır.",
    ref: "WAN optimizasyonu (Riverbed sınıfı), donanımsız uyarlama",
  },
  {
    k: "Çoklu yol birleştirme (multipath)",
    d: "Wi-Fi + hücresel + uydu aynı anda kullanılır; biri düşünce oturum kopmaz.",
    ref: "Speedify, MPTCP, QUIC/MASQUE",
  },
  {
    k: "Kenar kuyruklama (store-and-forward)",
    d: "Bağlantı yokken paket kaybolmaz; kuyruğa alınır ve dönüşte sırayla iletilir. Off-grid sahada tek gerçekçi yöntem budur.",
    ref: "Tedbirge Off-Grid",
  },
  {
    k: "Donanımsız düğüm (browser node)",
    d: "Telefon, tablet ve bilgisayar tarayıcıdan düğüm olur; kurulum sürtünmesi sıfır, cihaz maliyeti sıfır.",
    ref: "Tedbirge tarayıcı düğümü",
  },
];

const PEERS = [
  {
    n: "Cloudflare Argo",
    m: "Anycast ağ üzerinde akıllı yönlendirme",
    hw: "Donanım yok",
    c: "Yaklaşık %30 daha hızlı yükleme iddiası",
    w: "Yalnızca kendi ağına giren trafikte etkili; son mil darboğazını çözmez",
  },
  {
    n: "Teridion",
    m: "Bulut üzerinde sanal PoP overlay (NaaS)",
    hw: "Donanım yok",
    c: "SLA'lı gecikme/jitter azaltımı",
    w: "Bulut maliyetine bağımlı; küçük ölçekte pahalı",
  },
  {
    n: "NetFoundry / OpenZiti",
    m: "Zero-trust yazılım tanımlı overlay",
    hw: "Donanım yok",
    c: "Açık port olmadan uçtan uca tünel",
    w: "Ana değer güvenlik; hız kazancı ikincil",
  },
  {
    n: "Peer5 / Streamroot",
    m: "WebRTC ile tarayıcı P2P CDN",
    hw: "Donanım yok",
    c: "CDN bant genişliğinde %50–90 azaltım",
    w: "Yalnızca yüksek eşzamanlı canlı yayında anlamlı; bağımsız şirket olarak kalıcı olamadılar",
  },
  {
    n: "Speedify",
    m: "Çoklu bağlantı birleştirme (bonding)",
    hw: "Donanım yok",
    c: "Kesintisiz failover, toplam hız",
    w: "Tek bağlantısı olan kullanıcıya kazanç yok",
  },
  {
    n: "Helium / Althea",
    m: "Teşvikli DePIN mesh",
    hw: "Donanım gerekir",
    c: "Kırsalda ucuz kapsama",
    w: "Cihaz kurulumu ve token oynaklığı; asset-light değil",
  },
  {
    n: "Subspace (kapandı)",
    m: "Gerçek zamanlı trafik için özel overlay",
    hw: "Donanım yok",
    c: "Oyun/VoIP gecikmesinde büyük düşüş",
    w: "Tek bulut tedarikçisine bağımlılık ve birim ekonomisi; kapandı",
  },
  {
    n: "Riverbed sınıfı WAN optimizasyonu",
    m: "Dedup + sıkıştırma + protokol optimizasyonu",
    hw: "Appliance gerekir",
    c: "Tekrarlı veride 10–50x azaltım",
    w: "Donanım/appliance modeli; SASE tarafından ikame ediliyor",
  },
];

const HONEST = [
  "Tasarruf oranı trafiğin türüne bağlıdır: tekrarlı ve çok alıcılı içerikte yüksek, tek seferlik şifreli akışta düşüktür.",
  "Her iddia panelde ölçülür: taşınan bayt, kaynaktan çekilen bayt, eşten çekilen bayt ve gecikme farkı kaydedilir.",
  "Ölçüm yoksa oran yayınlanmaz. Pazarlama sayısı değil, saha raporu esastır.",
  "Fiziksel menzil yasası değişmez: 6–15 km bağlantı için LoRa/HaLow sınıfı bir radyo gerekir; tarayıcı bunu üretemez, sadece köprüler.",
];

function HybridModel() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
          <SectionLabel>Hibrit model</SectionLabel>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight md:text-5xl">
            Altyapıyı kurmayız; altyapının taşıdığı veriyi verimli taşırız
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Tedbirge Protokol sermaye yoğun bir telekom değildir. Direk dikmez, kablo döşemez, uydu
            fırlatmaz. Zaten var olan taşıyıcıların (fiber, hücresel, uydu, LoRa, HaLow, TVWS,
            WiGig, FSO) üzerinde çalışan taşıyıcı-bağımsız bir overlay katmanıdır: yolu kısaltır,
            tekrar eden veriyi eler, eşler arası dağıtır ve kopmada kuyruğa alır.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.t} className="rounded-sm border border-border bg-card/50 p-5">
                <h2 className="font-mono text-[12px] uppercase tracking-[0.14em] text-primary">{p.t}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionLabel>Tasarruf nereden gelir</SectionLabel>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
          Altı mekanizma — hepsi donanımsız
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MECHANISMS.map((m) => (
            <article key={m.k} className="rounded-sm border border-border bg-card/40 p-5">
              <h3 className="text-base font-semibold tracking-tight">{m.k}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.d}</p>
              <p className="mt-4 border-t border-border/60 pt-3 font-mono text-[11px] text-muted-foreground">
                emsal: {m.ref}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionLabel>Dünyadaki emsaller</SectionLabel>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Aynı işi donanımsız yapan firmalar ve zayıf noktaları
          </h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-3 pr-4">Firma</th>
                  <th className="py-3 pr-4">Model</th>
                  <th className="py-3 pr-4">Donanım</th>
                  <th className="py-3 pr-4">İddia</th>
                  <th className="py-3">Zayıf nokta</th>
                </tr>
              </thead>
              <tbody>
                {PEERS.map((p) => (
                  <tr key={p.n} className="border-b border-border/50 align-top">
                    <td className="py-3 pr-4 font-mono text-[12px] text-foreground">{p.n}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.m}</td>
                    <td className="py-3 pr-4 font-mono text-[11px] text-muted-foreground">{p.hw}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.c}</td>
                    <td className="py-3 text-muted-foreground">{p.w}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Çıkarım: donanımsız overlay pazarında kaybedenler tek tedarikçiye bağımlı olanlar
            (Subspace) ve tek dikeye sıkışanlar (P2P CDN) oldu. Tedbirge bu yüzden çoklu taşıyıcı +
            çoklu bulut + tarayıcı düğüm karışımıyla ilerler ve tek bir sağlayıcıya kilitlenmez.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <SectionLabel>Dürüstlük çerçevesi</SectionLabel>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">Oranları biz uydurmayız, ölçeriz</h2>
        <ul className="mt-6 space-y-3">
          {HONEST.map((h) => (
            <li key={h} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>{h}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/saha"
            className="rounded-sm border border-primary/60 px-4 py-2 font-mono text-[12px] text-primary"
          >
            Cihazını düğüme dönüştür
          </Link>
          <Link
            to="/tasiyicilar"
            className="rounded-sm border border-border px-4 py-2 font-mono text-[12px]"
          >
            Taşıyıcı matrisi
          </Link>
          <Link
            to="/saha-raporu"
            className="rounded-sm border border-border px-4 py-2 font-mono text-[12px]"
          >
            Saha ölçüm raporu
          </Link>
        </div>
      </section>
    </SitePage>
  );
}
