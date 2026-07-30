/**
 * Tedbirge Gateway — Regülasyon tek doğruluk kaynağı.
 * Tüm uyum sayfaları (/mevzuat, /uyumluluk, /sertifikasyon, /turkiye-mevzuat,
 * /izinler, /ihracat-uyum) bant/limit verilerini buradan okur.
 */

export const REG_VERSION = "v0.6a-turnkey";
export const REG_REVIEWED = "2026-07";
export const REG_VENDOR = "Mehmet DİNÇ (Tedbirge Gateway)";

export type RegionRow = {
  region: string;
  sub: string;
  lora: string;
  halow: string;
  tvws: string;
  wigig: string;
  fso: string;
};

export const REGION_MATRIX: RegionRow[] = [
  {
    region: "Türkiye (BTK)",
    sub: "TR",
    lora: "868 MHz (SRD) · 25 mW e.r.p. · %1 görev döngüsü",
    halow: "Üretimde kapalı — 900 MHz bandı lisanslı",
    tvws: "Üretimde kapalı — beyaz alan çerçevesi yok",
    wigig: "60 GHz serbest · EIRP sınırlı",
    fso: "Lisanssız (optik) · göz güvenliği Class 1M",
  },
  {
    region: "Avrupa Birliği (ETSI EN 300 220 / 302 567)",
    sub: "EU",
    lora: "863–870 MHz · 25 mW e.r.p. · %0.1–%1 görev döngüsü",
    halow: "Üretimde kapalı — 863–868 uyumlu profil yok",
    tvws: "Ülke bazlı (EN 301 598) · varsayılan kapalı",
    wigig: "57–66 GHz · 40 dBm EIRP",
    fso: "Lisanssız · IEC 60825 Class 1M",
  },
  {
    region: "ABD / Kanada (FCC Part 15 / ISED)",
    sub: "US-CA",
    lora: "902–928 MHz · frekans atlamalı · 1 W iletim",
    halow: "802.11ah 902–928 MHz · açılabilir profil",
    tvws: "470–698 MHz · veri tabanı sorgusu zorunlu",
    wigig: "57–71 GHz · Part 15.255",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Birleşik Krallık (Ofcom)",
    sub: "UK",
    lora: "863–870 MHz · IR 2030 · %1 görev döngüsü",
    halow: "Kapalı",
    tvws: "470–790 MHz · veri tabanı destekli, izinli",
    wigig: "57–71 GHz serbest",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Körfez (BAE TDRA · S. Arabistan CST)",
    sub: "GCC",
    lora: "865–868 MHz · 25 mW · yerel kayıt",
    halow: "Kapalı",
    tvws: "Kapalı",
    wigig: "57–66 GHz serbest",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "APAC (AU/NZ ACMA · JP ARIB · SG IMDA)",
    sub: "APAC",
    lora: "915–928 MHz (AU/NZ) · 920–923 MHz (JP, LBT zorunlu)",
    halow: "AU/NZ açılabilir · JP profil sınırlı",
    tvws: "SG/NZ pilot çerçevesi · varsayılan kapalı",
    wigig: "57–66 GHz serbest",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Japonya (MIC / ARIB STD-T108)",
    sub: "JP",
    lora: "920–923 MHz · LBT zorunlu · 20 mW",
    halow: "Kapalı — 802.11ah profili onaysız",
    tvws: "Kapalı",
    wigig: "57–66 GHz serbest",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Güney Kore (RRA) · Çin (SRRC) · Hindistan (WPC)",
    sub: "KR-CN-IN",
    lora: "KR 917–923.5 MHz · CN 470–510 MHz (868 yasak) · IN 865–867 MHz",
    halow: "Üçünde de kapalı",
    tvws: "Kapalı",
    wigig: "60 GHz serbest (yerel tip onayı ile)",
    fso: "Lisanssız · Class 1M",
  },
  {
    region: "Afrika & LATAM (ITU Bölge 1/2 karma)",
    sub: "AF-LATAM",
    lora: "868 veya 915 MHz — ulusal düzenleyiciye göre seçilir (BR 902–907.5/915–928)",
    halow: "Ülke bazlı · varsayılan kapalı",
    tvws: "ZA/KE beyaz alan çerçevesi · izinli",
    wigig: "57–66 GHz genellikle serbest",
    fso: "Lisanssız · Class 1M",
  },
];

export const MATRIX_NOTE =
  "Ethernet, Wi-Fi (2.4/5 GHz), hücresel ve uydu taşıyıcıları her bölgede operatörün mevcut aboneliği/donanımı üzerinden çalışır; ek spektrum izni gerektirmez.";

export const MATRIX_SOURCES =
  "Kaynaklar: ETSI EN 300 220 / EN 302 567, FCC Part 15.247 & 15.255, Ofcom IR 2030, BTK KEGY, ACMA/ARIB/IMDA sub-GHz düzenlemeleri, IEC 60825-1 lazer sınıflandırması. Matris bilgilendirme amaçlıdır; konuşlanmadan önce ilgili ulusal düzenleyicinin yürürlükteki metni esas alınmalıdır.";

export const RUNTIME_RULES = [
  {
    t: "Varsayılan olarak kısıtlı",
    b: "Yasal statüsü belirsiz her taşıyıcı üretim yapılandırmasında kapalı gelir. Açmak, bölge profilinin açıkça seçilmesini ve operatör onayını gerektirir.",
  },
  {
    t: "Bölge profili tek kaynaktan",
    b: "TEDBIRGE_REGION ortam değişkeni tek doğruluk kaynağıdır; frekans planı, iletim gücü tavanı ve görev döngüsü bütçesi bu profilden türetilir.",
  },
  {
    t: "Görev döngüsü zorlaması",
    b: "Sub-GHz taşıyıcılarda görev döngüsü bütçesi çalışma zamanında sayılır; bütçe dolduğunda paketler kuyruğa alınır, sessizce ihlal edilmez.",
  },
  {
    t: "Sorumluluk paylaşımı",
    b: "Lisans, kayıt ve saha izinleri operatörün sorumluluğundadır. Tedbirge, kuralları teknik olarak uygulanabilir kılar; hukuki temsil sağlamaz.",
  },
];

export const REGION_PROFILE_SNIPPET = `# Bölge profilini seçin — kapalı taşıyıcılar açılmaz
TEDBIRGE_REGION=EU        # TR | EU | US | UK | GCC | APAC
TEDBIRGE_CARRIERS=eth,wifi,cellular,satellite
TEDBIRGE_LORA_DUTY_CYCLE=0.01`;

/** Regülasyon merkezinin altı sütunu. */
export type Pillar = {
  no: string;
  t: string;
  b: string;
  refs: string;
  to: "/uyumluluk" | "/sertifikasyon" | "/turkiye-mevzuat" | "/izinler" | "/ihracat-uyum" | "/guvenlik";
  cta: string;
};

export const REG_PILLARS: Pillar[] = [
  {
    no: "01",
    t: "Ürün statüsü — salt yazılım",
    b: "Sevk edilen şey tek statik binary'dir; hiçbir radyo, verici veya anten üretilmez. Radyo tip onayı donanım üreticisinin, spektrum profil uyumu Tedbirge'nin sorumluluğundadır. Yazılım, yapılandırılabilir radyoyu yasa dışı parametreye zorlamama yükümlülüğü altındadır (RED Md. 3(3)(i) · FCC SDR kuralları).",
    refs: "RED 2014/53/AB · FCC SDR KDB 442812",
    to: "/sertifikasyon",
    cta: "Sertifikasyon zinciri",
  },
  {
    no: "02",
    t: "Spektrum rejimi — 9 taşıyıcı",
    b: "Lisanssız: Wi-Fi 2.4/5/6 GHz, WiGig 60 GHz, HaLow, LoRa sub-GHz, FSO (spektrum dışı). Operatör/lisanslı: hücresel, uydu. Koşullu: TVWS — çoğu ülkede geolokasyon veri tabanı zorunlu. Bölge kilitleri profil dosyasında zorlanır.",
    refs: "ETSI EN 300 220 · FCC 15.247 · BTK KEGY",
    to: "/uyumluluk",
    cta: "Bölge matrisi",
  },
  {
    no: "03",
    t: "Türkiye katmanı — pilot yargı alanı",
    b: "5809 sayılı Elektronik Haberleşme Kanunu, BTK KEGY tavanları, Milli Frekans Planı, 5651 log yükümlülüğü ve 6698 KVKK. TR profilinde 868 MHz / 25 mW / %1 görev döngüsü varsayılan olarak kilitlidir; HaLow ve TVWS kapalıdır.",
    refs: "5809 · KEGY · 6698 KVKK · 5651",
    to: "/turkiye-mevzuat",
    cta: "Türkiye mevzuatı",
  },
  {
    no: "04",
    t: "Sertifikasyon & test zinciri",
    b: "Radyo: EN 300 220 / 300 328 / 301 893 / 302 567, FCC 15.247–15.255. EMC: EN 301 489 serisi, EN 55032/55035. Güvenlik: IEC 62368-1, EN 62311 EMF, IEC 60825-1 lazer. Siber güvenlik: EN 18031 (RED 3(3)(d-e-f)) — donanım paketi için zorunlu.",
    refs: "EN 18031 · IEC 62368-1 · EN 301 489",
    to: "/sertifikasyon",
    cta: "Test matrisi",
  },
  {
    no: "05",
    t: "Kriptografi & ihracat kontrolü",
    b: "AES-256-GCM ve Ed25519 kullanımı ürünü Wassenaar Kategori 5 Bölüm 2 kapsamına sokabilir (AB 2021/821 · 5A002/5D002 · ABD EAR analojisi). Yaptırım taraması, son kullanıcı beyanı, yeniden ihracat yasağı ve insan hakları eşiği sözleşmeyle bağlayıcıdır.",
    refs: "Wassenaar Kat. 5-2 · Reg. (EU) 2021/821",
    to: "/ihracat-uyum",
    cta: "İhracat beyanı",
  },
  {
    no: "06",
    t: "Operasyonel izinler & kanıt",
    b: "Lisanssız bantta pilot için ön izin gerekmez; kamu/afet konuşlanmasında AFAD-valilik protokolü, kritik altyapıda BTK bildirimi, sabit nokta-nokta FSO/60 GHz linkte yer/kule izni gerekebilir. Her adım kanıt taşıma zincirinde SHA-256 ile kayıt altına alınır.",
    refs: "AFAD protokolü · BTK bildirimi · kanıt zinciri",
    to: "/izinler",
    cta: "İzin matrisi",
  },
];

/** İndirilebilir uyum beyanının satırları. */
export const DECLARATION_ROWS: Array<[string, string]> = [
  ["Beyan sahibi", REG_VENDOR + " · Türkiye"],
  ["Ürün", "Tedbirge Gateway / Tedbirge Loop / Tedbirge Off-Grid — salt yazılım"],
  ["Sürüm", REG_VERSION],
  ["Donanım kapsamı", "Yok — hiçbir radyo, verici, anten veya şifreleme donanımı sevk edilmez"],
  ["Kriptografi", "AES-256-GCM · Ed25519 · SHA-256"],
  ["İhracat sınıfı", "Wassenaar Kat. 5 Böl. 2 · AB 2021/821 (5A002/5D002 ilişkili)"],
  ["Varsayılan bölge", "TEDBIRGE_REGION=TR — 868 MHz SRD, 25 mW e.r.p., %1 görev döngüsü"],
  ["Kapalı taşıyıcılar (TR)", "Wi-Fi HaLow (900 MHz) · TVWS (470–790 MHz)"],
  ["Veri işleme", "Tünel içeriği saklanmaz; yalnızca SHA-256 özeti, bayt sayacı ve zaman damgası"],
  ["KVKK", "6698 s. Kanun · aydınlatma ve açık rıza akışı yayımlanmıştır"],
  ["Log yükümlülüğü", "5651 kapsamında erişim sağlayıcı sıfatı müşteridedir; opsiyonel log modülü sağlanır"],
  ["Sorumluluk sınırı", "Lisans, tip onayı ve saha izinleri operatöre aittir; bu belge hukuki görüş değildir"],
];

/* ------------------------------------------------------------------ *
 * Yasal sorumluluk sınırlandırması ve sözleşme metinleri
 * ------------------------------------------------------------------ */

/** 5651 sayılı kanun — toplu kullanım sağlayıcı sorumluluk sınırlandırması. */
export const LIABILITY_5651 = {
  title: "5651 sayılı Kanun — Toplu Kullanım Sağlayıcı Sorumluluk Sınırlandırması",
  clauses: [
    "Tedbirge Gateway üzerinden kurulan mesh ağı, kapalı devre ve izole bir haberleşme ortamıdır; genel internet erişimi (web, sosyal medya, e-posta) dağıtmaz. Bu nedenle düğüm işleten taraf, 5651 sayılı Kanun'un 2/1-(e) maddesi anlamında \"erişim sağlayıcı\" sıfatını kendiliğinden kazanmaz.",
    "Düğüm sahibi, ağı bir işyeri, kamu kurumu, kamp alanı veya benzeri bir mekânda üçüncü kişilerin kullanımına açar ve bu ağ üzerinden genel internete çıkış (exit node) etkinleştirilirse, 5651 sayılı Kanun'un 7. maddesi uyarınca \"toplu kullanım sağlayıcı\" sıfatı doğar. Bu durumda iç IP dağıtım loglarının elektronik ortamda kendi sistemine kaydedilmesi yükümlülüğü münhasıran düğüm sahibine aittir.",
    "Tedbirge, opsiyonel bir log modülü sağlar; ancak logların tutulması, saklanması, doğruluğu, gizliliği ve talep hâlinde yetkili makamlara sunulması yükümlülüğü işleten tarafa aittir. Tedbirge bu verilere erişemez, kopyasını tutmaz ve yerine geçemez.",
    "Tedbirge, taşınan içeriği çözemez (uçtan uca şifreleme) ve içeriği kontrol etme, izleme veya hukuka aykırı içeriği araştırma yükümlülüğü altında değildir (5651 md. 6/2 kıyasen). Tedbirge'nin sorumluluğu, yazılımın belgelenen teknik işlevi ile sınırlıdır.",
    "Exit node etkinleştiren veya ağı ticari olarak üçüncü kişilere sunan işletenlerin, yer/erişim/toplu kullanım sağlayıcı sıfatına ilişkin BTK bildirim ve belge yükümlülüklerini bağımsız hukuki danışmanlıkla değerlendirmesi gerekir.",
  ],
};

/** Harici donanıma özel firmware yüklenmesi hâlinde spektrum sorumluluğu. */
export const FIRMWARE_SPECTRUM_WARNING = {
  title: "Uyarı — Harici Donanım ve Özel Firmware Spektrum Sorumluluğu",
  body:
    "Tedbirge yazılımı, bölge profilinde (TEDBIRGE_REGION) tanımlı frekans, iletim gücü ve görev döngüsü tavanlarını yazılımsal olarak zorlar. Kullanıcının, bağlı harici radyo donanımına (LoRa/HaLow/TVWS modülleri dâhil) üretici dışı, değiştirilmiş veya özel (custom) firmware yüklemesi, bölge kilidini donanım tarafında devre dışı bırakabilir. Böyle bir durumda ortaya çıkan frekans, güç veya görev döngüsü ihlallerinden doğan tüm idari, hukuki ve cezai sorumluluk — 5809 sayılı Elektronik Haberleşme Kanunu ve BTK Kısa Mesafe Erişimli Telsiz Cihazları Yönetmeliği kapsamındaki yaptırımlar dâhil — münhasıran kullanıcıya/işletene aittir. Tedbirge, değiştirilmiş firmware ile çalışan donanımlar için hiçbir uygunluk beyanı vermez ve garanti kapsamı bu hâlde sona erer.",
};

/** KVKK / GDPR aydınlatma metni taslağı. */
export const PRIVACY_NOTICE = {
  title: "KVKK / GDPR Aydınlatma Metni (Taslak)",
  updated: REG_REVIEWED,
  sections: [
    {
      h: "1. Veri sorumlusu",
      p: `Veri sorumlusu: ${REG_VENDOR}, Türkiye. İletişim: tedbirge34@gmail.com. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) md. 10 ve GDPR md. 13–14 kapsamında bilgilendirme yapılmaktadır.`,
    },
    {
      h: "2. İşlenen veriler",
      p: "Hesap verileri (e-posta, ad, kurum), lisans ve abonelik kayıtları, düğüm telemetrisi (düğüm kimliği, RTT, paket kaybı, verim, bayt sayacı, zaman damgası), destek yazışmaları ve teknik günlükler (IP adresi, tarayıcı bilgisi). Mesh tüneli içinden geçen mesaj/dosya içeriği işlenmez.",
    },
    {
      h: "3. İşleme amaçları ve hukuki sebep",
      p: "Sözleşmenin kurulması ve ifası (KVKK 5/2-c, GDPR 6/1-b): hesap, lisans, faturalama. Hukuki yükümlülük (KVKK 5/2-ç, GDPR 6/1-c): vergi ve mevzuat kayıtları. Meşru menfaat (KVKK 5/2-f, GDPR 6/1-f): ağ güvenliği, kötüye kullanım tespiti, hizmet kalitesi ölçümü. Açık rıza (GDPR 6/1-a): yalnızca pazarlama iletişimi için.",
    },
    {
      h: "4. Sıfır-bilgi ilkesi",
      p: "Ağ üzerinden taşınan yük uçtan uca AES-256-GCM ile şifrelenir; özel anahtar kullanıcı cihazından çıkmaz. Sunucu tarafında yalnızca SHA-256 özeti, bayt sayacı ve zaman damgası tutulur. Tedbirge, taşınan içeriği teknik olarak çözemez; bu nedenle içerik verisi üzerinde erişim, düzeltme veya ifşa talebi yerine getirilemez.",
    },
    {
      h: "5. Aktarım",
      p: "Veriler, hizmetin sunulması için kullanılan bulut altyapısı (AB/AB'ye eşdeğer korumalı bölgeler) ve ödeme sağlayıcısı (Paddle — Merchant of Record) ile paylaşılır. Yurt dışına aktarım GDPR md. 46 standart sözleşme maddeleri ve KVKK md. 9 çerçevesinde yapılır.",
    },
    {
      h: "6. Saklama süreleri",
      p: "Telemetri örnekleri 90 gün; olay/denetim günlükleri 12 ay; fatura ve ticari kayıtlar mevzuat gereği 10 yıl; hesap verileri hesap kapatıldıktan sonra 6 ay içinde silinir veya anonimleştirilir.",
    },
    {
      h: "7. Haklarınız",
      p: "KVKK md. 11 ve GDPR md. 15–22 uyarınca; verilerinize erişme, düzeltme, silme, işlemeyi kısıtlama, taşınabilirlik ve itiraz haklarına sahipsiniz. Başvurularınızı tedbirge34@gmail.com adresine iletebilirsiniz; talepler en geç 30 gün içinde yanıtlanır. Ayrıca Kişisel Verileri Koruma Kurumu'na veya yetkili AB denetim otoritesine şikâyette bulunabilirsiniz.",
    },
    {
      h: "8. Çerezler ve yerel depolama",
      p: "Uygulama; oturum, düğüm kimliği, şifreleme anahtarı ve çevrimdışı mesaj kuyruğu için tarayıcı yerel depolamasını kullanır. Bu veriler cihazınızda kalır, sunucuya gönderilmez. Üçüncü taraf reklam veya izleme çerezi kullanılmaz.",
    },
  ],
  note:
    "Bu metin taslaktır ve hukuki görüş yerine geçmez. Kurumsal konuşlanmadan önce kendi veri envanteriniz ve VERBİS yükümlülüğünüz doğrultusunda hukuk müşavirinizle nihai hâline getirilmelidir.",
};
