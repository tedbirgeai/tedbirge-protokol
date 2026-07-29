import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "Kapsama & Süreklilik Planlayıcı — Tedbirge Gateway";
const DESC =
  "Evden uzaklaşınca bağlantı nasıl kopmaz? Taşıyıcı, arazi ve anten yüksekliğine göre atlama menzilini, gereken röle düğüm sayısını ve kurulum planını hesaplayın.";
const URL = "https://tedbirge-gateway.lovable.app/kapsama";

export const Route = createFileRoute("/kapsama")({
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
  component: CoveragePlanner,
});

/** Gerçekçi (pazarlama değil) tek atlama menzilleri — açık arazi, temiz Fresnel bölgesi referansı. */
const CARRIERS = [
  { id: "lora", name: "LoRa 868 MHz", baseKm: 5, mobile: true, note: "Düşük hız (0.3–37 kbps), mesaj/telemetri" },
  { id: "halow", name: "Wi-Fi HaLow 802.11ah", baseKm: 1.2, mobile: true, note: "IP trafiği, ~1–15 Mbps" },
  { id: "tvws", name: "TVWS (470–790 MHz)", baseKm: 8, mobile: false, note: "Veritabanı izni gerekir" },
  { id: "wifi", name: "Wi-Fi 2.4/5 GHz yönlü", baseKm: 3, mobile: false, note: "Sabit nokta-nokta, LoS şart" },
  { id: "wigig", name: "WiGig 60 GHz", baseKm: 1, mobile: false, note: "Gigabit, yağmurdan etkilenir" },
  { id: "fso", name: "FSO lazer", baseKm: 2, mobile: false, note: "Sisde kesilir, mekanik hizalama" },
  { id: "cellular", name: "Hücresel (LTE/5G)", baseKm: 0, mobile: true, note: "Operatör kapsaması varsa sınırsız" },
  { id: "satellite", name: "Uydu", baseKm: 0, mobile: true, note: "Gökyüzü görüşü varsa sınırsız" },
  { id: "eth", name: "Ethernet / fiber", baseKm: 0.1, mobile: false, note: "Sabit omurga" },
] as const;

const TERRAIN = [
  { id: "los", name: "Açık arazi / tepe hattı", factor: 1 },
  { id: "rural", name: "Kırsal, seyrek ağaç", factor: 0.6 },
  { id: "suburb", name: "Banliyö, alçak yapı", factor: 0.35 },
  { id: "city", name: "Şehir içi, beton", factor: 0.18 },
  { id: "forest", name: "Orman / vadi", factor: 0.15 },
] as const;

const HEIGHTS = [
  { id: "hand", name: "Elde / araç içi (~1.5 m)", factor: 0.5 },
  { id: "roof", name: "Çatı / direk (~8 m)", factor: 1 },
  { id: "mast", name: "Yüksek direk / tepe (~25 m)", factor: 1.7 },
] as const;

function CoveragePlanner() {
  const [carrierId, setCarrierId] = useState<string>("lora");
  const [terrainId, setTerrainId] = useState<string>("suburb");
  const [heightId, setHeightId] = useState<string>("roof");
  const [distanceKm, setDistanceKm] = useState<number>(6);

  const plan = useMemo(() => {
    const carrier = CARRIERS.find((c) => c.id === carrierId)!;
    const terrain = TERRAIN.find((t) => t.id === terrainId)!;
    const height = HEIGHTS.find((h) => h.id === heightId)!;
    const hopKm = Math.max(0.05, carrier.baseKm * terrain.factor * height.factor);
    const infrastructure = carrier.baseKm === 0;
    const hops = infrastructure ? 1 : Math.max(1, Math.ceil(distanceKm / hopKm));
    const relays = infrastructure ? 0 : Math.max(0, hops - 1);
    return { carrier, terrain, height, hopKm, hops, relays, infrastructure };
  }, [carrierId, terrainId, heightId, distanceKm]);

  const agentSnippet = `# Ev düğümü (sabit köprü) — internet çıkışı burada
tedbirge-agent --role gateway --carrier ${plan.carrier.id} --region TR \\
  --license-key <LISANS_ANAHTARINIZ> --node-id ev-01 --uplink auto

# Röle düğümü (çatı/direk) — x${plan.relays || 0} adet
tedbirge-agent --role relay --carrier ${plan.carrier.id} --region TR \\
  --license-key <LISANS_ANAHTARINIZ> --node-id role-01 --store-forward on

# Cepteki uç düğüm (telefon/tablet Wi-Fi ile en yakın düğüme bağlanır)
tedbirge-agent --role edge --carrier ${plan.carrier.id} --region TR \\
  --license-key <LISANS_ANAHTARINIZ> --node-id saha-01 --roaming on`;

  return (
    <SitePage>
      <section className="border-b border-border/60 bg-card/30">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <SectionLabel>Süreklilik mimarisi</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Evdeki tek düğüm ne işe yarar, evden uzaklaşınca ne olur?
          </h1>
          <p className="mt-5 max-w-3xl text-muted-foreground">
            Dürüst cevap: <strong className="text-foreground">tek bir düğüm ağ değildir.</strong> Evdeki düğüm
            internet çıkışını (uplink) ve mesaj kuyruğunu tutan köprüdür. Siz evden uzaklaştığınızda bağlantının
            kopmaması, o köprü ile cebinizdeki uç düğüm arasında <strong className="text-foreground">radyo menzili
            kadar</strong> mesafe kalmasına ya da aradaki boşluğu dolduran röle düğümlerine bağlıdır. Aşağıdaki
            planlayıcı, sizin taşıyıcı/arazi koşulunuzda kaç röleye ihtiyacınız olduğunu gerçekçi rakamlarla söyler.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "1 düğüm",
              d: "Sadece ev içi kapsama + telemetri. Uzaklaşınca bağlantı kesilir; mesajlarınız uç düğümde kuyruğa alınır, menzile girince otomatik iletilir (store-and-forward).",
            },
            {
              t: "2–3 düğüm",
              d: "Ev → çatı/tepe rölesi → cep. Mahalle/köy ölçeğinde kesintisiz mesajlaşma ve konum akışı. Pilot lisansın 5 düğüm limiti bu senaryo için yeterlidir.",
            },
            {
              t: "Hibrit taşıyıcı",
              d: "Hücresel veya uydu taşıyıcısı açıkken yönlendirici otomatik en iyi yolu seçer; şebeke düşerse aynı oturum LoRa/HaLow üzerinden devam eder. Kopma yerine hız düşer.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-lg border border-border bg-card p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-primary">{c.t}</p>
              <p className="mt-3 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <SectionLabel>Planlayıcı</SectionLabel>
          <h2 className="mt-3 text-2xl font-semibold">Kaç düğüme ihtiyacım var?</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="space-y-5">
              <label className="block text-sm">
                <span className="text-muted-foreground">Taşıyıcı</span>
                <select
                  value={carrierId}
                  onChange={(e) => setCarrierId(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {CARRIERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-muted-foreground">{plan.carrier.note}</span>
              </label>

              <label className="block text-sm">
                <span className="text-muted-foreground">Arazi</span>
                <select
                  value={terrainId}
                  onChange={(e) => setTerrainId(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {TERRAIN.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-muted-foreground">Anten yüksekliği</span>
                <select
                  value={heightId}
                  onChange={(e) => setHeightId(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {HEIGHTS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-muted-foreground">
                  Evden uzaklaşacağınız mesafe: <strong className="text-foreground">{distanceKm} km</strong>
                </span>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="mt-3 w-full accent-primary"
                />
              </label>
            </div>

            <div className="rounded-lg border border-primary/40 bg-background p-6">
              {plan.infrastructure ? (
                <>
                  <p className="font-mono text-xs uppercase tracking-widest text-primary">Altyapı taşıyıcısı</p>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Bu taşıyıcıda menzil sizin donanımınıza değil, operatör/uydu kapsamasına bağlıdır. Röle düğüme
                    gerek yoktur; ancak kapsama düştüğü anda devreye girecek bir <strong className="text-foreground">
                    yedek radyo taşıyıcısı</strong> (LoRa veya HaLow) tanımlamanız önerilir. Yönlendirici, birincil yol
                    kaybolduğunda oturumu yedek taşıyıcıya taşır.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-mono text-xs uppercase tracking-widest text-primary">Sonuç</p>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-semibold">{plan.hopKm.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">km / atlama</p>
                    </div>
                    <div>
                      <p className="text-3xl font-semibold">{plan.hops}</p>
                      <p className="text-xs text-muted-foreground">atlama</p>
                    </div>
                    <div>
                      <p className="text-3xl font-semibold text-primary">{plan.relays}</p>
                      <p className="text-xs text-muted-foreground">röle düğüm</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-muted-foreground">
                    {distanceKm} km mesafede kesintisiz bağlantı için ev köprüsü + <strong className="text-foreground">
                    {plan.relays} röle</strong> + cepteki uç düğüm gerekir (toplam {plan.relays + 2} düğüm).
                    {plan.relays + 2 > 5
                      ? " Bu, 5 düğümlük pilot limitini aşar; Enterprise plana geçmeniz ya da röleleri daha yüksek noktalara taşımanız gerekir."
                      : " Bu, 5 düğümlük pilot lisansı ile karşılanabilir."}
                  </p>
                  {!plan.carrier.mobile && (
                    <p className="mt-3 rounded border border-border bg-card p-3 text-xs text-muted-foreground">
                      Uyarı: bu taşıyıcı hareket halinde çalışmaz (sabit, hizalanmış nokta-nokta). Cepteki uç düğüm
                      için LoRa veya HaLow seçin; bu taşıyıcıyı yalnızca röleler arası omurga olarak kullanın.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <SectionLabel>Kurulum</SectionLabel>
        <h2 className="mt-3 text-2xl font-semibold">Kopya-yapıştır düğüm yapılandırması</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Lisans anahtarınızı <Link to="/panel" className="text-primary underline">panelden</Link> alın; her düğümü
          kaydettiğinizde telemetri geldiği anda panelde <strong className="text-foreground">çevrimiçi</strong> görünür.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-lg border border-border bg-card p-5 font-mono text-xs leading-relaxed text-muted-foreground">
{agentSnippet}
        </pre>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">Kopma anında ne olur?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Uç düğüm menzil dışına çıktığında mesajlar yerelde imzalanıp kuyruğa alınır (store-and-forward). Menzile
              döndüğünüzde ya da bir röle görüş alanına girdiğinizde kuyruk sırayla boşalır; hiçbir mesaj kaybolmaz,
              yalnızca gecikir.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">Gerçekçi beklenti</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Radyo fiziği pazarlama ile aşılamaz: şehir içinde LoRa pratikte 0.5–2 km, tepe hattında 10 km+ verir.
              Bu planlayıcı ölçülmüş saha değerlerine yakın kalır; kesin sonuç için{" "}
              <Link to="/saha-raporu" className="text-primary underline">saha test raporunu</Link> doldurun.
            </p>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
