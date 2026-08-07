# "Siz" (Profil) Bölümünün WhatsApp Ölçüsünde Kalıcı Onarımı

Gönderilen ekranlar (WhatsApp: Siz · Profil · QR kodu) ile bizim ekranımız yan yana konuldu. Bizdeki bölüm bozuk: kartlar üst üste biniyor, "Rehber" satırı yarım kalmış, aradaki beyaz şerit boş, menü maddelerinin çoğu görünmüyor.

## Kök neden (koddan doğrulandı)

`src/components/chat/MePanel.tsx` içindeki üç kart (`renderGroup`) dikey flex kabuğun doğrudan çocuğu ve `flex-shrink` serbest. Kabuk yüksekliği yetmeyince tarayıcı kartları eziyor: ilk kart 1 satıra iniyor, ikinci kartın üstüne biniyor, listenin geri kalanı görünmez oluyor. Ekran görüntüsündeki yarım "Rehber" satırı ve boş beyaz şerit tam olarak bu.

## Yapılacaklar

### 1. Ezilme ve kaydırma onarımı (asıl hata)
- Profil başlığı ve her kart `shrink-0` olur; kabuk gerçek kaydırma alanı olur.
- Alt sekme çubuğu + ev çubuğu payı korunur, son kart kesilmez, sayfa sonuna kadar akıcı kayar.
- Aynı düzeltme tablet ve masaüstünde de geçerlidir (orta sütun).

### 2. WhatsApp'taki "Siz" ekranının birebir karşılığı
- Üst çubuk: solda yuvarlak arama düğmesi, sağda karekod ve düzenleme (kalem) düğmeleri — bugünkü "…", rehber ve "+" karmaşası bu ekranda kalkar.
- Avatarın üstünde durum baloncuğu ("Müsait"), altında büyük ad + açılır ok (durum değiştirme).
- Kart grupları WhatsApp sırasıyla:
  - Abonelikler · Listeler · Toplu mesajlar · Yıldızlı · Bağlı cihazlar (sayaçlı)
  - Hesap · Gizlilik · Sohbetler (sayaçlı) · Bildirimler · Depolama ve veriler
  - Yardım · Arkadaşlarını davet et
- Her satır bugünkü mevcut diyaloğu açar; yeni iş mantığı eklenmez. Karşılığı olmayan satır (Toplu mesajlar, Listeler) mevcut rehber/klasör ekranlarına bağlanır.

### 3. Profil alt ekranı (gönderilen 2. görsel)
- Büyük avatar + "Düzenle".
- Satırlar: Ad · Hakkımda · Kullanıcı adı · Telefon numarası · Bağlantılar; sağda mevcut değer ve ok.
- Ad, hakkımda ve kullanıcı adı cihazdaki profilde saklanır; telefon numarası mevcut numara-çıpalı kimlikten okunur (değiştirilemez, salt gösterim).

### 4. QR kodu alt ekranı (gönderilen 1. görsel)
- Başlık "QR kodu", sağda paylaş düğmesi.
- Beyaz kart: avatar, ad, "Tedbirge kişisi", ortada karekod (mevcut davet/kimlik bağlantısı).
- Altta açıklama metni, yeşil "Tara" düğmesi ve "QR kodunu sıfırla".

### 5. Mobil · tablet · masaüstü aynı mantık
- Mobil (iOS/Android): alt sekme çubuğundan açılır, Profil ve QR tam ekran alt sayfa olarak gelir.
- Tablet/masaüstü: aynı içerik üç sütunlu düzenin orta sütununda; Profil ve QR ortalanmış 420px kart olarak açılır.
- Ekran sabit kalır: yatay kayma yok, `100dvh` kabuk ve güvenli alan payları korunur.

## Teknik notlar
- Değişecek dosyalar: `src/components/chat/MePanel.tsx` (yeniden düzenlenir), `src/components/chat/ChatApp.tsx` (Siz sekmesi başlığı ve yeni sayfa bağlantıları).
- Yeni dosyalar: `src/components/chat/ProfileSheet.tsx`, `src/components/chat/QrCodeSheet.tsx`.
- Ölçüler `src/styles.css` içindeki mevcut `--wa-*` tokenlarıyla verilir; sabit piksel serpiştirilmez.
- Sohbet, arama, kimlik ve senkronizasyon mantığına dokunulmaz — yalnızca sunum katmanı.
- Bitişte tip denetimi ve testler çalıştırılır, 390x844 ve 320x568 genişlikte kaydırma/taşma tarayıcıdan doğrulanır.
