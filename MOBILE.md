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
