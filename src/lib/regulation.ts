/**
 * Tedbirge Protokol — Regülasyon tek doğruluk kaynağı.
 * Tüm uyum sayfaları (/mevzuat, /uyumluluk, /sertifikasyon, /turkiye-mevzuat,
 * /izinler, /ihracat-uyum) bant/limit verilerini buradan okur.
 */

export const REG_VERSION = "v0.6a-turnkey";
export const REG_REVIEWED = "2026-07";
export const REG_VENDOR = "Mehmet DİNÇ (Tedbirge Protokol)";

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

/**
 * Çalışma zamanında YAZILIMSAL TAVAN olarak uygulanan sayısal spektrum
 * sınırları. Paket zamanlayıcı (carrier-scheduler.ts) bu tabloyu okur;
 * değerler hiçbir yerde sabit yazılmaz.
 */
export type SpectrumLimit = {
  region: string;
  /** Sub-GHz SRD görev döngüsü oranı (0.01 = %1). */
  dutyCycle: number;
  /** Azami e.r.p. (mW). */
  maxErpMw: number;
  /** Görev döngüsü penceresi (ms) — ETSI/BTK: 1 saat. */
  windowMs: number;
  /** Üretimde varsayılan kapalı taşıyıcılar. */
  disabled: string[];
  note: string;
};

export const SPECTRUM_LIMITS: Record<string, SpectrumLimit> = {
  TR: {
    region: "Türkiye (BTK KEGY)",
    dutyCycle: 0.01,
    maxErpMw: 25,
    windowMs: 3_600_000,
    disabled: ["halow", "tvws"],
    note: "868 MHz SRD · 25 mW e.r.p. · %1 görev döngüsü (saatte azami 36 sn yayın).",
  },
  EU: {
    region: "Avrupa Birliği (ETSI EN 300 220)",
    dutyCycle: 0.01,
    maxErpMw: 25,
    windowMs: 3_600_000,
    disabled: ["halow", "tvws"],
    note: "863–870 MHz · alt banda göre %0,1–%1; muhafazakâr tavan %1 uygulanır.",
  },
  US: {
    region: "ABD / Kanada (FCC Part 15.247)",
    dutyCycle: 1,
    maxErpMw: 1000,
    windowMs: 3_600_000,
    disabled: [],
    note: "902–928 MHz frekans atlamalı · görev döngüsü sınırı yok, güç tavanı geçerlidir.",
  },
  UK: {
    region: "Birleşik Krallık (Ofcom IR 2030)",
    dutyCycle: 0.01,
    maxErpMw: 25,
    windowMs: 3_600_000,
    disabled: ["halow"],
    note: "863–870 MHz · %1 görev döngüsü.",
  },
};

export const DEFAULT_REGION = "TR";

export function spectrumLimitFor(region = DEFAULT_REGION): SpectrumLimit {
  return SPECTRUM_LIMITS[region] ?? SPECTRUM_LIMITS[DEFAULT_REGION];
}

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
  ["Ürün", "Tedbirge Protokol / Tedbirge Loop / Tedbirge Off-Grid — salt yazılım"],
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
    "Tedbirge Protokol üzerinden kurulan mesh ağı, kapalı devre ve izole bir haberleşme ortamıdır; genel internet erişimi (web, sosyal medya, e-posta) dağıtmaz. Bu nedenle düğüm işleten taraf, 5651 sayılı Kanun'un 2/1-(e) maddesi anlamında \"erişim sağlayıcı\" sıfatını kendiliğinden kazanmaz.",
    "Düğüm sahibi, ağı bir işyeri, kamu kurumu, kamp alanı veya benzeri bir mekânda üçüncü kişilerin kullanımına açar ve bu ağ üzerinden genel internete çıkış (exit node) etkinleştirilirse, 5651 sayılı Kanun'un 7. maddesi uyarınca \"toplu kullanım sağlayıcı\" sıfatı doğar. Bu durumda iç IP dağıtım loglarının elektronik ortamda kendi sistemine kaydedilmesi yükümlülüğü münhasıran düğüm sahibine aittir.",
    "Tedbirge, opsiyonel bir log modülü sağlar; ancak logların tutulması, saklanması, doğruluğu, gizliliği ve talep hâlinde yetkili makamlara sunulması yükümlülüğü işleten tarafa aittir. Tedbirge bu verilere erişemez, kopyasını tutmaz ve yerine geçemez.",
    "Tedbirge, taşınan içeriği çözemez (uçtan uca şifreleme) ve içeriği kontrol etme, izleme veya hukuka aykırı içeriği araştırma yükümlülüğü altında değildir (5651 md. 6/2 kıyasen). Tedbirge'nin sorumluluğu, yazılımın belgelenen teknik işlevi ile sınırlıdır.",
    "Exit node etkinleştiren veya ağı ticari olarak üçüncü kişilere sunan işletenlerin, yer/erişim/toplu kullanım sağlayıcı sıfatına ilişkin BTK bildirim ve belge yükümlülüklerini bağımsız hukuki danışmanlıkla değerlendirmesi gerekir.",
  ],
};

/**
 * "Mere Conduit" (salt aktarıcı) zırhı — 6563 s.K. m.5 ve 5651 s.K. m.6/2
 * kıyasen. Overlay yalnızca şifreli zarf taşır; egress kilidi nedeniyle
 * genel internete çıkış yoktur.
 */
export const MERE_CONDUIT = {
  title: "Mere Conduit — Salt Aktarıcı Statüsü ve Sorumluluk Sınırlandırması",
  badge: "Salt aktarıcı · egress kilidi açık",
  clauses: [
    "Tedbirge düğümü, taşınan iletinin başlatıcısı değildir, alıcısını seçmez ve içeriğini değiştirmez. 6563 sayılı Kanun'un 5. maddesi ve 5651 sayılı Kanun'un 6/2 hükmü kıyasen, düğüm işleteni salt aktarıcı (mere conduit) konumundadır.",
    "Aktarım teknik olarak zorunlu süre boyunca ve otomatik biçimde yapılır; ara düğümde kalıcı içerik saklama amacı yoktur. Gövde uçtan uca şifrelidir; röle düğüm içeriği çözemez, okuyamaz, arşivleyemez.",
    "Egress/Exit Block kuralı derleme zamanında sabittir: overlay genel internete NAT, proxy, DNS veya exit-node hizmeti vermez. Bu nedenle düğüm sahibi kendiliğinden erişim sağlayıcı sıfatı kazanmaz.",
    "CE/FCC/BTK spektrum uygunluğu, bağlanan üçüncü taraf radyo donanımının üreticisine aittir. Tedbirge yazılımı yalnızca bölge profili tavanlarını zorlar; harici donanım için uygunluk beyanı vermez.",
    "Kullanıcının kendi internet aboneliği üzerinden gerçekleştirdiği kişisel kullanımdan doğan yükümlülükler kullanıcıya aittir. Tedbirge, kullanıcı IP adresine ilişkin trafik verisine erişemez ve kopyasını tutmaz.",
  ],
  disclaimer:
    "Bu metin bilgilendirme amaçlıdır, hukuki mütalaa değildir. Kurumsal dağıtım öncesi bağımsız hukuki danışmanlık alınmalıdır.",
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

/* ------------------------------------------------------------------ *
 * Şirketleşme ve idari uyum paketi — sözleşmesel ekler (Ek-A/B/C)
 * ------------------------------------------------------------------ */

export type ContractAnnex = {
  id: "ek-a" | "ek-b" | "ek-c";
  code: string;
  title: string;
  scope: string;
  refs: string;
  clauses: Array<{ n: string; h: string; p: string }>;
  signature: string;
};

export const CONTRACT_ANNEXES: ContractAnnex[] = [
  {
    id: "ek-a",
    code: "EK-A",
    title: "Spektrum ve Donanım Kullanım Taahhüdü",
    scope:
      "Bu ek, Tedbirge Protokol yazılımını işleten Müşteri/İşleten ile Tedbirge (Mehmet DİNÇ) arasındaki lisans sözleşmesinin ayrılmaz parçasıdır ve radyo spektrumu kullanımına ilişkin yükümlülükleri düzenler.",
    refs: "5809 s. Elektronik Haberleşme Kanunu · BTK KEGY · Milli Frekans Planı · ETSI EN 300 220 · RED 2014/53/AB Md. 3(3)(i)",
    clauses: [
      {
        n: "A.1",
        h: "Bant ve güç tavanlarına uyum",
        p: "İşleten, Türkiye Cumhuriyeti sınırları içinde yürüttüğü tüm konuşlanmalarda 863–870 MHz SRD bandı için BTK Kısa Mesafe Erişimli Telsiz Cihazları Yönetmeliği'nde (KEGY) öngörülen 25 mW e.r.p. azami iletim gücü ve %1 azami görev döngüsü (duty cycle) tavanlarına uyacağını kabul, beyan ve taahhüt eder. Anten kazancı dâhil edilerek hesaplanan efektif yayılan gücün bu tavanı aşmaması İşleten'in sorumluluğundadır.",
      },
      {
        n: "A.2",
        h: "Bölge kilitlerinin tahrif edilmemesi",
        p: "Yazılımda TEDBIRGE_REGION bölge profili ile zorlanan frekans planı, iletim gücü tavanı ve görev döngüsü bütçesi; tersine mühendislik, yama, bellek müdahalesi, yapılandırma manipülasyonu veya benzeri hiçbir yöntemle devre dışı bırakılamaz, aşılamaz veya değiştirilemez. Türkiye'de TR profilinde varsayılan olarak kapalı gelen Wi-Fi HaLow (900 MHz) ve TVWS (470–790 MHz) taşıyıcıları açılamaz.",
      },
      {
        n: "A.3",
        h: "Yalnızca tip onaylı donanım",
        p: "İşleten, yazılımla birlikte yalnızca ilgili ulusal düzenleyici tarafından tip onayı verilmiş, CE/RED veya eşdeğer uygunluk işareti taşıyan ve üretici firmware'i değiştirilmemiş radyo donanımı kullanacağını taahhüt eder. Üretici dışı, değiştirilmiş veya özel (custom) firmware yüklenmesi hâlinde uygunluk beyanı ve garanti kendiliğinden sona erer.",
      },
      {
        n: "A.4",
        h: "Yurt dışı konuşlanma",
        p: "Türkiye dışındaki konuşlanmalarda İşleten, konuşlanma yapılacak ülkenin yürürlükteki spektrum düzenlemesine uygun bölge profilini seçmek ve gerekli yerel kayıt/izin işlemlerini tamamlamakla yükümlüdür. Tedbirge'nin yayımladığı bölge matrisi bilgilendirme amaçlıdır; yetkili makam metni esastır.",
      },
      {
        n: "A.5",
        h: "Sorumluluk ve rücu",
        p: "A.1–A.4 maddelerine aykırılıktan doğan her türlü idari para cezası, cihaz el koyma, faaliyet durdurma ve üçüncü kişi zararları münhasıran İşleten'e aittir. Tedbirge'ye bu nedenle bir yaptırım uygulanması hâlinde Tedbirge, ödediği tutarlar için İşleten'e rücu eder.",
      },
      {
        n: "A.6",
        h: "Denetim ve kayıt",
        p: "İşleten, kullandığı donanımın marka/model/tip onay numarasını ve seçtiği bölge profilini kayıt altında tutar; Tedbirge'nin yazılı talebi hâlinde bu kayıtları 10 iş günü içinde sunar.",
      },
    ],
    signature:
      "İşleten (unvan / ad-soyad, tarih, imza) — Tedbirge: Mehmet DİNÇ (Tedbirge Protokol), Türkiye",
  },
  {
    id: "ek-b",
    code: "EK-B",
    title: "5651 Sorumluluk Devri ve Log Yükümlülüğü Beyanı",
    scope:
      "Bu ek, Tedbirge Protokol düğümü üzerinden genel internete çıkış (exit node) etkinleştirilmesi hâlinde doğan yükümlülüklerin taraflar arasındaki dağılımını düzenler.",
    refs: "5651 s. Kanun md. 2/1-(e), 5, 7 · İnternet Toplu Kullanım Sağlayıcıları Hakkında Yönetmelik · 6698 s. KVKK",
    clauses: [
      {
        n: "B.1",
        h: "Varsayılan izole ağ statüsü",
        p: "Tedbirge Protokol varsayılan yapılandırmasında kapalı devre, izole bir haberleşme ortamı kurar ve genel internet erişimi dağıtmaz. Bu yapılandırmada düğüm sahibi, 5651 sayılı Kanun anlamında erişim sağlayıcı veya toplu kullanım sağlayıcı sıfatını kendiliğinden kazanmaz.",
      },
      {
        n: "B.2",
        h: "Exit node ile sıfat değişikliği",
        p: "Düğüm sahibinin ağı bir işyeri, kamu kurumu, kamp alanı, etkinlik alanı veya benzeri bir mekânda üçüncü kişilerin kullanımına açması ve genel internete çıkışı (exit node) etkinleştirmesi hâlinde, 5651 sayılı Kanun'un 7. maddesi uyarınca 'toplu kullanım sağlayıcı' sıfatı münhasıran düğüm sahibinde doğar.",
      },
      {
        n: "B.3",
        h: "Adli log yükümlülüğünün münhasırlığı",
        p: "B.2 hâlinde iç IP dağıtım kayıtlarının (kaynak IP, atanan IP, MAC adresi, port bilgisi, oturum başlangıç/bitiş zaman damgası) elektronik ortamda kendi sisteminde tutulması, doğruluğunun ve bütünlüğünün korunması, yetkisiz erişime karşı güvenliğinin sağlanması ve mevzuatın öngördüğü süre boyunca saklanması yükümlülüğü münhasıran Müşteri'ye/düğüm sahibine aittir.",
      },
      {
        n: "B.4",
        h: "Zaman damgası ve bütünlük",
        p: "Müşteri, log kayıtlarının NTP ile senkronize saat kaynağı kullanılarak üretilmesini ve kayıt bütünlüğünün özet (hash) veya nitelikli elektronik zaman damgası ile doğrulanabilir olmasını sağlar. Tedbirge opsiyonel bir log modülü sağlar; modülün varlığı yükümlülüğü Tedbirge'ye devretmez.",
      },
      {
        n: "B.5",
        h: "Tedbirge'nin teknik erişimsizliği",
        p: "Ağ üzerinden taşınan yük uçtan uca AES-256-GCM ile şifrelenir ve özel anahtar kullanıcı cihazından çıkmaz. Tedbirge; içerik verisine, log kayıtlarına veya abone bilgisine teknik olarak erişemez, kopyasını tutmaz ve yetkili makam taleplerinde Müşteri'nin yerine geçemez. Tedbirge'ye ulaşan talepler gecikmeksizin Müşteri'ye yönlendirilir.",
      },
      {
        n: "B.6",
        h: "Bildirim ve belge yükümlülükleri",
        p: "Müşteri, ticari amaçla toplu kullanım sağlayıcılığı yapması hâlinde mülki idare amirliğinden izin belgesi alınması ve BTK'ya yapılması gereken bildirimler dâhil tüm idari yükümlülükleri bağımsız hukuki danışmanlıkla değerlendirip yerine getirir.",
      },
      {
        n: "B.7",
        h: "Tazmin",
        p: "Bu ekte tanımlı yükümlülüklerin ihlalinden doğan idari, hukuki ve cezai sorumluluk ile üçüncü kişi talepleri Müşteri'ye aittir; Müşteri, Tedbirge'yi bu taleplerden ari tutmayı kabul eder.",
      },
    ],
    signature:
      "Müşteri / düğüm sahibi (unvan, ad-soyad, tarih, imza) — Tedbirge: Mehmet DİNÇ (Tedbirge Protokol)",
  },
  {
    id: "ek-c",
    code: "EK-C",
    title: "İhracat Kontrolü, Çift Kullanım ve Yaptırım Taraması — Son Kullanıcı Beyanı",
    scope:
      "Bu ek, güçlü kriptografi (AES-256-GCM, Ed25519, ECDH P-256) içeren Tedbirge yazılımının uluslararası ihracat kontrol rejimleri ve yaptırım programları ile uyumlu kullanımına ilişkin son kullanıcı beyanıdır.",
    refs: "Wassenaar Düzenlemesi Kat. 5 Böl. 2 · (AB) 2021/821 · 5A002/5D002 · ABD EAR (EAR99/5D002 analojisi) · BM/AB/OFAC yaptırım listeleri",
    clauses: [
      {
        n: "C.1",
        h: "Sınıflandırma bilgisi",
        p: "Son Kullanıcı, yazılımın simetrik 256 bit ve asimetrik eliptik eğri kriptografi içerdiğini ve bu nedenle çift kullanımlı ürün sınıflandırması kapsamına girebileceğini bildiğini beyan eder. Yazılım salt yazılım olarak sevk edilir; hiçbir şifreleme donanımı, verici veya anten teslim edilmez.",
      },
      {
        n: "C.2",
        h: "Son kullanım beyanı",
        p: "Son Kullanıcı, yazılımı yalnızca beyan ettiği meşru sivil/kurumsal haberleşme süreklilik amaçlarıyla kullanacağını; nükleer, kimyasal, biyolojik silah veya füze teknolojisi geliştirme faaliyetlerinde, hukuka aykırı kitlesel gözetim sistemlerinde veya insan hakları ihlaline yol açacak uygulamalarda kullanmayacağını taahhüt eder.",
      },
      {
        n: "C.3",
        h: "Yaptırım taraması",
        p: "Son Kullanıcı; kendisinin, hâkim ortaklarının ve nihai yararlanıcılarının BM Güvenlik Konseyi, Avrupa Birliği konsolide yaptırım listesi, ABD OFAC SDN listesi ve Türkiye'nin taraf olduğu yaptırım rejimlerinde yer almadığını beyan eder. Statüsünde değişiklik olması hâlinde derhal Tedbirge'yi bilgilendirir.",
      },
      {
        n: "C.4",
        h: "Yeniden ihracat yasağı",
        p: "Yazılımın, lisansı olmayan üçüncü kişilere devri, alt lisanslanması, yeniden ihracı veya ambargo/yaptırım uygulanan ülke ya da kişilere doğrudan veya dolaylı olarak erişilebilir kılınması yasaktır.",
      },
      {
        n: "C.5",
        h: "Kayıt ve denetim",
        p: "Son Kullanıcı, dağıtım ve kurulum kayıtlarını en az 5 yıl saklar; yetkili ihracat kontrol makamının veya Tedbirge'nin yazılı talebi hâlinde bu kayıtları sunar.",
      },
      {
        n: "C.6",
        h: "İhlalin sonucu",
        p: "Bu ekin ihlali hâlinde lisans, ihbara gerek olmaksızın derhal sona erer; doğan tüm idari ve cezai sorumluluk Son Kullanıcı'ya aittir.",
      },
    ],
    signature:
      "Son Kullanıcı (kurum unvanı, yetkili ad-soyad, ülke, tarih, imza) — Tedbirge: Mehmet DİNÇ (Tedbirge Protokol)",
  },
];

/* ------------------------------------------------------------------ *
 * İdari ve resmî dilekçe taslakları
 * ------------------------------------------------------------------ */

export type OfficialDraft = {
  id:
    | "btk-muafiyet"
    | "valilik-saha-testi"
    | "kvkk-sifat-beyani"
    | "bulut-birlikte-calisabilirlik"
    | "afad-kamu-protokol";
  label: string;
  title: string;
  summary: string;
  body: string;
};


export const OFFICIAL_DRAFTS: OfficialDraft[] = [
  {
    id: "btk-muafiyet",
    label: "BTK",
    title: "BTK Resmî Muafiyet ve Bilgilendirme Dilekçesi (Taslak)",
    summary:
      "Ürünün verici içermeyen, lisanssız ISM bandında çalışan salt yazılım olduğunu belgeleyen; lisans/bildirim muafiyeti hakkında yazılı görüş talep eden idari başvuru metni.",
    body: `BİLGİ TEKNOLOJİLERİ VE İLETİŞİM KURUMU BAŞKANLIĞI'NA
(Yetkilendirme Dairesi Başkanlığı / Spektrum Yönetimi Dairesi Başkanlığı)
Eskişehir Yolu 10. km No: 276 Çankaya / ANKARA

Konu: Verici içermeyen, lisanssız (ISM/SRD) bantları yöneten salt yazılım ürünü hakkında yetkilendirme ve tip onayı yükümlülükleri bakımından muafiyet değerlendirmesi ve yazılı görüş talebi.

Tarih: ..../..../20....

1. BAŞVURU SAHİBİ
Unvan: Mehmet DİNÇ (Tedbirge Protokol) — şahıs işletmesi
Vergi dairesi / VKN-TCKN: ...............................
Adres: ...............................
Tebligata esas e-posta / KEP: ...............................
Telefon: ...............................

2. ÜRÜNÜN TANIMI
"Tedbirge Protokol", tek statik çalıştırılabilir dosya (binary) ve buna eşdeğer, kurulum gerektirmeyen tarayıcı uygulaması (PWA) biçiminde dağıtılan salt yazılım nitelikli bir haberleşme tünelleme ve yönlendirme katmanıdır. Ürün kapsamında:
a) Hiçbir radyo vericisi, alıcı, anten veya RF güç katı üretilmemekte, ithal edilmemekte ve satılmamaktadır; ürün 5809 sayılı Kanun'un 3'üncü maddesi anlamında "telsiz cihazı" niteliği taşımamaktadır.
b) Yazılım, kullanıcının hâlihazırda sahip olduğu ve ilgili mevzuata göre tip onaylı/uygunluk değerlendirmesi yapılmış donanımın (Ethernet, Wi-Fi 2,4/5/6 GHz, 60 GHz, sub-GHz SRD modülleri, hücresel modem, uydu terminali, optik/FSO bağlantı) üzerinde çalışır. Donanıma ilişkin tip onayı ve piyasaya arz sorumluluğu ilgili cihaz üreticisi/ithalatçısına aittir.
c) Hücresel ve uydu taşıyıcılar, kullanıcının yetkilendirilmiş işletmeciyle mevcut abonelik ilişkisi üzerinden kullanılır; başvuru sahibi elektronik haberleşme hizmeti sunmamakta, şebeke/altyapı işletmemekte ve abonelik ilişkisi kurmamaktadır. Bu nedenle 5809 sayılı Kanun'un 8'inci maddesi kapsamında işletmeci sıfatı bulunmadığı değerlendirilmektedir.
d) Ürünün tarayıcı bileşeni, cihazlar arasında doğrudan uçtan uca bağlantı (WebRTC eşler arası veri kanalı) kurar. Başvuru sahibinin sunucuları yalnızca bağlantı kurulum sinyalleşmesi ve karşı taraf çevrimdışıyken şifreli paketin geçici olarak kuyruklanması (store-and-forward) işlevini görür; içerik açılamaz, saklanan şifreli kayıt süre sonunda otomatik silinir.

3. SPEKTRUM KULLANIMI VE YAZILIMSAL SINIRLAMALAR
Ürünün Türkiye (TR) bölge profili, Kısa Mesafe Erişimli Telsiz Cihazları (KET) Yönetmeliği ve Millî Frekans Planı hükümleri esas alınarak yapılandırılmıştır:
- Sub-GHz SRD: 863–870 MHz, azami 25 mW e.r.p., azami %1 görev döngüsü — yazılımsal olarak zorlanmakta, bütçe dolduğunda paketler kuyruğa alınmaktadır.
- Wi-Fi HaLow (902–928 MHz) ve TVWS (470–790 MHz) taşıyıcıları TR profilinde varsayılan ve zorunlu olarak KAPALI gelmekte, kullanıcı tarafından açılamamaktadır.
- Yapılandırılabilir radyonun mevzuata aykırı parametrelere zorlanmasını engelleyen bölge kilidi mekanizması, Telsiz Ekipmanları Yönetmeliği'nin (2014/53/AB) yazılım-radyo uyumluluğuna ilişkin ilkeleriyle uyumlu olarak uygulanmaktadır.
- Bölge profili ve parametre tablosu, ürünün kaynak kodunda tek ve denetlenebilir bir dosyada (regülasyon tablosu) tutulmakta; arayüzdeki tüm taşıyıcı seçenekleri bu tablodan türetilmektedir.

4. VERİ VE İÇERİK BOYUTU
Taşınan yük uçtan uca AES-256-GCM ile şifrelenir; anahtarlar (Ed25519 imza / X25519 anahtar uzlaşımı) kullanıcı cihazında üretilir ve cihazdan çıkmaz. Başvuru sahibi içerik verisine teknik olarak erişememektedir. Sunucu tarafında yalnızca teknik telemetri (gecikme, paket kaybı, verim, zaman damgası), düğüm kimliği ve şifreli kuyruk kaydı tutulur. Bildirim altyapısı (Web Push/VAPID) yalnızca "uyandırma" sinyali taşır; mesaj içeriği, gönderen adı veya konum bildirime konulmaz, içerik cihazda çözülerek gösterilir. Varsayılan yapılandırma kapalı devre olup genel internet erişimi dağıtmamaktadır. Kullanıcının genel internete çıkış (exit node) özelliğini etkinleştirmesi hâlinde, 5651 sayılı Kanun kapsamındaki erişim/yer sağlayıcı yükümlülüklerinin kullanıcıya ait olduğu, kullanıcı sözleşmesinin ilgili ekinde açıkça düzenlenmiştir.

5. DENETLENEBİLİRLİK
Ürün, sıfır-bilgi iddiasının bağımsız olarak sınanmasına imkân veren bir öz denetim modülü içerir: sunucuya giden her alanın listesi, şifreli yükün açılamadığının kanıtı ve olay kayıtlarının SHA-256 zinciriyle bütünlük doğrulaması dışa aktarılabilir. Kurumunuzca talep edilmesi hâlinde bu çıktı ve doğrulama talimatı sunulacaktır.

6. TALEP
Yukarıda nitelikleri açıklanan ürünün;
a) 5809 sayılı Elektronik Haberleşme Kanunu kapsamında yetkilendirme (bildirim/kullanım hakkı) gerektirip gerektirmediği,
b) Telsiz kurma ve kullanma izni ile tip onayı yükümlülükleri bakımından, verici içermeyen salt yazılım niteliği nedeniyle muafiyet kapsamında değerlendirilip değerlendirilmeyeceği,
c) Tarayıcı üzerinden çalışan, eşler arası şifreli veri kanalı kuran bileşenin bu değerlendirmeyi değiştirip değiştirmediği,
d) Varsa yerine getirilmesi gereken ilave bildirim, belge veya teknik dosya yükümlülükleri,
hususlarında Kurumunuzun yazılı görüşünün tarafımıza bildirilmesini saygılarımla arz ederim.

Kurumunuzca talep edilmesi hâlinde ürün teknik özeti, bölge profili (TR) spektrum parametre tablosu, sıfır-bilgi denetim çıktısı ve ilgili sözleşme ek metinleri ayrıca sunulacaktır.




Mehmet DİNÇ
Tedbirge Protokol
İmza: ...............................`,
  },
  {
    id: "valilik-saha-testi",
    label: "Valilik",
    title: "Sakarya Valiliği / İl Telekomünikasyon Saha Testi Bilgilendirme Yazısı (Taslak)",
    summary:
      "Pilot saha testi öncesinde mülki idareye sunulacak, test yeri-zamanı, spektrum parametreleri ve güvenlik tedbirlerini bildiren resmî bilgilendirme metni.",
    body: `SAKARYA VALİLİĞİ'NE
(İl Yazı İşleri Müdürlüğü / İl Afet ve Acil Durum Müdürlüğü / İlgili İl Telekomünikasyon Birimi)

Konu: Lisanssız ISM/SRD bandında yürütülecek haberleşme süreklilik saha testi hakkında bilgilendirme.

Tarih: ..../..../20....

1. BİLGİLENDİRMEDE BULUNAN
Unvan: Mehmet DİNÇ (Tedbirge Protokol)
Adres: ............................... · E-posta: tedbirge34@gmail.com · Telefon: ...............................

2. TESTİN AMACI
İnternet altyapısının kesintiye uğradığı afet ve acil durum senaryolarında, mevcut ve tip onaylı kullanıcı donanımları üzerinde çalışan salt yazılım tabanlı bir mesh haberleşme katmanının menzil, gecikme, paket kaybı ve süreklilik performansının ölçülmesidir. Test, kamu düzenini etkilemeyen, ticari hizmet sunumu içermeyen teknik bir ölçüm faaliyetidir.

3. TESTİN YERİ, TARİHİ VE KAPSAMI
Yer / koordinatlar: ...............................
Tarih ve saat aralığı: ..../..../20.... — ..:.. – ..:..
Katılımcı sayısı: ....... kişi · Kullanılacak düğüm sayısı: ....... adet
Kurulacak bağlantı: sabit/mobil, nokta-nokta ve mesh; kalıcı yapı, direk, kule veya kazı işi yapılmayacaktır.

4. SPEKTRUM VE DONANIM
- Kullanılacak bantlar: 863–870 MHz SRD (azami 25 mW e.r.p., azami %1 görev döngüsü), Wi-Fi 2,4/5 GHz ve 60 GHz lisanssız bantlar.
- Tüm donanım CE/RED işaretli ve tip onaylıdır; üretici firmware'i değiştirilmemiştir.
- Wi-Fi HaLow ve TVWS taşıyıcıları yazılım tarafından kapalı tutulmaktadır.
- Kullanılan bantlar lisanssız olup, mevcut mevzuata göre ayrıca telsiz kurma ve kullanma izni gerektirmemektedir. Faaliyet, yetkilendirilmiş işletmecilerin spektrumuna müdahale etmemekte, kamuya elektronik haberleşme hizmeti sunulmamaktadır.

5. GÜVENLİK VE ÇEVRE TEDBİRLERİ
- İnsan maruziyeti EN 62311 sınırlarının altındadır; optik (FSO) bağlantı kullanılması hâlinde IEC 60825-1 Class 1M göz güvenliği sınıfı geçerlidir.
- Test alanı görevli personel tarafından denetlenecek, acil durum irtibat numarası bulundurulacaktır.
- Test sırasında genel internete çıkış (exit node) etkinleştirilmeyecek, ağ izole çalışacaktır; bu nedenle 5651 sayılı Kanun kapsamında toplu kullanım sağlayıcılığı doğmayacaktır.

6. VERİ İŞLEME VE ÖLÇÜM YÖNTEMİ
Test kapsamında yalnızca teknik telemetri (düğüm kimliği, sinyal seviyesi, gecikme, paket kaybı, verim, zaman damgası, konum doğruluğu) kaydedilecek olup, katılımcılara ait kişisel veri veya haberleşme içeriği işlenmeyecektir. Ölçümler, katılımcıların kendi cihazlarındaki tarayıcı üzerinden çalışan düğüm yazılımıyla otomatik toplanır ve imzalı, SHA-256 zinciriyle bütünlüğü doğrulanabilir bir saha raporuna dönüştürülür. Rapor talep hâlinde Valiliğinize sunulacaktır. 6698 sayılı KVKK kapsamında aydınlatma metni katılımcılara sunulacak; katılımcı cihazlarındaki haberleşme içeriği uçtan uca şifreli olduğundan test yürütücüsü tarafından da okunamayacaktır.

7. TALEP
Yukarıda ayrıntıları verilen saha testi faaliyeti hakkında Valiliğinizin bilgilendirilmesini, uygun görülmesi hâlinde ilgili birimlerin haberdar edilmesini ve varsa yerine getirmemiz gereken ilave tedbir/izin hususlarının tarafımıza bildirilmesini saygılarımla arz ederim.

Mehmet DİNÇ
Tedbirge Protokol
İmza: ...............................`,
  },
  {
    id: "kvkk-sifat-beyani",
    label: "KVKK",
    title: "KVKK Sıfat Beyanı ve VERBİS Değerlendirme Başvurusu (Taslak)",
    summary:
      "Uçtan uca şifreli taşıma mimarisinde veri sorumlusu/veri işleyen sıfatının tespiti ve VERBİS kayıt yükümlülüğü hakkında Kuruma yazılı görüş başvurusu.",
    body: `KİŞİSEL VERİLERİ KORUMA KURUMU BAŞKANLIĞI'NA
(Veri Yönetimi Dairesi Başkanlığı)
Nasuh Akar Mah. Ziyabey Cad. 1407. Sok. No: 4 Balgat — Çankaya / ANKARA

Konu: Uçtan uca şifreli haberleşme taşıma katmanında veri sorumlusu / veri işleyen sıfatının tespiti ve VERBİS kayıt yükümlülüğü hakkında görüş talebi.

Tarih: ..../..../20....

1. BAŞVURU SAHİBİ
Unvan: Mehmet DİNÇ (Tedbirge Protokol) — şahıs işletmesi
VKN-TCKN: ............................... · Adres: ...............................
Tebligata esas e-posta / KEP: ...............................

2. FAALİYETİN NİTELİĞİ
Tedbirge Protokol, kurumların ve son kullanıcıların kendi cihazları arasında doğrudan, uçtan uca şifreli bağlantı kuran bir yazılım katmanıdır. Mimarinin belirleyici özellikleri şunlardır:
a) Şifreleme anahtarları kullanıcı cihazında üretilir ve cihazdan hiçbir koşulda çıkmaz; başvuru sahibi haberleşme içeriğini teknik olarak çözemez.
b) Mesajlar, sesli/görüntülü görüşmeler ve dosyalar cihazdan cihaza aktarılır; karşı taraf çevrimdışıyken yalnızca şifreli paket, sınırlı süreyle ve içeriği açılamaz biçimde kuyruklanır.
c) Rehber, konum ve mesaj geçmişi sunucuya kopyalanmaz; cihazın yerel deposunda tutulur.
d) Bildirim altyapısı yalnızca içeriksiz "uyandırma" sinyali taşır.
e) Sunucu tarafında tutulan kayıtlar teknik telemetri, düğüm kimliği ve abonelik/lisans kayıtlarıyla sınırlıdır.

3. HUKUKİ DEĞERLENDİRME
Başvuru sahibi, haberleşme içeriği bakımından işleme amaç ve vasıtalarını belirleme imkânına sahip olmadığından 6698 sayılı Kanun'un 3'üncü maddesi anlamında bu veriler yönünden veri sorumlusu olmadığı; kurumsal müşteriler bakımından ise yalnızca sınırlı teknik veriler üzerinden veri işleyen sıfatını taşıdığı değerlendirilmektedir. Müşteri sözleşmelerine, Kanun'un 12'nci maddesi uyarınca veri işleyen yükümlülüklerini düzenleyen bir ek (DPA) konulmaktadır.

4. TALEP
a) Yukarıda tarif edilen mimaride başvuru sahibinin hangi veri kategorileri bakımından veri sorumlusu, hangileri bakımından veri işleyen sayılacağı,
b) Sicile kayıt (VERBİS) yükümlülüğünün doğup doğmadığı, doğuyorsa kapsamı,
c) Yurt dışında konumlanan bulut/altyapı hizmet sağlayıcılarının kullanılması hâlinde yurt dışına aktarım hükümleri bakımından, içeriğin sağlayıcı tarafından açılamıyor olmasının değerlendirmeye etkisi,
hususlarında Kurumunuzun yazılı görüşünün tarafımıza bildirilmesini saygılarımla arz ederim.

Mehmet DİNÇ
Tedbirge Protokol
İmza: ...............................`,
  },
  {
    id: "bulut-birlikte-calisabilirlik",
    label: "Bulut / Kurum BT",
    title: "Bulut ve Kurumsal BT Birlikte Çalışabilirlik Beyanı (Taslak)",
    summary:
      "Cloudflare, AWS, Azure, GCP gibi sağlayıcıların ve kurumsal BT birimlerinin güvenlik incelemesine sunulacak; düğümün mevcut mimariye nasıl yan katman olarak eklendiğini ve geri dönüş prosedürünü açıklayan teknik-hukuki beyan.",
    body: `BİRLİKTE ÇALIŞABİLİRLİK VE GÜVENLİK BEYANI
(Bulut hizmet sağlayıcısı / kurumsal BT güvenlik incelemesi için)

Tarih: ..../..../20....
Beyanda bulunan: Mehmet DİNÇ (Tedbirge Protokol)
Muhatap kurum / sağlayıcı: ...............................

1. KONUMLANDIRMA
Tedbirge Gateway, adından da anlaşılacağı üzere bir "düğüm"dür: mevcut bulut mimarisinin yerine geçmez, önüne yan katman (sidecar overlay) olarak konur. Kurumun uygulama kodu, kimlik altyapısı ve veri modeli değişmez. Amaç, bağlantı koptuğunda sahanın çalışmaya devam etmesi ve bağlantı geri geldiğinde kayıtların otomatik mahsuplaşmasıdır.

2. ENTEGRASYON YÜZEYİ
a) Ağ: düğüm, kurumun kendi ağında veya sahadaki cihazda çalışır; buluta giden trafik ters vekil / uç nokta yönlendirmesiyle önce düğümden geçer.
b) Kimlik: kurumun mevcut kimlik sağlayıcısı (OIDC/SAML SSO) ile düğüm kimliği eşleştirilir; ayrı kullanıcı veritabanı oluşturulmaz.
c) İstemci: kurulum gerektirmeyen tarayıcı uygulaması (PWA) ile telefon, tablet ve bilgisayar aynı düğüm ağına katılır; mağaza onayı veya cihaz yönetimi zorunluluğu yoktur.
d) Uç çalıştırma: sinyalleşme ve kuyruk uç noktaları, sağlayıcının uç çalıştırma (edge worker) ortamında da çalışacak biçimde standart HTTP/WebSocket arayüzleriyle yazılmıştır; sağlayıcıya özgü kapalı bileşen kullanılmaz.
e) Dışa açık uç noktalar imzalı doğrulama, hız sınırlama ve şema doğrulaması ile korunur; makine-makine entegrasyonu için açık API tanımı (OpenAPI) yayımlanmıştır.

3. GÜVENLİK VE VERİ EGEMENLİĞİ
- Taşınan içerik uçtan uca şifrelidir; ne sağlayıcı ne de Tedbirge içeriği açabilir.
- Anahtarlar kullanıcı cihazında üretilir; kurum isterse tüm kuyruk ve sinyalleşme bileşenlerini kendi tenant'ında çalıştırabilir.
- Her olay imzalı ve zincirlenmiş (SHA-256) kayda dönüşür; denetim çıktısı bağımsız doğrulanabilir.
- Sıfır-bilgi iddiası, ürün içindeki öz denetim modülüyle sağlayıcı tarafından da sınanabilir.

4. GERİ DÖNÜŞ (EXIT) GARANTİSİ
Düğüm katmanı kaldırıldığında kurumun mimarisi ilk günkü hâline döner: yönlendirme kaydı geri alınır, veri modeli değişmediği için taşıma gerekmez, cihazlardaki yerel kayıtlar standart biçimde dışa aktarılır. Sağlayıcı bağımlılığı (vendor lock-in) oluşmaz.

5. SORUMLULUK SINIRI
Tedbirge, kurumun bulut sözleşmesinin tarafı değildir ve sağlayıcı hizmet seviyesi taahhütlerini devralmaz. Düğüm katmanına ilişkin hizmet seviyesi, ayrı bir ek ile düzenlenir.

Mehmet DİNÇ
Tedbirge Protokol
İmza: ...............................`,
  },
  {
    id: "afad-kamu-protokol",
    label: "AFAD / Kamu",
    title: "AFAD ve Kamu Kurumları İşbirliği Protokolü Talebi (Taslak)",
    summary:
      "Afet ve acil durumlarda kamu kurumlarının mevcut sistemleriyle birlikte çalışacak yedek haberleşme katmanı için işbirliği/pilot protokolü talep yazısı.",
    body: `T.C. .................. VALİLİĞİ / İL AFET VE ACİL DURUM MÜDÜRLÜĞÜ'NE
(veya ilgili kamu kurumu Bilgi İşlem / Haberleşme Birimi)

Konu: Afet ve acil durumlarda mevcut haberleşme sistemlerini tamamlayıcı, yedek yazılım katmanı hakkında işbirliği ve pilot protokolü talebi.

Tarih: ..../..../20....

1. TALEPTE BULUNAN
Unvan: Mehmet DİNÇ (Tedbirge Protokol) · Adres: ............................... · E-posta: ...............................

2. GEREKÇE
Afet anında ilk kaybedilen hizmet, veri bağlantısıdır. Mevcut telsiz ve uydu sistemleri kritik ekipler için çalışsa da, saha personelinin elindeki telefon ve tabletler bağlantısız kalmakta; durum raporu, fotoğraf, hasar tespiti ve konum bilgisi merkeze ulaşamamaktadır.

3. ÖNERİLEN KATMAN
a) Kurumun mevcut sistemlerinin yerine geçmez; onların çalışmadığı anda devreye giren tamamlayıcı bir yazılım katmanıdır.
b) Personelin kendi cihazına kurulum yapmasına gerek yoktur; tarayıcıdan açılan bağlantı ile cihaz düğüme dönüşür.
c) Cihazlar birbirine doğrudan bağlanır; internet olmadan mesaj, sesli mesaj, konum ve dosya paylaşımı sürer, bağlantı geri geldiğinde kayıtlar otomatik merkeze aktarılır.
d) Tüm trafik uçtan uca şifrelidir; kayıtlar imzalı ve bütünlüğü doğrulanabilir biçimde tutulur, denetim raporu otomatik üretilir.
e) Lisanssız bantlar kullanılır; kurumun tahsisli spektrumuna müdahale edilmez, ek telsiz izni gerekmez.

4. TALEP
a) Kurumunuz koordinasyonunda, önceden belirlenecek bir ilçe/mahalle ölçeğinde, personel güvenliğini etkilemeyen bir tatbikat kapsamında pilot uygulama yapılması,
b) Pilot kapsamında veri sahipliği, gizlilik ve sorumluluk sınırlarını düzenleyen bir işbirliği protokolü imzalanması,
c) Kurumunuzun mevcut olay yönetim sistemleriyle veri alışverişi için teknik irtibat kişisinin bildirilmesi,
hususlarını saygılarımla arz ederim.

Pilot faaliyeti ticari hizmet sunumu içermez; ölçüm sonuçları ve sınırlılıklar kurumunuza yazılı rapor olarak sunulur.

Mehmet DİNÇ
Tedbirge Protokol
İmza: ...............................`,
  },
];

