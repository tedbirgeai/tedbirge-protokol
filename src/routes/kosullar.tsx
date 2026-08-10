import { createFileRoute } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/kosullar")({
  head: () => ({
    meta: [
      { title: "Kullanım Koşulları — Tedbirge Protokol" },
      {
        name: "description",
        content:
          "Tedbirge Protokol hizmet ve lisans kullanım koşulları: kabul, uygun kullanım, fikri mülkiyet, ödeme, askıya alma ve sorumluluk sınırları.",
      },
      { property: "og:title", content: "Tedbirge Kullanım Koşulları" },
      { property: "og:description", content: "Hizmet ve lisans kullanım koşulları." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tedbirge-gateway.lovable.app/kosullar" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/kosullar" }],
  }),
  component: Terms,
});

const SELLER = "Mehmet DİNÇ (Tedbirge Protokol)";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Terms() {
  return (
    <SitePage>
      <section className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <div>
          <SectionLabel>Yasal</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Kullanım Koşulları</h1>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
          </p>
        </div>

        <Section title="1. Taraflar ve kabul">
          <p>
            Bu koşullar, Tedbirge Protokol yazılımını ve ilgili hizmetleri sunan {SELLER} (“Satıcı”,
            “biz”) ile hizmeti kullanan gerçek veya tüzel kişi (“Kullanıcı”, “siz”) arasındadır.
            Siteyi veya yazılımı kullanmaya devam etmeniz bu koşulları kabul ettiğiniz anlamına
            gelir. Kurum adına kabul ediyorsanız, kurumu bağlama yetkisine sahip olduğunuzu beyan
            edersiniz.
          </p>
        </Section>

        <Section title="2. Hizmet tanımı">
          <p>
            Tedbirge Protokol, Tedbirge Loop ve Tedbirge Off-Grid; taşıyıcı-bağımsız mesh
            yönlendirme, şifreli tünel taşıma ve kullanım ölçüm bileşenlerinden oluşan yazılım
            ürünleridir. Community sürümü açık kaynak lisansıyla, Enterprise ve Operator paketleri
            ise abonelik karşılığı sunulur.
          </p>
        </Section>

        <Section title="3. Uygun kullanım">
          <p>Kullanıcı aşağıdakileri yapmamayı kabul eder:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Yürürlükteki mevzuata aykırı kullanım; özellikle 5809 sayılı Elektronik Haberleşme
              Kanunu ve TCK 132–140 kapsamındaki ihlaller.
            </li>
            <li>
              Lisanslı spektrumda izinsiz yayın, izinsiz uydu dinleme veya izin gerektiren bantlarda
              koordinasyonsuz çalışma.
            </li>
            <li>
              Dolandırıcılık, istenmeyen toplu ileti (spam) veya üçüncü kişilerin fikri mülkiyet
              haklarının ihlali.
            </li>
            <li>
              Zararlı yazılım yayma, güvenlik testi izni olmadan sistemleri tarama, hız sınırlarını
              aşma veya teknik kısıtları dolanma.
            </li>
            <li>
              Yazılımı tersine mühendislikle çözme, yeniden satma veya lisans kapsamının dışında
              dağıtma.
            </li>
          </ul>
        </Section>

        <Section title="4. Hesap ve doğruluk">
          <p>
            Hesap bilgilerinizin gizliliğinden ve hesabınız altındaki tüm işlemlerden siz
            sorumlusunuz. Verdiğiniz bilgileri doğru ve güncel tutmakla yükümlüsünüz.
          </p>
        </Section>

        <Section title="5. Fikri mülkiyet">
          <p>
            Yazılım, dokümantasyon, marka ve görsel kimlik dâhil tüm fikri mülkiyet hakları {SELLER}
            ’a aittir. Enterprise ve Operator paketleri; devredilemez, münhasır olmayan ve seçilen
            plan kapsamıyla sınırlı bir kullanım hakkı verir. Açık kaynak bileşenler kendi lisans
            metinlerine tabidir.
          </p>
        </Section>

        <Section title="6. Hizmet seviyesi">
          <p>
            Yazılımın kesintisiz veya hatasız çalışacağı garanti edilmez. Yürürlükteki mevzuatın
            izin verdiği azami ölçüde, satılabilirlik ve belirli bir amaca uygunluk dâhil olmak
            üzere tüm zımni garantiler reddedilir.
          </p>
        </Section>

        <Section title="7. Ödeme, abonelik ve vergiler">
          <p>
            Siparişlerimiz çevrim içi bayimiz Paddle.com üzerinden gerçekleştirilir. Paddle.com tüm
            siparişlerimizde kayıtlı satıcıdır (Merchant of Record); müşteri hizmetleri taleplerini
            ve iadeleri Paddle yürütür. Ödeme, faturalama, vergi ve iptal mekaniği için{" "}
            <a
              className="text-primary underline"
              href="https://www.paddle.com/legal/checkout-buyer-terms"
              target="_blank"
              rel="noreferrer"
            >
              Paddle Alıcı Koşulları
            </a>{" "}
            geçerlidir. Abonelikler, iptal edilmediği sürece seçilen dönemde otomatik yenilenir.
          </p>
        </Section>

        <Section title="8. Askıya alma ve fesih">
          <p>
            Esaslı sözleşme ihlali, ödeme yapılmaması, güvenlik veya dolandırıcılık riski ya da
            tekrarlayan politika ihlalleri hâlinde erişiminizi askıya alabilir veya
            sonlandırabiliriz. Erişim sona erdiğinde verilerinizi dışa aktarmanız için makul bir
            süre tanınır; bu sürenin ardından veriler silinir.
          </p>
        </Section>

        <Section title="9. Sorumluluk sınırı">
          <p>
            Toplam sorumluluğumuz, talebin doğduğu tarihten önceki 12 ayda tarafınızca ödenen
            ücretlerle sınırlıdır. Dolaylı, arızi veya netice kabilinden zararlar (kâr, veri veya
            itibar kaybı) kapsam dışıdır. Hile, kasıt, ölüm ve bedensel zarara ilişkin sorumluluklar
            saklıdır.
          </p>
        </Section>

        <Section title="10. Tazminat">
          <p>
            İçeriğiniz, hukuka aykırı kullanımınız veya bu koşulların ihlalinden doğan üçüncü kişi
            taleplerine karşı {SELLER}’ı tazmin etmeyi kabul edersiniz.
          </p>
        </Section>

        <Section title="11. Uygulanacak hukuk ve uyuşmazlık">
          <p>
            Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Uyuşmazlıklarda İstanbul mahkemeleri
            ve icra daireleri yetkilidir.
          </p>
        </Section>

        <Section title="12. Devir ve mücbir sebep">
          <p>
            Kullanıcı, yazılı onayımız olmadan bu sözleşmeyi devredemez; birleşme ve devralma
            hâllerinde devir hakkımız saklıdır. Makul kontrolümüz dışındaki olaylarda edim
            yükümlülüğü askıya alınır.
          </p>
        </Section>

        <Section title="13. İletişim">
          <p>
            Sorularınız için pilot ve iletişim formunu kullanabilirsiniz. Faturalama ve iade
            talepleri doğrudan Paddle üzerinden de iletilebilir.
          </p>
        </Section>
      </section>
    </SitePage>
  );
}
