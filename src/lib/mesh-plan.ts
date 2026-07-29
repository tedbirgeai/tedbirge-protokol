/**
 * Kapsama / röle zinciri hesabının tek doğruluk kaynağı.
 * Hem /kapsama planlayıcısı hem de panel içindeki otomatik röle zinciri sihirbazı
 * bu modülü kullanır; iki yerde farklı sonuç çıkması mümkün değildir.
 */

export type CarrierId =
  | "lora"
  | "halow"
  | "tvws"
  | "wifi"
  | "wigig"
  | "fso"
  | "cellular"
  | "satellite"
  | "eth";

export const CARRIERS = [
  { id: "lora", name: "LoRa 868 MHz", baseKm: 5, mobile: true, note: "Düşük hız (0.3–37 kbps), mesaj/telemetri" },
  { id: "halow", name: "Wi-Fi HaLow 802.11ah", baseKm: 1.2, mobile: true, note: "IP trafiği, ~1–15 Mbps" },
  { id: "tvws", name: "TVWS (470–790 MHz)", baseKm: 8, mobile: false, note: "Veritabanı izni gerekir" },
  { id: "wifi", name: "Wi-Fi 2.4/5 GHz yönlü", baseKm: 3, mobile: false, note: "Sabit nokta-nokta, LoS şart" },
  { id: "wigig", name: "WiGig 60 GHz", baseKm: 1, mobile: false, note: "Gigabit, yağmurdan etkilenir" },
  { id: "fso", name: "FSO lazer", baseKm: 2, mobile: false, note: "Sisde kesilir, mekanik hizalama" },
  { id: "cellular", name: "Hücresel (LTE/5G)", baseKm: 0, mobile: true, note: "Operatör kapsaması varsa sınırsız" },
  { id: "satellite", name: "Uydu", baseKm: 0, mobile: true, note: "Gökyüzü görüşü varsa sınırsız" },
  { id: "eth", name: "Ethernet / fiber", baseKm: 0.1, mobile: false, note: "Sabit omurga" },
] as const;

export const TERRAIN = [
  { id: "los", name: "Açık arazi / tepe hattı", factor: 1 },
  { id: "rural", name: "Kırsal, seyrek ağaç", factor: 0.6 },
  { id: "suburb", name: "Banliyö, alçak yapı", factor: 0.35 },
  { id: "city", name: "Şehir içi, beton", factor: 0.18 },
  { id: "forest", name: "Orman / vadi", factor: 0.15 },
] as const;

export const HEIGHTS = [
  { id: "hand", name: "Elde / araç içi (~1.5 m)", factor: 0.5 },
  { id: "roof", name: "Çatı / direk (~8 m)", factor: 1 },
  { id: "mast", name: "Yüksek direk / tepe (~25 m)", factor: 1.7 },
] as const;

export type NodeRole = "gateway" | "relay" | "edge";

export type MeshPlan = {
  carrier: (typeof CARRIERS)[number];
  terrain: (typeof TERRAIN)[number];
  height: (typeof HEIGHTS)[number];
  /** Teorik/kataloğa göre tek atlama menzili (km). */
  modelHopKm: number;
  /** Saha ölçümleriyle kalibre edilmiş tek atlama menzili (km). */
  hopKm: number;
  /** Kalibrasyonda kullanılan ölçüm sayısı. */
  sampleCount: number;
  hops: number;
  relays: number;
  infrastructure: boolean;
  totalNodes: number;
  chain: { role: NodeRole; nodeId: string; label: string; distanceKm: number }[];
};

export type Measurement = {
  carrier: string;
  terrain: string;
  antenna_height: string;
  distance_km: number;
  link_ok: boolean;
};

export function findCarrier(id: string) {
  return CARRIERS.find((c) => c.id === id) ?? CARRIERS[0];
}
export function findTerrain(id: string) {
  return TERRAIN.find((t) => t.id === id) ?? TERRAIN[0];
}
export function findHeight(id: string) {
  return HEIGHTS.find((h) => h.id === id) ?? HEIGHTS[1];
}

/**
 * Gerçek saha ölçümleriyle kalibrasyon:
 * aynı taşıyıcı/arazi/yükseklik için başarılı en uzun bağlantı ile
 * başarısız en kısa bağlantı arasındaki eşik alınır ve model değeriyle harmanlanır.
 */
function calibrate(modelKm: number, samples: Measurement[]) {
  if (!samples.length) return { km: modelKm, count: 0 };
  const ok = samples.filter((s) => s.link_ok).map((s) => Number(s.distance_km));
  const fail = samples.filter((s) => !s.link_ok).map((s) => Number(s.distance_km));
  const bestOk = ok.length ? Math.max(...ok) : null;
  const worstFail = fail.length ? Math.min(...fail) : null;

  let measured: number;
  if (bestOk !== null && worstFail !== null) measured = (bestOk + worstFail) / 2;
  else if (bestOk !== null) measured = bestOk;
  else measured = Math.max(0.05, worstFail! * 0.8);

  // Ölçüm sayısı arttıkça saha verisinin ağırlığı artar (en fazla %80).
  const weight = Math.min(0.8, samples.length / (samples.length + 3));
  return { km: modelKm * (1 - weight) + measured * weight, count: samples.length };
}

export function buildMeshPlan(input: {
  carrierId: string;
  terrainId: string;
  heightId: string;
  distanceKm: number;
  measurements?: Measurement[];
}): MeshPlan {
  const carrier = findCarrier(input.carrierId);
  const terrain = findTerrain(input.terrainId);
  const height = findHeight(input.heightId);

  const modelHopKm = Math.max(0.05, carrier.baseKm * terrain.factor * height.factor);
  const relevant = (input.measurements ?? []).filter(
    (m) =>
      m.carrier === carrier.id &&
      m.terrain === terrain.id &&
      m.antenna_height === height.id &&
      Number.isFinite(Number(m.distance_km)),
  );
  const { km, count } = calibrate(modelHopKm, relevant);
  const hopKm = Math.max(0.05, km);

  const infrastructure = carrier.baseKm === 0;
  const hops = infrastructure ? 1 : Math.max(1, Math.ceil(input.distanceKm / hopKm));
  const relays = infrastructure ? 0 : Math.max(0, hops - 1);

  const chain: MeshPlan["chain"] = [
    { role: "gateway", nodeId: "ev-01", label: "Ev köprüsü (internet çıkışı)", distanceKm: 0 },
  ];
  for (let i = 1; i <= relays; i++) {
    chain.push({
      role: "relay",
      nodeId: `role-${String(i).padStart(2, "0")}`,
      label: `Ara röle ${i} (çatı/direk)`,
      distanceKm: Number((hopKm * i).toFixed(2)),
    });
  }
  chain.push({
    role: "edge",
    nodeId: "saha-01",
    label: "Saha ucu (cep/araç)",
    distanceKm: Number(input.distanceKm.toFixed(2)),
  });

  return {
    carrier,
    terrain,
    height,
    modelHopKm,
    hopKm,
    sampleCount: count,
    hops,
    relays,
    infrastructure,
    totalNodes: chain.length,
    chain,
  };
}

/** Düğüm ajanı için kopyala-yapıştır yapılandırması. */
export function agentSnippet(plan: MeshPlan, licenseKey = "<LISANS_ANAHTARINIZ>") {
  return plan.chain
    .map((n) => {
      const roleFlags =
        n.role === "gateway"
          ? "--uplink auto --queue-store on --failover-priority 1"
          : n.role === "relay"
            ? "--store-forward on --failover-priority 10"
            : "--roaming on --queue-store on";
      return `# ${n.label}
tedbirge-agent --role ${n.role} --carrier ${plan.carrier.id} --region TR \\
  --license-key ${licenseKey} --node-id ${n.nodeId} ${roleFlags}`;
    })
    .join("\n\n");
}
