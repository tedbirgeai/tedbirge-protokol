/**
 * El sıkışma (birlikte çalışabilirlik) haritası.
 * ------------------------------------------------------------------
 * Tedbirge Gateway bir "düğüm"dür: mevcut sistemlerin yerine geçmez,
 * yanına eklenir. Bu dosya, hangi ekosistemle hangi yüzeyden el
 * sıkıştığımızı, karşı tarafın hangi boşluğunu kapattığımızı ve
 * regülasyon açısından nereye oturduğumuzu tek kaynakta tutar.
 * Panel ve tanıtım sayfaları bu listeden beslenir.
 */

export type InteropStatus = "hazir" | "kismi" | "planli";

export type InteropTarget = {
  id: string;
  /** Ekosistem/karşı taraf adı */
  name: string;
  /** Kısa kategori etiketi */
  category: string;
  /** Karşı tarafın çözemediği sorun */
  gap: string;
  /** Bizim düğümün getirdiği çözüm */
  handshake: string;
  /** Somut teknik temas yüzeyi (kod tabanındaki karşılığı) */
  surface: string[];
  /** Yasal/uyum notu */
  legal: string;
  status: InteropStatus;
};

export const INTEROP_STATUS_LABEL: Record<InteropStatus, string> = {
  hazir: "Hazır",
  kismi: "Kısmen hazır",
  planli: "Planlı",
};

export const INTEROP_TARGETS: InteropTarget[] = [
  {
    id: "pwa",
    name: "PWA / tarayıcı platformları",
    category: "İstemci dağıtımı",
    gap: "Kurumsal saha uygulamaları mağaza onayı, cihaz yönetimi ve kurulum sürtünmesi yüzünden hızlı yayılamıyor; çevrimdışı senaryoda uygulama tamamen kör kalıyor.",
    handshake:
      "Düğüm, kurulum gerektirmeyen tarayıcı uygulaması olarak dağıtılır: bağlantı paylaşılır, cihaz saniyeler içinde ağın düğümü olur. Uygulama ana ekrana eklendiğinde çevrimdışı çalışır, arka planda bildirim alır.",
    surface: [
      "Servis işçisi + çevrimdışı önbellek (/cevrimdisi)",
      "Web Push (VAPID) — içeriksiz uyandırma sinyali",
      "Yerel depo (IndexedDB) üzerinde mesaj ve telemetri kuyruğu",
      "Ana ekrana ekleme akışı ve bildirim sağlık kontrolü",
    ],
    legal:
      "Mağaza dışı dağıtım; içerik cihazda şifrelenir, bildirimde kişisel veri taşınmaz (KVKK veri minimizasyonu).",
    status: "hazir",
  },
  {
    id: "cloudflare",
    name: "Cloudflare (uç çalıştırma ve ağ katmanı)",
    category: "Uç bulut",
    gap: "Uç çalıştırma ortamı çok hızlıdır ama merkeze bağımlıdır: kullanıcı tarafındaki hat koptuğunda uç düğüm de erişilemez hâle gelir, oturum ve kuyruk kaybolur.",
    handshake:
      "Sunucu tarafımız uç çalıştırma ortamında koşacak biçimde yazıldı: sinyalleşme, kuyruk ve bildirim uç noktaları sağlayıcıya özgü kapalı bileşen kullanmaz. Uç kesildiğinde kullanıcı cihazları birbirine doğrudan bağlanır, bağlantı dönünce uçtaki kuyruk otomatik boşalır.",
    surface: [
      "Standart HTTP/WebSocket uç noktaları (/api/public/*)",
      "Bulut yedek röle: karşı taraf çevrimdışıyken şifreli paket kuyruğu",
      "OpenAPI tanımı ile makine-makine entegrasyon",
      "İmzalı doğrulama + hız sınırlama",
    ],
    legal:
      "Sağlayıcı içeriği açamaz; yurt dışı aktarım tartışması, taşınan verinin şifreli ve anlamsız olması nedeniyle daralır.",
    status: "hazir",
  },
  {
    id: "hyperscaler",
    name: "AWS / Azure / Google Cloud",
    category: "Merkezi bulut",
    gap: "Tek buluta bağlı kurumlarda hat koptuğunda saha kör kalır; egress maliyeti ve veri yerelliği baskısı sürer.",
    handshake:
      "Düğüm, kurumun kendi ağına yan katman olarak konur; uygulama kodu değişmez. Kesintide saha kendi arasında çalışır, bağlantı dönünce kayıtlar mahsuplaşır. Tekrar eden veri sahada elenir.",
    surface: [
      "Ters vekil / uç nokta yönlendirmesi ile devralma",
      "Store-and-forward kuyruğu ve otomatik yeniden gönderim",
      "Taşıyıcı skorlama ve otomatik yedeğe geçiş",
      "İmzalı olay zinciri ile denetim raporu",
    ],
    legal:
      "Veri işleyen sıfatı sözleşme ekiyle (DPA) sabitlenir; geri dönüş (exit) prosedürü yazılı taahhüt altındadır.",
    status: "kismi",
  },
  {
    id: "sso",
    name: "Kurumsal kimlik (OIDC / SAML SSO)",
    category: "Kimlik",
    gap: "Yeni bir araç, yeni bir kullanıcı veritabanı demek: BT birimi ayrı hesap yönetimini güvenlik riski sayar ve satın almayı durdurur.",
    handshake:
      "Düğüm kimliği, kurumun mevcut kimlik sağlayıcısıyla eşleştirilir. Cihaz anahtarı yerelde kalır; yetki kurumun dizininden okunur, ayrıca hesap açılmaz.",
    surface: [
      "Kimlik sağlayıcı bağlama (OIDC/SAML)",
      "Rol tabanlı panel erişimi",
      "Çevrimdışı imzalı yetki belirteci — merkez erişilemezken de geçerli",
    ],
    legal: "Yetki kararı kurumda kalır; Tedbirge personel verisi tutmaz.",
    status: "kismi",
  },
  {
    id: "telekom",
    name: "Telekom operatörleri",
    category: "Taşıyıcı",
    gap: "Operatör için afet ve kırsal kapsama boşluğu maliyetli bir sorundur; her boşluğa baz istasyonu kurmak ekonomik değildir.",
    handshake:
      "Taşıyıcı rakip değil, kanaldır. Düğüm, operatörün hattını taşıyıcılardan biri olarak kullanır; hat yokken kullanıcılar birbirine bağlanır. Operatör bunu katma değerli süreklilik hizmeti olarak satabilir.",
    surface: [
      "Çoklu taşıyıcı yönetimi ve skorlama",
      "Hücresel/uydu hattı üzerinden şeffaf geçiş",
      "Operatör markalı paket (beyaz etiket) uygunluğu",
    ],
    legal:
      "Elektronik haberleşme hizmeti sunulmaz, abonelik ilişkisi kurulmaz; işletmeci sıfatı doğmaz.",
    status: "planli",
  },
  {
    id: "uydu",
    name: "Uydu terminalleri (LEO/GEO)",
    category: "Taşıyıcı",
    gap: "Uydu bağlantısı pahalı ve tek noktadadır; terminalin bulunduğu yerden uzaktaki ekip yararlanamaz.",
    handshake:
      "Tek uydu terminali ağ girişi olarak işaretlenir; çevredeki tüm düğümler bu çıkışı paylaşır ve trafik önceliklendirilir. Böylece bir abonelik, bir ekibi ayakta tutar.",
    surface: ["Çıkış düğümü rolü", "Yol seçimi ve öncelik kuyruğu", "Veri tasarrufu için tekrar eleme"],
    legal: "Terminalin tip onayı ve abonelik sorumluluğu kullanıcıdadır.",
    status: "kismi",
  },
  {
    id: "lora",
    name: "LoRa / LoRaWAN ve kısa mesafe telsiz",
    category: "Donanım köprüsü",
    gap: "Sensör ağları düşük bant genişliğinde çalışır ve çoğu zaman kendi kapalı sunucusuna bağımlıdır.",
    handshake:
      "Kullanıcının mevcut CE/RED işaretli modülü, tarayıcıdan seri port veya Bluetooth üzerinden düğüme köprülenir; ağ, bu taşıyıcıyı düşük hızlı ama uzun menzilli hat olarak kullanır.",
    surface: [
      "Taşıyıcı köprüsü (Web Serial / BLE)",
      "TR profilinde 863–870 MHz, 25 mW e.r.p., %1 görev döngüsü yazılımsal kilidi",
      "Görev döngüsü dolduğunda paket kuyruğa alma",
    ],
    legal:
      "Bölge kilidi zorunludur; HaLow ve TVWS TR profilinde kapalıdır. Donanım tip onayı üreticiye aittir.",
    status: "kismi",
  },
  {
    id: "kamu",
    name: "AFAD ve kamu olay yönetim sistemleri",
    category: "Kamu",
    gap: "Afet anında saha personelinin telefonu bağlantısız kalır; hasar tespiti, fotoğraf ve konum merkeze ulaşmaz.",
    handshake:
      "Mevcut telsiz ve olay yönetim sistemlerinin yerine geçmez; onlar çalışmadığında devreye giren tamamlayıcı katman olur. Bağlantı dönünce kayıtlar imzalı biçimde merkeze aktarılır.",
    surface: [
      "Saha raporu ve kanıt zinciri (SHA-256)",
      "SOS ve pil durumu içeren konum paylaşımı",
      "Olay yönetim sistemlerine dışa aktarım için açık API",
    ],
    legal:
      "Lisanssız bantlar; tahsisli kamu spektrumuna müdahale yok. Pilot için işbirliği protokolü taslağı hazır.",
    status: "planli",
  },
  {
    id: "mesajlasma",
    name: "Kurumsal mesajlaşma ve iş akışı araçları",
    category: "Uygulama",
    gap: "Ekip iletişimi tamamen buluta bağlıdır; hat koptuğunda ekip birbirini kaybeder ve gölge kanallara (kişisel uygulamalar) kayar.",
    handshake:
      "Düğüm ağı, bağlantı yokken çalışan yerel mesajlaşma katmanı sağlar; bağlantı dönünce kayıtlar mevcut araca aktarılabilir. Böylece gölge kanal riski ve veri kaçağı ortadan kalkar.",
    surface: ["Uçtan uca şifreli sohbet ve arama", "Kaybolan mesaj ve yerel yedek", "Web kancası ile dışa aktarım"],
    legal: "İçerik cihazda kalır; kurum kendi saklama politikasını uygular.",
    status: "hazir",
  },
];
