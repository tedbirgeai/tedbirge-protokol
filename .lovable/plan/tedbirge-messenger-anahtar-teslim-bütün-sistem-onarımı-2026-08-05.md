# Tedbirge Messenger — Anahtar Teslim Bütün Sistem Onarımı

Bu plan parça iş değildir: kimlik/rehber çekirdeği, teslimat hattı, çok-atlamalı yönlendirme, çağrı motoru, otonom kendini onarma ve sürekli doğrulama tek turda ele alınır. Her madde kabul ölçütüyle birlikte teslim edilir.

## 1. Kök neden: rehberde numara çıpası yok (ekrandaki kopya kişiler)

Doğrulanan durum: `importContacts` eşleşen her kişiyi `putTrustedNode` ile **düğüm kimliğine** yazıyor ve kayıtta telefon özeti tutulmuyor (`src/lib/chat/directory.ts`). `mergePersonDuplicates` ve `collapsePersons` ise sırayla `personId` → imza anahtarı → ad'a bakıyor. Sunucudan `personId` boş dönen ya da farklı cihazdan gelen satırlar farklı imza anahtarına sahip olduğu için hiçbir zaman birleşmiyor. Ekran görüntüsündeki "TÜRKAN DİNÇ" ×2, "mehmet dinç" ×3, "BİLGİSAYAR MEHMET DİNÇ" ve "Tedbirge kullanıcısı" bunun sonucu.

Yapılacak:
- Güvenilir düğüm kaydına `phoneHash` alanı eklenir; rehber eşleşmesinden gelen her kayıt numara özetiyle yazılır (ham numara asla ağa çıkmaz, cihazda kalır).
- Birleştirme anahtarı sırası **phoneHash → personId → imza anahtarı → ad** olur. Aynı numaraya ait tüm cihazlar tek kişi kartında toplanır; numarası bilinen iki farklı kişi aynı adı taşısa da ayrı kalır.
- "BİLGİSAYAR/TELEFON …" gibi cihaz etiketli adlar zaten normalize ediliyor; bu normalizasyon rehber içe aktarımında da uygulanır, böylece kart adı tek biçim olur.
- Tek seferlik geçmiş temizliği yeniden çalıştırılır: mevcut kopya kayıtlar numara özetine çıpalanır, adsız/mesajsız hayaletler ("Tedbirge kullanıcısı") budanır, kişi başına tek kart bırakılır. İşlem idempotenttir, veri silmez, yalnızca birleştirir.
- Sohbet listesi ve arama geçmişi aynı çözümleyiciyi kullanır; aynı kişi listede iki satır olamaz.

## 2. Teslimat hattı: iki yönlü garanti

- Giden her mesaj/çağrı daveti aynı anda mesh, bulut rölesi ve push kanalına verilir; ilk teslim kazanır, diğerleri iptal edilir (çift bildirim yok).
- Kişi adresli teslim: hedef kişinin **tüm** bağlı cihazlarına fan-out; tek cihaz kapalıysa diğeri alır.
- Kuyruk kalıcıdır: uygulama kapansa da bekleyen mesaj cihazda durur, bağlantı gelince üstel artan bekleme ile gönderilir, teslim edilince tik güncellenir.
- 429/ağ hatası sessizce yutulmaz; kullanıcıya tek satır Türkçe durum, teknisyene senkron günlüğü.

## 3. Çok-atlamalı yönlendirme (10 taşıyıcı, Dijkstra)

- Taşıyıcı listesi tek kaynaktan yönetilir; her taşıyıcı için gecikme, bant genişliği, güvenilirlik ve enerji maliyeti ağırlığı tanımlanır.
- Dijkstra motoru bu ağırlıklarla en iyi yolu seçer; yol kopunca ölçülen gerçek gecikmeye göre kendini günceller ve ikinci en iyi yola anında geçer (kullanıcı fark etmez).
- Atlama sınırı ve TTL dinamiktir; döngü koruması ve yinelenen paket bastırma açık kalır.
- Yönlendirme kararları teşhis panelinde okunur biçimde görünür: seçilen yol, atlama sayısı, neden.

## 4. Çağrı ve konferans

- Tek oda kimliği, 6 kişiye kadar konferans, görüşme sırasında kişi ekleme, düşen katılımcı için sınırlı otomatik yeniden bağlanma (mevcut yapı korunur, kişi kartı birleşmesiyle uyumlu hale getirilir).
- Arama ekranındaki ad, rehber kartının adıyla birebir aynı olur (ayrı ad kaynağı kalmaz).
- Çağrı geçmişi kişi bazlıdır; aynı kişi için ayrı satırlar birleşir.

## 5. Otonom çalışma ve kendini onarma

- Açılışta ve düzenli aralıkla sessiz sağlık taraması: kopuk ad bağı, sahipsiz kayıt, takılı kuyruk, süresi geçmiş oturum, bozuk yerel veritabanı.
- Bulunan sorun kullanıcıya sorulmadan onarılır; onarılamayan tek satır Türkçe uyarı olur.
- Yerel veritabanı hatasında otomatik yeniden bağlanma ve güvenli yeniden kurulum (mesaj kaybı yok).

## 6. Emsal ürünlerden alınan ve eksik olan davranışlar

WhatsApp/Signal/Briar/Meshtastic davranışları taranıp uygulanacak eksikler:
- Kişi kartı: tek kişi, bağlı cihaz listesi, doğrulama rozeti, engelleme.
- Sohbet: yanıtla, ilet, tepki, düzenle/sil, sabitleme, okundu bilgisi, yazıyor göstergesi (var olanlar korunur, eksikler tamamlanır).
- Bildirim: tek cihazda okununca diğerinde bildirim düşer.
- Çevrimdışı: her ekran internet olmadan açılır, kuyruğa yazar, geri gelince eşitler.

## 7. Doğrulama (kanıtlı teslim)

- Üç ortam (masaüstü Chrome profili ×2 + mobil boyut) ile: aynı numaranın tek kart olduğu, kopya kalmadığı, "Tedbirge kullanıcısı" satırının kalmadığı ekran görüntüleriyle gösterilir.
- İki yönlü mesaj + görüntülü arama, biri çevrimdışıyken kuyruk ve dönüşte teslim.
- Konferansa dördüncü kişi ekleme ve düşen katılımcının geri dönmesi.
- Yönlendirme motoru için birim testleri; tip denetimi 0 hata; tüm testler geçer.

## Teknik notlar

- Dosyalar: `src/lib/store/idb.ts` (kayıt şeması + phoneHash), `src/lib/chat/directory.ts`, `src/lib/chat/merge.ts`, `src/lib/chat/contacts.ts`, `src/lib/chat/name-resolver.ts`, `src/lib/chat/engine.ts`, `src/lib/relay-cloud.ts`, `src/lib/browser-node.ts`, `src/lib/mesh-routing.ts`, `src/lib/call/engine.ts`, `src/components/chat/*`.
- Veritabanı değişikliği gerekmez; rehber ve numara verisi cihazda kalır (KVKK).
- Mevcut çalışan davranışlar bozulmaz; her adım tip denetimi ve testle kapanır.
