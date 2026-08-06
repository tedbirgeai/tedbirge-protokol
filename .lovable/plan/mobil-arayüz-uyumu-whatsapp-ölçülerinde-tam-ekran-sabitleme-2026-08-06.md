# Mobil Arayüz Uyumu — WhatsApp Ölçülerinde Tam Ekran Sabitleme

Amaç: Sohbet uygulaması telefonda birebir WhatsApp gibi otursun. Ekran sağa sola kaymasın, dokunma alanları büyüsün, alt kısımda sabit sekme çubuğu olsun, arama çubuğu "AI'ye Sor veya Ara" olsun. Mevcut hiçbir özellik bozulmayacak.

## Farklılık analizi (bizim uygulama vs. referans ekranlar)

| Alan | Şu anki durum | Hedef |
|---|---|---|
| Alt gezinme | Yok; tüm işlevler üst başlıkta 8 küçük ikon halinde sıkışık | Sabit alt sekme çubuğu: Aramalar · Topluluklar · Sohbetler · Siz |
| Üst başlık | İkon kalabalığı, satır kayabiliyor | Büyük "Sohbetler" başlığı + solda "…" menüsü, sağda kamera ve yeşil "+" |
| Arama çubuğu | "Ara veya yeni sohbet başlat", ince | Yuvarlak dolgulu, 44px yükseklikte, "AI'ye Sor veya Ara" — soldaki büyüteç, AI danışmanına da bağlı |
| Liste satırı | Kompakt, avatar küçük | 72px satır yüksekliği, 52px avatar, 17px isim, 15px önizleme, sağda saat |
| Klasör sekmeleri | Yatay kaydırmalı çipler | "Arşivlenmiş" satırı listenin başında + çipler korunur |
| Ekran sabitleme | `h-[100dvh]`, bazı satırlarda taşma riski | Gerçek viewport kilidi, yatay kaydırma tamamen kapalı, çentik/ev çubuğu güvenli alanı |
| Profil ekranı | Ayarlar diyaloğu | "Siz" sekmesi: büyük avatar, ad, gruplanmış ayar kartları (Listeler, Bağlı cihazlar, Hesap, Gizlilik, Sohbetler) |
| Aramalar | Sohbet listesi içinde bir çip | Ayrı sekme: üstte Ara / Planla / Tuş takımı / Favoriler kısayolları, altta "En Son" listesi |
| Topluluklar | Grup katılım kutusu | Ayrı sekme: boş durum görseli + "Yeni topluluk" butonu, mevcut grup mantığına bağlanır |

## Yapılacaklar

### 1. Ekran kilidi (kaymayı bitiren katman)
- Sohbet kabuğu `position: fixed; inset: 0` ve `height: 100dvh` ile tam ekrana kilitlenir; `overscroll-behavior: none`, `touch-action: pan-y`.
- Tüm yatay taşma kaynakları kapatılır: kabuk ve her sütun `overflow-x: hidden` + `min-w-0`.
- Üst çentik ve alt ev çubuğu için `env(safe-area-inset-*)` tek yerde, kabuk seviyesinde uygulanır (şu an dağınık üç yerde).
- iOS klavye açılınca girişin kaymaması için `visualViewport` yüksekliğini CSS değişkenine yazan küçük bir kanca.

### 2. Alt sekme çubuğu (yeni)
- Yeni bileşen: 4 sekme (Aramalar, Topluluklar, Sohbetler, Siz), 56px yükseklik + güvenli alan, aktif sekme koyu ikon + kalın etiket.
- Sadece mobilde görünür; masaüstünde mevcut iki sütunlu düzen aynen kalır (regresyon yok).
- Sekme durumu bileşen içinde tutulur; mevcut `folder`/`CALLS_TAB` mantığı buna bağlanır, silinmez.

### 3. Sohbetler sekmesi
- Büyük başlık + "…" + kamera + yeşil "+" düğmeleri.
- Arama çubuğu: dolgulu, yuvarlak, `AI'ye Sor veya Ara`. Yazı AI ile başlıyorsa mevcut AI danışman olayı tetiklenir, aksi halde normal arama çalışır.
- Liste satırı WhatsApp ölçülerine büyütülür (72px satır, 52px avatar, 17/15px tipografi, tik ikonları, saat sağ üstte).
- "Arşivlenmiş" satırı listenin en üstünde sayaçla.

### 4. Aramalar sekmesi
- 4 yuvarlak kısayol (Ara, Planla, Tuş takımı, Favoriler) — Planla/Favoriler ilk sürümde görünür ama pasif etiketli.
- "En Son" başlığı ve mevcut çağrı kaydı listesi büyütülmüş satırlarla; cevapsız aramalar kırmızı.

### 5. Topluluklar sekmesi
- Boş durum: illüstrasyon, açıklama metni ve "Yeni topluluk" butonu; mevcut grup oluşturma/katılma akışına bağlanır.

### 6. Siz sekmesi
- Büyük avatar, ad, durum baloncuğu; gruplanmış kartlar hâlinde mevcut ayarlar (Bağlı cihazlar, Hesap, Gizlilik, Sohbetler, Yedekleme, Hakkında) — hepsi var olan diyalogları açar.

### 7. Kalite kapanışı
- Tip denetimi 0 hata, testler yeşil, 390x844 ve 320x568 genişlikte yatay kayma olmadığı tarayıcı üzerinden doğrulanır.
- Sürüm damgası güncellenip yayınlanır.

## Teknik notlar
- Ana dosya `src/components/chat/ChatApp.tsx`; alt sekme çubuğu, Aramalar, Topluluklar ve Siz ekranları ayrı bileşen dosyalarına çıkarılır (dosya 2256 satır, daha fazla şişmesin).
- Ölçüler `src/styles.css` içindeki `.wa` bloğuna token olarak eklenir (`--wa-row-h: 72px`, `--wa-avatar: 52px`, `--wa-tabbar-h: 56px`), sabit değer serpiştirilmez.
- Masaüstü düzeni `md:` üstünde bugünkü hâliyle korunur; alt çubuk `md:hidden`.
- İş mantığı (kimlik, çağrı motoru, senkronizasyon, rehber) değiştirilmez — yalnızca sunum katmanı.
