# Fotoğraf döngüsü, izin çökmesi ve WhatsApp mesaj menüsü

## Sorunların doğrulanmış kaynağı

Kod okumasıyla teyit edilenler:

1. **Fotoğraf "Aktarılıyor · %5" döngüsü** — `src/lib/chat/engine.ts` içindeki `sendMedia`, parçaları eşe gönderirken ilerleme yüzdesini yayınlıyor. Eş yoksa veya ilk parça gitmiyorsa döngü aynı eş için tüm parçaları tek tek denemeye devam ediyor ve hata durumunda `transfers` kaydı temizlenmiyor (temizlik `try/finally` içinde değil). Sonuç: çubuk düşük bir yüzdede takılı kalıyor.
2. **Aynı fotoğrafın tekrar tekrar gönderilmesi** — `retryMessage` (aynı dosya, 934. satır) mesajın türüne bakmadan her bekleyen mesajı `t: "text"` olarak yeniden gönderiyor. Medya mesajı için bu hem boş metin yolluyor hem `pumpRetryQueue` tarafından 6 kez tekrarlanıyor.
3. **Tekrarlayan izin pencereleri** — `src/lib/call/media-prewarm.ts` içindeki `bootMediaPrewarm`, kullanıcının ilk dokunuşunda kamera **ve** mikrofon izni istiyor. İzin reddedilirse durum saklanmadığı için her açılışta yeniden soruluyor; ayrıca `src/lib/call/engine.ts` arama sırasında tekrar `getUserMedia` çağırıyor.
4. **Mesaj eylem menüsü** — `src/apps/messenger/MessageRow.tsx` içinde Cevapla/İlet/Kopyala/Sabitle/Yıldız eylemleri var, ancak hover araç çubuğu biçiminde; ekran görüntüsündeki gibi uzun basınca açılan WhatsApp menüsü ve görsele basınca açılan "Kaydet / Kopyala / Aç" menüsü yok.

## Yapılacaklar

### 1. Aktarım döngüsünün kapatılması (`src/lib/chat/engine.ts`)
- `sendMedia` gövdesi `try/finally` içine alınır; ne olursa olsun `transfers` kaydı silinir, çubuk asla takılı kalmaz.
- Hedef eş yoksa aktarım anında biter, mesaj "bekliyor" olarak kuyruğa alınır.
- Bir eşe ilk parça gitmezse o eş için ısrar edilmez; kuyruk devralır.

### 2. Yeniden gönderimin türe duyarlı olması (`src/lib/chat/engine.ts`)
- `retryMessage`: metin mesajları eskisi gibi; medya mesajları saklanan `dataUrl` üzerinden yeniden parçalanıp `media` kanalından gönderilir; konum mesajları `geo` paketiyle gönderilir.
- Aynı mesaj için eşzamanlı ikinci bir yeniden gönderim başlatılmaz (basit "devam ediyor" kilidi), böylece `pumpRetryQueue` ile çakışma olmaz.

### 3. İzin akışının sakinleştirilmesi (`src/lib/call/media-prewarm.ts`)
- Açılışta otomatik izin isteme kaldırılır; izin yalnızca kullanıcı arama başlattığında veya kamera/mikrofon düğmesine bastığında istenir.
- Reddedilen izin cihazda işaretlenir, tekrar tekrar sorulmaz; arayüzde tek satırlık "İzin kapalı — açmak için dokunun" uyarısı gösterilir.
- İzin reddi hata fırlatmaz; arama sesli moda düşer.

### 4. WhatsApp ölçüsünde eylem menüleri (`src/apps/messenger/MessageRow.tsx`)
- Mesaja uzun basma / sağ tık ile açılan menü: Cevapla, İlet, Kopyala, Yıldız Ekle, Sabitle, Bilgi, Sil. Mevcut işlev bağlantıları korunur, yalnızca sunum değişir.
- Fotoğraf/video baloncuğunda ayrı menü: Kaydet, Resmi Kopyala, Resmi Aç, İlet, Sil.
- Emoji tepki şeridi menünün üstünde açılır (ekran görüntüsündeki düzen).

### 5. Depo hijyeni
- Kullanılmayan ölü içe aktarımlar ve kopuk bağımlılıklar taranıp temizlenir; tip denetimi 0 hata ile bitirilir.

## Teknik notlar
- Değişiklikler yalnızca istemci tarafında; veritabanı veya sunucu fonksiyonu değişmez.
- `state.transfers` sözleşmesi aynı kalır, `ChatApp.tsx` tarafında değişiklik gerekmez.
- Tüm eylemler mevcut `chat/engine.ts` API'lerini (reactToMessage, retryMessage, forward, pin, star) kullanır; yeni iş mantığı eklenmez.
