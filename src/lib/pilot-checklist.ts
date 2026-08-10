export type PilotCheckItem = {
  id: string;
  group: string;
  title: string;
  requirement: string;
  evidence: string;
  authority: string;
};

export const pilotGroups = [
  "1 · Yasal kapsam",
  "2 · Donanım & spektrum",
  "3 · Yapılandırma",
  "4 · Veri & KVKK",
  "5 · Güvenlik",
  "6 · Saha operasyonu",
  "7 · Kayıt & raporlama",
] as const;

export const pilotChecklist: PilotCheckItem[] = [
  {
    id: "L1",
    group: "1 · Yasal kapsam",
    title: "Pilot kapsam protokolü imzalandı",
    requirement:
      "Pilot alanı, süresi, düğüm sayısı, kullanılacak taşıyıcılar ve frekans bantları yazılı protokolde sabitlendi.",
    evidence: "İmzalı protokol PDF",
    authority: "Taraflar",
  },
  {
    id: "L2",
    group: "1 · Yasal kapsam",
    title: "Kamuya hizmet sunulmayacağı teyidi",
    requirement:
      "Pilot kapalı devre kurum içi kullanımdır; üçüncü kişilere bedelli haberleşme hizmeti sunulmaz. Sunulacaksa BTK işletmeci yetkilendirmesi belgesi eklenir.",
    evidence: "Kapsam beyanı veya BTK yetki belgesi",
    authority: "BTK",
  },
  {
    id: "L3",
    group: "1 · Yasal kapsam",
    title: "5651 erişim sağlayıcı yükümlülüğü değerlendirildi",
    requirement:
      "Pilotta kamuya internet erişimi verilmiyorsa gerekçe yazıldı; veriliyorsa faaliyet belgesi ve log altyapısı hazır.",
    evidence: "Değerlendirme notu / faaliyet belgesi",
    authority: "BTK · ESB",
  },
  {
    id: "L4",
    group: "1 · Yasal kapsam",
    title: "İhracat kontrol beyanı alındı",
    requirement:
      "Yurt dışı katılımcı veya yurt dışına lisans varsa son kullanıcı beyanı ve yaptırım listesi taraması tamamlandı.",
    evidence: "Son kullanıcı beyanı + tarama çıktısı",
    authority: "Ticaret Bakanlığı",
  },
  {
    id: "H1",
    group: "2 · Donanım & spektrum",
    title: "Tüm radyo cihazları CE + TDDY belgeli",
    requirement:
      "Sahaya çıkan her radyo cihazı için uygunluk beyanı ve CE işareti dosyada; belgesiz veya güç/frekansı yazılımla değiştirilebilen SDR sahaya çıkarılmadı.",
    evidence: "Cihaz listesi + uygunluk beyanları",
    authority: "BTK · Sanayi ve Tek. Bak.",
  },
  {
    id: "H2",
    group: "2 · Donanım & spektrum",
    title: "Bant ve güç ölçümü yapıldı",
    requirement:
      "868 MHz SRD ≤ 25 mW e.r.p. ve %1 görev döngüsü; 2.4/5 GHz ve 60 GHz KEGY tavanları spektrum analizörü ile doğrulandı.",
    evidence: "Ölçüm raporu / analizör ekran görüntüsü",
    authority: "BTK KEGY",
  },
  {
    id: "H3",
    group: "2 · Donanım & spektrum",
    title: "EM alan güvenlik mesafesi hesabı",
    requirement:
      "Yönlü 60 GHz veya harici anten kullanımında EM alan şiddeti hesabı yapıldı ve limit değerlerin altında olduğu gösterildi.",
    evidence: "Hesap sayfası",
    authority: "BTK EMF Yönetmeliği",
  },
  {
    id: "H4",
    group: "2 · Donanım & spektrum",
    title: "FSO lazer sınıf kontrolü",
    requirement:
      "FSO link kullanılıyorsa IEC 60825-1 Class 1M sınırı aşılmıyor; göz güvenliği uyarı levhaları ve İSG risk değerlendirmesi tamam.",
    evidence: "Lazer sınıf belgesi + İSG formu",
    authority: "İSG · IEC 60825-1",
  },
  {
    id: "C1",
    group: "3 · Yapılandırma",
    title: "Bölge profili imzalı olarak kilitlendi",
    requirement:
      "TEDBIRGE_REGION=TR profili imzalı yapılandırma ile dağıtıldı; operatör çalışma zamanında değiştiremiyor.",
    evidence: "Yapılandırma dosyası + imza doğrulaması",
    authority: "Tedbirge",
  },
  {
    id: "C2",
    group: "3 · Yapılandırma",
    title: "Kapsam dışı taşıyıcılar kapalı",
    requirement: "TR profilinde Wi-Fi HaLow ve TVWS kapalı; kapalı olduğu çıktı ile doğrulandı.",
    evidence: "`tedbirge-cli carriers` çıktısı",
    authority: "BTK",
  },
  {
    id: "C3",
    group: "3 · Yapılandırma",
    title: "Görev döngüsü bütçesi zorlanıyor",
    requirement:
      "Duty cycle sayaçları çalışma zamanında uygulanıyor ve aşımda iletim durduruluyor.",
    evidence: "Log örneği",
    authority: "BTK KEGY",
  },
  {
    id: "D1",
    group: "4 · Veri & KVKK",
    title: "Kişisel veri envanteri güncellendi",
    requirement:
      "Pilotta işlenen kişisel veri kalemleri, hukuki sebep, saklama süresi ve imha planı envantere işlendi.",
    evidence: "Envanter tablosu",
    authority: "KVKK",
  },
  {
    id: "D2",
    group: "4 · Veri & KVKK",
    title: "Aydınlatma ve açık rıza",
    requirement: "Katılımcılara aydınlatma metni sunuldu; gereken hallerde açık rıza kaydedildi.",
    evidence: "İmzalı/loglu rıza kayıtları",
    authority: "KVKK",
  },
  {
    id: "D3",
    group: "4 · Veri & KVKK",
    title: "İçerik saklanmadığı doğrulandı",
    requirement:
      "Tünel içeriğinin diske yazılmadığı, yalnızca SHA-256 özeti ve bayt sayacı tutulduğu teknik olarak gösterildi.",
    evidence: "Denetim çıktısı",
    authority: "KVKK · BTK",
  },
  {
    id: "S1",
    group: "5 · Güvenlik",
    title: "Düğüm kimlikleri ve anahtar yönetimi",
    requirement:
      "Her düğüm için Ed25519 kimliği üretildi, özel anahtarlar müşteri kontrolünde saklanıyor, katılımda PoW açık.",
    evidence: "Anahtar envanteri (parmak izleri)",
    authority: "Tedbirge",
  },
  {
    id: "S2",
    group: "5 · Güvenlik",
    title: "Şifreleme ve replay koruması testi",
    requirement: "AES-256-GCM chunk şifreleme ve nonce kayan pencere replay testi geçti.",
    evidence: "Test çıktısı",
    authority: "Tedbirge",
  },
  {
    id: "S3",
    group: "5 · Güvenlik",
    title: "Zafiyet bildirim kanalı duyuruldu",
    requirement: "Pilot ekibine güvenlik iletişim adresi ve bildirim süreci tebliğ edildi.",
    evidence: "Tebliğ e-postası",
    authority: "Tedbirge",
  },
  {
    id: "O1",
    group: "6 · Saha operasyonu",
    title: "Mesh, P2P ve exit demoları geçti",
    requirement:
      "`mesh-demo`, `p2p-demo` ve `exit-demo` sahada kayıpsız çalıştı; röle düşürme senaryosunda yol yeniden kuruldu.",
    evidence: "CLI çıktıları / ekran kaydı",
    authority: "Tedbirge",
  },
  {
    id: "O2",
    group: "6 · Saha operasyonu",
    title: "Off-grid mahsuplaşma doğrulandı",
    requirement:
      "İnternetsiz ortamda Ed25519 imzalı fişler üretildi, çift harcama reddedildi, bağlantı gelince mahsuplaşma tamamlandı.",
    evidence: "Fiş örnekleri + mahsup raporu",
    authority: "Tedbirge",
  },
  {
    id: "O3",
    group: "6 · Saha operasyonu",
    title: "Menzil ve link bütçesi ölçümü",
    requirement: "Her taşıyıcı için gerçek menzil, RSSI/SNR ve paket kaybı ölçüldü ve kaydedildi.",
    evidence: "Ölçüm tablosu",
    authority: "Tedbirge",
  },
  {
    id: "O4",
    group: "6 · Saha operasyonu",
    title: "Enerji ve süreklilik testi",
    requirement:
      "Düğümlerin batarya/solar ile kesintisiz çalışma süresi ölçüldü; afet senaryosu için asgari 72 saat hedefi değerlendirildi.",
    evidence: "Enerji log tablosu",
    authority: "AFAD senaryosu",
  },
  {
    id: "R1",
    group: "7 · Kayıt & raporlama",
    title: "Olay bildirim süreleri tebliğ edildi",
    requirement:
      "Kişisel veri ihlalinde 72 saat KVKK bildirimi ve hizmet kesintisi bildirim süreleri yazılı olarak paylaşıldı.",
    evidence: "Tebliğ belgesi",
    authority: "KVKK",
  },
  {
    id: "R2",
    group: "7 · Kayıt & raporlama",
    title: "Pilot raporu yayımlandı",
    requirement: "Ölçümler, sapmalar ve düzeltici aksiyonlar pilot raporunda toplandı.",
    evidence: "Pilot raporu PDF",
    authority: "Taraflar",
  },
  {
    id: "R3",
    group: "7 · Kayıt & raporlama",
    title: "5 yıllık arşiv dosyası oluşturuldu",
    requirement:
      "Kurulum dosyası, uygunluk beyanları, EM hesabı, son kullanıcı beyanı ve pilot raporu tek arşivde en az 5 yıl saklanacak şekilde kapatıldı.",
    evidence: "Arşiv dizin listesi + hash listesi",
    authority: "BTK · Ticaret Bak.",
  },
];
