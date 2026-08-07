/**
 * Komuta Konsolu (Command Console) demo verisi.
 *
 * Tamamen istemci tarafı, statik gösterim verisidir. Gerçek bir backend'e
 * bağlı değildir; ultra-modern 3 sütunlu protokol + messenger panelinin
 * görsel ve etkileşimsel gösterimini besler.
 */

export type NodeStatus = "online" | "degraded" | "offline";

export interface ProtocolNode {
  id: string;
  code: string;
  label: string;
  region: string;
  status: NodeStatus;
  latencyMs: number;
  peers: number;
  layer: string;
}

export interface Tunnel {
  id: string;
  from: string;
  to: string;
  carrier: "mesh" | "sat" | "lora" | "fiber";
  throughput: string;
  encrypted: boolean;
  hops: number;
}

export interface HealthMetric {
  id: string;
  label: string;
  value: number; // 0-100
  unit: string;
  trend: "up" | "down" | "flat";
}

export type ChannelState = "aktif" | "senkronize" | "mesh";

export interface Channel {
  id: string;
  name: string;
  handle: string;
  state: ChannelState;
  unread: number;
  lastActivity: string;
  preview: string;
  cipher: string;
  members: number;
  pinned?: boolean;
}

export interface ConsoleMessage {
  id: string;
  channelId: string;
  author: string;
  role: "self" | "peer" | "system";
  body: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  tag?: string;
}

export interface AiInsight {
  id: string;
  kind: "risk" | "signal" | "action";
  title: string;
  detail: string;
  confidence: number;
}

export const NETWORK_NODES: ProtocolNode[] = [
  { id: "n1", code: "TR-IST-01", label: "İstanbul Ana", region: "Marmara", status: "online", latencyMs: 12, peers: 48, layer: "Trust" },
  { id: "n2", code: "TR-ANK-02", label: "Ankara Röle", region: "İç Anadolu", status: "online", latencyMs: 19, peers: 33, layer: "Relay" },
  { id: "n3", code: "TR-IZM-03", label: "İzmir Kenar", region: "Ege", status: "degraded", latencyMs: 88, peers: 21, layer: "Edge" },
  { id: "n4", code: "TR-VAN-07", label: "Van Off-Grid", region: "Doğu", status: "online", latencyMs: 42, peers: 12, layer: "Off-Grid" },
  { id: "n5", code: "TR-GAZ-05", label: "Gaziantep Saha", region: "Güneydoğu", status: "offline", latencyMs: 0, peers: 0, layer: "Sense" },
  { id: "n6", code: "TR-TRB-09", label: "Trabzon Loop", region: "Karadeniz", status: "online", latencyMs: 27, peers: 18, layer: "Loop" },
];

export const ACTIVE_TUNNELS: Tunnel[] = [
  { id: "t1", from: "IST-01", to: "ANK-02", carrier: "fiber", throughput: "1.2 Gb/s", encrypted: true, hops: 2 },
  { id: "t2", from: "ANK-02", to: "VAN-07", carrier: "sat", throughput: "48 Mb/s", encrypted: true, hops: 4 },
  { id: "t3", from: "IZM-03", to: "IST-01", carrier: "mesh", throughput: "112 Mb/s", encrypted: true, hops: 3 },
  { id: "t4", from: "VAN-07", to: "TRB-09", carrier: "lora", throughput: "9.6 kb/s", encrypted: true, hops: 6 },
];

export const HEALTH_METRICS: HealthMetric[] = [
  { id: "h1", label: "Ağ Bütünlüğü", value: 96, unit: "%", trend: "up" },
  { id: "h2", label: "Şifreleme Kapsamı", value: 100, unit: "%", trend: "flat" },
  { id: "h3", label: "Mesh Yoğunluğu", value: 74, unit: "%", trend: "up" },
  { id: "h4", label: "Röle Yükü", value: 38, unit: "%", trend: "down" },
];

export const CHANNELS: Channel[] = [
  {
    id: "c1",
    name: "Saha Komuta · Van",
    handle: "#saha-van",
    state: "aktif",
    unread: 3,
    lastActivity: "şimdi",
    preview: "Röle 7 üzerinden görüntü akışı stabil.",
    cipher: "X25519 · AES-256-GCM",
    members: 14,
    pinned: true,
  },
  {
    id: "c2",
    name: "Mesh Operasyon",
    handle: "#mesh-ops",
    state: "mesh",
    unread: 0,
    lastActivity: "2 dk",
    preview: "Yeni düğüm ağa katıldı: TR-TRB-09",
    cipher: "X25519 · ChaCha20",
    members: 27,
  },
  {
    id: "c3",
    name: "Uydu Yedek Hattı",
    handle: "#sat-backup",
    state: "senkronize",
    unread: 1,
    lastActivity: "8 dk",
    preview: "Senkronizasyon tamamlandı, 12 paket kuyrukta.",
    cipher: "Kyber-768 · AES-256",
    members: 6,
  },
  {
    id: "c4",
    name: "Kriz Masası",
    handle: "#kriz-masasi",
    state: "aktif",
    unread: 5,
    lastActivity: "12 dk",
    preview: "Bölge 3 için tahliye protokolü hazır.",
    cipher: "X25519 · AES-256-GCM",
    members: 9,
  },
  {
    id: "c5",
    name: "Sensör Telemetri",
    handle: "#telemetri",
    state: "senkronize",
    unread: 0,
    lastActivity: "22 dk",
    preview: "Sıcaklık ve titreşim verisi normal aralıkta.",
    cipher: "X25519 · ChaCha20",
    members: 4,
  },
  {
    id: "c6",
    name: "Off-Grid Köy Ağı",
    handle: "#offgrid-koy",
    state: "mesh",
    unread: 2,
    lastActivity: "34 dk",
    preview: "LoRa üzerinden 6 atlama ile ulaşıldı.",
    cipher: "X25519 · AES-256-GCM",
    members: 31,
  },
];

export const MESSAGES: ConsoleMessage[] = [
  { id: "m1", channelId: "c1", author: "Sistem", role: "system", body: "Kanal uçtan uca şifreli. Anahtar parmak izi doğrulandı.", time: "09:58", tag: "güvenli" },
  { id: "m2", channelId: "c1", author: "Deniz K.", role: "peer", body: "Röle 7 üzerinden görüntü akışını başlattım, gecikme 42 ms.", time: "10:01", status: "read" },
  { id: "m3", channelId: "c1", author: "Deniz K.", role: "peer", body: "Bölge 3'te bağlantı zayıf, mesh üzerinden yeniden yönlendiriyorum.", time: "10:02", status: "read" },
  { id: "m4", channelId: "c1", author: "Sen", role: "self", body: "Anlaşıldı. VAN-07 düğümünü ikincil röle olarak devreye al.", time: "10:03", status: "read" },
  { id: "m5", channelId: "c1", author: "Sistem", role: "system", body: "VAN-07 düğümü ikincil röle olarak eklendi. Yeni yol: 4 atlama.", time: "10:03", tag: "otomasyon" },
  { id: "m6", channelId: "c1", author: "Deniz K.", role: "peer", body: "Akış stabil. Kapsama %96'ya çıktı.", time: "10:05", status: "delivered" },

  { id: "m7", channelId: "c2", author: "Sistem", role: "system", body: "TR-TRB-09 ağa katıldı, 18 eş ile eşleşti.", time: "09:44", tag: "topoloji" },
  { id: "m8", channelId: "c2", author: "Mesh Ajanı", role: "peer", body: "Topoloji yeniden hesaplandı, yoğunluk %74.", time: "09:45", status: "read" },

  { id: "m9", channelId: "c4", author: "Kriz Koord.", role: "peer", body: "Bölge 3 tahliye protokolü hazır, onay bekliyor.", time: "09:51", status: "read" },
  { id: "m10", channelId: "c4", author: "Sen", role: "self", body: "Onaylıyorum. Tüm sahaya push bildirimi gönder.", time: "09:52", status: "delivered" },
];

export const AI_INSIGHTS: AiInsight[] = [
  { id: "a1", kind: "risk", title: "IZM-03 düğümü zayıflıyor", detail: "Gecikme 88 ms'ye yükseldi. Trafiği IST-01 üzerinden yeniden dengelemeyi öner.", confidence: 87 },
  { id: "a2", kind: "signal", title: "Mesh yoğunluğu artışı", detail: "Son 10 dakikada 2 yeni düğüm katıldı. Off-grid kapsama genişliyor.", confidence: 93 },
  { id: "a3", kind: "action", title: "Anahtar rotasyonu zamanı", detail: "#kriz-masasi kanalı için oturum anahtarı 6 saattir aktif. Rotasyon önerilir.", confidence: 78 },
];
