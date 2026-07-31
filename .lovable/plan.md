## TEDBİRGE GATEWAY — NİHAİ UYGULAMA VE MİMARİ PLANI

Hiçbir dosya değiştirilmedi. Aşağıdaki plan, onayınız sonrası uygulanacak sıralamadır.

### Faz 0 — Temel: Kalıcı depolama katmanı
Yeni `src/lib/store/idb.ts`: IndexedDB sarmalayıcı (harici bağımlılık yok, `indexedDB` API doğrudan).
Nesne depoları:
```text
outbox   (key: pktId)  — gönderilmeyi bekleyen zarflar, index: priority, ts
inbox    (key: pktId)  — görülen paket kimlikleri (mükerrer engelleme), TTL 30 gün
keys     (key: nodeId) — non-extractable CryptoKey nesneleri
peers    (key: peerId) — genel anahtar, parmak izi, son görülme
events   (key: autoinc)— kesinti/olay günlüğü, saha ölçümleri
```
`localStorage` kuyruğu tek seferlik göç ile taşınır (`browser-node.ts` içindeki 200 paketlik dizi okunur, IndexedDB'ye yazılır, anahtar silinir). Hedef: 30 gün off-grid, ~50k paket.

**Öncelik tabanlı budama** (`src/lib/store/pruning.ts`): her paket `priority: 0=acil/güvenlik, 1=kontrol, 2=mesaj, 3=telemetri`. Kota %85'i aşınca sondan (3 → 2) ve en eskiden başlayarak budanır; 0 ve 1 asla silinmez. Kota `navigator.storage.estimate()` ile ölçülür, `navigator.storage.persist()` istenir.

### Faz 1 — Kriptografi çekirdeği
`src/lib/e2ee.ts` genişletilir (mevcut ECDH+AES-GCM korunur, kırılma yok):
- **Kimlik anahtarı**: Ed25519 (`crypto.subtle` destekliyorsa; yoksa ECDSA P-256'ya düşer) — imzalama.
- **Şifreleme anahtarı**: ECDH P-256 → AES-256-GCM (mevcut). ChaCha20 tarayıcıda yok; AES-GCM donanım hızlandırmalı olduğu için standart bu kalır, ajan tarafında ChaCha20-Poly1305 kabul edilir (alg alanı ile müzakere).
- `extractable: false` üretim; anahtarlar IndexedDB `keys` deposunda CryptoKey olarak saklanır. `localStorage` anahtar saklama kaldırılır (göç: mevcut anahtar bir kez içe aktarılıp non-extractable kopyaya çevrilir).
- **Seed phrase**: yeni `src/lib/recovery.ts` — 128-bit entropi → BIP-39 kelime listesi (yerel liste, offline), HKDF ile deterministik anahtar türetimi. Kurtarma ekranında 12 kelime bir kez gösterilir, doğrulama adımı ile onaylanır.
- **Parmak izi**: mevcut `fingerprintOf` kullanılır; UI'da opsiyonel manuel eşleştirme.

### Faz 2 — MeshEnvelope v2 (E2EE zarf)
`src/lib/mesh-envelope.ts` (yeni), tüm taşıyıcılar için ortak biçim:
```text
header (açık): v, pktId, from, to, kind, ttl, hops, lamport, ts, sig
body   (kapalı): { alg, epk, iv, ct }   ← yalnız hedef açar
```
- `pktId = SHA-256(from ‖ lamport ‖ body.ct)` → idempotency anahtarı; `inbox`'ta varsa paket düşürülür.
- `lamport`: yerel mantıksal saat, her gönderim/alımda `max(local, gelen)+1`; duvar saati yalnız gösterim amaçlı.
- `sig`: header + body hash'inin Ed25519 imzası. İmza doğrulanmayan paket röle EDİLMEZ.
- Röle davranışı: header okunur, `ttl--`, yeniden imzalanmaz (orijinal imza taşınır), body'e dokunulmaz.
`browser-node.ts` ve `install.sh` ajan protokolü bu biçime geçirilir; sunucu (`api/public/queue.ts`, `telemetry.ts`) yalnız opak `body` taşır, doğrulama header üzerinden yapılır.

### Faz 3 — PHY veri düzlemi (LoRa/HaLow taşıma)
`src/lib/carrier-bridge.ts` içine **paket zamanlayıcı** eklenir (`src/lib/carrier-scheduler.ts`):
- Fiziksel çerçeve limiti: LoRa yükü ≤ 200 bayt → zarflar parçalanır (`frag: i/n`, hedefte yeniden birleştirme, eksik parça 30 dk sonra düşer).
- **Duty-cycle kilidi**: kayan 60 dk penceresinde toplam yayın süresi ≥ 36 s ise (%1) kuyruk bekletilir; süre, spreading factor + bant genişliği + bayt sayısından hesaplanan Time-on-Air ile ölçülür. Güç tavanı 25 mW (14 dBm) — modem yapılandırma komutu bu değerin üstünü reddeder. Sınırlar `regulation.ts` içinden okunur, sabit yazılmaz; bölge değişirse tek kaynaktan değişir.
- Bütçe dolduğunda yalnız priority 0/1 paketleri geçer, telemetri beklemeye alınır. UI'da "duty-cycle bütçesi: %x, sonraki pencere: hh:mm" göstergesi.
- Taşıyıcı seçimi: IP varsa WebSocket/WebRTC; koptuğunda sırayla HaLow → Wi-Fi yönlü → LoRa. Geri dönüşte kuyruk otomatik boşalır.

### Faz 4 — Keşif ve NAT
- Tarayıcı: `/katil` captive portal + yerel röle köprüsü (aynı LAN'daki düğüm, sunucusuz WebRTC el sıkışması için QR/kısa kod takası).
- Ajan (`install.sh`): mDNS/DNS-SD ile gerçek yerel keşif; tarayıcı ajana ws://localhost üzerinden bağlanır.
- TURN yok. Simetrik NAT'ta, kamuya açık IP'li Tedbirge düğümleri `egress` bayrağıyla ilan edilir ve dağıtık röle olur; egress düğüm de body'i okuyamaz (Faz 2 garantisi).

### Faz 5 — Arayüz (mevcut tasarım ve palet korunur)
- `BrowserNodeCard`: "Kurtarma anahtarı" adımı (12 kelime), duty-cycle göstergesi, kuyruk doluluk çubuğu.
- `CarrierBridgeCard`: taşıyıcı başına "veri düzlemi aktif / yalnız telemetri" rozeti ve yayın bütçesi.
- Panel > Güvenlik: eş parmak izi listesi, manuel doğrulama, imzasız paket sayacı.
- `/guvenlik` ve `/gizlilik`: "röleler içeriği göremez" beyanı artık teknik gerçeği yansıttığı için doğrulanabilir ifadeyle güncellenir (KVKK: röle düğümde kişisel veri işlenmez).

### Teknik notlar / riskler
- Ed25519 WebCrypto desteği tarayıcıya göre değişir; ECDSA P-256 yedeği zorunlu, alg alanı zarfta taşınır.
- IndexedDB kotası tarayıcı/cihaza bağlıdır; 30 gün hedefi budama politikası ile garanti edilir, ham kapasite ile değil.
- Web Serial yalnız masaüstü Chromium'da; mobilde LoRa veri düzlemi BLE köprüsü veya ajan üzerinden çalışır, iOS'ta çalışmaz — UI bunu açıkça yazar.
- Duty-cycle hesabı gerçek modem geri bildirimiyle (TX süre raporu) çapraz kontrol edilir; sapma varsa yazılım tavanı daha muhafazakâr kalır.

### Uygulama sırası ve doğrulama
1. Faz 0 → 1 → 2 (çekirdek, geriye dönük uyumlu; eski zarf 30 gün kabul edilir)
2. Faz 3 → 4 (taşıma)
3. Faz 5 (arayüz)
Her fazda: birim testleri (zarf imza/açma, budama, duty-cycle bütçesi), tarayıcı üzerinden uçtan uca senaryo (çevrimdışı → kuyruk → geri dönüş), tip kontrolü.

Onayınız sonrası Faz 0'dan başlayarak uygulamaya geçilecektir.