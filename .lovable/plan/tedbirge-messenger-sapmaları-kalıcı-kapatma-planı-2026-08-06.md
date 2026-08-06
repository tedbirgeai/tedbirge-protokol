# Tedbirge Messenger — Sapmaları kalıcı kapatma planı

Haklısınız: son turlarda hep "filtreyi bir kat daha sıkılaştırma" yapıldı ve ekranda hiçbir şey değişmedi. Bu plan aynı yolu tekrar etmiyor.

## Bulunan durum (koddan doğrulandı)

- Sohbet listesi ve "Son sohbetler" paneli **tek bir kaynaktan** besleniyor (`ChatApp.tsx` içindeki `conversations`), ve bu kaynak "Tedbirge kullanıcısı" başlıklı satırı **üç ayrı kapıda** eliyor (`isNamed`, `isTechnicalLabel`, birleştirme sonrası son filtre).
- Yani kaynak kodda o satırın ekrana düşmesi mümkün görünmüyor. Buna rağmen ekranınızda duruyor.

Bu iki cümle bir arada tek anlama gelir: **ekranda çalışan paket, düzeltmelerin olduğu paket değil** (PWA servis çalışanı eski JS'i sunuyor) ya da satır listeden değil başka bir yoldan çiziliyor. Bunu tahminle kapatmayacağım — önce ölçeceğim.

## Yapılacaklar (tek turda, sırayla)

### 1. Görünür sürüm damgası (ölçüm)
Ayarlar ekranına ve sohbet altbilgisine küçük bir "Sürüm: <build-id>" satırı eklenir. Böylece ekranınızdaki uygulamanın hangi paket olduğu tek bakışta belli olur. Tahmin biter.

### 2. Eski paketi zorla düşürme
Servis çalışanı sürüm damgası değiştiğinde: bekleyen paketi devralır, tüm önbellekleri siler ve sayfayı bir kez kendiliğinden yeniler. Şu anki mekanizma sadece `update()` çağırıyor; devralma ve zorunlu yenileme yok — eklenecek.

### 3. Görünür "Onar ve temizle" düğmesi
Arka planda sessizce çalışan temizlik yerine, Ayarlar'da tek dokunuşluk bir düğme: hayalet kayıtları budar, adsız kayıtları siler, rehberi tazeler ve sonucu ekranda sayıyla söyler ("3 kayıt temizlendi"). Çalıştığını görebileceksiniz.

### 4. Kök neden: adsız kayıt hiç yazılmasın
Şu an temizlik "yazıldıktan sonra silme" mantığında. Yazma tarafına kilit konur: adı çözülemeyen bir eşe ait sohbet kaydı ve arama kaydı **kalıcı olarak hiç oluşturulmaz** (bellekte geçici tutulur, ad öğrenilince kalıcılaşır). Böylece silinecek hayalet üretilmez.

### 5. Rehberde tıklanan kişi = açılan sohbet
Tıklanan kişi kartındaki cihaz kimliği doğrudan aktif sohbete çıpalanır; başlık, arama hedefi ve mesaj akışı aynı kimlikten okunur. Sıraya/birleştirmeye bağlı sapma kaldırılır.

### 6. Uçtan uca denetim ve kanıt
`src/lib/chat/*`, `src/lib/call/*`, `src/components/chat/*` tam okunur; bulunan her kusur aynı turda listelenip kapatılır. Kapanışta: tip denetimi 0 hata, testler yeşil, tarayıcıda `/chat` üzerinde otomatik duman testi ekran görüntüsüyle.

## Teknik detay

- `vite.config.ts` PWA: `registerType: autoUpdate` + `skipWaiting/clientsClaim` zaten açık; eksik olan istemci tarafında `needRefresh` yakalanınca `updateServiceWorker(true)` çağrısı ve tek seferlik reload.
- `version-lock.ts`: `APP_DATA_VERSION` derleme kimliğinden üretilir (elle yazılan sabit yerine), böylece her yayın kilidi tetikler.
- `safe-title.ts` / `name-resolver.ts`: filtre katmanı korunur ama artık son savunma hattı olur, birincil çözüm değil.
- Yazma kilidi: `engine.ts` (sohbet oluşturma) ve `call-log.ts` (arama kaydı) içinde tek bir `canPersistPeer(peerId)` kapısı.
- Yeni testler: adsız eşe kayıt yazılmadığı, rehber seçiminin doğru sohbeti açtığı.

## Kapsam dışı

Mesajlar, rehber, kimlik ve kasa verisine dokunulmaz. Mevcut hiçbir özellik kaldırılmaz.
