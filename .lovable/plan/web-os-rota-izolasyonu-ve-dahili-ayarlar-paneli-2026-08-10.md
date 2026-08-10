# Web-OS Rota İzolasyonu ve Dahili Ayarlar Paneli

## Sorunun kaynağı (doğrulandı)

`src/components/Messenger.tsx` içindeki sol menüde iki bağlantı Web-OS kabuğunun dışına çıkıyor:

- "Ayarlar" → `<Link to="/izinler">`
- "Güvenlik" → `<Link to="/guvenlik">`

Bu iki rota (`src/routes/izinler.tsx`, `src/routes/guvenlik.tsx`) kurumsal `SitePage`/`SiteChrome` bileşenini render ediyor; yani eski pazarlama başlığı ve içerik ekrana geliyor. "Terminal" (`/system`) ve "Dosyalar" (`/app`) ise Web-OS temalı, onlar sorunsuz.

## Yapılacaklar

### 1. Sol menü tamamen dahili duruma bağlanır

Kontrol Paneli, Ağ/Kapsama, Terminal, Dosyalar, Güvenlik, Ayarlar butonlarının hepsi `center` durumuna (`video | network | security | settings`) geçer. Kurumsal rotalara giden `Link` kalmaz — Web-OS içindeyken hiçbir tıklama dışarı fırlatmaz. Üstteki `node_admin` kısayolu da kabuk içinde kalır.

Terminal ve Dosyalar zaten Web-OS temalı olduğu için bunlar `/system` ve `/app` rotasında kalabilir; istersen onları da panel içine gömerim.

### 2. Dahili "Düğüm ve Sistem Ayarları" paneli

Yeni `src/components/shell/NodeSettingsPanel.tsx` (Dark Cyber tema, `#0b101d` kart / emerald kenar) — orta sütunda render edilir, dört bölüm:

- **P2P düğüm yapılandırması**: düğüm kimliği, mesh kanal adı, taşıyıcı/röle tercihi, anahtar parmak izi ve anahtar yenileme (mevcut `node-runtime` + `crypto/identity` verileri).
- **Çekirdek durumu**: Wasm runtime statüsü, çalışan servisler, bellek/kuyruk ölçümleri (`src/kernel/telemetry.ts`, `supervisor.ts`).
- **Yerel veri ve depolama**: IndexedDB kullanım özeti, yedek al / geri yükle, yerel veriyi temizle (`lib/store/idb.ts`, `lib/hard-reset.ts`).
- **Arayüz ve bildirim tercihleri**: bildirim izin durumu, ses/titreşim, yoğun mod.

Tüm değerler gerçek çalışma zamanından okunur; uydurma metrik yazılmaz.

### 3. Güvenlik görünümü kabuk içine alınır

Orta sütunda Web-OS temalı özet: şifreleme durumu, doğrulanmış eş rozetleri, egress kilidi durumu, son güvenlik olayları. Kurumsal `/guvenlik` ve `/izinler` sayfaları SEO ve yasal içerik olduğu için **silinmez**, sadece Web-OS menüsünden bağlantısı kaldırılır.

### 4. Depo hijyeni

- `package-lock.json` silinir (paket yönetimi `bun.lock` üzerinde sabit).
- Kök dizine `.env.example` eklenir (değersiz anahtar listesi).
- `.gitignore` env kuralları doğrulanır.

`.env.production` içindeki `VITE_PAYMENTS_CLIENT_TOKEN` **silinmez**: bu Paddle'ın yayınlanabilir istemci anahtarı ve derleme sırasında bakılan dosya; boşaltılırsa yayınlanan sitede ödeme akışı kırılır. Kaldırmamı istersen ayrıca söyle.

## Kapsam dışı bıraktıklarım (ikinci direktif)

"Tüm protokolü Rust/WARM çekirdeğine derle, merkezi API/veritabanı/auth bağımlılığını tamamen kaldır" maddeleri tek bir düzeltme turuna sığmaz ve mevcut çalışan katmanları (Supabase sinyalleşme, lisans, telemetri) kırar. Bu bir sonraki iş kalemi olarak ayrı planlanmalı. Mevcut kod tabanında `src/kernel/wasm-provider.ts` ve `contract.ts` zaten bu geçiş için köprüyü tutuyor.

Rehber senkronizasyonu için Zod `ContactSchema`, `NativeBridgeErrorBoundary` ve re-render izolasyonu maddelerini de bu turda değil, ayrı bir turda ele almayı öneriyorum — bu tur yalnızca rota kaçışını ve ayarlar panelini kapatır.

## Teknik notlar

- Değişen dosyalar: `src/components/Messenger.tsx`, yeni `src/components/shell/NodeSettingsPanel.tsx`, yeni `src/components/shell/SecurityPanel.tsx`, `package-lock.json` (silme), `.env.example` (yeni).
- Rota dosyalarına dokunulmaz; `/izinler` ve `/guvenlik` yayında kalır.
- Bitişte `tsgo --noEmit` sıfır hata ve `/` sayfası 200 kontrolü yapılır.
