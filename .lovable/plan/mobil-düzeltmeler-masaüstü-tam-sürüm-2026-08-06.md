# Mobil Düzeltmeler + Masaüstü Tam Sürüm

Mobil şablon aynen korunur. Bu turda üç mobil kusur kapatılır, ardından masaüstü için tam kapsamlı, markamıza özgü bir arayüz kurulur.

## A. Mobil düzeltmeler (şablon bozulmadan)

### 1. Sağ üstteki yeşil "+" işlevsiz
Şu an bu düğme yalnızca arka planda grup seçim kipini açıp kapatıyor; ekranda görünür bir şey olmuyor. Yerine bir alt sayfa (action sheet) açılacak:
- Yeni sohbet (rehberi açar)
- Yeni grup (grup seçim kipini görünür başlıkla başlatır: "Üye seçin · n seçildi" + Oluştur düğmesi)
- Kendine not
- Kimliğimi paylaş (QR / bağlantı)
Grup kipi açıkken üstte iptal edilebilir bir şerit görünür, böylece kullanıcı ne olduğunu görür.

### 2. "Siz" ekranının altı kesik
Alt sekme çubuğu içeriğin üstüne biniyor. Dört panelin de (Sohbetler, Aramalar, Topluluklar, Siz) alt boşluğu sekme çubuğu yüksekliği + ev çubuğu güvenli alanı kadar artırılır; sürüm damgası ve son kart tam görünür.

### 3. Çift isim ve aramada hedef sapması
Kök neden: aynı kişinin birden fazla cihaz kimliği var; liste satırında ve arama kaydında hedef, sıraya göre değişebilen `members[0]`/kayıtlı `peerId` üzerinden seçiliyor. Yapılacak:
- Her satır için tek bir "kilitli hedef" alanı: kişi kartı açılırken sabitlenen cihaz kimliği satırda saklanır, arama ve sohbet daima onu kullanır.
- Arama düğmesi, listede görünen adı ve hedefi birlikte taşır; ad ile hedef uyuşmazsa arama başlatılmaz, kişi kartı açılır.
- Arama geçmişindeki kayıtlar da kanonik kişi anahtarına göre tekilleştirilir; aynı kişi iki farklı adla iki satır olarak görünmez.
- Liste ve rehberde ad çözümü tek kanaldan (kanonik anahtar) yapılır, ikinci bir ad kaynağı kalmaz.

## B. Masaüstü sürümü (yeni, tam kapsam)

Referans görsellerdeki yerleşim mantığı alınır, semboller ve renkler tamamen Tedbirge kimliğiyle yeniden çizilir.

### Yerleşim
```text
┌──┬───────────────┬──────────────────────────────┐
│  │  Liste sütunu │   Sohbet / detay sütunu      │
│R │  arama + çip  │   başlık · mesajlar · yazma  │
│a │  sohbet satır │                              │
│y │               │              (sağ bilgi      │
│  │               │               paneli açılır) │
└──┴───────────────┴──────────────────────────────┘
```
- **Sol dikey ray (72px):** Sohbetler, Durumlar, Kanallar, Topluluklar, Aramalar; altta Ayarlar ve profil avatarı. Aktif sekme Tedbirge yeşili göstergeyle.
- **Liste sütunu (380px, yeniden boyutlandırılabilir 320–480px):** başlık, "AI'ye Sor veya Ara" çubuğu, filtre çipleri (Tümü · Okunmamış · Favoriler · Gruplar), Arşivlenmiş satırı, 72px satırlar.
- **Sohbet sütunu:** sabit başlık (avatar, ad, çevrimiçi/son görülme, ara/görüntülü/ara-içinde-ara/menü), kaydırılan mesaj alanı, sabit yazma çubuğu (ek, emoji, ses, gönder).
- **Sağ bilgi paneli:** kişi/grup bilgisi, medya-bağlantı-belgeler, sessize al, şifreleme rozeti, temizle/engelle.

### Masaüstüne özel eklenecek ekranlar
- **Durumlar:** kendi durumunu ekle + "En yeni" listesi, tam ekran görüntüleyici.
- **Kanallar:** keşfet listesi, takip et, kanal oluştur.
- **Topluluklar:** boş durum illüstrasyonu + topluluk oluştur akışı, mevcut grup mantığına bağlı.
- **Aramalar:** çağrı geçmişi, yeni arama, çoklu katılımcı (konferans) başlatma.
- **Ayarlar:** Profil, Hesap, Gizlilik, Sohbetler, Bildirimler, Bağlı cihazlar, Yedekleme, Hakkında — hepsi mevcut diyaloglara bağlanır.
- **Klavye kısayolları:** Ctrl/Cmd+K arama, Ctrl+N yeni sohbet, Esc kapat, ok tuşlarıyla listede gezinme.

### Sabitlik ve akıcılık
- Uygulama kabuğu `100dvh` içinde kilitli; yalnızca liste ve mesaj alanı kaydırılır, sayfa gövdesi asla kaymaz, yatay kayma yok.
- Sütun genişlikleri CSS değişkeni; sürükleyerek boyutlandırma değeri saklanır, yeniden akış titremesi olmaz.
- Mesaj listesi sanallaştırma eşiğiyle çalışır; sabit yükseklikli satırlar ve `content-visibility` ile uzun sohbetlerde bile kayma pürüzsüz.
- Yeni mesajda düzen sıçraması olmaması için alt-yapışkan kaydırma ve ölçülü giriş animasyonları.

## Kalite kapanışı
- Tip denetimi 0 hata, tüm testler yeşil.
- 390x844 (mobil), 1280x800 ve 1920x1080 (masaüstü) genişliklerinde yatay kayma ve kırpma olmadığı tarayıcı üzerinden doğrulanır.
- Sürüm damgası güncellenir ve yayına alınır.

## Teknik notlar
- Mobil şablon dosyaları (`MobileTabBar`, `CallsPanel`, `CommunitiesPanel`, `MePanel`) değişmez; yalnızca alt boşluk ve "+" menüsü eklenir.
- Masaüstü kabuğu ayrı bileşenlere çıkarılır (`DesktopShell`, `DesktopRail`, `ChatList`, `ChatPane`, `InfoPanel`, `StatusPanel`, `ChannelsPanel`) — `ChatApp.tsx` daha fazla şişmez.
- Ölçüler `src/styles.css` içindeki `.wa` bloğuna token olarak eklenir (`--wa-rail-w`, `--wa-list-w`, `--wa-header-h`); sabit değer serpiştirilmez.
- İş mantığı (kimlik, çağrı motoru, senkronizasyon, rehber) yalnızca hedef kilidi maddesinde dokunulur; geri kalanı sunum katmanıdır.
