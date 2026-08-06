# Master plan — WhatsApp mantığında kişi ekleme, tek renk sistemi, tam sohbet menüsü

Üç iş tek turda kapanır: (1) "Yeni kişi" akışı, (2) mavi/mor tonların WhatsApp yeşiline dönüşü, (3) sohbet satırı sağ tık / basılı tutma menüsündeki tüm eylemlerin çalışır hale gelmesi. Hiçbir mevcut ekran bozulmaz; mobil (iOS/Android) ve masaüstü aynı mantığı paylaşır.

## 1) Yeni kişi ekleme — WhatsApp ile birebir mantık

Bugün "+" > "Yeni sohbet" doğrudan Rehber penceresini açıyor; kişi eklemek için ayrı bir form yok.

Yeni akış:

```text
+  →  Yeni sohbet     → rehber listesi + üstte "Yeni kişi" satırı
   →  Yeni grup
   →  Yeni kişi       → Ad · Soyadı · Ülke (TR +90) · Telefon  → Kaydet
   →  Kendine not
```

- Masaüstünde WhatsApp Web'deki gibi sağ panelde açılır; mobilde tam ekran sayfa olarak açılır. İkisi de aynı bileşeni kullanır.
- Kaydedilen kişi cihazdaki şifreli rehber kasasına yazılır; numara özet (hash) olarak dizinde aranır. Kişi Tedbirge'de kayıtlıysa hemen "Tedbirge'de" rozetiyle görünür ve sohbet açılabilir; değilse "Davet et" satırı olarak durur ve katıldığı an kendiliğinden eşleşir.
- Aynı numara ikinci kez eklenirse yeni kayıt açılmaz, mevcut kişi güncellenir (kopya kişi yasağı korunur).
- Numara doğrulaması E.164; ülke seçici varsayılan TR +90.
- **Görünürlük kuralı:** her kimlik yalnızca kendi rehberindeki kişileri görür. Sunucu yalnızca "bu özet kayıtlı mı" sorusuna cevap verir; kişi listesi, ad ve numara cihazdan çıkmaz. İleride yapılacak otomatik telefon rehberi okuma bu aynı kasaya yazacağı için akış değişmez.

## 2) Renk — mavi/mor tonların kaldırılması

Rehber penceresi ve bazı bilgi kartları koyu mavi/mor tonda; uygulamanın geri kalanı WhatsApp yeşili.

- Rehber penceresi, kimlik/QR kartı ve içindeki tüm düğmeler ortak yeşil tema değişkenlerine geçer (panel beyaz, aksan yeşil, rozetler açık yeşil).
- Tema tek kaynaktan yönetilir; bileşenlerde sabit renk kodu bırakılmaz. Açık/koyu modda okunabilirlik kontrol edilir.
- Marka işareti, splash ve alt sekme çubuğu aynı yeşil ailesini kullanır — uygulama boyunca tek renk dili.

## 3) Sohbet satırı menüsü — hiçbir düğme pasif kalmaz

Sohbet satırında sağ tık (masaüstü) ve basılı tutma (mobil) ile açılan menü:

| Eylem | Davranış |
| --- | --- |
| Sohbeti arşivle / arşivden çıkar | Arşiv klasörüne taşır; liste başında "Arşivlenmiş (n)" satırı |
| Sohbeti sabitle / kaldır | Listenin en üstüne sabitler |
| Okundu / okunmadı işaretle | Okunmamış rozetini sıfırlar veya geri getirir |
| Favorilere ekle / çıkar | "Favoriler" süzgecinde listelenir |
| Listeye ekle | Mevcut klasörler + "Yeni liste" |
| Sohbeti temizle | Mesajları siler, sohbet kaydı kalır (onay ister) |
| Sohbeti sil | Sohbeti tamamen kaldırır (onay ister) |

- Liste üstündeki süzgeç çipleri tamamlanır: **Tümü · Okunmamış · Favoriler · Gruplar · +liste**.
- Arşiv, favori ve liste bilgisi yalnızca cihazda saklanır.
- Uygulamadaki tüm düğmeler taranır; işlevsiz kalan varsa ya bağlanır ya kaldırılır.

## Doğrulama

- Yeni kişi eklenir, listede görünür, sohbet açılır; aynı numara ikinci kez eklendiğinde kopya oluşmaz.
- Menüdeki yedi eylem tek tek denenir; sayfa yenilendikten sonra arşiv/sabit/favori durumu korunur.
- Mavi/mor ton taraması: ekran görüntüleriyle mobil ve masaüstü doğrulanır.
- Tip denetimi 0 hata, tüm testler yeşil; ardından yayına alınır.

## Teknik notlar

Yeni: `src/components/chat/NewContactForm.tsx`, `src/components/chat/ChatRowMenu.tsx`, `src/lib/chat/chat-flags.ts` (favori/okunmadı işaretleri). Düzenlenecek: `NewChatSheet.tsx` (Yeni kişi girişi), `ContactsDialog.tsx` (tema + yeni kişi satırı), `ChatApp.tsx` (menü tetikleyici, süzgeç çipleri, arşiv başlığı), `src/lib/chat/folders.ts` (favori + liste API'si), `src/lib/chat/engine.ts` (sohbeti temizle, okunmadı işaretle), `src/lib/chat/directory.ts` (elle eklenen kişinin özetle eşleştirilmesi), `src/styles.css` (renk değişkenleri). Veritabanı şeması değişmez; ham numara cihazdan çıkmaz.
