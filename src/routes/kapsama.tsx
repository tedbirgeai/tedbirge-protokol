import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { CARRIERS, TERRAIN, HEIGHTS, buildMeshPlan, agentSnippet, type Measurement } from "@/lib/mesh-plan";
import { saveFieldMeasurement, listFieldMeasurements } from "@/lib/mesh.functions";
import { useAuth } from "@/hooks/useAuth";

const TITLE = "Kapsama & Süreklilik Planlayıcı — Tedbirge Gateway";
const DESC =
  "Evden uzaklaşınca bağlantı nasıl kopmaz? Taşıyıcı, arazi ve anten yüksekliğine göre atlama menzilini, gereken röle düğüm sayısını hesaplayın; gerçek saha ölçümü girip simülasyonu kalibre edin.";
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

function CoveragePlanner() {
  const { user } = useAuth();
  const [carrierId, setCarrierId] = useState<string>("lora");
  const [terrainId, setTerrainId] = useState<string>("suburb");
  const [heightId, setHeightId] = useState<string>("roof");
  const [distanceKm, setDistanceKm] = useState<number>(6);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [testMode, setTestMode] = useState(false);

  // Ölçüm girişi
  const [mDistance, setMDistance] = useState<number>(2);
  const [mLinkOk, setMLinkOk] = useState(true);
  const [mRssi, setMRssi] = useState<string>("");
  const [mSnr, setMSnr] = useState<string>("");
  const [mNote, setMNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function loadMeasurements() {
    const { data } = await supabase
      .from("field_measurements")
      .select("carrier, terrain, antenna_height, distance_km, link_ok")
      .limit(500);
    setMeasurements(
      (data ?? []).map((m) => ({
        carrier: m.carrier,
        terrain: m.terrain,
        antenna_height: m.antenna_height,
        distance_km: Number(m.distance_km),
        link_ok: m.link_ok,
      })),
    );
  }

  useEffect(() => {
    void loadMeasurements();
  }, []);

  const plan = useMemo(
    () => buildMeshPlan({ carrierId, terrainId, heightId, distanceKm, measurements }),
    [carrierId, terrainId, heightId, distanceKm, measurements],
  );

  async function submitMeasurement() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveFieldMeasurement({
        data: {
          carrier: carrierId as never,
          terrain: terrainId as never,
          antennaHeight: heightId as never,
          distanceKm: mDistance,
          linkOk: mLinkOk,
          rssiDbm: mRssi ? Number(mRssi) : null,
          snrDb: mSnr ? Number(mSnr) : null,
          note: mNote || undefined,
        },
      });
      setSaveMsg("Ölçüm kaydedildi; planlayıcı bu veriyle yeniden kalibre edildi.");
      setMNote("");
      await loadMeasurements();
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Ölçüm kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>Planlayıcı</SectionLabel>
              <h2 className="mt-3 text-2xl font-semibold">Kaç düğüme ihtiyacım var?</h2>
            </div>
            <button
              onClick={() => setTestMode((v) => !v)}
              className={`rounded-md border px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] ${
                testMode ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
              }`}
            >
              {testMode ? "Test modu açık" : "Test modu"}
            </button>
          </div>

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
                  <p className="mt-3 text-xs text-muted-foreground">
                    {plan.sampleCount > 0
                      ? `${plan.sampleCount} gerçek saha ölçümü ile kalibre edildi (katalog modeli: ${plan.modelHopKm.toFixed(1)} km/atlama).`
                      : "Henüz bu koşul için saha ölçümü yok; katalog değerleri kullanılıyor."}
                  </p>
                  <p className="mt-5 text-sm text-muted-foreground">
                    {distanceKm} km mesafede kesintisiz bağlantı için ev köprüsü + <strong className="text-foreground">
                    {plan.relays} röle</strong> + cepteki uç düğüm gerekir (toplam {plan.totalNodes} düğüm).
                    {plan.totalNodes > 5
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

          {testMode && (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-primary">Gerçek saha ölçümü</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Sahada iki düğüm arasında ölçtüğünüz mesafeyi ve bağlantının kurulup kurulmadığını girin.
                  Her ölçüm yukarıdaki hesabı otomatik kalibre eder.
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  <label className="block">
                    <span className="text-muted-foreground">Ölçülen mesafe (km)</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0.01}
                      value={mDistance}
                      onChange={(e) => setMDistance(Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex gap-2">
                    {[
                      { v: true, l: "Bağlantı kuruldu" },
                      { v: false, l: "Kopuk" },
                    ].map((o) => (
                      <button
                        key={o.l}
                        onClick={() => setMLinkOk(o.v)}
                        className={`flex-1 rounded-md border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] ${
                          mLinkOk === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-muted-foreground">RSSI (dBm)</span>
                      <input
                        value={mRssi}
                        onChange={(e) => setMRssi(e.target.value)}
                        placeholder="-107"
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-muted-foreground">SNR (dB)</span>
                      <input
                        value={mSnr}
                        onChange={(e) => setMSnr(e.target.value)}
                        placeholder="-7"
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-muted-foreground">Not</span>
                    <input
                      value={mNote}
                      onChange={(e) => setMNote(e.target.value)}
                      placeholder="Sakarya · tepe hattı · yağmurlu"
                      className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                    />
                  </label>

                  {user ? (
                    <button
                      onClick={submitMeasurement}
                      disabled={saving}
                      className="w-full rounded-md bg-primary px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-primary-foreground disabled:opacity-50"
                    >
                      {saving ? "Kaydediliyor…" : "Ölçümü kaydet"}
                    </button>
                  ) : (
                    <Link
                      to="/giris"
                      className="block rounded-md border border-border px-4 py-2.5 text-center font-mono text-xs uppercase tracking-[0.15em] hover:bg-secondary"
                    >
                      Ölçüm kaydetmek için giriş yapın
                    </Link>
                  )}
                  {saveMsg && <p className="text-xs text-primary">{saveMsg}</p>}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-primary">Atlama simülasyonu</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {distanceKm} km hedef için {plan.hopKm.toFixed(2)} km'lik atlamalarla oluşan zincir:
                </p>
                <ol className="mt-4 space-y-2 text-sm">
                  {plan.chain.map((n, i) => (
                    <li
                      key={n.nodeId}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <span className="font-mono text-xs">
                        {i + 1}. {n.nodeId}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {n.label} · {n.distanceKm} km
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-xs text-muted-foreground">
                  Toplam {plan.hops} atlama · {plan.relays} röle · zincir gecikmesi yaklaşık{" "}
                  {(plan.hops * 0.35).toFixed(2)} sn (LoRa sınıfı taşıyıcıda atlama başına ~350 ms).
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Aynı planı panelden tek tıkla kurmak için{" "}
                  <Link to="/panel" className="text-primary underline">
                    otomatik röle zinciri sihirbazını
                  </Link>{" "}
                  kullanın.
                </p>
              </div>
            </div>
          )}
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
{agentSnippet(plan)}
        </pre>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">Kopma anında ne olur?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Uç düğüm menzil dışına çıktığında mesajlar yerelde imzalanıp kuyruğa alınır (store-and-forward). Menzile
              döndüğünüzde ya da bir röle görüş alanına girdiğinizde kuyruk sırayla boşalır; hiçbir mesaj kaybolmaz,
              yalnızca gecikir. Kuyruğun durumu panelde canlı görünür.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">Gerçekçi beklenti</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Radyo fiziği pazarlama ile aşılamaz: şehir içinde LoRa pratikte 0.5–2 km, tepe hattında 10 km+ verir.
              Bu planlayıcı ölçülmüş saha değerleriyle kalibre olur; kesin sonuç için{" "}
              <Link to="/saha-raporu" className="text-primary underline">saha test raporunu</Link> doldurun.
            </p>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
