/**
 * Tedbirge Protocol — 7 katmanlı mimarinin tek doğruluk kaynağı.
 *
 * Buradaki metinler kullanıcı arayüzünde birebir kullanılır: kriptografik
 * uzun terimler (imza algoritmaları, anahtar türetme, karma fonksiyonları)
 * bilinçli olarak yer almaz. Bu katmanlar arka planda tam performansla
 * çalışmaya devam eder; kullanıcıya yalnızca sade, kurumsal karşılıkları
 * ("Uçtan uca şifreli", "Sıfır-bilgi", "Doğrulanmış düğüm") gösterilir.
 */

export type ProtocolLayer = {
  /** 1–7 katman numarası */
  n: number;
  /** Katman adı (marka) */
  name: string;
  /** Tek cümlelik kurumsal karşılık */
  tagline: string;
  /** Sade açıklama — teknik terim yok */
  body: string;
  /** Kullanıcıya gösterilen güven/işlev rozetleri */
  badges: readonly string[];
  /** 1 tıkla gidilecek hızlı aksiyon */
  action: { to: string; label: string };
};

export const PROTOCOL_LAYERS = [
  {
    n: 1,
    name: "Tedbirge Trust",
    tagline: "Kimlik ve sıfır-bilgi zırhı",
    body: "Her cihaz ağa katılırken otomatik olarak kendi güvenli kimliğini alır. Trafiğinizin içeriği hiçbir noktada saklanmaz; ağ yalnızca hacim bilgisini görür. Tüm bu işlemler arka planda, siz hiçbir ayar yapmadan tamamlanır.",
    badges: ["Uçtan uca şifreli (E2EE)", "Sıfır-bilgi güvenliği", "Doğrulanmış düğüm"],
    action: { to: "/guvenlik", label: "Güvenlik özeti" },
  },
  {
    n: 2,
    name: "Tedbirge Edge",
    tagline: "Tek tıkla çalışan saha ve tarayıcı düğümü",
    body: "Kurulum dosyası, terminal veya anahtar yönetimi gerekmez. Bilgisayar, tablet veya telefonda tarayıcıyı açıp “Ağı başlat” demeniz yeterli; cihaz saniyeler içinde ağın bir parçası olur.",
    badges: ["Kurulumsuz", "Tüm cihazlar", "2 tıkla aktif"],
    action: { to: "/kur", label: "Ağı kur" },
  },
  {
    n: 3,
    name: "Tedbirge Loop",
    tagline: "Kesintisiz yönlendirme ve otomatik yedekleme",
    body: "Bir bağlantı zayıfladığında veya koptuğunda trafik, en hızlı alternatif taşıyıcıya kendiliğinden aktarılır. Kullanıcı hiçbir şey fark etmez; oturum düşmez.",
    badges: ["Otomatik failover", "Çoklu taşıyıcı", "Kesintisiz oturum"],
    action: { to: "/tasiyicilar", label: "Taşıyıcılar" },
  },
  {
    n: 4,
    name: "Tedbirge Off-Grid",
    tagline: "İnternetsiz saha şartlarında veri zırhı",
    body: "Bağlantı tamamen kesilse bile ölçümler, mesajlar ve raporlar cihazda güvenle bekletilir. Hat geri geldiğinde sıraya göre, kayıpsız biçimde merkeze iletilir.",
    badges: ["Çevrimdışı kuyruk", "Kayıpsız aktarım", "Otomatik senkron"],
    action: { to: "/cevrimdisi", label: "Çevrimdışı mod" },
  },
  {
    n: 5,
    name: "Tedbirge Sense",
    tagline: "Canlı performans ve teşhis göstergeleri",
    body: "Gecikme, teslim oranı, bağlantı kalitesi ve kuyruk durumu tek ekranda izlenir. Sorun oluşmadan önce uyarı alır, saha ekibine net bir rapor çıkarırsınız.",
    badges: ["Canlı telemetri", "Gecikme (RTT)", "Erken uyarı"],
    action: { to: "/panel", label: "Canlı panel" },
  },
  {
    n: 6,
    name: "Tedbirge Console",
    tagline: "Kurumsal yönetim, yetkilendirme ve teklif motoru",
    body: "Kullanıcı rolleri, lisans ve kota yönetimi, olay günlüğü ve kurumsal teklif/PDF üretimi tek bulut panelinden yapılır. Yönetici, operatör ve izleyici yetkileri birbirinden ayrıdır.",
    badges: ["Rol bazlı erişim", "Lisans yönetimi", "Kurumsal teklif"],
    action: { to: "/panel", label: "Yönetim paneli" },
  },
  {
    n: 7,
    name: "Tedbirge Relay",
    tagline: "Topluluk ve saha bağlantı çıkış noktaları",
    body: "Sahadaki bir cihaz internete doğrudan erişemediğinde, komşu çıkış noktası üzerinden güvenle dışarı bağlanır. Paylaşılan kapasite şeffaf biçimde ölçülür ve raporlanır.",
    badges: ["Çıkış noktası", "Paylaşımlı kapasite", "Şeffaf ölçüm"],
    action: { to: "/saha", label: "Saha erişimi" },
  },
] as const satisfies readonly ProtocolLayer[];

/** RaaS (Resilience-as-a-Service) paket özeti — pazarlama yüzeylerinde ortak kullanılır. */
export const RAAS_TIERS = [
  {
    key: "freemium",
    name: "Freemium",
    price: "Ücretsiz",
    note: "kayıt yeterli",
    for: "Tek cihazla denemek isteyenler",
    points: ["2 cihaza kadar", "Tarayıcı düğümü", "Temel canlı göstergeler"],
  },
  {
    key: "community",
    name: "Community",
    price: "Ücretsiz",
    note: "5 düğüme kadar",
    for: "Pilot ve saha denemeleri",
    points: ["5 düğüm kotası", "Tüm taşıyıcı köprüleri", "Çevrimdışı kuyruk", "Topluluk desteği"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Düğüm başına",
    note: "aylık / yıllık abonelik",
    for: "Kurumsal süreklilik ihtiyacı",
    points: [
      "Sınırsız düğüm ve organizasyon",
      "Rol bazlı yetkilendirme",
      "Kesinti/olay günlüğü ve uyum raporu",
      "SLA'lı destek",
    ],
  },
  {
    key: "operator",
    name: "Operator",
    price: "Özel",
    note: "trafik bazlı veya gelir paylaşımı",
    for: "ISP, entegratör ve kamu operatörleri",
    points: ["Beyaz etiket panel", "Taşınan hacim başına ücret", "Özel taşıyıcı entegrasyonu", "7×24 saha mühendisliği"],
  },
] as const;
