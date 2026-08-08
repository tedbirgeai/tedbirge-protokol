# Faz A — Kabuk (Shell) ile Uygulama (App) Ayrımı

Amaç: Rust kernel'e geçmeden önce sınırları doğru yere koymak. Bugün `ChatApp.tsx` 2718 satırlık tek parça; hem işletim kabuğu (sekmeler, pencereler, modallar, düğüm yaşam döngüsü) hem de mesajlaşma uygulaması aynı dosyada. Bu ayrım yapılmadan tanımlanacak her ABI yanlış sınıra donar.

Kural: **davranış değişmez**. Mobil/masaüstü görünüm, ölçüler, WhatsApp düzeni, mevcut akışlar birebir korunur. Bu tur bir yeniden düzenleme (refactor) turudur, yeni özellik yoktur.

## Ne yapılacak

### 1. Kabuk çekirdeği (OS Shell)
- Yeni `src/shell/` klasörü: sekme/pencere durumu, aktif uygulama, modal (yüzey) yığını ve klavye kısayolları tek bir kabuk sağlayıcısında toplanır.
- Bugün `ChatApp` içinde dağınık duran ~30 `useState` üç gruba ayrılır: kabuk durumu (sekme, açık yüzeyler), uygulama durumu (aktif sohbet, taslak, yanıt), geçici UI durumu (menü, lightbox).
- Modallar tek tek `useState` yerine kabuk üzerinden açılır: `openSurface("profile")`, `closeSurface()`. Görsel sonuç aynı.

### 2. Uygulama kaydı (App Registry)
- Her sekme bir "uygulama" olarak tanımlanır: kimlik, ad, ikon, mobil/masaüstü bileşeni, rozet sayacı.
- Sohbetler, Aramalar, Topluluklar, Siz — dördü de aynı sözleşmeyi uygular. `MobileTabBar` ve `DesktopRail` sabit listeden değil bu kayıttan beslenir.
- Böylece ileride Wasm uygulamaları aynı kayda eklenebilir; kabuk kodu değişmez.

### 3. Messenger uygulamasının ayrıştırılması
- `ChatApp.tsx` içindeki mesajlaşma bölümü `src/apps/messenger/` altına taşınır: sohbet listesi, konuşma görünümü, besteci (composer), mesaj satırı.
- `ChatApp.tsx` yalnız kabuk montajı olarak kalır (hedef: 300 satır altı).
- Taşınan parçalar mevcut dosyalardan (`MessageRow`, `MenuItem`, yardımcı biçimleyiciler) kesilip yapıştırılır; mantık değiştirilmez.

### 4. Düğüm yaşam döngüsü kabuğa alınır
- `node-runtime.ts` otomatik başlatması bugün arayüz ağacı içinden tetikleniyor. Kabuk seviyesine çekilir: uygulama bileşenleri düğümün açık olduğunu varsayar, başlatma/durdurma/yeniden bağlanma tek yerden yönetilir.
- Röle "varsayılan açık, kapatılabilir" anahtarı kabuk durumuna bağlanır (arayüz metni bu turda değişmez).

### 5. Kernel sınırının yazıya dökülmesi
- `src/kernel/contract.ts`: kabuğun çekirdekten beklediği asgari yüzey — `send`, `subscribe`, `resolve`, `route`, `identity`, `status`.
- Bugünkü TypeScript uygulaması bu sözleşmeyi karşılayan tek sağlayıcı olarak kaydedilir. Rust/Wasm sağlayıcısı ileride aynı sözleşmeyi doldurur, çağrı yerleri değişmez.

### 6. Teslim ölçütü
- `tsgo --noEmit` 0 hata, mevcut testler yeşil.
- Playwright ile duman testi: mobil ve masaüstünde dört sekme açılır, sohbet açılıp mesaj yazılır, arama ekranı ve "Siz" paneli kaydırılır; ekran görüntüleriyle önce/sonra karşılaştırması.
- Hayalet kayıt, çift isim, hedef sapması gibi bilinen davranışlar bu turda **değişmez** — yalnız yerleri taşınır, düzeltme ayrı turda.

## Teknik notlar

Yeni: `src/shell/ShellProvider.tsx`, `src/shell/surfaces.ts`, `src/shell/apps.ts`, `src/apps/messenger/*`, `src/kernel/contract.ts`, `src/kernel/ts-provider.ts`.
Dokunulacak: `src/components/chat/ChatApp.tsx` (küçültme), `MobileTabBar.tsx`, `DesktopRail.tsx`, `node-runtime.ts` (başlatma çağrısı taşınır).
Dokunulmayacak: şifreleme (`crypto/identity.ts`), zarf ve yönlendirme, egress kilidi, Supabase şeması, stil/tema değişkenleri.

## Sıra

1 → 2 → 3 tek turda (asıl iş), ardından 4 ve 5, sonunda 6 ile kanıt.
