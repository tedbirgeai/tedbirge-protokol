# Kişi listesi kapanışı + GSM rehber senkronizasyonu

İki konu var: (1) ekrandaki kalan kusurların kalıcı kapatılması, (2) telefon rehberinin WhatsApp/Telegram gibi kendiliğinden gelmesi. İkisi tek turda, mevcut çalışan davranış bozulmadan yapılır.

## 1. Kalan kusur: "Tedbirge kullanıcısı" satırı

Doğrulanan durum: sohbet listesi filtresi (`ChatApp`) adsız kaydı zaten eleyor — hem sol liste hem "Son sohbetler" aynı `conversations` dizisini kullanıyor, ikisi de `safeTitleOf(c) === "Tedbirge kullanıcısı"` olan satırı atıyor. Yani kod yolu doğru; ekran görüntüsündeki satırın kaynağı **cihazda kayıtlı eski veri + tarayıcı önbelleği**, çünkü filtre yalnızca gizliyor, kaydı silmiyor ve arama geçmişi (`call-log`) bu sohbeti her açılışta yeniden canlandırıyor.

Yapılacak:
- Adsız/teknik kimlikli sohbet ve arama kayıtları açılışta **temizlenir** (otonom onarım `self-heal` içinde): kişi adı çözülemeyen ve hiç mesajı olmayan kayıt budanır, adı sonradan öğrenilirse kayıt geri gelir.
- `callTouched` yolu adsız kişi için sohbet satırı üretmez; arama geçmişi sekmesinde kalır ama listede hayalet satır açmaz.
- Kendi cihazlarım filtresi arama geçmişine de uygulanır (aynı `isSelfPerson` kanalı).
- Yayın sonrası eski sürümün ekranda kalmaması için servis çalışanı güncellemesi zorlanır (kullanıcı elle "tam yenileme" yapmak zorunda kalmaz).

## 2. GSM rehberi nasıl gelecek (WhatsApp/Telegram modeli)

Gerçek sınır: tarayıcı (web/PWA) hiçbir platformda tüm telefon rehberini okuyamaz. Android Chrome'da yalnızca kullanıcının seçtiği kişiler okunur, iOS Safari'de hiç okunmaz. WhatsApp'ın yaptığı şey yerel uygulama izniyle olur — projede Capacitor kabuğu ve `native-contacts` köprüsü zaten hazır.

Bu yüzden net üç kanal tanımlanır ve arayüz hangisinde olduğunuzu tek cümleyle söyler:

```text
Yerel uygulama (iOS/Android)  → sistem rehber izni → TÜM rehber otomatik, periyodik
Android tarayıcı              → kişi seçici       → seçilen kişiler, sonra otomatik yenilenir
iOS Safari / masaüstü         → rehber dosyası (.vcf) bir kez → sonra otomatik yenilenir
```

Yapılacak:
- **Tek düğme, tek akış:** "Rehberi getir" hangi kanal varsa onu kendisi seçer (bugünkü `autoSyncContacts` sırası korunur), sonuç tek satır Türkçe bildirimle döner.
- **Periyodik yeniden eşleştirme:** cihazda saklanan rehber (ham numara cihazdan çıkmaz) uygulama her açıldığında ve arka planda belirli aralıkla yeniden eşleştirilir; sonradan Tedbirge'ye katılan tanıdıklar kendiliğinden rehberde belirir — kullanıcı hiçbir şey yapmaz.
- **Ad güncellemesi:** telefon rehberinde adı değişen kişi bir sonraki eşitlemede yeni adıyla görünür; kişi kartı bölünmez (numara çıpası aynı kalır).
- **Silinen kişi:** rehberden silinen kişi sohbeti silinmez, yalnızca "Rehberinizden eşleşti" rozetini kaybeder.
- **Yeni cihaz:** aynı numarayla girildiğinde şifreli rehber yedeğinden geri yüklenir (mevcut kasa akışı korunur).
- **KVKK:** hiçbir aşamada ham numara/ad ağa çıkmaz; sunucuya yalnızca geri döndürülemez özet gider (mevcut mimari korunur).
- **Yerel uygulama kurulumu:** iOS/Android kabuğunun nasıl derlenip yükleneceği `MOBILE.md` üzerinden adım adım güncellenir; tam rehber senkronu yalnızca bu kabukla mümkündür.

## 3. Doğrulama (kanıtlı)

- Tarayıcıda `/chat` açılır: adsız satır yok, kendi kaydım yok, aynı kişi tek satır — ekran görüntüsüyle gösterilir.
- Rehber eşitleme iki kez üst üste çalıştırılır: kişi sayısı artmaz, kopya oluşmaz (idempotent).
- Tip denetimi 0 hata, tüm testler geçer; ardından yayına alınır.

## Teknik notlar

Dokunulacak dosyalar: `src/lib/chat/self-heal.ts` (hayalet budama), `src/components/chat/ChatApp.tsx` (arama kaynaklı satır filtresi), `src/lib/chat/call-log.ts` (kendi/adsız kayıt filtresi), `src/lib/chat/directory.ts` (periyodik yeniden eşleştirme), `src/components/chat/ContactsDialog.tsx` (tek düğme + kanal açıklaması), `src/lib/pwa.ts` (güncelleme zorlaması), `MOBILE.md`. Veritabanı değişikliği yok.
