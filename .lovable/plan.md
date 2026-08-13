# Dağıtık Veri Taşıma Katmanı (P2P Overlay Transit) — Uygulama Planı

## Mevcut durum (kod tabanından doğrulanan)

- `src/lib/browser-node.ts` (1495 satır) tüm ağ, sinyalleşme, röle ve zarf işlemeyi **ana iş parçacığında** yürütüyor. Sadece Dijkstra hesabı worker'a taşınmış (`src/lib/mesh-routing-bridge.ts` → `mesh-routing.worker.ts`). E2EE (`src/lib/e2ee.ts`) ve zarf imzalama (`src/lib/mesh-envelope.ts`) UI thread'inde.
- `src/lib/mesh-routing.ts` grafiğin tamamı üzerinde Dijkstra çalıştırıyor; kenar maliyeti statik taşıyıcı tablosundan (`TRANSPORTS`) türüyor, canlı bant genişliği/sinyal kalitesi girmiyor. Uzak düğüm keşfi (DHT/mesafe vektörü) yok.
- Zarf başlığında alıcı alanı var (`mesh-envelope.ts` `to: string | "*"`), fakat `browser-node.ts` iletme yolu (`forwardEnvelope`, satır ~1124) ve `send("ping","*")` gibi çağrılar yayın (broadcast) davranışını sürdürüyor; hedefi tutmayan zarfların erken düşürülmesi tek noktada zorunlu kılınmamış.
- Parçalama iki ayrı yerde ve tekil hat üzerinden: `src/lib/chat/transfer.ts` (20.000 karakter, base64 string) ve `src/lib/p2p/file-transfer.ts` (24.000 karakter). Çok yollu paralel dağıtım ve `ArrayBuffer` yok.
- Rehber: `src/lib/chat/directory.ts` numara özetlerini sunucuya yollayıp eşleşme alıyor (`src/lib/directory.functions.ts`). Yerel kasa (`local-book.ts`, `store/idb.ts`) mevcut ama sunucu dizini hâlâ listeleme kaynağı.
- Heartbeat var (`heartbeat()` döngüsü) fakat 30 sn eşiğiyle çalışan bir hayalet düğüm toplayıcısı (GC) yok; `pruneOutbox` yalnızca giden kutusunu buduyor.
- ICE yapılandırması `src/lib/call/engine.ts` satır 74-89: tekrarlanan STUN girdisi (`stun1` iki kez) ve tek ücretsiz TURN sağlayıcı; ICE toplama havuzlama/erken aday gönderimi yok.
- Rust/Wasm: `src/kernel/wasm-provider.ts` `public/kernel/tedbirge_kernel.wasm` bekliyor, **böyle bir dosya ve Rust crate'i depoda yok**. Yani bugün her açılışta sessizce TS çekirdeğine düşülüyor; "Wasm entegrasyon hatası" bunun sonucu.

## Yapılacaklar

### 1. Çekirdek izolasyonu — `src/kernel/kernel.worker.ts`
Yeni worker: yönlendirme + E2EE seal/open + zarf imza doğrulama + Wasm motoru worker içinde. Ana thread için ince istemci `src/kernel/kernel-client.ts` (istek/yanıt eşlemeli, zaman aşımı ve senkron TS'e düşüş ile). IPC ikili çerçeve: `[u8 opcode][u32 corrId][u32 len][payload]` üzerinden `Transferable ArrayBuffer` (postMessage transfer listesi). Wasm derlendiğinde payload kodlaması bincode ile uyumludur; Wasm yokken aynı ikili çerçeveyi TS codec çözer. Mevcut `mesh-routing.worker.ts` bu worker'a katlanır, `mesh-routing-bridge.ts` API'si korunur.

### 2. Dijkstra refactor — k-hop yerel mesh
`mesh-routing.ts` içine `localSubgraph(graph, self, k = 2)` eklenir; `shortestPath` yalnızca bu alt grafikte çalışır. Kenar ağırlığı: `(gecikme / kalan bant genişliği) + (1 - sinyal kalitesi) * ceza`, canlı ölçümler `LinkMetrics` (RTT, son verim, kalite) kaydından okunur. 2-hop dışı hedefler için `src/lib/mesh/dht.ts`: Kademlia XOR mesafeli k-bucket + iteratif `FIND_NODE`, sonuç yoksa AODV tarzı sınırlı TTL rota isteği (RREQ/RREP) ile.

### 3. `src/lib/p2p/multipath-router.ts`
Veriyi 16 KB (yapılandırılabilir 16/64 KB) `ArrayBuffer` parçalarına böler, aktif taşıyıcı düğüm havuzuna paralel dağıtır, alıcıda sıra numarasına göre birleştirir, eksik parçaları yeniden ister. Havuz boyutu **sabit değil**: `src/lib/transit-config.ts` üzerinden okunur (varsayılan 5 ücretsiz hat; paket/plan yükseltmesinde N). `chat/transfer.ts` ve `p2p/file-transfer.ts` bu tek modülü kullanır.

### 4. Yayın filtresi
`mesh-envelope.ts` başlığına `targetPeerId` + imza kapsamı; `browser-node.ts` girişinde tek kapı: hedef bize değilse ve rota bizden geçmiyorsa zarf **işlenmeden ve yeniden yayılmadan düşürülür**. `"*"` yalnızca presence/keşif için beyaz listede kalır; içerik zarfları için yasaklanır.

### 5. Yerel rehber izolasyonu
Sunucu tabanlı genel dizin listeleme kaldırılır (`directory.functions.ts` çağrıları arayüzden çıkar). Rehber tek kaynak: IndexedDB kasası. Yalnızca yerelde ekli veya kamu anahtarı doğrulanmış kişiler listelenir.

### 6. Heartbeat + GC
Yalnızca aktif oturumdaki eşlere hafif ping/pong; `lastSeen` haritası. 30 sn'yi geçen düğümler eş listesinden, rota tablosundan, DHT bucket'ından ve bellekten silinir; `beforeunload`/`visibilitychange`'de veda mesajı.

### 7. mDNS/LAN + Store-and-Forward DTN
WAN veya STUN/TURN erişilemezse LAN keşfi (mevcut `lanSignalUrls` + BroadcastChannel + yerel yayın) devreye girer. Teslim edilemeyen zarflar IndexedDB'de E2EE şifreli, TTL ve öncelikli kuyrukta bekler; alıcı görününce otomatik boşalır.

### 8. CGNAT / ICE / uyandırma
`call/engine.ts` ICE listesi tekrarlardan arındırılır, TURN (UDP+TCP+TLS 443) öncelik sırasına konur, `iceCandidatePoolSize` ve trickle ICE ile toplama kısaltılır. Uygulama kapalıyken mevcut Web Push altyapısı (`web-push.server.ts`, `api/public/push.ts`) "sinyal uyandırma" olarak arama/mesaj sinyaline bağlanır.

## Rust/Wasm hakkında karar gereken nokta

Depoda Rust crate'i yok. İki seçenek:
- **A (önerilen):** `crates/tedbirge-kernel` oluşturulur, `wasm-pack --target web` ile derlenip `public/kernel/` altına konur; yönlendirme + bincode codec Rust'ta, tarayıcıda Wasm, yükleme başarısızsa TS'e düşüş korunur.
- **B:** Wasm ertelenir; tüm 8 madde TypeScript worker'da yapılır, `wasm-provider` sözleşmesi ileriye dönük korunur.

Aksi belirtilmezse **A** uygulanır (derleme sandbox'ta yapılır, `.wasm` statik varlık olarak yayımlanır).

## Teknik notlar

- Etkilenen dosyalar: `src/kernel/*`, `src/lib/mesh-routing*.ts`, `src/lib/mesh-envelope.ts`, `src/lib/browser-node.ts`, `src/lib/e2ee.ts`, `src/lib/chat/transfer.ts`, `src/lib/p2p/*`, `src/lib/chat/directory.ts`, `src/lib/call/engine.ts`, yeni: `transit-config.ts`, `mesh/dht.ts`, `p2p/multipath-router.ts`, `kernel/kernel.worker.ts`, `kernel/kernel-client.ts`.
- `.wasm` yalnızca istemci tarafında, `public/wasm|kernel` altından URL ile yüklenir; SSR grafiğine girmez.
- Worker dosya adları `*.client.*` olmayacak (SSR derlemesi bu deseni reddediyor).
- Doğrulama: `tsgo`, `eslint`, `vitest` (yeni testler: k-hop alt grafik, ağırlık formülü, hedef filtresi, çok yollu birleştirme, GC eşiği), `bun run build` ve önizlemede canlı iki sekme testi.

## Akış şeması

```text
React UI ──ikili çerçeve/Transferable──> kernel.worker.ts ──> Wasm çekirdek (rota+codec)
   ^                                        │
   └────── olay/yanıt ──────────────────────┤──> E2EE seal/open
                                            └──> Multipath Chunk Router ──> N taşıyıcı hat
                                                          │
                                              hedef yok ──> DTN store-and-forward (IndexedDB)
```
