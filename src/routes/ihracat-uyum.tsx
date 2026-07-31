import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

const TITLE = "İhracat Kontrolü & Çift Kullanım Beyanı — Tedbirge Protokol";
const DESC =
  "Tedbirge Protokol'in kriptografik yetenekleri, Wassenaar Düzenlemesi kapsamındaki sınıflandırması, yasaklı ülke politikası ve son kullanıcı beyanı süreci.";
const URL = "https://tedbirge-gateway.lovable.app/ihracat-uyum";

export const Route = createFileRoute("/ihracat-uyum")({
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
  component: ExportCompliance,
});

const classification = [
  ["Ürün", "Tedbirge Protokol / Loop / Off-Grid — yalnızca yazılım (tek statik binary + SDK)"],
  ["Kriptografi", "AES-256-GCM (veri), Ed25519 (kimlik/imza), SHA-256 (özet)"],
  ["Wassenaar kategorisi", "Kategori 5 Bölüm 2 — Bilgi Güvenliği (kitlesel pazar istisnası değerlendirilir)"],
  ["AB Çift Kullanım", "Reg. (EU) 2021/821 kapsamı — 5A002/5D002 ile ilişkilendirilebilir"],
  ["ABD analoji", "ECCN 5D002 benzeri; yeniden ihracat halinde EAR sorumluluğu alıcıdadır"],
  ["Donanım", "Yok — hiçbir radyo, verici veya şifreleme donanımı sevk edilmez"],
];

const policy = [
  {
    t: "Yaptırım taraması",
    b: "Her kurumsal lisans, sipariş öncesi BM, AB, ABD OFAC ve Türkiye yaptırım listelerine karşı taranır. Listelenmiş taraf, iştirak veya nihai kullanıcıya lisans verilmez.",
  },
  {
    t: "Ambargolu bölgeler",
    b: "Kapsamlı ambargo altındaki ülke ve bölgelere satış, dağıtım ve teknik destek yapılmaz. Community sürümünün bu bölgelerden indirilmesi de lisans ihlalidir.",
  },
  {
    t: "Son kullanıcı beyanı",
    b: "Enterprise ve Operator lisanslarında alıcı; nihai kullanım, nihai kullanıcı ve konuşlanma ülkesini yazılı beyan eder. Beyan dışı kullanım lisansı feshe tabi kılar.",
  },
  {
    t: "Yeniden ihracat yasağı",
    b: "Lisans devri, alt lisanslama ve üçüncü ülkeye yeniden ihracat, yazılı ön onay olmadan yasaktır.",
  },
  {
    t: "İnsan hakları eşiği",
    b: "Toplu gözetim, sansür veya sivil haberleşmenin bastırılması amaçlı kullanım sözleşmeyle yasaklanmıştır; tespiti halinde lisans iptal edilir.",
  },
  {
    t: "Kayıt tutma",
    b: "Satış, beyan ve tarama kayıtları en az 5 yıl saklanır; yetkili düzenleyici talebinde ibraz edilir.",
  },
];

function ExportCompliance() {
  return (
    <SitePage>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>İhracat uyumu</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Güçlü kriptografi, açık beyan
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Tedbirge Protokol güçlü şifreleme içeren bir yazılımdır ve bu nedenle çift kullanımlı
            teknoloji rejimlerinin kapsamına girebilir. Dünya genelinde hizmet veriyoruz —
            yalnızca yasal sınırlar dahilinde.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Sınıflandırma</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Teknik künye</h2>
        <dl className="mt-10 divide-y divide-border/60 overflow-hidden rounded-sm border border-border">
          {classification.map(([k, v]) => (
            <div key={k} className="grid gap-2 bg-card/40 px-6 py-5 md:grid-cols-[220px_1fr]">
              <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {k}
              </dt>
              <dd className="text-sm leading-relaxed text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Bu sayfa bilgilendirme amaçlıdır ve hukuki görüş yerine geçmez. Nihai sınıflandırma,
          alıcının kendi yargı bölgesindeki yetkili makam tarafından teyit edilmelidir.
        </p>
      </section>

      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Politika</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">Altı bağlayıcı kural</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
            {policy.map((p) => (
              <article key={p.t} className="bg-background/60 p-7">
                <h3 className="text-base font-semibold">{p.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Son kullanıcı beyan formu
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Kurumsal satın alma öncesi nihai kullanım beyanını birlikte tamamlıyoruz. Konuşlanma
            ülkenizi yazın, uygun lisans yolunu bildirelim.
          </p>
        </div>
        <div className="flex gap-3">
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
            Beyan başlat
          </Link>
        </div>
      </section>
    </SitePage>
  );
}
