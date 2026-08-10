import { createFileRoute } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/iade")({
  head: () => ({
    meta: [
      { title: "İade Politikası — Tedbirge Protokol" },
      {
        name: "description",
        content:
          "Tedbirge abonelikleri için 30 gün koşulsuz iade garantisi; iade talebi nasıl açılır, ne kadar sürede sonuçlanır ve hangi durumlar kapsam dışıdır.",
      },
      { property: "og:title", content: "Tedbirge İade Politikası" },
      { property: "og:description", content: "30 günlük para iade garantisi ve iade süreci." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tedbirge-gateway.lovable.app/iade" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/iade" }],
  }),
  component: Refund,
});

function Refund() {
  return (
    <SitePage>
      <section className="mx-auto max-w-3xl space-y-8 px-6 py-16">
        <div>
          <SectionLabel>Yasal</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">İade Politikası</h1>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
          </p>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">30 gün para iade garantisi.</strong> Satın aldığınız
            Tedbirge aboneliğinden memnun kalmazsanız, sipariş tarihinden itibaren 30 gün içinde tam
            iade talep edebilirsiniz. Gerekçe belirtmek zorunda değilsiniz.
          </p>
          <p>
            İadeler, kayıtlı satıcımız (Merchant of Record) Paddle tarafından işlenir. Talebinizi{" "}
            <a
              className="text-primary underline"
              href="https://paddle.net"
              target="_blank"
              rel="noreferrer"
            >
              paddle.net
            </a>{" "}
            üzerinden ya da iletişim formumuz aracılığıyla iletebilirsiniz. Onaylanan iadeler, ödeme
            yaptığınız yönteme genellikle 5–10 iş günü içinde yansır.
          </p>
          <p>
            Yenilenen abonelik dönemleri için de aynı 30 günlük süre geçerlidir. Aboneliğinizi
            dilediğiniz an müşteri panelinden veya Paddle üzerinden iptal edebilirsiniz; iptal
            sonrasında erişiminiz ödenmiş dönemin sonuna kadar devam eder.
          </p>
          <p>
            Ücretsiz Community sürümü için ödeme alınmadığından iade söz konusu değildir. Operator
            paketlerinde özel sözleşme hükümleri geçerli olabilir; bu durumda iade koşulları
            sözleşmenizde açıkça belirtilir.
          </p>
          <p>Tüketici mevzuatından doğan cayma hakkınız bu politikadan bağımsız olarak saklıdır.</p>
        </div>
      </section>
    </SitePage>
  );
}
