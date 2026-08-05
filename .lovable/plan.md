# Kontrol sonucu: bir uyumsuzluk kaldı

Tip denetimi 0 hata, tüm testler geçiyor. Ancak kod okumasında kişi birleştirmede tek bir tutarsızlık tespit edildi.

## Bulgu

Rehber listesi (`collapsePersons`) ve otonom onarım (`mergePersonDuplicates`) artık iki geçişli çalışıyor: önce numara özeti/kişi kimliği, sonra normalize edilmiş ad. Yani rehberde aynı kişi tek satıra iniyor.

Sohbet listesindeki birleştirme ise (ChatApp) hâlâ **tek geçişli**: anahtar sırası numara özeti → kişi kimliği → ad. Aynı kişinin bir cihazında numara özeti varsa, diğerinde yoksa iki farklı anahtar üretilir ve **ikinci geçiş olmadığı için ad üzerinden birleşme hiç denenmez**. Ekran görüntüsündeki "mehmet dinç" / "MEHMET" gibi çift satırların kalan sebebi budur.

## Yapılacak

- Tek bir kanonik anahtar/birleştirme yardımcı fonksiyonu oluşturulur ve üç yer de (rehber, onarım, sohbet listesi) aynı fonksiyonu kullanır.
- Sohbet listesine rehberdekiyle aynı ikinci geçiş eklenir: iki küme farklı numara özeti taşımıyorsa ve normalize adları aynıysa tek satırda birleşir; farklı numaraya çıpalı iki kişi aynı adı taşısa bile ayrı kalır.
- Birleşen satırda en son hareket gören sohbet ve tüm cihaz kimlikleri korunur (arama doğru cihaza gitsin).

## Doğrulama

- Aynı kişinin numara özetli + özetsiz iki cihazı → sohbet listesinde tek satır.
- Farklı numaralı iki kişi aynı adla → iki satır.
- Tip denetimi 0 hata, testler geçer; ardından yayına alınır.

## Teknik not

`src/components/chat/ChatApp.tsx` (satır ~868-885 birleştirme bloğu), `src/lib/chat/contacts.ts` (`collapsePersons`), `src/lib/chat/merge.ts` (`mergePersonDuplicates`), ortak anahtar `src/lib/chat/name-resolver.ts` içine taşınır. Veritabanı değişikliği yok.
