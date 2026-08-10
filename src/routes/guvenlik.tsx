import { createFileRoute, Link } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";
import { MERE_CONDUIT } from "@/lib/regulation";
import { EGRESS_POLICY } from "@/lib/egress-guard";

const TITLE = "Güvenlik & Tehdit Modeli — Sıfır-Bilgi Geçidin Sınırları";
const DESC =
  "Tedbirge Protokol'in tehdit modeli: kriptografik temeller, hangi saldırganlara karşı koruma sağlanır, sıfır-bilgi iddiasının kapsamı, bilinen sınırlar ve zafiyet bildirim süreci.";
const URL = "https://tedbirge-gateway.lovable.app/guvenlik";

export const Route = createFileRoute("/guvenlik")({
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
  component: Security,
});

const primitives = [
  ["Veri gizliliği", "AES-256-GCM · chunk başına nonce · AEAD bütünlük etiketi"],
  ["Düğüm kimliği", "Ed25519 anahtar çifti · katılımda Proof-of-Work"],
  ["Bütünlük/ölçüm", "SHA-256 özeti · yalnızca bayt sayımı kaydedilir"],
  ["Tekrar koruması", "Nonce kayan penceresi · TTL ve loop-prevention"],
  ["Off-grid muhasebe", "Ed25519 imzalı fiş · çift harcama koruması"],
];

const inScope = [
  {
    t: "Pasif ağ dinleyicisi",
    b: "Taşıyıcı üzerindeki trafiği kaydeden saldırgan yalnızca şifreli chunk'ları ve boyut/zamanlama meta verisini görür; içerik açığa çıkmaz.",
  },
  {
    t: "Kötü niyetli röle düğümü",
    b: "Halkadaki bir röle taşıdığı içeriği çözemez; anahtar uçlarda kalır. Röle en fazla paketi düşürebilir — bu da çok-sıçramalı yol seçimiyle tolere edilir.",
  },
  {
    t: "Tekrar (replay) saldırısı",
    b: "Kaydedilen paketin yeniden gönderimi nonce penceresi ve TTL tarafından reddedilir.",
  },
  {
    t: "Sahte düğüm katılımı",
    b: "Kimliksiz düğüm halkaya giremez; katılım Ed25519 imzası ve Proof-of-Work maliyeti gerektirir.",
  },
  {
    t: "Off-grid çift harcama",
    b: "İmzalı fiş defteri, aynı relay kredisinin iki kez harcanmasını sonradan mahsuplaşmada tespit eder.",
  },
];

const outOfScope = [
  {
    t: "Ele geçirilmiş uç cihaz",
    b: "Düğümün kök yetkisi saldırgandaysa anahtarlar da onundur. Uç sertleştirme, disk şifreleme ve fiziksel güvenlik operatörün sorumluluğudur.",
  },
  {
    t: "Trafik analizi",
    b: "İçerik gizlidir; paket boyutu, zamanlama ve hacim deseni gizlenmez. Metadata direnci hedeflenen bir özellik değildir.",
  },
  {
    t: "Küresel pasif gözlemci",
    b: "Tüm taşıyıcıları aynı anda gözleyen devlet düzeyinde bir aktöre karşı anonimlik iddiamız yoktur — bu bir anonimlik ağı değil, bir transport katmanıdır.",
  },
  {
    t: "Radyo katmanı jamming",
    b: "Kasıtlı RF bozma engellenemez; yanıt, taşıyıcı çeşitliliğiyle otomatik yol değiştirmektir.",
  },
  {
    t: "Tedarik zinciri",
    b: "Binary bütünlüğü sürüm imzası ve SHA-256 özeti ile doğrulanır; işletim sistemi ve donanım tedarik zinciri kapsam dışıdır.",
  },
];

const claims = [
  ["Ne demek", "Geçit, taşıdığı içeriği hiçbir noktada saklamaz ve düz metne erişmez."],
  ["Nasıl ölçülür", "Ölçüm kaydı yalnızca SHA-256 özeti, bayt sayımı ve zaman damgasından oluşur."],
  ["Ne demek değil", "Metadata gizliliği, anonimlik veya trafik analizine direnç iddia edilmez."],
  ["Doğrulanabilirlik", "Kaynak kod incelemeye açıktır; bağımsız kriptografik denetim henüz yapılmamıştır ve tamamlandığında raporu bu sayfada yayımlanacaktır."],
];

function Security() {
  return (
    <SitePage className="tbos cyber-grid">
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Güvenlik</SectionLabel>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Tehdit modeli: neyi koruyoruz, neyi korumuyoruz
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Güvenlik iddiası, sınırları yazılı olmadıkça iddia değildir. Aşağıda Tedbirge
            Tedbirge ProtokolGateway&apos;inapos;ün kriptografik temelleri, kapsadığı saldırgan sınıfları ve açıkça
            kapsam dışı bıraktığı alanlar yer alır.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Temeller</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Kriptografik yapı taşları</h2>
        <dl className="mt-10 divide-y divide-border/60 overflow-hidden rounded-sm border border-border">
          {primitives.map(([k, v]) => (
            <div key={k} className="grid gap-2 bg-card/40 px-6 py-5 md:grid-cols-[220px_1fr]">
              <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                {k}
              </dt>
              <dd className="font-mono text-[13px] text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <SectionLabel>Yasal zırh</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">{MERE_CONDUIT.title}</h2>
        <p className="mt-4 inline-flex items-center gap-2 rounded-sm border border-primary/50 bg-primary/5 px-3 py-1.5 font-mono text-[11px] text-primary">
          ✓ {MERE_CONDUIT.badge}
        </p>
        <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {MERE_CONDUIT.clauses.map((c) => (
            <li key={c} className="rounded-sm border border-border bg-card/40 p-4">
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-sm border border-border bg-background/60 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {EGRESS_POLICY.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{EGRESS_POLICY.summary}</p>
          <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-muted-foreground">
            {EGRESS_POLICY.rules.map((r) => (
              <li key={r}>· {r}</li>
            ))}
          </ul>
        </div>
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">{MERE_CONDUIT.disclaimer}</p>
      </section>



      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <SectionLabel>Kapsam içi</SectionLabel>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              Karşı koruma sağladığımız saldırganlar
            </h2>
            <ul className="mt-8 space-y-6">
              {inScope.map((i) => (
                <li key={i.t} className="border-l-2 border-primary/60 pl-5">
                  <p className="text-sm font-semibold">{i.t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.b}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel>Kapsam dışı</SectionLabel>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              Açıkça iddia etmediklerimiz
            </h2>
            <ul className="mt-8 space-y-6">
              {outOfScope.map((i) => (
                <li key={i.t} className="border-l-2 border-border pl-5">
                  <p className="text-sm font-semibold">{i.t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{i.b}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionLabel>Sıfır-bilgi iddiası</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Kelimelerin tam karşılığı</h2>
        <dl className="mt-10 divide-y divide-border/60 overflow-hidden rounded-sm border border-border">
          {claims.map(([k, v]) => (
            <div key={k} className="grid gap-2 bg-card/40 px-6 py-5 md:grid-cols-[220px_1fr]">
              <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">{k}</dt>
              <dd className="text-sm leading-relaxed text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionLabel>Zafiyet bildirimi</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Sorumlu açıklama politikası
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ["Bildirim", "tedbirge34@gmail.com adresine teknik ayrıntı ve yeniden üretim adımlarıyla yazın."],
              ["Yanıt süresi", "72 saat içinde teyit, 90 gün içinde düzeltme veya gerekçeli yol haritası."],
              ["Taahhüt", "İyi niyetli araştırmaya hukuki işlem başlatılmaz; katkı sürüm notlarında anılır."],
            ].map(([k, v]) => (
              <div key={k} className="rounded-sm border border-border bg-background/60 p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">{k}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/uyumluluk"
              className="rounded-sm border border-border px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] hover:bg-secondary"
            >
              Spektrum & uyum
            </Link>
            <Link
              to="/iletisim"
              className="rounded-sm bg-primary px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground hover:opacity-90"
            >
              Güvenlik ekibine yaz
            </Link>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
