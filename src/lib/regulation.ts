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
