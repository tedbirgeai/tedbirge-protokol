/**
 * Salt-okunur kurumsal iş planı rehberi.
 * Yalnızca /yonetim panelinde admin rolüne gösterilir. Veri tabanı erişimi yoktur.
 */

export type BusinessPlanSection = {
  id: string;
  title: string;
  summary: string;
  items: string[];
};

export const BUSINESS_PLAN_VERSION = "v1.0 · Mimar: Mehmet DİNÇ";

export const BUSINESS_PLAN: BusinessPlanSection[] = [
  {
    id: "positioning",
    title: "1. Stratejik konumlandırma",
    summary: "İş planının açılışında ürün, pazar ve farklılaşma tek cümleyle anlaşılır olmalı.",
    items: [
      "Ürün: taşıyıcı-bağımsız, sıfır-bilgi iletişim overlay katmanı; fiziksel altyapı yatırımı gerektirmez.",
      "Pazar: afet & kamu, kritik altyapı, enerji/maden, kırsal bağlantı, kurumsal saha operasyonu.",
      "Farklılaşma: 9 fiziksel taşıyıcıyı tek yönetim düzleminde birleştirmek ve kesinti anında otomatik devretmek.",
      "Rakip değil tamamlayıcı: telekom operatörü taşıyıcıdır; Tedbirge Protocol onun üzerinde dayanıklılık katmanıdır.",
    ],
  },
  {
    id: "capability",
    title: "2. Yetenek envanteri (kod tabanı → ticari değer)",
    summary: "Her teknik yetenek, satılabilir bir faydaya çevrilerek listelenmelidir.",
    items: [
      "Trust: uçtan uca şifreli, sıfır-bilgi röle → 'içerik röle düğümünde okunamaz' beyanı.",
      "Edge / Loop: çoklu taşıyıcı yönlendirme ve otomatik devretme → ölçülebilir süreklilik SLA'sı.",
      "Off-Grid: kuyruklama ve öncelikli iletim → internet kesintisinde operasyonun sürmesi.",
      "Sense / Console: telemetri, tanılama ve proaktif danışman → operasyonel maliyet düşüşü.",
      "Relay: dağıtık röle → yatırımsız kapsama genişletme.",
    ],
  },
  {
    id: "raas",
    title: "3. RaaS gelir modeli",
    summary: "Resilience-as-a-Service; düğüm ve süreklilik taahhüdü üzerinden abonelik.",
    items: [
      "Freemium: 5 düğüm, topluluk desteği — pazar girişi ve ürün deneme kanalı.",
      "Community: küçük ekip / STK; düğüm başı aylık ücret, temel telemetri.",
      "Enterprise: kurumsal SLA, rol bazlı panel, uyum raporlaması, öncelikli destek.",
      "Operator: taşıyıcı/entegratör ortaklığı; gelir paylaşımı ve beyaz etiket.",
      "Ek gelir: pilot kurulum hizmeti, saha eğitimi, uyum dosyası hazırlığı.",
    ],
  },
  {
    id: "gtm",
    title: "4. Pazara giriş sırası",
    summary: "Referans önce, ölçek sonra. Pilot olmadan kurumsal satış olmaz.",
    items: [
      "Aşama 1 — Sakarya saha pilotu: ölçülmüş gecikme, paket kaybı ve kesinti süresi verisi topla.",
      "Aşama 2 — Referans dosyası: pilot çıktısını PDF saha raporuna dönüştür, izin/uyum ekleriyle birlikte sun.",
      "Aşama 3 — Kamu & kritik altyapı: AFAD, belediye, enerji dağıtım şirketleri ile ikinci pilot.",
      "Aşama 4 — Kanal: entegratör ve taşıyıcı ortaklıklarıyla satışı çoğalt.",
      "Aşama 5 — Uluslararası: yasal sınırlar dahilinde bölge bazlı spektrum profilleriyle genişleme.",
    ],
  },
  {
    id: "compliance",
    title: "5. Uyum ve yasal çerçeve",
    summary: "Kurumsal alıcı, uyum dosyası olmayan çözümü satın alma sürecine bile almaz.",
    items: [
      "Spektrum: BTK (TR), ETSI (EU), FCC (US) sınırları tek kaynaktan yönetilir; 868 MHz 25 mW %1 duty-cycle kilidi yazılımda uygulanır.",
      "Veri: KVKK/GDPR; röle düğümünde kişisel veri işlenmediği teknik olarak kanıtlanabilir olmalı.",
      "5651: genel internet dağıtımı yapılmaz; düğüm sahibi sağlayıcı konumuna düşmez.",
      "İhracat: Wassenaar kapsamı gözetilir; ülke bazlı kısıtlar satış öncesi kontrol edilir.",
      "Belge zinciri: her pilot için izin, uyum beyanı ve kanıt karması arşivlenir.",
    ],
  },
  {
    id: "finance",
    title: "6. Finansal kurgu",
    summary: "Asset-light model; maliyetin ana kalemi insan ve uyum, donanım değil.",
    items: [
      "Maliyet: geliştirme, bulut/telemetri, uyum danışmanlığı, saha pilot lojistiği.",
      "Birim ekonomi: düğüm başı aylık gelir − düğüm başı işletme maliyeti; hedef brüt marj %70+.",
      "Metrikler: aktif düğüm, aylık yinelenen gelir, düğüm kaybı oranı, pilot→sözleşme dönüşümü.",
      "Nakit planı: 24 aylık gelir-gider tablosu, iki senaryo (temkinli / hedef).",
      "Fon: TÜBİTAK, KOSGEB, Teknopark ve AB dijital dayanıklılık programlarına uygunluk taraması.",
    ],
  },
  {
    id: "risk",
    title: "7. Risk ve azaltım",
    summary: "Riskleri planın içinde açıkça yazmak, kurumsal güvenilirliği artırır.",
    items: [
      "Regülasyon değişikliği → tek kaynaklı spektrum yapılandırması ile hızlı uyarlama.",
      "Uzun kamu satın alma döngüsü → paralel özel sektör pilotlarıyla nakit dengesi.",
      "Donanım tedariki → çoklu modem/taşıyıcı desteğiyle tek tedarikçiye bağımlılığın kırılması.",
      "Tek kişiye bağımlılık → dokümantasyon, kod sahipliği ve kademeli ekip planı.",
      "İddia riski → tasarruf ve süreklilik oranları ölçülmeden pazarlamada kullanılmaz.",
    ],
  },
  {
    id: "next",
    title: "8. Sonraki 90 gün",
    summary: "Plan, takvimli eyleme bağlanmadan iş planı sayılmaz.",
    items: [
      "0-30 gün: saha pilotu kurulumu ve telemetri toplama akışının doğrulanması.",
      "30-60 gün: ilk saha raporu, uyum dosyası ve referans sunumunun hazırlanması.",
      "60-90 gün: iki kurumsal görüşme, fiyat testi ve ödeme akışının canlıya alınması.",
      "Sürekli: metriklerin panelden haftalık izlenmesi ve plan revizyonu.",
    ],
  },
];
