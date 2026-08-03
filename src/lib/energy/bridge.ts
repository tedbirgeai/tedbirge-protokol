/**
 * Enerji köprüsü — Web Serial üzerinden gerçek saha donanımı (Katman 12)
 * ------------------------------------------------------------------
 * Üç kaynak desteklenir:
 *  - Victron VE.Direct (metin akışı, salt okunur)
 *  - Modbus RTU (EG4/Growatt/BMS — periyodik salt-okuma isteği)
 *  - NMEA GNSS alıcı (konum/RTK kalitesi)
 *
 * Yazma yok: enerji köprüsü hiçbir cihaza komut göndermez (Modbus'ta yalnız
 * okuma fonksiyonları 0x03/0x04 kullanılır). Böylece sahadaki invertör
 * güvenliği etkilenmez.
 *
 * Donanım yoksa hiçbir değer üretilmez; panel "bağlı değil" gösterir.
 */

import { useSyncExternalStore } from "react";
import { getBrowserNodeId } from "@/lib/browser-node";
import {
  MODBUS_PROFILES,
  VeDirectFramer,
  buildModbusRead,
  decodeRegisters,
  parseModbusResponse,
  parseNmea,
  parseVeDirectBlock,
  type EnergyReading,
  type GnssFix,
  type ModbusProfile,
} from "@/lib/energy/protocol";

export type SourceKind = "vedirect" | "modbus" | "gnss";

export type EnergySource = {
  id: string;
  kind: SourceKind;
  name: string;
  connectedAt: number;
  lastFrameAt: number | null;
  frames: number;
  uploaded: number;
  reading: EnergyReading | null;
  fix: GnssFix | null;
  lastLine: string;
  error: string | null;
};

type State = {
  sources: Record<string, EnergySource>;
  supported: { serial: boolean };
};

let state: State = { sources: {}, supported: { serial: false } };
const listeners = new Set<() => void>();
let license: string | undefined;

function publish() {
  state = { ...state, sources: { ...state.sources } };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useEnergyBridge() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function refreshEnergySupport() {
  if (typeof navigator === "undefined") return;
  state = { ...state, supported: { serial: "serial" in navigator } };
  publish();
}

export function setEnergyLicense(key?: string) {
  license = key;
}

type Handle = { stop: () => Promise<void>; timer: ReturnType<typeof setInterval> | null };
const handles = new Map<string, Handle>();

function upsert(id: string, patch: Partial<EnergySource>) {
  const prev = state.sources[id];
  if (!prev) return;
  state.sources[id] = { ...prev, ...patch };
  publish();
}

/* ----------------------------- telemetri gönderimi ------------------------- */

async function postEnergyTelemetry(id: string) {
  const src = state.sources[id];
  if (!src || !license) return;
  const r = src.reading;
  const note = r
    ? `enerji · soc:${r.soc ?? "-"}% v:${r.batteryV ?? "-"} pv:${r.pvW ?? "-"}W yuk:${r.loadW ?? "-"}W`
    : src.fix
      ? `gnss · kalite:${src.fix.quality ?? "-"} uydu:${src.fix.sats ?? "-"}`
      : "enerji · ölçüm yok";
  try {
    const res = await fetch("/api/public/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tedbirge-License": license },
      body: JSON.stringify({
        node_id: `${getBrowserNodeId()}-${src.kind}`,
        label: `${src.name} (enerji katmanı)`,
        firmware: `energy-bridge-1.0/${src.kind}`,
        hops: 1,
        note: note.slice(0, 500),
      }),
    });
    upsert(id, {
      uploaded: res.ok ? src.uploaded + 1 : src.uploaded,
      error: res.ok ? null : `Panele yazılamadı (HTTP ${res.status}).`,
    });
  } catch {
    upsert(id, { error: "Bulut erişilemedi; ölçüm yerelde tutuluyor." });
  }
}

function startUplink(id: string) {
  const h = handles.get(id);
  if (!h || h.timer) return;
  h.timer = setInterval(() => void postEnergyTelemetry(id), 60_000);
}

/* -------------------------------- seri yardım ------------------------------ */

type SerialPortLike = {
  open: (o: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
};

async function requestPort(baudRate: number): Promise<SerialPortLike> {
  const nav = navigator as unknown as { serial?: { requestPort: () => Promise<SerialPortLike> } };
  if (!nav.serial) throw new Error("Bu tarayıcı Web Serial desteklemiyor. Chrome/Edge masaüstü kullanın.");
  const port = await nav.serial.requestPort();
  await port.open({ baudRate });
  return port;
}

function register(id: string, kind: SourceKind, name: string) {
  state.sources[id] = {
    id,
    kind,
    name,
    connectedAt: Date.now(),
    lastFrameAt: null,
    frames: 0,
    uploaded: 0,
    reading: null,
    fix: null,
    lastLine: "",
    error: null,
  };
  publish();
}

/* ------------------------------ VE.Direct girişi --------------------------- */

export async function connectVeDirect() {
  const id = "vedirect";
  if (handles.has(id)) return;
  const port = await requestPort(19200);
  register(id, "vedirect", "Victron VE.Direct");

  let stopped = false;
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable as unknown as WritableStream<Uint8Array>).catch(() => undefined);
  const reader = decoder.readable.getReader();
  const framer = new VeDirectFramer();

  (async () => {
    let buf = "";
    while (!stopped) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value ?? "";
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const block = framer.push(line);
        if (!block) continue;
        const reading = parseVeDirectBlock(block);
        if (!reading) continue;
        const prev = state.sources[id];
        upsert(id, {
          reading,
          frames: (prev?.frames ?? 0) + 1,
          lastFrameAt: Date.now(),
          lastLine: line.slice(0, 120),
          error: null,
        });
      }
    }
  })().catch((e) => upsert(id, { error: e instanceof Error ? e.message : "seri okuma hatası" }));

  handles.set(id, {
    timer: null,
    stop: async () => {
      stopped = true;
      await reader.cancel().catch(() => undefined);
      await port.close().catch(() => undefined);
    },
  });
  startUplink(id);
}

/* -------------------------------- Modbus girişi ---------------------------- */

export async function connectModbus(profileId: string) {
  const id = `modbus:${profileId}`;
  if (handles.has(id)) return;
  const profile = MODBUS_PROFILES.find((p) => p.id === profileId);
  if (!profile) throw new Error("Bilinmeyen cihaz profili.");
  const port = await requestPort(profile.baud);
  register(id, "modbus", profile.name);

  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();
  let stopped = false;
  let rx: number[] = [];

  const consume = (profileRef: ModbusProfile) => {
    // Beklenen uzunluk: slave + fn + bayt sayısı + veri + CRC
    const expected = 5 + profileRef.count * 2;
    if (rx.length < expected) return;
    const frame = new Uint8Array(rx.slice(0, expected));
    rx = rx.slice(expected);
    const parsed = parseModbusResponse(frame);
    const prev = state.sources[id];
    if (!parsed.ok) {
      upsert(id, { error: `Modbus: ${parsed.error}` });
      return;
    }
    upsert(id, {
      reading: decodeRegisters(profileRef, parsed.registers),
      frames: (prev?.frames ?? 0) + 1,
      lastFrameAt: Date.now(),
      lastLine: `${parsed.registers.length} kayıt okundu`,
      error: null,
    });
  };

  (async () => {
    while (!stopped) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) rx.push(...value);
      if (rx.length > 512) rx = rx.slice(-512);
      consume(profile);
    }
  })().catch((e) => upsert(id, { error: e instanceof Error ? e.message : "seri okuma hatası" }));

  const poll = async () => {
    try {
      await writer.write(buildModbusRead(profile.slave, profile.fn, profile.start, profile.count));
    } catch (e) {
      upsert(id, { error: e instanceof Error ? e.message : "Modbus isteği gönderilemedi." });
    }
  };
  void poll();
  const pollTimer = setInterval(() => void poll(), 5_000);

  handles.set(id, {
    timer: null,
    stop: async () => {
      stopped = true;
      clearInterval(pollTimer);
      await writer.close().catch(() => undefined);
      await reader.cancel().catch(() => undefined);
      await port.close().catch(() => undefined);
    },
  });
  startUplink(id);
}

/* --------------------------------- GNSS girişi ----------------------------- */

export async function connectGnss(baud = 9600) {
  const id = "gnss";
  if (handles.has(id)) return;
  const port = await requestPort(baud);
  register(id, "gnss", "GNSS / RTK alıcı");

  let stopped = false;
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable as unknown as WritableStream<Uint8Array>).catch(() => undefined);
  const reader = decoder.readable.getReader();

  (async () => {
    let buf = "";
    while (!stopped) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value ?? "";
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const fix = parseNmea(line);
        if (!fix) continue;
        const prev = state.sources[id];
        upsert(id, {
          fix: { ...(prev?.fix ?? {}), ...fix },
          frames: (prev?.frames ?? 0) + 1,
          lastFrameAt: Date.now(),
          lastLine: line.slice(0, 120),
          error: null,
        });
      }
    }
  })().catch((e) => upsert(id, { error: e instanceof Error ? e.message : "seri okuma hatası" }));

  handles.set(id, {
    timer: null,
    stop: async () => {
      stopped = true;
      await reader.cancel().catch(() => undefined);
      await port.close().catch(() => undefined);
    },
  });
  startUplink(id);
}

export async function disconnectEnergySource(id: string) {
  const h = handles.get(id);
  if (h) {
    if (h.timer) clearInterval(h.timer);
    await h.stop().catch(() => undefined);
    handles.delete(id);
  }
  delete state.sources[id];
  publish();
}

/** Bağlı kaynakların birleşik ölçümü — panelde tek kart olarak gösterilir. */
export function mergedReading(sources: Record<string, EnergySource>): EnergyReading | null {
  const readings = Object.values(sources)
    .map((s) => s.reading)
    .filter((r): r is EnergyReading => Boolean(r));
  if (readings.length === 0) return null;
  return readings.reduce<EnergyReading>((acc, r) => ({ ...acc, ...r }), {});
}
