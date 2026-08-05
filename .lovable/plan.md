# Tedbirge — Teslimat Hattının Kalıcı Onarımı

Uygulamanın "hiçbir şey gitmiyor" hâlinin kanıtlanmış tek bir ana nedeni var; onu kapatmadan diğer şikâyetleri (mükerrer kişi, konferans) doğru değerlendirmek mümkün değil. Bu plan önce kök nedeni kapatır, sonra görünür kusurları sırayla temizler.

## Doğrulanan kök neden

Canlı ağ kayıtlarında `/api/public/relay` isteklerinin tamamı **429 (rate_limited)** dönüyor. Nedeni:

- Sunucu tarafı sınır **IP başına dakikada 60 istek** (`src/lib/api-rate-limit.server.ts`). Aynı ev/ofis ağındaki tüm cihazlar, hatta aynı cihazın sekmeleri, tek kotayı paylaşıyor.
- İstemci bu kotayı saniyeler içinde tüketiyor: `browser-node.ts` içinde kuyruk 12 saniyede bir tamamen yeniden deneniyor ve **her paket için** `resolveDevices()` çağrılıyor. Her gönderim denemesi 2 ayrı yol (gerçek zamanlı + röle) üzerinden ayrı `lookup` isteği üretiyor, önbellek yok.
- 429 yanıtı istemcide "başarısız" sayılıp geri çekilme (backoff) uygulanmadan tekrar deneniyor — kendi kendini besleyen bir döngü.

Sonuç: mesaj, arama daveti, rehber eşitlemesi hiçbiri karşıya ulaşmıyor. Bu düzeltilmeden yapılan her test yanıltıcı.

## Yapılacak işler

### 1. Röle trafiğini kotanın altına indir (öncelik)
- `resolveDevices` sonuçları için cihaz-içi önbellek (TTL ~5 dk, başarısızlıkta kısa TTL); aynı hedef için saniyede tekrar tekrar `lookup` atılmaz.
- Kuyruk boşaltmada hedef başına tek çözümleme, paketler tek `push` isteğinde toplu gönderilir.
- 429 yanıtında istemci genelinde geri çekilme: `Retry-After` süresince tüm röle çağrıları duraklar, üstel artışla tekrar denenir; kullanıcıya "Bağlantı yoğun, birazdan yeniden denenecek" tek cümlelik Türkçe uyarı ve eşitleme günlüğü kaydı.
- Kuyruk yeniden deneme aralığı sabit 12 sn yerine üstel (12 sn → 2 dk) ve yalnız gerçekten bekleyen paket varsa çalışır.

### 2. Sunucu sınırını doğru ölçeğe taşı
- `relay` kapsamı için sınır IP yerine **düğüm kimliği** başına uygulanır; IP başına yalnız kötüye kullanımı durduracak yüksek bir tavan kalır.
- `lookup` gibi salt-okunur eylemler için ayrı ve daha geniş kota; `push`/`pull` için ayrı kota.
- 429 yanıtına `Retry-After` başlığı eklenir (istemcinin geri çekilmesi buna dayanır).

### 3. İki yönlü teslimin kanıtlanması
- Playwright ile iki ayrı profil: A→B ve B→A metin mesajı, fotoğraf, sesli ve görüntülü arama daveti.
- Her senaryoda hangi kanaldan (mesh / gerçek zamanlı / röle) teslim edildiği eşitleme günlüğünden okunur ve rapora yazılır.
- 429 sayısının sıfır olduğu ağ kaydıyla doğrulanır.

### 4. Mükerrer kişi kaydının kalıcı çözümü
- Rehber birleştirmesi şu an ada göre çalışıyor; aynı kişinin farklı cihazları farklı `personId` ile kaldığında ayrı kart oluşuyor.
- Birleştirme anahtarı numara-çıpalı `personId` önceliğine alınır; ad yalnız ikincil ipucu olur.
- Açılışta tek seferlik göç: mevcut mükerrer kayıtlar tek karta indirilir, eski kayıtlar silinmez, bağlı cihaz olarak eklenir.
- Testte 5 kişi / 3 cihaz senaryosu ile tek kart doğrulanır.

### 5. Konferans (sesli/görüntülü) tamamlanması
- Çekirdek `startConference` var; eksik olan arayüz ve oda yönetimi: ortak oda kimliği, davetle geç katılım, katılımcı ızgarası, mikrofon/kamera durumu, katılımcı çıkarma, düşen katılımcının otomatik yeniden bağlanması.
- Üç profil ile senaryo: üç kişilik konferans, biri geç katılıyor, biri düşüp geri dönüyor.

### 6. Teslim ölçütü
`tsgo --noEmit` 0 hata, tüm testler yeşil, her madde için ekran görüntülü veya günlük çıktılı kanıt. Kanıtsız madde teslim sayılmaz.

## Teknik notlar

Dokunulacak dosyalar: `src/lib/browser-node.ts`, `src/lib/relay-cloud.ts`, `src/routes/api/public/relay.ts`, `src/lib/api-rate-limit.server.ts`, `src/lib/chat/contacts.ts`, `src/lib/chat/merge.ts`, `src/lib/call/engine.ts` ve konferans arayüz bileşeni. Şifreleme katmanına dokunulmaz; röle yalnız opak zarf taşımaya devam eder.

## Sıra önerisi

1 ve 2 birlikte tek turda (teslimat hattı), ardından 3 ile kanıt. 4 ve 5 ikinci turda — çünkü 1-2 düzelmeden bunların testi anlamsız.
