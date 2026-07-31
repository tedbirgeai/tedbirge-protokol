export type Guide = {
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
  date: string;
  tag: string;
  sections: { heading: string; body: string[]; code?: string }[];
};

export const guides: Guide[] = [
  {
    slug: "off-grid-mesh-kurulumu",
    title: "Off-grid mesh ağını 15 dakikada kurma rehberi",
    description:
      "İnternet erişimi olmayan sahada üç düğümlü bir Tedbirge mesh ağını sıfırdan kurup doğrulama adımları: binary dağıtımı, tohum komşu tanımı ve kayıpsız aktarım testi.",
    readingMinutes: 7,
    date: "2026-07-10",
    tag: "Kurulum",
    sections: [
      {
        heading: "1. Binary'yi sahaya taşıyın",
        body: [
          "Tedbirge Protokol tek statik bir çalıştırılabilir dosyadır. Node.js, CDN veya paket yöneticisi gerektirmez; kurulum, dosyayı hedef cihaza kopyalamaktan ibarettir.",
          "Linux (amd64/arm64), Windows ve macOS için cross-compile çıktılar aynı sürümden üretilir. Saha cihazları çoğunlukla arm64 olduğundan, konuşlandırmadan önce mimariyi doğrulayın.",
        ],
        code: `# Hedef cihazda çalıştırma izni ver
chmod +x tedbirge-gateway
./tedbirge-gateway --version`,
      },
      {
        heading: "2. İlk düğümü röle olarak başlatın",
        body: [
          "Sahadaki ilk düğüm, diğerlerinin tohum (seed) komşusu olur. Mesh modunu açıp düğüm kimliğini ve dinleme adresini vermek yeterlidir.",
        ],
        code: `TEDBIRGE_MESH=true \\
TEDBIRGE_MESH_NODE_ID=saha-A \\
TEDBIRGE_MESH_ADDR=:7946 tedbirge-gateway`,
      },
      {
        heading: "3. Komşu düğümleri bağlayın",
        body: [
          "İkinci ve üçüncü düğümler yalnızca tohum adresini bilmek zorundadır. Gossip keşfi devreye girdiğinde topolojinin geri kalanı otomatik öğrenilir; merkezi bir kayıt sunucusu yoktur.",
        ],
        code: `TEDBIRGE_MESH=true \\
TEDBIRGE_MESH_NODE_ID=saha-B \\
TEDBIRGE_MESH_SEEDS=10.0.0.1:7946 tedbirge-gateway`,
      },
      {
        heading: "4. Kayıpsız aktarımı doğrulayın",
        body: [
          "Yerleşik demo komutları, üç düğümlük bir topolojide çok-sıçramalı aktarımı, 0-WAN dosya takasını ve exit düğüm üzerinden WAN köprüsünü test eder.",
          "Her testin sonunda SHA-256 özeti karşılaştırılır; içerik hiçbir noktada saklanmaz, yalnızca özet ve bayt sayımı raporlanır.",
        ],
        code: `tedbirge-cli mesh-demo   # 3 düğüm, kayıpsız
tedbirge-cli p2p-demo    # 0-WAN takas
tedbirge-cli exit-demo   # WAN köprüsü`,
      },
    ],
  },
  {
    slug: "afet-haberlesmesi-mimarisi",
    title: "Afet haberleşmesinde kurum içi mesh mimarisi nasıl tasarlanır",
    description:
      "Şebeke çöktüğünde çalışan bir afet haberleşme mimarisinin katmanları: taşıyıcı yedekliliği, exit düğüm planlaması, yetki modeli ve tatbikat kriterleri.",
    readingMinutes: 9,
    date: "2026-07-16",
    tag: "Afet & Kamu",
    sections: [
      {
        heading: "Tek taşıyıcıya bağlı mimari neden çöker",
        body: [
          "Afet anında ilk kaybedilen katman baz istasyonu ve fiber omurgadır. Yalnız hücresel yedeklemeye dayanan planlar, aynı fiziksel altyapıya bağlı oldukları için birlikte devre dışı kalır.",
          "Taşıyıcı-bağımsız bir mimaride Ethernet, Wi-Fi, LoRa, uydu, FSO ve TVWS aynı yazılım katmanı altında değiştirilebilir bileşenlerdir; birinin kaybı yolu yeniden hesaplatır, iletişimi durdurmaz.",
        ],
      },
      {
        heading: "Exit düğüm planlaması",
        body: [
          "Sahadaki tüm düğümlerin WAN'a çıkması gerekmez. Uydu terminali veya sağlam hücresel bağlantısı olan tek bir düğüm exit olarak işaretlenir; diğerleri şifreli mesh üzerinden bu düğümden çıkar.",
          "Exit düğüm yalnızca hedef adresi görür, taşınan içeriği göremez. Bu, kritik trafiğin tek bir cihazda toplanmasının yarattığı riski ortadan kaldırır.",
        ],
      },
      {
        heading: "Yetki ve kimlik modeli",
        body: [
          "Her düğüm Ed25519 anahtar çiftiyle kimliklenir. Ağa katılım Proof-of-Work ile maliyetlendirilir; replay saldırıları nonce kayan penceresiyle engellenir.",
          "Kurum, kendi kök anahtarıyla imzalanmış düğüm listesini önceden dağıtarak sahada tanınmayan cihazların katılımını kapatabilir.",
        ],
      },
      {
        heading: "Tatbikat kabul kriterleri",
        body: [
          "Bir afet haberleşme tatbikatını geçerli saymak için üç ölçüt öneriyoruz: (1) WAN tamamen kapalıyken uçtan uca mesaj teslimi, (2) bir röle düğüm fiziksel olarak kapatıldığında yolun 30 saniyede yeniden kurulması, (3) tüm aktarımların bütünlük özetiyle doğrulanması.",
        ],
      },
    ],
  },
  {
    slug: "sifir-bilgi-tunel-nedir",
    title: "Sıfır-bilgi tünel geçidi ne demek, VPN'den farkı nedir",
    description:
      "Zero-knowledge tünel mimarisinin klasik VPN'lerden farkı: içerik saklamama, ölçümün özet üzerinden yapılması ve operatörün taşıdığı veriyi bilememesi.",
    readingMinutes: 6,
    date: "2026-07-22",
    tag: "Güvenlik",
    sections: [
      {
        heading: "Klasik VPN'de operatör her şeyi görebilir",
        body: [
          "Geleneksel bir VPN sağlayıcısı, tünelin bir ucunda şifreyi çözer. Bu noktada trafiğin içeriği, hedefleri ve zamanlaması teknik olarak görülebilir ve kaydedilebilir durumdadır.",
          "Kurumsal alıcı için asıl soru şudur: operatör istese bile veriyi görebilir mi? Politika değil, mimari cevabı gereklidir.",
        ],
      },
      {
        heading: "Sıfır-bilgi tünelde ölçüm özet üzerinden yapılır",
        body: [
          "Tedbirge Protokol, taşınan veriyi AES-256-GCM ile parça parça şifreler ve hiçbir parçayı kalıcılaştırmaz. Faturalama ve telemetri için yalnızca iki değer tutulur: SHA-256 bütünlük özeti ve taşınan bayt sayısı.",
          "Bu sayede röle düğümü, ne taşıdığını bilmeden taşıdığını kanıtlayabilir. Off-grid defterdeki Ed25519 imzalı fişler de bu iki değer üzerine kuruludur.",
        ],
      },
      {
        heading: "Kurumsal alıcı için pratik sonuç",
        body: [
          "Veri işleyen taraf sayısı azalır: içerik yalnızca uç noktalarda açık haldedir. Bu, veri işleme envanterini ve sözleşmesel sorumluluğu belirgin biçimde sadeleştirir.",
          "Ayrıca sistem kendi donanımınızda çalıştığı için, üçüncü taraf bir bulut aboneliğine bağımlılık oluşmaz.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((g) => g.slug === slug);
}
