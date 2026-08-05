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
