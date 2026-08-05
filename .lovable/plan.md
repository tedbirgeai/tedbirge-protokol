# Sıradaki adım: hayalet satırı bitir + rehberi gerçekten getir

Ekran görüntüsündeki durum ile koddaki durum ayrışıyor. Kodda sohbet listesi filtresi doğru: `ChatApp.tsx` içindeki liste, adı çözülemeyen kaydı üç ayrı kapıda eliyor (`isNamed`, `safeTitleOf(c) === UNKNOWN_TITLE`, `isSelfPerson`) ve açılışta `self-heal` hayalet sohbet/arama kayıtlarını buduyor. Buna rağmen tarayıcıda "Tedbirge kullanıcısı" satırı görünüyor — yani bu ekran **eski önbelleğe alınmış sürümü** çalıştırıyor. Bu tanı, düzeltmenin ilk maddesini belirliyor.

## 1) Sürüm kilidi — kullanıcı hiçbir şey yapmadan yeni sürüme geçsin

- Servis çalışanı yeni sürüm bulduğunda beklemeden devralır (`skipWaiting` + `clients.claim`), sayfa bir kez kendiliğinden tazelenir.
- Uygulama açılışında sürüm damgası karşılaştırılır; damga değiştiyse eski önbellekler silinir ve otonom onarım (`self-heal`) bir kez zorla çalışır.
- Ekranın alt köşesinde tek satırlık "Yeni sürüm yüklendi" bilgisi görünür ve kaybolur; onay istenmez.

Sonuç: telefonda/masaüstünde elle "tam yenileme" yapma zorunluluğu kalkar, hayalet satır tek açılışta gider.

## 2) Hayalet kaydı kaynağında kes

- Adı çözülemeyen bir eşe yapılan arama artık **sohbet kaydı oluşturmaz**; yalnızca arama geçmişine yazılır.
- Budama açılışta bir kez değil, arama bittiğinde ve rehber tazelendiğinde de çalışır — ad sonradan öğrenilirse kayıt gerçek adıyla geri gelir.

## 3) Rehber gerçekten gelsin — üç kanal, tek düğme

Tarayıcı hiçbir platformda tüm rehberi okuyamaz; bu bir Tedbirge eksiği değil, tarayıcı güvenlik sınırı. Bu yüzden "Rehberi getir" düğmesi bulunduğunuz ortama göre en güçlü kanalı kendisi seçer ve sonuç tek satır Türkçe bildirimle döner:

```text
Tedbirge mobil uygulaması → sistem rehber izni → TÜM rehber, otomatik, yarım saatte bir tazelenir
Android tarayıcı          → kişi seçici        → seçilenler, sonra otomatik tazelenir
iPhone / masaüstü         → rehber dosyası     → bir kez yüklenir, sonra otomatik tazelenir
```

Bu turda yapılacak somut iyileştirmeler:
- **Masaüstü/iPhone akışı sürtünmesiz olur:** düğmeye basınca doğrudan dosya seçici açılır, `.vcf` ve `.csv` (Google Kişiler dışa aktarımı, iCloud vCard) formatlarının ikisi de okunur; hatalı dosyada ne yapılacağı tek cümleyle yazar.
- **Nasıl dışa aktarılır rehberi** aynı pencerede üç adımda gösterilir (iPhone: Kişiler > paylaş; Google: contacts.google.com > dışa aktar).
- **Yükleme sonrası özet:** "X kişi okundu · Y kişi Tedbirge'de bulundu" ve bulunanlar anında rehber listesine düşer.
- Yüklenen rehber cihazda şifreli kalır; yarım saatte bir sessiz yeniden eşleştirme zaten çalışıyor, dokunulmaz.

## 4) Tam otomatik rehber için mobil kabuk

Tam otomatik senkron yalnızca yerel uygulama kabuğuyla mümkün. Kod tarafı hazır (`native-contacts.ts`, Capacitor yapılandırması). Bu turda `MOBILE.md` tek oturumda takip edilebilir bir kurulum akışına indirgenir (derleme, izin metinleri, cihaza yükleme) — sizin tarafınızda yalnızca Xcode/Android Studio adımı kalır.

## Doğrulama

- Tarayıcıda `/chat` açılır: "Tedbirge kullanıcısı" satırı yok, kendi kaydım yok, aynı kişi tek satır — ekran görüntüsüyle gösterilir.
- Örnek bir `.vcf` ve bir Google `.csv` yüklenir; iki kez üst üste yüklendiğinde kopya kişi oluşmaz.
- Tip denetimi 0 hata, tüm testler geçer; ardından canlıya alınır.

## Teknik notlar

Dokunulacak dosyalar: `src/lib/pwa.ts` ve `public/push-sw.js` (sürüm devralma), `src/lib/chat/self-heal.ts` (zorla onarım), `src/lib/chat/call-log.ts` + `src/lib/chat/engine.ts` (adsız eşte sohbet açmama), `src/lib/chat/directory.ts` (vCard/CSV çözümleyici), `src/components/chat/ContactsDialog.tsx` (tek düğme + dışa aktarma rehberi), `MOBILE.md`. Veritabanı değişikliği yok; ham numara cihazdan çıkmaz.
