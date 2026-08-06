# Tedbirge — Yerel (Native) iOS / Android Uygulaması

Tarayıcı sürümü telefon rehberine erişemez (tarayıcı güvenlik kısıtı).
Yerel uygulama kabuğu kurulduğunda rehber senkronizasyonu WhatsApp ile
birebir aynı çalışır: sistem izni bir kez verilir, sonrasında tüm kişiler
arka planda kendiliğinden eşleşir.

## Tek komutla kurulum (anahtar teslim)

```bash
git clone <repo> && cd <repo>
npm install
npm run mobile:setup
```

`mobile:setup` sırasıyla şunları kendiliğinden yapar:

1. Web sürümünü derler (`dist/client`)
2. `ios/` ve `android/` platform klasörlerini ekler (yoksa)
3. Rehber, kamera, mikrofon, bildirim ve konum izin metinlerini
   `Info.plist` ve `AndroidManifest.xml` içine yazar (elle düzenleme yok)
4. İkon ve açılış ekranını üretir
5. `npx cap sync` ile web katmanını cihaz projesine kopyalar

Komut tekrar tekrar çalıştırılabilir; var olan ayarları bozmaz.
macOS/Xcode yoksa iOS adımı atlanır, Android kurulmaya devam eder.

## Derleme ve mağazaya gönderme

```bash
npm run mobile:android   # Android Studio > Build > Generate Signed Bundle (.aab)
npm run mobile:ios       # Xcode > Archive > App Store Connect
```

Web tarafında bir değişiklik yaptığınızda: `npm run mobile:sync`.

## Geliştirme modu (canlı siteye bağlanmak)

```bash
CAP_LIVE_URL=https://tedbirge-gateway.lovable.app npx cap sync
```

Bu değişken tanımlı değilse uygulama mağaza modundadır: tüm dosyalar
cihazın içindedir, internet olmadan da açılır.

## Rehber otomatiği

Yerel uygulamada ilk açılışta sistem rehber izni istenir. İzin
verildikten sonra tüm kişiler arka planda okunur, yarım saatte bir
sessizce tazelenir ve telefona sonradan eklenen kişiler kullanıcı
hiçbir şey yapmadan listeye düşer — WhatsApp ile birebir aynı davranış.


## Mağaza sürümü notu

Varsayılan yapılandırma zaten mağaza sürümüdür: `CAP_LIVE_URL` tanımlı
değilse uygulama canlı siteye bağlanmaz, `dist/client` içindeki
dosyalarla tamamen çevrimdışı açılır. Elle silinecek bir blok yoktur.


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
| iPhone Safari ve masaüstü | Rehber dosyası (.vcf veya CSV) | Bir kez yüklenir, sonra otomatik yeniden eşleştirilir |

Rehber dosyası nasıl dışa aktarılır:

- **iPhone:** Kişiler > Listeler > Tümünü seç > Paylaş > dosyayı kaydet (`.vcf`).
- **Google Kişiler:** contacts.google.com > Dışa aktar > **CSV**.
- **Outlook:** Kişiler > Yönet > Kişileri dışa aktar (`CSV`).

Dosya uygulamada **Rehber > Rehber dosyası yükle** ile seçilir; hem vCard hem
CSV okunur, kişiler cihazda saklanır ve aynı dosya iki kez yüklense bile kopya
kişi oluşmaz.

Her üç kanalda da ham numara ve ad cihazdan çıkmaz; sunucuya yalnızca geri
döndürülemez SHA-256 özeti gider (KVKK). Tam otomatik rehber yalnızca yerel
uygulama kabuğuyla mümkündür — `npx cap sync` ile kabuğu derleyip cihaza
yükledikten sonra ilk açılışta rehber izni istenir.

