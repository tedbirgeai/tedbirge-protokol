import { createFileRoute } from "@tanstack/react-router";
import { SitePage, SectionLabel } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/gizlilik")({
  head: () => ({
    meta: [
      { title: "Gizlilik Bildirimi — Tedbirge Protokol" },
      {
        name: "description",
        content:
          "Tedbirge Protokol gizlilik bildirimi: işlenen kişisel veri kategorileri, işleme amaçları, hukuki sebepler, saklama süreleri ve KVKK/GDPR hakları.",
      },
      { property: "og:title", content: "Tedbirge Gizlilik Bildirimi" },
      { property: "og:description", content: "Kişisel veri işleme, paylaşım ve haklarınız." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://tedbirge-gateway.lovable.app/gizlilik" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge-gateway.lovable.app/gizlilik" }],
  }),
  component: Privacy,
});

const SELLER = "Mehmet DİNÇ (Tedbirge Gateway)";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Privacy() {
  return (
    <SitePage>
      <section className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <div>
          <SectionLabel>Yasal</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Gizlilik Bildirimi</h1>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
          </p>
        </div>

        <Section title="1. Veri sorumlusu">
          <p>
            {SELLER}, bu sitede ve Tedbirge ürünlerinde işlenen kişisel veriler bakımından veri
            sorumlusudur (KVKK m.3; GDPR m.4/7).
          </p>
        </Section>

        <Section title="2. İşlenen veri kategorileri ve amaçları">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Kimlik ve iletişim</strong> (ad soyad, kurum, e-posta, telefon) — hesap açma, pilot başvurusu değerlendirme, sözleşme kurma ve destek.</li>
            <li><strong>Hesap ve oturum verileri</strong> (kullanıcı kimliği, oturum jetonları) — kimlik doğrulama ve güvenlik.</li>
            <li><strong>Abonelik ve lisans verileri</strong> (plan, düğüm sayısı, dönem, lisans anahtarı) — sözleşmenin ifası ve lisans yönetimi.</li>
            <li><strong>Teknik/kullanım verileri</strong> (IP adresi, cihaz ve tarayıcı bilgisi, taşınan bayt sayısı, SHA-256 özetleri) — güvenlik, dolandırıcılık önleme, faturalama ölçümü ve ürün iyileştirme.</li>
            <li><strong>Destek yazışmaları</strong> — talep yönetimi ve kayıt.</li>
          </ul>
          <p>
            Ağ üzerinden taşınan mesaj içerikleri sıfır-bilgi ilkesiyle işlenir: yalnızca bayt
            sayısı ve SHA-256 özeti ölçülür, içerik saklanmaz.
          </p>
        </Section>

        <Section title="3. Hukuki sebepler">
          <p>
            Sözleşmenin kurulması ve ifası (KVKK m.5/2-c; GDPR m.6/1-b), hukuki yükümlülük
            (m.5/2-ç; m.6/1-c), meşru menfaat (m.5/2-f; m.6/1-f) ve gerektiğinde açık rıza
            (m.5/1; m.6/1-a).
          </p>
        </Section>

        <Section title="4. Aktarım yapılan alıcı kategorileri">
          <ul className="list-disc space-y-1 pl-5">
            <li>Barındırma, veritabanı ve analitik hizmet sağlayıcıları (alt işleyenler).</li>
            <li>Kayıtlı satıcı (Merchant of Record) Paddle.com — satış, abonelik yönetimi, ödeme, vergi uyumu ve faturalandırma amacıyla.</li>
            <li>Hukuk ve mali müşavirlik gibi profesyonel danışmanlar.</li>
            <li>Mevzuatın zorunlu kıldığı hâllerde yetkili kamu kurumları.</li>
          </ul>
        </Section>

        <Section title="5. Yurt dışına aktarım">
          <p>
            Hizmet sağlayıcılarımızın bir kısmı AB/AEA ve ABD’de bulunur. Aktarımlar; yeterlilik
            kararı, Standart Sözleşme Hükümleri (SCC) veya KVKK m.9 kapsamındaki uygun
            güvenceler temelinde yapılır.
          </p>
        </Section>

        <Section title="6. Saklama süreleri">
          <p>
            Hesap ve abonelik verileri ilişki sürdüğü müddetçe, ticari defter ve fatura kayıtları
            mevzuattaki azami süre (Türkiye’de 10 yıl) boyunca saklanır. Amaç ortadan
            kalktığında veriler silinir veya anonim hâle getirilir.
          </p>
        </Section>

        <Section title="7. Haklarınız">
          <p>
            Erişim, düzeltme, silme, işlemenin kısıtlanması, veri taşınabilirliği, itiraz ve
            rızayı geri çekme haklarına sahipsiniz. Talepler en geç 30 gün içinde yanıtlanır.
            Ayrıca Kişisel Verileri Koruma Kurumu’na (veya AB/AEA’da ilgili denetim otoritesine)
            şikâyet hakkınız saklıdır.
          </p>
        </Section>

        <Section title="8. Güvenlik">
          <p>
            AES-256-GCM şifreleme, Ed25519 düğüm kimliği, erişim kontrolü ve satır düzeyi
            yetkilendirme dâhil uygun teknik ve idari tedbirler uygulanır.
          </p>
        </Section>

        <Section title="9. Çerezler">
          <p>
            Yalnızca oturum ve güvenlik için gerekli zorunlu çerezler ile ödeme sağlayıcısının
            çerezleri kullanılır. Pazarlama amaçlı izleme çerezi kullanılmaz; tarayıcı
            ayarlarınızdan çerez tercihlerinizi yönetebilirsiniz.
          </p>
        </Section>

        <Section title="10. İletişim">
          <p>
            Veri sahibi başvuruları için iletişim formunu kullanabilir veya{" "}
            <a className="text-primary underline" href="mailto:tedbirge34@gmail.com">
              tedbirge34@gmail.com
            </a>{" "}
            adresine yazabilirsiniz.
          </p>
        </Section>

      </section>
    </SitePage>
  );
}
