# Elle Uygulanacak Anchored Edit'ler

Bu dosyadaki değişiklikler mevcut büyük dosyalara aittir ve GÜVENLİK için
otomatik yazılmadı. Sohbet yanıtındaki TASK 2/4/5 bölümlerindeki diff'leri
aşağıdaki dosyalara uygulayın:

- src/services/signaling.ts   → TASK 2 (routeViaWorker + buildLiveGraph + hopRadius)
- src/lib/browser-node.ts      → TASK 4 (import, alanlar, onMeshMessage touch,
                                  dinamik heartbeat, sweepStalePeers, stop temizliği)
- src/lib/browser-node.ts      → TASK 5 (buildMeshIce + const ICE değişimi)
- (opsiyonel) src/kernel/boot.ts → TASK 1 worker ısıtma

Not: .env içine kendi TURN'ünüz için VITE_TURN_URL / VITE_TURN_USERNAME /
VITE_TURN_CREDENTIAL ekleyin (yoksa açık röle yedeğine düşer).
