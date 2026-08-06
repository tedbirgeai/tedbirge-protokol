# Aramalar Sekmesi (WhatsApp Ölçüsü) + Kayıt Ekranı Titreme Düzeltmesi

## 1) Aramalar sekmesini WhatsApp düzenine tam oturtma

Gönderilen ekran görüntülerindeki dört ekran birebir karşılanacak:

**A. Aramalar ana ekranı (image-199)**
- Üst çubuk: solda "…" (menü), sağda yeşil dolu "+" düğmesi.
- Altında büyük "Aramalar" başlığı (WhatsApp'taki 34px kalın başlık ölçüsü).
- 4 kısayol dairesi: Ara · Planla · Tuş takımı · Favoriler (hepsi çalışır hale gelecek; şu an Planla ve Favoriler pasif).
- "En Son" başlığı ve arama geçmişi listesi: 56px avatar, ad, altında yön ikonu + "Giden/Gelen/Cevapsız", sağda tarih ve yuvarlak (i) bilgi düğmesi. Cevapsız aramalar kırmızı.

**B. Yeni arama sayfası (image-200)**
- Üstte "İptal" · "Yeni arama" · seçim sayacı (0/31).
- Arama kutusu: "Ad, numara, @kullanıcıadı".
- İki eylem satırı: "Yeni arama bağlantısı" ve "Yeni kişi".
- "Sık görüşülenler" grubu + alfabetik kişi listesi, sağda A–Z hızlı şerit, her satırda çoklu seçim yuvarlağı; birden fazla seçilince alttan yeşil "Ara" çubuğu çıkar (konferans arama motoru zaten mevcut).

**C. Yeni arama bağlantısı (image-201)**
- Görüntülü/Sesli seçimi, üretilen katılım bağlantısı, "Katılmak için onay gereksin" anahtarı.
- Kopyala / Paylaş / Takvime ekle (.ics) eylemleri. Bağlantı kendi alan adımızla üretilir.

**D. Arama planla (image-203) ve Tuş takımı (image-204)**
- Planla: başlık, açıklama (2048 karakter), başlangıç tarih/saat, bitiş saati anahtarı, arama türü, onay anahtarı, hatırlatma. Kayıt cihazda tutulur, saati gelince bildirim.
- Tuş takımı: 1–9/*/0/# daireleri (harf alt yazılarıyla), üstte yazılan numara, altta yeşil yuvarlak arama düğmesi.

**Ölçü ve sabitleme kuralı (mobil · tablet · masaüstü)**
- Tüm ekranlar mevcut `wa-shell` / `100dvh` kabuğunun içinde kalır; yatay kaydırma yok, alt sekme çubuğu ve güvenli alan payları korunur.
- Yeni arama, bağlantı, planla ve tuş takımı ekranları mobilde tam ekran alttan açılır sayfa, tablet/masaüstünde ortalanmış 420px kartıdır — mevcut sohbet düzeni hiç değişmez.
- Masaüstünde Aramalar, üç sütunlu düzenin orta sütununda aynı içerikle görünür (rayda telefon ikonu zaten var).

## 2) Kayıt ekranındaki titreme / sayfa yenilenmesi

Kök neden koddan doğrulandı: `src/lib/pwa.ts` içindeki servis çalışanı güncelleme döngüsü, yeni sürüm görünce `SKIP_WAITING` gönderip 350 ms sonra `window.location.reload()` çağırıyor. Kullanıcı ad/telefon yazarken bu tetiklenince ekran tazeleniyor ve form sıfırlanıyor. `version-lock.ts` içindeki tek seferlik yenileme de aynı ana denk gelebiliyor.

Düzeltme:
- Yenileme, kullanıcı bir alana yazıyorken (odaklı input/textarea veya son 10 sn içinde tuş girişi) ve katılım/onboarding ekranı açıkken **ertelenir**; ekran boşa çıkınca uygulanır.
- Katılım ekranında girilen ad/telefon/e-posta, yazıldığı anda oturum deposuna yazılır; olası bir yenilemede alanlar dolu gelir.
- Sürüm kilidi yenilemesi de aynı "yazma sırasında erteleme" kapısından geçer.

## Teknik notlar

- Yeni dosyalar: `src/components/chat/NewCallSheet.tsx`, `Dialpad.tsx`, `CallLinkSheet.tsx`, `ScheduleCallSheet.tsx`, `src/lib/chat/scheduled-calls.ts`, `src/lib/chat/call-links.ts`, `src/lib/ui/defer-reload.ts`.
- Güncellenecek: `CallsPanel.tsx`, `CallHistory.tsx` (WhatsApp satır ölçüleri + (i) düğmesi), `ChatApp.tsx` (masaüstü Aramalar sütunu ve sayfa bağlantıları), `pwa.ts`, `version-lock.ts`, `PhoneOnboarding.tsx`.
- Arama motoru (`src/lib/call/engine.ts`) ve konferans limiti değişmez; yeni ekranlar yalnızca mevcut `startCall` / `addParticipant` akışını tetikler.
- Planlanan aramalar ve bağlantılar cihazda saklanır (localStorage), buluta veri gitmez.
- Bitişte tip denetimi ve testler çalıştırılır.
