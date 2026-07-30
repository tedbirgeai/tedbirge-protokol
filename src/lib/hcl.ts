/**
 * Tedbirge Gateway — Onaylı Donanım Listesi (HCL).
 * ------------------------------------------------------------------
 * Yalnızca laboratuvarda veya sahada fiilen sürülen taşıyıcı donanımları
 * listelenir. "Doğrulandı" etiketi, ilgili köprü sürücüsünün (Web Serial /
 * Web Bluetooth) o cihazla uçtan uca paket taşıdığı anlamına gelir.
 */

export const HCL_VERSION = "hcl-2026.07";

export type HclStatus = "verified" | "beta" | "planned";

export type HclEntry = {
  id: string;
  vendor: string;
  model: string;
  carrier: string;
  /** Bağlantı yolu: tarayıcı düğümünün donanıma eriştiği arayüz */
  link: "Web Serial (USB/UART)" | "Web Bluetooth (BLE)" | "Ethernet / IP";
  status: HclStatus;
  /** Teknik parametreler: anahtar → değer */
  specs: Array<[string, string]>;
  note: string;
};

export const HCL_STATUS_LABEL: Record<HclStatus, string> = {
  verified: "Doğrulandı",
  beta: "Beta",
  planned: "Planlandı",
};

export const HCL: HclEntry[] = [
  {
    id: "sx1262",
    vendor: "Semtech",
    model: "SX1262 LoRa transceiver (ör. Ebyte E22 / Waveshare HAT)",
    carrier: "LoRa sub-GHz",
    link: "Web Serial (USB/UART)",
    status: "verified",
    specs: [
      ["Bant", "863–870 MHz (EU/TR) · 902–928 MHz (US)"],
      ["İletim gücü", "TR/EU profilinde yazılımsal tavan 25 mW e.r.p. (14 dBm)"],
      ["Görev döngüsü", "%1 — çalışma zamanında sayılır, dolunca paket kuyruğa alınır"],
      ["Hassasiyet", "−148 dBm (SF12, 125 kHz)"],
      ["Veri hızı", "0.3–62.5 kbps (LoRa) · 300 kbps (FSK)"],
      ["Arayüz", "SPI → UART köprüsü, 9600–115200 baud"],
      ["Menzil (ölçülen)", "Şehir içi 1.5–3 km · açık arazi görüş hattı 8–12 km"],
    ],
    note: "Varsayılan profil TR: 868 MHz / 25 mW / %1. Modül firmware'i değiştirilirse spektrum sorumluluğu kullanıcıya geçer.",
  },
  {
    id: "rak-halow",
    vendor: "RAK Wireless",
    model: "RAK7625 / RAK Wi-Fi HaLow (Newracom NRC7292)",
    carrier: "Wi-Fi HaLow (802.11ah)",
    link: "Ethernet / IP",
    status: "beta",
    specs: [
      ["Bant", "902–928 MHz (US/AU) · 863–868 MHz (EU profili sınırlı)"],
      ["Kanal genişliği", "1 / 2 / 4 / 8 MHz"],
      ["Verim", "150 kbps – 15 Mbps (kanal ve MCS'e göre)"],
      ["Menzil", "1–3 km görüş hattı, düşük güçte NLOS penetrasyonu yüksek"],
      ["Arayüz", "Ethernet / IP — düğüm bunu normal WAN taşıyıcısı gibi kullanır"],
      ["TR durumu", "Üretimde kapalı — 900 MHz bandı BTK'da lisanslı"],
    ],
    note: "TR bölge profilinde açılamaz. US/AU/NZ profilinde etkinleştirilebilir; ülke seçimi TEDBIRGE_REGION ile zorlanır.",
  },
  {
    id: "esp32-meshtastic",
    vendor: "Espressif / Meshtastic",
    model: "ESP32 + SX1262 (Heltec V3, LilyGO T-Beam, RAK4631)",
    carrier: "LoRa mesh (Meshtastic protokolü)",
    link: "Web Bluetooth (BLE)",
    status: "verified",
    specs: [
      ["Firmware", "Meshtastic 2.x — BLE servisi 6ba1b218-15a8-461f-9fa8-5dcae273eafd"],
      ["Bant", "Bölge ayarı cihaz üzerinde: EU_868 / US / ANZ"],
      ["Atlama", "Varsayılan 3 hop (Tedbirge zarfı TTL 4 ile hizalanır)"],
      ["Paket boyutu", "237 bayt yük — Tedbirge parçalayıcısı otomatik böler"],
      ["Güç", "Tipik 100 mA TX, uyku modunda <1 mA"],
      ["Eşleşme", "BLE PIN doğrulaması + Tedbirge ECDH P-256 anahtar değişimi"],
    ],
    note: "Tarayıcı düğümü bu cihazı doğrudan sürebilir; Chrome/Edge (masaüstü ve Android) Web Bluetooth desteği gerekir.",
  },
  {
    id: "nordic-uart",
    vendor: "Nordic Semiconductor",
    model: "nRF52840 / nRF5340 — Nordic UART Service (NUS)",
    carrier: "BLE mesh / seri köprü",
    link: "Web Bluetooth (BLE)",
    status: "verified",
    specs: [
      ["Servis UUID", "6e400001-b5a3-f393-e0a9-e50e24dcca9e"],
      ["MTU", "247 bayt (BLE 4.2+ DLE)"],
      ["Verim", "~120 kbps pratik"],
      ["Menzil", "30–100 m (Coded PHY ile 400 m'ye kadar)"],
      ["Rol", "Ara köprü — LoRa/HaLow modülüne seri geçit"],
      ["Güç", "TX 5.3 mA @ 0 dBm"],
    ],
    note: "Kablosuz seri köprü olarak kullanılır; kendi başına uzun menzil sağlamaz, taşıyıcı modüle bağlanır.",
  },
];

export const HCL_DISCLAIMER =
  "Bu liste, Tedbirge köprü sürücülerinin fiilen paket taşıdığı donanımları kapsar. Listede olmayan cihazlar çalışabilir ancak desteklenmez. Radyo tip onayı (CE/RED, FCC) donanım üreticisine aittir; Tedbirge hiçbir radyo, verici veya anten üretmez.";
