# Tedbirge — Yerel (Native) iOS / Android Uygulaması

Tarayıcı sürümü telefon rehberine erişemez (tarayıcı güvenlik kısıtı).
Yerel uygulama kabuğu kurulduğunda rehber senkronizasyonu WhatsApp ile
birebir aynı çalışır: sistem izni bir kez verilir, sonrasında tüm kişiler
arka planda kendiliğinden eşleşir.

## Kurulum (bir kez, kendi bilgisayarınızda)

```bash
git clone <repo> && cd <repo>
npm install
npm run build

npx cap add ios       # macOS + Xcode gerekir
npx cap add android   # Android Studio gerekir
npx cap sync
```

## İzin metinleri

### iOS — `ios/App/App/Info.plist`
```xml
<key>NSContactsUsageDescription</key>
<string>Tanıdıklarınızı Tedbirge ağında bulmak için rehberiniz yalnızca bu cihazda okunur. Numaralarınız cihazdan çıkmaz.</string>
<key>NSCameraUsageDescription</key>
<string>Görüntülü görüşme için kamera erişimi gerekir.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Sesli görüşme için mikrofon erişimi gerekir.</string>
```

### Android — `android/app/src/main/AndroidManifest.xml`
```xml
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## Çalıştırma

```bash
npx cap open ios       # Xcode'da çalıştır / App Store'a gönder
npx cap open android   # Android Studio'da çalıştır / Play'e gönder
```

## Mağaza sürümü notu

`capacitor.config.ts` içindeki `server.url` alanı geliştirme kolaylığı
içindir; uygulama canlı siteyi yükler. Mağaza sürümünde bu bloğu
kaldırın — uygulama `dist/client` içindeki dosyalarla tamamen
çevrimdışı açılır.

## KVKK

Rehber verisi cihazdan çıkmaz. Eşleştirme yalnızca geri döndürülemez
SHA-256 özetleriyle yapılır; eşleşmeyen numaralar sunucuda iz bırakmaz.

## İkon, açılış ekranı ve sürüm numarası

Kaynak görseller depoda hazırdır:

- İkon: `public/icon-512.png` (1024×1024 sürümünü `resources/icon.png` olarak kopyalayın)
- Açılış ekranı: `resources/splash.png` (2732×2732, arka plan `#0b141a`)

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#0b141a" --splashBackgroundColor "#0b141a"
```

Sürüm numarası tek kaynaktan yönetilir: `package.json` içindeki `version`
(şu an `1.0.0`).

- iOS: Xcode > App > General > Version = `1.0.0`, Build = artan tamsayı.
- Android: `android/app/build.gradle` içinde `versionName "1.0.0"`,
  `versionCode` artan tamsayı.

## Push bildirimi (APNs / FCM)

Kod tarafı hazırdır: `src/lib/chat/native-push.ts` izni ister, cihaz
jetonunu alır ve saklar. Yalnızca sertifika adımları sizde:

1. **iOS** — Apple Developer > Keys > yeni **APNs Auth Key (.p8)** üretin.
   Xcode'da `Signing & Capabilities` altına **Push Notifications** ve
   **Background Modes > Remote notifications** ekleyin.
2. **Android** — Firebase konsolunda proje açıp `google-services.json`
   dosyasını `android/app/` altına koyun.
3. `npx cap sync` çalıştırın.

Sunucu tarafı yalnızca "uyandırma" sinyali gönderir; mesaj içeriği ve
rehber cihazdan çıkmaz.

## Derleme kontrol listesi

```bash
npm run build
npx cap sync
npx cap open ios      # Archive > App Store Connect
npx cap open android  # Build > Generate Signed Bundle (.aab)
```

Mağaza sürümünde `capacitor.config.ts` içindeki `server.url` bloğunu
kaldırmayı unutmayın.

## Push jetonunun sunucuya kaydı (hazır)

Uygulama izin verildiği anda cihaz jetonunu `/api/public/push`
adresine `native-subscribe` isteğiyle gönderir ve jeton
`native_push_tokens` tablosunda saklanır. Sunucu, web push ile **aynı
gönderim hattından** (`notifyNode`) hem tarayıcı hem mobil cihazları
uyandırır. Bildirim yükü asla mesaj içeriği taşımaz.

Yalnızca sizin yapmanız gereken adım:

1. Firebase konsolunda projeyi açın, **Cloud Messaging** sunucu
   anahtarını kopyalayın.
2. Bu anahtarı arka uç gizli değeri olarak `FCM_SERVER_KEY` adıyla
   ekleyin. Anahtar tanımlanmadıkça mobil push sessizce devre dışı
   kalır; tarayıcı bildirimleri çalışmaya devam eder.
3. iOS için APNs anahtarını (.p8) Firebase > Project Settings > Cloud
   Messaging > **APNs Authentication Key** alanına yükleyin. Böylece
   iOS cihazlar da aynı FCM hattından uyandırılır.

### iOS sessiz push (uygulama kapalıyken uyandırma)

Sunucu her bildirimde `content_available: true` gönderir; bu, iOS'ta
uygulamayı arka planda kısa süre uyandırıp bekleyen şifreli zarfların
çekilmesini sağlar. Xcode'da şunlar açık olmalıdır:

- `Signing & Capabilities > Push Notifications`
- `Signing & Capabilities > Background Modes > Remote notifications`

### Arka plan eşitleme (web)

Servis çalışanı `tedbirge-outbox` etiketiyle Background Sync dinler:
ağ geri geldiğinde bekleyen mesajlar kendiliğinden gönderilir.
iOS Safari bu API'yi desteklemez; orada kuyruk 15 saniyelik
zamanlayıcı ve üstel geri çekilme ile işlenir.

## Rehber senkronizasyonu (kanal tablosu)

| Ortam | Rehber erişimi | Davranış |
| --- | --- | --- |
| Tedbirge mobil uygulaması (iOS/Android) | Sistem rehber izni | Tüm rehber otomatik okunur, yarım saatte bir sessizce tazelenir |
| Android tarayıcı / PWA | Kişi seçici (Contact Picker) | Seçilen kişiler okunur, sonra otomatik yeniden eşleştirilir |
| iPhone Safari ve masaüstü | Rehber dosyası (.vcf) | Bir kez yüklenir, sonra otomatik yeniden eşleştirilir |

Her üç kanalda da ham numara ve ad cihazdan çıkmaz; sunucuya yalnızca geri
döndürülemez SHA-256 özeti gider (KVKK). Tam otomatik rehber yalnızca yerel
uygulama kabuğuyla mümkündür — `npx cap sync` ile kabuğu derleyip cihaza
yükledikten sonra ilk açılışta rehber izni istenir.
