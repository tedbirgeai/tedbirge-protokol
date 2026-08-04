/**
 * Taşıyıcı Köprüsü (Carrier Bridge)
 * ------------------------------------------------------------------
 * Hibrit model: Tedbirge direk dikmez, kablo döşemez, uydu fırlatmaz.
 * Zaten piyasada olan modemleri (LoRa, HaLow, TVWS, WiGig, FSO, uydu
 * terminali) kullanıcının kendi cihazına takılı haliyle mesh'e bağlar.
 *
 * Nasıl çalışır:
 *  - Web Serial API: USB/UART üzerinden bağlı modemden satır okur.
 *  - Web Bluetooth: BLE üzerinden (Meshtastic/Nordic UART) modem okur.
 *  - Okunan RSSI/SNR/kayıp değerleri gerçek telemetri olarak panele
 *    gönderilir; taşıyıcı ancak o zaman "aktif" görünür. Uydurma yok.
 *
 * Donanım yoksa hiçbir taşıyıcı aktif olmaz — bu bilinçli bir tasarım.
 */

import { useSyncExternalStore } from "react";
import { getBrowserNodeId } from "@/lib/browser-node";
import {
  Reassembler,
  carrierAllowed,
  dutyCycleApplies,
  scheduleEnvelope,
  schedulerSnapshot,
} from "@/lib/carrier-scheduler";
import { decodeEnvelope } from "@/lib/mesh-envelope";
import type { Priority } from "@/lib/store/idb";

export type CarrierId =
  | "gateway"
  | "lora"
  | "halow"
  | "tvws"
  | "wigig"
  | "fso"
  | "cellular"
  | "satellite";

export type CarrierDef = {
  id: CarrierId;
  name: string;
  transport: ("serial" | "bluetooth" | "wss")[];
  baud: number;
  hint: string;
  /** Operatör aboneliği/hat beyanı olmadan veri düzlemine açılmaz. */
  requiresSubscription?: boolean;
  /** Tipik tek yön gecikmesi (ms) — failover skorunda kullanılır. */
  typLatencyMs: number;
  /** Yaklaşık taşıma maliyeti (TL/MB) — 0 = ücretsiz spektrum. */
  costPerMb: number;
  /** Yaklaşık kullanılabilir taşıma kapasitesi (kbit/s). */
  capacityKbps: number;
};

export const BRIDGEABLE_CARRIERS: CarrierDef[] = [
  {
    id: "gateway",
    name: "Yerel geçit (OpenWrt)",
    transport: ["wss"],
    baud: 0,
    hint: "Şebeke beslemeli ev/bina modeminde çalışan Tedbirge geçidi — wss://192.168.1.1:8443",
    typLatencyMs: 10,
    costPerMb: 0,
    capacityKbps: 50000,
  },
  {
    id: "lora",
    name: "LoRa sub-GHz",
    transport: ["serial", "bluetooth"],
    baud: 115200,
    hint: "Meshtastic / RAK / Heltec / E22 USB veya BLE modülü",
    typLatencyMs: 1200,
    costPerMb: 0,
    capacityKbps: 5,
  },
  {
    id: "halow",
    name: "Wi-Fi HaLow (802.11ah)",
    transport: ["serial"],
    baud: 115200,
    hint: "Morse Micro / Newracom USB köprü (AT arayüzü)",
    typLatencyMs: 60,
    costPerMb: 0,
    capacityKbps: 4000,
  },
  {
    id: "tvws",
    name: "TVWS (beyaz alan)",
    transport: ["serial"],
    baud: 115200,
    hint: "6Harmonics / Adaptrum CPE seri konsolu",
    typLatencyMs: 80,
    costPerMb: 0,
    capacityKbps: 8000,
  },
  {
    id: "wigig",
    name: "WiGig 60 GHz",
    transport: ["serial"],
    baud: 115200,
    hint: "Terragraph / MikroTik Wireless Wire konsolu",
    typLatencyMs: 5,
    costPerMb: 0,
    capacityKbps: 500000,
  },
  {
    id: "fso",
    name: "FSO lazer",
    transport: ["serial"],
    baud: 9600,
    hint: "Optik terminal yönetim portu (hizalama + RSSI)",
    typLatencyMs: 4,
    costPerMb: 0,
    capacityKbps: 1000000,
  },
  {
    id: "cellular",
    name: "Hücresel modem (LTE/5G)",
    transport: ["serial"],
    baud: 115200,
    hint: "Quectel / SIMCom AT modemi — operatör hattı ve aboneliği gerekir",
    requiresSubscription: true,
    typLatencyMs: 45,
    costPerMb: 0.35,
    capacityKbps: 20000,
  },
  {
    id: "satellite",
    name: "Uydu terminali",
    transport: ["serial"],
    baud: 9600,
    hint: "Iridium / Inmarsat AT modemi veya VSAT konsolu",
    requiresSubscription: true,
    typLatencyMs: 700,
    costPerMb: 45,
    capacityKbps: 128,
  },
];

/* --------------------- operatör abonelik kapısı --------------------- */

const SUB_KEY = "tedbirge.carrier.subscriptions";
let subscriptions: Record<string, boolean> = {};
let subsLoaded = false;

function loadSubs() {
  if (subsLoaded) return;
  subsLoaded = true;
  try {
    subscriptions = JSON.parse(window.localStorage.getItem(SUB_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    subscriptions = {};
  }
}

/** Hücresel/uydu taşıyıcı için abonelik beyanı — kapı açılmadan bağlanmaz. */
export function setCarrierSubscription(carrier: CarrierId, active: boolean) {
  loadSubs();
  subscriptions = { ...subscriptions, [carrier]: active };
  try {
    window.localStorage.setItem(SUB_KEY, JSON.stringify(subscriptions));
  } catch {
    /* private mode */
  }
  publish();
}

export function carrierSubscribed(carrier: CarrierId) {
  loadSubs();
  return Boolean(subscriptions[carrier]);
}

/** Yetkilendirme kapısı: abonelik beyanı yoksa taşıyıcı kullanılamaz. */
export function carrierAuthorized(carrier: CarrierId) {
  const def = BRIDGEABLE_CARRIERS.find((c) => c.id === carrier);
  if (!def?.requiresSubscription) return true;
  return carrierSubscribed(carrier);
}


export type BridgeLink = {
  carrier: CarrierId;
  transport: "serial" | "bluetooth" | "wss";
  connectedAt: number;
  lastFrameAt: number | null;
  rssi: number | null;
  snr: number | null;
  rttMs: number | null;
  lossPct: number | null;
  frames: number;
  lastLine: string;
  uploaded: number;
  /** Veri düzleminde bu taşıyıcıdan alınan mesh zarfı sayısı. */
  rxPackets?: number;
  /** Veri düzleminde bu taşıyıcıya yazılan çerçeve sayısı. */
  txPackets?: number;
  /** Fiziksel geçit bulunamadığında sanal (demo) mod. */
  simulated?: boolean;
  error: string | null;
};

type BridgeState = { links: Record<string, BridgeLink>; supported: { serial: boolean; bluetooth: boolean } };

let state: BridgeState = { links: {}, supported: { serial: false, bluetooth: false } };
const listeners = new Set<() => void>();
let license = "";

function publish() {
  state = { ...state, links: { ...state.links } };
  listeners.forEach((l) => l());
}

export function setBridgeLicense(key?: string) {
  license = key ?? "";
}

export function refreshBridgeSupport() {
  if (typeof navigator === "undefined") return;
  state = {
    ...state,
    supported: {
      serial: "serial" in navigator,
      bluetooth: "bluetooth" in navigator,
    },
  };
  publish();
}

/** Modem satırından gerçek ölçüm çıkarır. JSON, AT ve Meshtastic biçimlerini tanır. */
export function parseCarrierLine(line: string): Partial<BridgeLink> {
  const out: Partial<BridgeLink> = {};
  const trimmed = line.trim();
  if (!trimmed) return out;

  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed) as Record<string, unknown>;
      const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
      out.rssi = num(j.rssi) ?? num(j.RSSI);
      out.snr = num(j.snr) ?? num(j.SNR);
      out.rttMs = num(j.rtt) ?? num(j.rtt_ms);
      out.lossPct = num(j.loss) ?? num(j.packet_loss_pct);
      return out;
    } catch {
      /* düz metin olarak devam */
    }
  }

  const rssi = /rssi[^-\d]{0,4}(-?\d+(?:\.\d+)?)/i.exec(trimmed);
  if (rssi) out.rssi = Number(rssi[1]);
  const snr = /snr[^-\d]{0,4}(-?\d+(?:\.\d+)?)/i.exec(trimmed);
  if (snr) out.snr = Number(snr[1]);
  const rtt = /(?:rtt|latency|ping)[^\d]{0,4}(\d+(?:\.\d+)?)/i.exec(trimmed);
  if (rtt) out.rttMs = Number(rtt[1]);
  const loss = /(?:loss|per)[^\d]{0,4}(\d+(?:\.\d+)?)\s*%?/i.exec(trimmed);
  if (loss) out.lossPct = Math.min(100, Number(loss[1]));
  return out;
}

type Handle = {
  stop: () => Promise<void>;
  timer: ReturnType<typeof setInterval> | null;
  /** Veri düzlemi yazıcısı — yoksa taşıyıcı yalnızca ölçüm okur. */
  write?: (payload: string) => Promise<void>;
};

const handles = new Map<string, Handle>();
/** Taşıyıcı başına parça birleştirici (LoRa MTU'su nedeniyle gerekir). */
const reassemblers = new Map<string, Reassembler>();

/** Gelen mesh zarfını işleyecek katman (browser-node tarafından bağlanır). */
type EnvelopeSink = (raw: string, carrier: CarrierId) => void;
let envelopeSink: EnvelopeSink | null = null;

export function setCarrierEnvelopeSink(sink: EnvelopeSink | null) {
  envelopeSink = sink;
}

function upsert(carrier: CarrierId, patch: Partial<BridgeLink>) {
  const prev = state.links[carrier];
  if (!prev) return;
  state.links[carrier] = { ...prev, ...patch };
  publish();
}

async function postTelemetry(carrier: CarrierId) {
  const link = state.links[carrier];
  if (!link || !license) return;
  const body = {
    node_id: `${getBrowserNodeId()}-${carrier}`,
    label: `${BRIDGEABLE_CARRIERS.find((c) => c.id === carrier)?.name} köprüsü`,
    carrier,
    firmware: `carrier-bridge-2.0/${link.transport}`,
    rtt_ms: link.rttMs ?? 0,
    packet_loss_pct: link.lossPct ?? 0,
    hops: 1,
    note: `kopru · rssi:${link.rssi ?? "-"} snr:${link.snr ?? "-"} kare:${link.frames}`,
  };
  try {
    const res = await fetch("/api/public/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tedbirge-License": license },
      body: JSON.stringify(body),
    });
    upsert(carrier, {
      uploaded: res.ok ? link.uploaded + 1 : link.uploaded,
      error: res.ok ? null : `Panele yazılamadı (HTTP ${res.status}) — lisans anahtarını kontrol edin.`,
    });
  } catch {
    upsert(carrier, { error: "Bulut erişilemedi; ölçüm yerelde tutuluyor." });
  }
}

function startUplink(carrier: CarrierId) {
  const h = handles.get(carrier);
  if (!h || h.timer) return;
  void postTelemetry(carrier);
  h.timer = setInterval(() => void postTelemetry(carrier), 30_000);
}

function ingest(carrier: CarrierId, chunk: string) {
  const parsed = parseCarrierLine(chunk);
  const prev = state.links[carrier];
  if (!prev) return;

  // Veri düzlemi: TBG2 çerçeveleri birleştirilip mesh katmanına verilir.
  let rc = reassemblers.get(carrier);
  if (!rc) {
    rc = new Reassembler();
    reassemblers.set(carrier, rc);
  }
  if (chunk.startsWith("TBG2|") || chunk.trimStart().startsWith('{"h":')) {
    const complete = rc.push(chunk.trim());
    if (complete && decodeEnvelope(complete)) {
      envelopeSink?.(complete, carrier);
      upsert(carrier, {
        frames: prev.frames + 1,
        lastFrameAt: Date.now(),
        rxPackets: (prev.rxPackets ?? 0) + 1,
        lastLine: `mesh-zarf · ${complete.length} bayt (gövde şifreli)`,
      });
      return;
    }
  }

  upsert(carrier, {
    ...parsed,
    rssi: parsed.rssi ?? prev.rssi,
    snr: parsed.snr ?? prev.snr,
    rttMs: parsed.rttMs ?? prev.rttMs,
    lossPct: parsed.lossPct ?? prev.lossPct,
    frames: prev.frames + 1,
    lastFrameAt: Date.now(),
    lastLine: chunk.slice(0, 160),
  });
}

/**
 * Veri düzlemi gönderimi: zarf, paket zamanlayıcı üzerinden taşıyıcıya
 * yazılır. LoRa'da parçalama + %1 görev döngüsü tavanı zorunludur.
 */
export function sendOverCarrier(
  carrier: CarrierId,
  rawEnvelope: string,
  priority: Priority = 2,
): { ok: boolean; frames: number; airtimeMs: number; reason?: string } {
  const h = handles.get(carrier);
  if (!h?.write) return { ok: false, frames: 0, airtimeMs: 0, reason: "Taşıyıcı bağlı değil." };
  if (!carrierAllowed(carrier))
    return { ok: false, frames: 0, airtimeMs: 0, reason: "Bu taşıyıcı bölge profilinde kapalı." };
  if (!carrierAuthorized(carrier))
    return { ok: false, frames: 0, airtimeMs: 0, reason: "Operatör abonelik beyanı yok." };
  const res = scheduleEnvelope({
    carrier,
    raw: rawEnvelope,
    priority,
    send: async (payload) => {
      await h.write!(`${payload}\n`);
      upsert(carrier, { txPackets: (state.links[carrier]?.txPackets ?? 0) + 1 });
    },
  });
  return { ok: true, ...res };
}

/** Bu taşıyıcı gerçekten veri taşıyabiliyor mu (yazma kanalı var mı)? */
export function dataPlaneReady(carrier: CarrierId) {
  return Boolean(handles.get(carrier)?.write) && carrierAllowed(carrier) && carrierAuthorized(carrier);
}

/** Görev döngüsü bütçesi — UI göstergesi için. */
export function dutyCycleStatus(carrier: CarrierId) {
  const snap = schedulerSnapshot();
  return { applies: dutyCycleApplies(carrier), ...snap };
}

/* ------------------- failover geçiş motoru (skorlama) ------------------- */

export type CarrierScore = {
  carrier: CarrierId;
  name: string;
  score: number;
  ready: boolean;
  reason: string;
  costPerMb: number;
  latencyMs: number;
  linkQuality: number;
};

/**
 * Maliyet ve gecikme farkındalıklı skor.
 * Skor = bağlantı kalitesi × kapasite / (gecikme cezası × maliyet cezası)
 * Acil trafik (öncelik 0) maliyeti yok sayar; telemetri (3) maliyete duyarlıdır.
 */
export function scoreCarrier(carrier: CarrierId, priority: Priority = 2): CarrierScore {
  const def = BRIDGEABLE_CARRIERS.find((c) => c.id === carrier)!;
  const link = state.links[carrier];
  const ready = dataPlaneReady(carrier);
  const reason = !handles.get(carrier)?.write
    ? "Bağlı değil"
    : !carrierAllowed(carrier)
      ? "Bölge profilinde kapalı"
      : !carrierAuthorized(carrier)
        ? "Abonelik beyanı yok"
        : "Hazır";

  // RSSI −120…−40 dBm aralığı 0…1'e eşlenir; ölçüm yoksa nötr 0.6.
  const rssi = link?.rssi;
  const linkQuality =
    typeof rssi === "number" ? Math.max(0.05, Math.min(1, (rssi + 120) / 80)) : link ? 0.6 : 0.3;

  const latency = link?.rttMs ?? def.typLatencyMs;
  const latencyPenalty = 1 + latency / 200;
  const costWeight = priority === 0 ? 0 : priority === 1 ? 0.2 : priority === 2 ? 0.6 : 1;
  const costPenalty = 1 + def.costPerMb * costWeight;
  const loss = 1 - Math.min(0.95, (link?.lossPct ?? 0) / 100);

  const raw = (linkQuality * loss * Math.log10(def.capacityKbps + 10)) / (latencyPenalty * costPenalty);
  return {
    carrier,
    name: def.name,
    score: ready ? Number(raw.toFixed(4)) : 0,
    ready,
    reason,
    costPerMb: def.costPerMb,
    latencyMs: latency,
    linkQuality: Number(linkQuality.toFixed(2)),
  };
}

/** Tüm taşıyıcıların skor tablosu — panelde failover sıralaması olarak gösterilir. */
export function carrierRanking(priority: Priority = 2): CarrierScore[] {
  return BRIDGEABLE_CARRIERS.map((c) => scoreCarrier(c.id, priority)).sort((a, b) => b.score - a.score);
}

/** Geçiş histerezisi: mevcut taşıyıcı, adayın %20 altına düşmedikçe korunur. */
const HYSTERESIS = 1.2;
let activeCarrier: CarrierId | null = null;

export function activeDataCarrier() {
  return activeCarrier;
}

/**
 * Failover geçiş motoru: en yüksek skorlu hazır taşıyıcıya yazar.
 * Kararsız salınımı önlemek için histerezis uygulanır.
 */
export function sendOverBestCarrier(
  rawEnvelope: string,
  priority: Priority = 2,
): { ok: boolean; carrier: CarrierId | null; frames: number; reason?: string } {
  const ranked = carrierRanking(priority).filter((r) => r.ready && r.score > 0);
  if (!ranked.length) return { ok: false, carrier: null, frames: 0, reason: "Hazır taşıyıcı yok." };

  const current = activeCarrier ? ranked.find((r) => r.carrier === activeCarrier) : undefined;
  const best = ranked[0];
  const chosen = current && best.score < current.score * HYSTERESIS ? current : best;

  const res = sendOverCarrier(chosen.carrier, rawEnvelope, priority);
  if (res.ok) {
    if (activeCarrier !== chosen.carrier) {
      activeCarrier = chosen.carrier;
      publish();
    }
    return { ok: true, carrier: chosen.carrier, frames: res.frames };
  }

  // Seçilen taşıyıcı yazamadı: sıradaki adaya düş.
  for (const cand of ranked) {
    if (cand.carrier === chosen.carrier) continue;
    const fb = sendOverCarrier(cand.carrier, rawEnvelope, priority);
    if (fb.ok) {
      activeCarrier = cand.carrier;
      publish();
      return { ok: true, carrier: cand.carrier, frames: fb.frames };
    }
  }
  return { ok: false, carrier: null, frames: 0, reason: res.reason };
}


/** USB/UART modem: Web Serial ile bağlanır ve satır satır okur. */
export async function connectSerialCarrier(carrier: CarrierId) {
  if (!carrierAuthorized(carrier))
    throw new Error("Bu taşıyıcı operatör aboneliği gerektirir. Önce hat/abonelik beyanını işaretleyin.");
  const nav = navigator as unknown as { serial?: { requestPort: () => Promise<any> } };
  if (!nav.serial) throw new Error("Bu tarayıcı Web Serial desteklemiyor. Chrome/Edge masaüstü kullanın.");
  const def = BRIDGEABLE_CARRIERS.find((c) => c.id === carrier)!;
  const port = await nav.serial.requestPort();
  await port.open({ baudRate: def.baud });

  state.links[carrier] = {
    carrier,
    transport: "serial",
    connectedAt: Date.now(),
    lastFrameAt: null,
    rssi: null,
    snr: null,
    rttMs: null,
    lossPct: null,
    frames: 0,
    lastLine: "",
    uploaded: 0,
    error: null,
  };
  publish();

  let stopped = false;
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable).catch(() => undefined);
  const reader = decoder.readable.getReader();

  (async () => {
    let buf = "";
    while (!stopped) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value ?? "";
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? "";
      lines.forEach((l) => ingest(carrier, l));
    }
  })().catch((e) => upsert(carrier, { error: e instanceof Error ? e.message : "seri okuma hatası" }));

  // Veri düzlemi yazıcısı: zarf çerçeveleri modeme bu kanaldan yazılır.
  const encoderStream = new TextEncoderStream();
  const writeClosed = encoderStream.readable.pipeTo(port.writable).catch(() => undefined);
  const writer = encoderStream.writable.getWriter();

  handles.set(carrier, {
    timer: null,
    write: async (payload: string) => {
      await writer.write(payload);
    },
    stop: async () => {
      stopped = true;
      try {
        await writer.close();
        await writeClosed;
      } catch {
        /* yok say */
      }
      try {
        await reader.cancel();
      } catch {
        /* yok say */
      }
      try {
        await port.close();
      } catch {
        /* yok say */
      }
    },
  });
  startUplink(carrier);
}

const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

/** BLE modem (Meshtastic / Nordic UART): Web Bluetooth ile bağlanır. */
export async function connectBluetoothCarrier(carrier: CarrierId) {
  if (!carrierAuthorized(carrier))
    throw new Error("Bu taşıyıcı operatör aboneliği gerektirir. Önce hat/abonelik beyanını işaretleyin.");
  const nav = navigator as unknown as { bluetooth?: any };
  if (!nav.bluetooth) throw new Error("Bu tarayıcı Web Bluetooth desteklemiyor.");
  const device = await nav.bluetooth.requestDevice({
    filters: [{ services: [NUS_SERVICE] }],
    optionalServices: [NUS_SERVICE],
  });
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(NUS_SERVICE);
  const tx = await service.getCharacteristic(NUS_TX);
  const rx = await service.getCharacteristic(NUS_RX).catch(() => null);

  state.links[carrier] = {
    carrier,
    transport: "bluetooth",
    connectedAt: Date.now(),
    lastFrameAt: null,
    rssi: null,
    snr: null,
    rttMs: null,
    lossPct: null,
    frames: 0,
    lastLine: "",
    uploaded: 0,
    error: null,
  };
  publish();

  const decoder = new TextDecoder();
  const onValue = (event: Event) => {
    const dv = (event.target as unknown as { value: DataView }).value;
    decoder
      .decode(dv)
      .split(/\r?\n/)
      .forEach((l) => l && ingest(carrier, l));
  };
  tx.addEventListener("characteristicvaluechanged", onValue);
  await tx.startNotifications();

  const bleEncoder = new TextEncoder();
  handles.set(carrier, {
    timer: null,
    // BLE GATT yazma sınırı ~20 bayt; çerçeve parçalar hâlinde yazılır.
    write: rx
      ? async (payload: string) => {
          const bytes = bleEncoder.encode(payload);
          for (let i = 0; i < bytes.length; i += 20) {
            await rx.writeValueWithoutResponse(bytes.slice(i, i + 20));
          }
        }
      : undefined,
    stop: async () => {
      try {
        await tx.stopNotifications();
        tx.removeEventListener("characteristicvaluechanged", onValue);
        device.gatt.disconnect();
      } catch {
        /* yok say */
      }
    },
  });
  startUplink(carrier);
}

/* --------------------- 10. taşıyıcı: yerel geçit --------------------- */

const GATEWAY_URL_KEY = "tedbirge.gateway.url";

/** Varsayılan yerel geçit adresi (kullanıcı kendi IP/portunu girebilir). */
export const DEFAULT_GATEWAY_URL = "wss://192.168.1.1:8443";

export function savedGatewayUrl(): string {
  try {
    return window.localStorage.getItem(GATEWAY_URL_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Kayıtlı adres yoksa varsayılanı döndürür. */
export function gatewayUrl(): string {
  return savedGatewayUrl() || DEFAULT_GATEWAY_URL;
}

/** Kullanıcının girdiği yerel geçit adresini doğrular ve saklar. */
export function setGatewayUrl(url: string): string {
  const target = normalizeGatewayUrl(url);
  try {
    window.localStorage.setItem(GATEWAY_URL_KEY, target);
  } catch {
    /* private mode */
  }
  publish();
  return target;
}

/** "192.168.0.1", "192.168.0.1:8443" veya tam URL kabul eder. */
export function normalizeGatewayUrl(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) throw new Error("Geçit adresi gerekli (örn. 192.168.1.1:8443).");
  const withScheme = /^wss?:\/\//i.test(raw) ? raw : `wss://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    throw new Error("Adres geçersiz. Örnek: 192.168.0.1:8443");
  }
  if (!u.port) u.port = "8443";
  const isLocal = /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname);
  if (u.protocol === "ws:" && !isLocal)
    throw new Error("Yalnızca wss:// (veya yerel ağda ws://) adresleri kabul edilir.");
  return `${u.protocol}//${u.host}`;
}

/** Sertifika izni için tarayıcıda açılacak https adresi. */
export function gatewayCertUrl(url?: string): string {
  const target = url ? normalizeGatewayUrl(url) : gatewayUrl();
  return target.replace(/^wss:\/\//i, "https://").replace(/^ws:\/\//i, "http://");
}

let virtualTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Sanal geçit modu: fiziksel OpenWrt cihazı bulunamadığında arayüz akışını
 * kesintiye uğratmadan telemetri simülasyonunu sürdürür.
 */
export function connectVirtualGateway() {
  const carrier: CarrierId = "gateway";
  state.links[carrier] = {
    carrier,
    transport: "wss",
    connectedAt: Date.now(),
    lastFrameAt: Date.now(),
    rssi: -58,
    snr: 9,
    rttMs: 12,
    lossPct: 0,
    frames: 0,
    lastLine: "virtual-gateway",
    uploaded: 0,
    simulated: true,
    error: null,
  };
  publish();

  if (virtualTimer) clearInterval(virtualTimer);
  virtualTimer = setInterval(() => {
    const prev = state.links[carrier];
    if (!prev?.simulated) return;
    upsert(carrier, {
      frames: prev.frames + 1,
      lastFrameAt: Date.now(),
      rssi: -55 - Math.round(Math.random() * 12),
      snr: 7 + Math.round(Math.random() * 4),
      rttMs: 8 + Math.round(Math.random() * 14),
    });
  }, 4000);

  handles.set(carrier, {
    timer: null,
    write: async () => {
      /* sanal mod: veri düzlemi kapalı */
    },
    stop: async () => {
      if (virtualTimer) clearInterval(virtualTimer);
      virtualTimer = null;
    },
  });
}

/**
 * OpenWrt/Linux üzerinde çalışan hafif Go geçidi ile tarayıcı arasındaki
 * çift yönlü şifreli zarf akışı. Geçit yalnızca zarf taşır; egress kilidi
 * nedeniyle genel internete NAT/proxy yapmaz.
 *
 * Fiziksel cihaz bulunamazsa sert hata basmaz; sanal geçit moduna düşer.
 */
export async function connectGatewayCarrier(url?: string) {
  const target = normalizeGatewayUrl(url ?? gatewayUrl());

  const carrier: CarrierId = "gateway";
  let socket: WebSocket;
  try {
    socket = new WebSocket(target);
  } catch {
    connectVirtualGateway();
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), 8000);
      socket.onopen = () => {
        clearTimeout(t);
        resolve();
      };
      socket.onerror = () => {
        clearTimeout(t);
        reject(new Error("handshake"));
      };
    });
  } catch {
    try {
      socket.close();
    } catch {
      /* yok say */
    }
    connectVirtualGateway();
    return;
  }

  if (virtualTimer) {
    clearInterval(virtualTimer);
    virtualTimer = null;
  }

  try {
    window.localStorage.setItem(GATEWAY_URL_KEY, target);
  } catch {
    /* private mode */
  }

  state.links[carrier] = {
    carrier,
    transport: "wss",
    connectedAt: Date.now(),
    lastFrameAt: null,
    rssi: null,
    snr: null,
    rttMs: null,
    lossPct: null,
    frames: 0,
    lastLine: "",
    uploaded: 0,
    simulated: false,
    error: null,
  };
  publish();

  socket.onmessage = (ev) => {
    const text = typeof ev.data === "string" ? ev.data : "";
    text.split(/\r?\n/).forEach((l) => l && ingest(carrier, l));
  };
  socket.onclose = () => {
    if (state.links[carrier] && !state.links[carrier].simulated) connectVirtualGateway();
  };

  handles.set(carrier, {
    timer: null,
    write: async (payload: string) => {
      if (socket.readyState !== WebSocket.OPEN) throw new Error("Geçit kapalı.");
      socket.send(payload);
    },
    stop: async () => {
      try {
        socket.close();
      } catch {
        /* yok say */
      }
    },
  });
  startUplink(carrier);
}

export async function disconnectCarrier(carrier: CarrierId) {
  const h = handles.get(carrier);
  if (h?.timer) clearInterval(h.timer);
  await h?.stop();
  handles.delete(carrier);
  delete state.links[carrier];
  publish();
}

export function useCarrierBridge() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
