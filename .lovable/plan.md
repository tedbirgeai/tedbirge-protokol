# Kalan iş: tekil kişi kartı + konferans tamamlama

Teslimat hattı (röle kotası, kuyruk, 429) önceki turda kapandı ve kanıtlandı. Planın kalan iki maddesi burada tek turda bitirilir.

## 1) Rehberde tek kişi — numara çıpası öncelikli

Bugün birleştirme önce **ada** bakıyor: `collapsePersons` grup anahtarını `name:<normalize ad>` olarak kuruyor, kişi kimliği yalnız ad boşsa devreye giriyor. Bu iki yanlış üretir: aynı adı taşıyan iki gerçek kişi tek karta düşer, adı farklı yazılmış aynı numara ise ayrı kalır.

Yapılacak:
- Grup anahtarı sırası ters çevrilir: **kişi kimliği (numara çıpası) → ad → düğüm kimliği**. Aynı `personId`'ye sahip cihazlar adları farklı olsa da tek kartta toplanır.
- Ad benzerliği yalnız kişi kimliği **iki tarafta da yokken** birleştirme sebebi olur; kimliği bilinen iki farklı kişi aynı adı taşısa bile ayrı kalır ve mevcut "aynı ad" uyarı rozeti gösterilir.
- Birleşen kartta en güncel cihazın adı, doğrulama rozetinin en yükseği ve tüm bağlı cihazların listesi tutulur.
- Tek seferlik geçmiş temizliği: açılışta çalışan `mergePersonDuplicates` aynı sıraya göre yeniden yazılır; hâlâ ikiye bölünmüş eski kayıtlar kişi kimliğine çıpalanır, adsız/mesajsız hayaletler budanır. İşlem bir kez çalışır ve işaretlenir.

## 2) Sesli-görüntülü konferans — eksik parçalar

Çoklu katılımcı sinyalleşmesi ve görüntü ızgarası çalışıyor; şu üçü eksik:
- **Oda kimliği:** her konferansa tek bir oda kimliği verilir, tüm davetler ve yeniden bağlanmalar bu kimliği taşır; iki taraf aynı anda arama başlatınca çift oda oluşmaz.
- **Görüşme sırasında kişi ekleme:** arama ekranına "Kişi ekle" düğmesi; seçilen kişiye mevcut oda kimliği ve katılımcı listesiyle davet gider, diğer katılımcılar yeni kişiyi kendiliğinden bağlar (en fazla 6 kişi).
- **Düşen katılımcının geri gelmesi:** bağlantısı kopan katılımcı için oda kimliğiyle sınırlı sayıda otomatik yeniden bağlanma denemesi; başarısızsa ızgaradan düşer ve arayüzde tek satır Türkçe bilgi görünür.

## Doğrulama

- Kişi kartı: aynı numaraya bağlı iki cihaz tek kart; aynı adı taşıyan iki farklı kişi iki kart + uyarı rozeti.
- Konferans: üç tarayıcı profiliyle görüntülü konferans kurulur, dördüncü kişi görüşme sırasında eklenir, biri kapatılıp geri açıldığında ızgaraya döner — ekran görüntüleriyle.
- Tip denetimi 0 hata, tüm testler geçer.

## Teknik notlar

- `src/lib/chat/contacts.ts` (`collapsePersons`), `src/lib/chat/merge.ts` (`mergePersonDuplicates`), `src/lib/chat/name-resolver.ts` (anahtar üretimi).
- `src/lib/call/engine.ts` (oda kimliği, davet yayılımı, katılımcı yeniden bağlanma), `src/components/chat/CallOverlay.tsx` (kişi ekle düğmesi, katılımcı durumu).
- Veritabanı değişikliği yok; tüm rehber verisi cihazda kalır.
