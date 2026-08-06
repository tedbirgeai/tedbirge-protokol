# Hayalet satırın kalıcı kapanışı ve uçtan uca temizlik

## Doğrulanan bulgular

- Yayındaki paket güncel: `tedbirge-gateway.lovable.app` üzerinden indirilen `engine-*.js` içinde yeni `sweepGhosts` kodu mevcut. Yani sunucu tarafı eski değil.
- Sohbet listesi filtresi (`ChatApp.tsx:887-889`) adsız kaydı iki kez eliyor: `isNamed(c)` ve `safeTitleOf(c) === "Tedbirge kullanıcısı"`. İkinci kontrol **birebir metin karşılaştırması**; başlıkta farklı büyük/küçük harf, fazladan boşluk veya farklı bir nötr etiket ("Bilinmeyen kişi", "Anonim") olduğunda satır listeye sızabilir.
- `pruneGhostConversations` (`merge.ts:255`) gerçek mesajı olan sohbeti hiç incelemeden atlıyor. Adsız bir eşten tek bir mesaj gelmiş olması, satırın veri tabanında kalıcı olması için yeterli.
- Ekran görüntüsündeki satırda önizleme metni yok; bu kaydın kaynağı büyük olasılıkla mesajsız/sistem kayıtlı bir sohbet ya da tarayıcıda kalan eski önbellek. Kesin kaynak, düzeltmeden önce cihaz verisiyle doğrulanacak.

## Yapılacaklar (tek turda)

1. **Filtreyi metin karşılaştırmasından kurtarma**: liste filtresi `safeTitleOf(c) === UNKNOWN_TITLE` yerine `isTechnicalLabel(safeTitleOf(c))` kullanacak. Böylece tüm nötr etiketler (büyük/küçük harf, boşluk, "Bilinmeyen kişi", "Anonim") tek kuralla elenir. Aynı kural son sohbetler, İlet penceresi, arama ekranı ve bildirim başlıklarında da geçerli olacak (hepsi `safe-title.ts` üzerinden).
2. **Nötr etiketin ad olarak saklanmasını engelleme**: `name-resolver` içindeki yazma yolları (`setNickname`, `writeClaimedName`) nötr/teknik etiketi ad olarak kaydetmeyecek; mevcut yerel kayıtlardaki bu tür adlar tek seferlik temizlikte silinecek.
3. **Budamayı gerçek mesaj durumundan bağımsız hale getirme**: adı çözülemeyen eşe ait sohbet, yalnızca sistem/arama kaydı içeriyorsa silinecek; gerçek mesajı varsa **silinmeyecek ama listede gösterilmeyecek** ve ad öğrenilir öğrenilmez kendiliğinden görünür olacak (veri kaybı sıfır).
4. **Sürüm kilidini sertleştirme**: `APP_DATA_VERSION` yükseltilecek; sürüm değiştiğinde önbellek temizliğine ek olarak eski servis çalışanı kaydı bir kez tazelenip sayfa yenilenecek, böylece telefonda eski paket kalmayacak.
5. **Regresyon testleri**: (a) nötr etiketli sohbet listeye giremez, (b) adsız eşten gelen eşitleme paketi satır üretmez, (c) ad sonradan gelince satır görünür olur. `tsgo --noEmit` 0 hata + tüm testler yeşil.
6. **Yayın**: doğrulama sonrası yeni sürümle yayınlanacak; telefonda tek bir açılışta eski kalıntı temizlenecek.

## Teknik notlar

- Dokunulacak dosyalar: `src/lib/chat/safe-title.ts`, `src/lib/chat/display-name.ts`, `src/lib/chat/name-resolver.ts`, `src/lib/chat/merge.ts`, `src/lib/chat/version-lock.ts`, `src/components/chat/ChatApp.tsx` ve ilgili testler.
- Mesajlar, rehber, kimlik ve kasa yedekleri hiçbir adımda silinmez; yalnızca görünürlük kuralları ve önbellek etkilenir.
- Mevcut `sweepGhosts` akışı korunur; sadece kuralları genişletilir.
