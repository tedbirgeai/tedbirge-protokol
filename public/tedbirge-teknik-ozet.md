# Tedbirge Gateway — Teknik Özet (v0.6a turnkey)

Satıcı: Mehmet DİNÇ (Tedbirge) · Türkiye · tedbirge34@gmail.com

## 1. Nedir

Tedbirge Gateway; taşıyıcı-bağımsız (PHY-agnostic), sıfır-bilgi bir tünel geçidi ve mesh
SDK'sıdır. Tek statik binary olarak çalışır; Node.js, CDN, harici veritabanı veya çalışma
zamanı paket indirmesi gerektirmez.

## 2. Modüller

- **Tedbirge Gateway** — Tünel proxy motoru ve exit node. AES-256-GCM chunk şifreleme,
  zero-knowledge ölçüm, WAN köprüsü.
- **Tedbirge Loop** — Mesh yönlendirme ve gossip halkası. Dijkstra çok-sıçramalı yol seçimi,
  komşu keşfi, TTL ve loop-prevention.
- **Tedbirge Off-Grid** — İnternetsiz muhasebe katmanı. Ed25519 imzalı fiş, relay credit,
  çift harcama koruması, sonradan mahsuplaşma.

## 3. Taşıyıcı matrisi (9 fiziksel katman)

Ethernet, Wi-Fi, Hücresel, Uydu, WiGig 60 GHz, FSO Lazer, Wi-Fi HaLow, TVWS, LoRa.
Varsayılan profiller Türkiye ve AB spektrum kurallarına göre sınırlandırılmıştır.

## 4. Güvenlik

- Ed25519 düğüm kimliği, katılımda Proof-of-Work
- Nonce kayan penceresiyle replay koruması
- AES-256-GCM uçtan uca chunk şifreleme
- İçerik saklanmaz; yalnızca SHA-256 özeti ve bayt sayımı tutulur

## 5. Konuşlandırma

```
# Düğüm A — sahra röle noktası
TEDBIRGE_MESH=true \
TEDBIRGE_MESH_NODE_ID=saha-A \
TEDBIRGE_MESH_ADDR=:7946 tedbirge-gateway

# Düğüm B — A'yı tohum komşu alır
TEDBIRGE_MESH=true \
TEDBIRGE_MESH_SEEDS=10.0.0.1:7946 tedbirge-gateway

# Doğrulama
tedbirge-cli mesh-demo   # 3 düğüm, kayıpsız
tedbirge-cli p2p-demo    # 0-WAN takas
tedbirge-cli exit-demo   # WAN köprüsü
```

## 6. Platform desteği

Linux (amd64/arm64), Windows, macOS. CGO gerektirmeyen cross-compilation.

## 7. Lisanslama

- Community — ücretsiz, tek düğüm / değerlendirme
- Enterprise — düğüm başına aylık abonelik, lisans anahtarı ile düğüm limiti
- Operator — özel kapsam, kurumsal sözleşme

Ayrıntı: https://artisan-project-studio.lovable.app/fiyatlandirma
