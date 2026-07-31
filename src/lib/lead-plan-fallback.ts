import type { LeadPlan, PlanDoc, PlanStep } from "@/lib/lead-plan";

type PlanInput = {
  kurum?: string | null;
  ulke?: string | null;
  senaryo?: string | null;
  tasiyici?: string | null;
  dugum?: string | null;
  aciliyet?: string | null;
};

function isTurkey(ulke?: string | null) {
  const v = (ulke ?? "").toLocaleLowerCase("tr");
  if (!v.trim()) return true; // varsayılan pilot bölgesi
  return /t[üu]rk|turkey|tr\b/.test(v);
}

function nodeCount(dugum?: string | null) {
  const m = (dugum ?? "").match(/\d+/);
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function carriers(tasiyici?: string | null) {
  const v = (tasiyici ?? "").toLocaleLowerCase("tr");
  return {
    lora: /lora|ism|868|sub-?ghz/.test(v) || !v.trim(),
    halow: /halow|802\.11ah|900/.test(v),
    cellular: /h[üu]cresel|cellular|lte|4g|5g|gsm/.test(v),
    satellite: /uydu|satellite|starlink|iridium/.test(v),
    wifi: /wi-?fi|wifi|lan|mesh/.test(v) || !v.trim(),
  };
}

/**
 * Deterministik yedek plan motoru.
 * AI çıktısı alınamadığında BTK (%1 duty-cycle), KVKK (E2EE) ve 5651
 * uyumlu saha kurulum planını anında üretir.
 */
export function buildFallbackPlan(input: PlanInput): LeadPlan {
  const tr = isTurkey(input.ulke);
  const n = nodeCount(input.dugum);
  const c = carriers(input.tasiyici);
  const kurum = input.kurum?.trim() || "Kurum";
  const senaryo = input.senaryo?.trim() || "saha haberleşme sürekliliği";
  const regulator = tr ? "BTK" : "ilgili ülke düzenleyicisi (ETSI/FCC vb.)";
  const acil = /acil|hemen|1 ay|urgent|asap/i.test(input.aciliyet ?? "");

  const adimlar: PlanStep[] = [
    {
      hafta: "1. hafta",
      baslik: "Kapsam ve saha keşfi",
      aciklama: `${kurum} için ${senaryo} senaryosunda ${n} düğümlük topoloji çıkarılır; röle noktaları, güç/montaj koşulları ve kapsama boşlukları belirlenir.`,
      sorumlu: "Tedbirge saha ekibi + kurum teknik sorumlusu",
    },
    {
      hafta: acil ? "1. hafta" : "1-2. hafta",
      baslik: "Spektrum ve uyum beyanı",
      aciklama: c.lora
        ? `Lisanssız 868 MHz kullanımı için %1 duty-cycle bütçesi hesaplanır, çıkış gücü yazılımsal olarak sınırlandırılır ve ${regulator} beyan dosyası hazırlanır.`
        : `Kullanılacak bantlar için ${regulator} kapsamındaki lisans/beyan durumu netleştirilir; hücresel/uydu taşıyıcılarda operatör abonelik ve sorumluluk beyanı alınır.`,
      sorumlu: "Uyum sorumlusu",
    },
    {
      hafta: "2-3. hafta",
      baslik: "Düğüm kurulumu ve kimlik üretimi",
      aciklama: `${n} düğüm için Ed25519/X25519 kimlikleri üretilir, 12 kelimelik kurtarma anahtarları teslim edilir ve eş parmak izleri (TOFU) karşılıklı doğrulanır.`,
      sorumlu: "Tedbirge kurulum ekibi",
    },
    {
      hafta: "3-4. hafta",
      baslik: "Taşıyıcı köprüleri ve failover",
      aciklama: [
        c.wifi && "LAN/P2P birincil yol",
        c.lora && "LoRa 868 MHz yedek yol",
        c.halow && "Wi-Fi HaLow orta menzil",
        c.cellular && "hücresel yedek",
        c.satellite && "uydu son çare",
      ]
        .filter(Boolean)
        .join(", ") + " sırasıyla skor tabanlı failover motoru yapılandırılır ve kesinti tatbikatı yapılır.",
      sorumlu: "Ağ mühendisi",
    },
    {
      hafta: "4-5. hafta",
      baslik: "Veri koruma ve kayıt politikası",
      aciklama: tr
        ? "Uçtan uca şifreleme (AES-256-GCM) ile mesaj gövdesi sunucuya açık gitmez; KVKK aydınlatma metni, VERBİS kaydı gözden geçirilir ve 5651 kapsamında iç ağ erişim kayıt politikası yazılır."
        : "Uçtan uca şifreleme doğrulanır; yerel veri koruma mevzuatına (GDPR vb.) göre aydınlatma ve saklama politikası hazırlanır.",
      sorumlu: "Hukuk / veri sorumlusu",
    },
    {
      hafta: acil ? "5. hafta" : "5-6. hafta",
      baslik: "Saha testi, ölçüm ve devreye alma",
      aciklama:
        "RTT, paket kaybı, hop dağılımı ve duty-cycle bütçesi canlı ölçülür; sıfır-bilgi denetim raporu ve saha raporu PDF olarak teslim edilerek pilot devreye alınır.",
      sorumlu: "Tedbirge saha ekibi",
    },
  ];

  const belgeler: PlanDoc[] = tr
    ? [
        { belge: "Lisanssız bant kullanım beyanı (duty-cycle kaydı)", kurum: "BTK", zorunlu: c.lora, not: "868 MHz %1 duty-cycle bütçesi ekiyle sunulur." },
        { belge: "Telsiz ekipmanı uygunluk beyanı (CE/RED)", kurum: "Üretici / BTK", zorunlu: true, not: "Kullanılan modem ve anten setleri için." },
        { belge: "KVKK aydınlatma metni ve VERBİS kaydı", kurum: "KVKK", zorunlu: true, not: "Veri sorumlusu kurumdur; Tedbirge veri işleyen konumundadır." },
        { belge: "5651 sayılı Kanun kapsamında log politikası", kurum: "BTK / kurum içi", zorunlu: true, not: "Yalnız erişim kaydı; mesaj içeriği tutulmaz." },
        { belge: "Saha kurulum / montaj izni", kurum: "Valilik veya saha sahibi kurum", zorunlu: false, not: "Kamu alanı kullanımı varsa gereklidir." },
        { belge: "AFAD koordinasyon yazısı", kurum: "AFAD", zorunlu: /afet|acil|arama|kurtarma/i.test(senaryo), not: "Afet senaryolarında pilot kapsamında teyit edilecek." },
        { belge: "İş sağlığı ve güvenliği çalışma izni", kurum: "Kurum İSG birimi", zorunlu: false, not: "Direk/çatı montajı yapılacaksa." },
        ...(c.cellular || c.satellite
          ? [{ belge: "Operatör abonelik ve sorumluluk beyanı", kurum: "Hücresel/uydu operatörü", zorunlu: true, not: "Beyan olmadan taşıyıcı kapısı açılmaz." }]
          : []),
      ]
    : [
        { belge: "Spektrum uygunluk beyanı (ETSI/FCC)", kurum: "Ülke düzenleyicisi", zorunlu: true, not: "Bant planı pilot kapsamında teyit edilecek." },
        { belge: "Ekipman uygunluk sertifikası", kurum: "Üretici", zorunlu: true, not: "CE/FCC ID kayıtları." },
        { belge: "Veri koruma aydınlatma metni (GDPR vb.)", kurum: "Yerel otorite", zorunlu: true, not: "Uçtan uca şifreleme kapsamı belirtilir." },
        { belge: "Saha erişim ve montaj izni", kurum: "Saha sahibi", zorunlu: false, not: "Kamu alanı kullanımına göre." },
      ];

  const riskler = [
    c.lora
      ? "Yoğun trafikte %1 duty-cycle bütçesi dolabilir; zamanlayıcı önceliklendirmesi ve yedek taşıyıcı şart."
      : "Taşıyıcı çeşitliliği sınırlıysa tek nokta arıza riski oluşur.",
    tr ? "BTK beyan ve saha izin süreleri pilot takvimini 2-3 hafta uzatabilir." : "Yerel düzenleyici onay süresi takvimi uzatabilir.",
    "Saha erişimi (arazi, enerji, montaj) hava koşullarına bağlı olarak gecikebilir.",
    "Kurtarma anahtarı kaybı geri dönülemez veri erişim kaybına yol açar; teslim tutanağı ile kayıt altına alınmalı.",
  ];

  return {
    ozet: `${kurum} için ${n} düğümlük ${senaryo} pilotu: ${tr ? "BTK lisanssız bant beyanı, KVKK ve 5651" : "yerel spektrum ve veri koruma"} gereklilikleri karşılanarak yaklaşık ${acil ? "5" : "6"} haftada devreye alınır. Plan şablon motoruyla üretilmiştir; saha keşfi sonrası netleştirilir.`,
    adimlar,
    belgeler,
    riskler,
    olusturuldu: new Date().toISOString(),
  };
}
