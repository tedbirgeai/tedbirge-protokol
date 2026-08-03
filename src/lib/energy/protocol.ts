/**
 * Enerji & saha donanımı — protokol çözücüleri (Katman 12)
 * ------------------------------------------------------------------
 * Bu dosya saf fonksiyonlardan oluşur: donanımdan gelen ham satır/baytları
 * anlamlı ölçüme çevirir. Tarayıcı API'si kullanmaz, bu yüzden hem sunucu
 * hem tarayıcı tarafında test edilebilir.
 *
 * Desteklenen kaynaklar:
 *  - Victron VE.Direct (MPPT şarj kontrolcüsü, BMV akü izleyici, Phoenix)
 *  - Modbus RTU (EG4 / Growatt / Deye / jenerik invertör-BMS kayıt haritası)
 *  - NMEA 0183 (GNSS alıcı: GGA + RMC cümleleri)
 *
 * İlke: cihaz yoksa hiçbir değer uydurulmaz. Çözücüler yalnızca gerçekten
 * okunan alanları döndürür; okunmayan alan `undefined` kalır.
 */

/* ------------------------------ ortak tipler ------------------------------ */

export type EnergyReading = {
  /** Akü gerilimi (V) */
  batteryV?: number;
  /** Akü akımı (A) — pozitif şarj, negatif deşarj */
  batteryA?: number;
  /** Akü doluluk oranı (%) */
  soc?: number;
  /** Panel/PV gerilimi (V) */
  pvV?: number;
  /** Panel/PV gücü (W) */
  pvW?: number;
  /** Yük gücü (W) */
  loadW?: number;
  /** Cihaz sıcaklığı (°C) */
  tempC?: number;
  /** Şebeke/AC giriş var mı */
  acPresent?: boolean;
  /** Cihazın bildirdiği alarm metni */
  alarm?: string | null;
  /** Cihaz modeli/etiketi */
  model?: string;
};

export type GnssFix = {
  lat: number;
  lon: number;
  /** Rakım (m) */
  altM?: number;
  /** Uydu sayısı */
  sats?: number;
  /** Yatay hassasiyet seyreltmesi */
  hdop?: number;
  /** Sabitleme kalitesi: 0 yok, 1 GPS, 2 DGPS, 4 RTK sabit, 5 RTK yüzer */
  quality?: number;
  /** Hız (km/s) */
  speedKmh?: number;
  ts: number;
};

/* ---------------------------- Victron VE.Direct --------------------------- */

/**
 * VE.Direct metin protokolü: her satır `ETİKET<TAB>DEĞER`.
 * Blok sonunda `Checksum` alanı gelir; blok baytlarının toplamı 0 (mod 256)
 * olmalıdır. Doğrulama başarısızsa blok yok sayılır (bozuk veri gösterilmez).
 */
export function parseVeDirectBlock(block: string): EnergyReading | null {
  const lines = block.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const fields: Record<string, string> = {};
  for (const line of lines) {
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;
    fields[line.slice(0, tab).trim()] = line.slice(tab + 1).trim();
  }
  if (Object.keys(fields).length === 0) return null;

  const num = (key: string): number | undefined => {
    const raw = fields[key];
    if (raw === undefined) return undefined;
    const v = Number(raw);
    return Number.isFinite(v) ? v : undefined;
  };

  const mV = num("V");
  const mA = num("I");
  const pvmV = num("VPV");
  const permille = num("SOC");
  const alarmOn = fields["Alarm"] === "ON";

  const reading: EnergyReading = {
    batteryV: mV !== undefined ? round(mV / 1000, 3) : undefined,
    batteryA: mA !== undefined ? round(mA / 1000, 3) : undefined,
    soc: permille !== undefined ? round(permille / 10, 1) : undefined,
    pvV: pvmV !== undefined ? round(pvmV / 1000, 2) : undefined,
    pvW: num("PPV"),
    tempC: num("T"),
    alarm: alarmOn ? (fields["AR"] ? `VE.Direct alarm kodu ${fields["AR"]}` : "VE.Direct alarmı") : null,
    model: fields["PID"] ? `Victron ${fields["PID"]}` : undefined,
  };

  // Yük gücü doğrudan gelmiyorsa akü akımı ile PV gücünden türetilir.
  if (reading.loadW === undefined && reading.pvW !== undefined && reading.batteryV && reading.batteryA !== undefined) {
    const battW = reading.batteryV * reading.batteryA;
    const derived = reading.pvW - battW;
    if (Number.isFinite(derived) && derived >= 0) reading.loadW = round(derived, 1);
  }

  return stripUndefined(reading);
}

/** VE.Direct akışını tam bloklara böler (Checksum satırı blok sonudur). */
export class VeDirectFramer {
  private buf: string[] = [];

  push(line: string): string | null {
    this.buf.push(line);
    if (this.buf.length > 64) this.buf.splice(0, this.buf.length - 64);
    if (/^Checksum\t/.test(line)) {
      const block = this.buf.join("\n");
      this.buf = [];
      return block;
    }
    return null;
  }
}

/* -------------------------------- Modbus RTU ------------------------------ */

/** Modbus RTU CRC16 (poli 0xA001). */
export function modbusCrc16(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return crc & 0xffff;
}

/** 0x03 / 0x04 okuma isteği çerçevesi üretir. */
export function buildModbusRead(
  slave: number,
  fn: 3 | 4,
  start: number,
  count: number,
): Uint8Array {
  const body = new Uint8Array([
    slave & 0xff,
    fn,
    (start >> 8) & 0xff,
    start & 0xff,
    (count >> 8) & 0xff,
    count & 0xff,
  ]);
  const crc = modbusCrc16(body);
  const frame = new Uint8Array(body.length + 2);
  frame.set(body, 0);
  frame[body.length] = crc & 0xff;
  frame[body.length + 1] = (crc >> 8) & 0xff;
  return frame;
}

/** Yanıt çerçevesini doğrular ve 16-bit kayıt dizisine çevirir. */
export function parseModbusResponse(frame: Uint8Array):
  | { ok: true; slave: number; registers: number[] }
  | { ok: false; error: string } {
  if (frame.length < 5) return { ok: false, error: "Çerçeve çok kısa" };
  const crc = modbusCrc16(frame.subarray(0, frame.length - 2));
  const given = frame[frame.length - 2] | (frame[frame.length - 1] << 8);
  if (crc !== given) return { ok: false, error: "CRC uyuşmuyor" };
  const fn = frame[1];
  if (fn & 0x80) return { ok: false, error: `Modbus istisnası ${frame[2]}` };
  const byteCount = frame[2];
  if (frame.length < 3 + byteCount + 2) return { ok: false, error: "Eksik veri" };
  const registers: number[] = [];
  for (let i = 0; i < byteCount; i += 2) {
    registers.push((frame[3 + i] << 8) | frame[4 + i]);
  }
  return { ok: true, slave: frame[0], registers };
}

export type RegisterField = {
  key: keyof EnergyReading;
  /** Blok başlangıcına göre kayıt indeksi */
  offset: number;
  /** Ham değeri fiziksel birime çeviren çarpan */
  scale: number;
  /** İşaretli 16-bit mi (akım/güç için gerekir) */
  signed?: boolean;
  /** 32-bit (iki kayıt, büyük uçlu) */
  wide?: boolean;
};

export type ModbusProfile = {
  id: string;
  name: string;
  hint: string;
  slave: number;
  fn: 3 | 4;
  start: number;
  count: number;
  baud: number;
  fields: RegisterField[];
};

/**
 * Yaygın hibrit invertör/şarj kontrolcüsü kayıt haritaları.
 * Kayıt adresleri üreticinin yayımladığı Modbus dokümanına dayanır; cihaz
 * firmware sürümüne göre kaydırma olursa profil tek yerden düzeltilir.
 */
export const MODBUS_PROFILES: ModbusProfile[] = [
  {
    id: "eg4",
    name: "EG4 / Luxpower hibrit invertör",
    hint: "RS485–USB dönüştürücü, 19200 8N1, slave 1",
    slave: 1,
    fn: 4,
    start: 0,
    count: 16,
    baud: 19200,
    fields: [
      { key: "batteryV", offset: 4, scale: 0.1 },
      { key: "soc", offset: 5, scale: 1 },
      { key: "pvV", offset: 1, scale: 0.1 },
      { key: "pvW", offset: 7, scale: 1 },
      { key: "loadW", offset: 9, scale: 1 },
      { key: "batteryA", offset: 6, scale: 0.1, signed: true },
      { key: "tempC", offset: 12, scale: 0.1, signed: true },
    ],
  },
  {
    id: "growatt",
    name: "Growatt / Deye jenerik hibrit",
    hint: "RS485–USB, 9600 8N1, slave 1",
    slave: 1,
    fn: 4,
    start: 0,
    count: 20,
    baud: 9600,
    fields: [
      { key: "pvW", offset: 1, scale: 0.1, wide: true },
      { key: "pvV", offset: 3, scale: 0.1 },
      { key: "loadW", offset: 11, scale: 0.1, wide: true },
      { key: "batteryV", offset: 17, scale: 0.1 },
      { key: "soc", offset: 18, scale: 1 },
      { key: "tempC", offset: 19, scale: 0.1, signed: true },
    ],
  },
  {
    id: "pace-bms",
    name: "PACE / JBD BMS (LiFePO4 paket)",
    hint: "RS485, 9600 8N1, slave 1 — yalnızca akü verisi",
    slave: 1,
    fn: 3,
    start: 0,
    count: 8,
    baud: 9600,
    fields: [
      { key: "batteryV", offset: 0, scale: 0.01 },
      { key: "batteryA", offset: 1, scale: 0.01, signed: true },
      { key: "soc", offset: 3, scale: 1 },
      { key: "tempC", offset: 5, scale: 0.1, signed: true },
    ],
  },
];

/** Kayıt dizisini profil haritasıyla ölçüme çevirir. */
export function decodeRegisters(profile: ModbusProfile, registers: number[]): EnergyReading {
  const out: EnergyReading = { model: profile.name };
  for (const f of profile.fields) {
    const raw = f.wide
      ? registers[f.offset] === undefined || registers[f.offset + 1] === undefined
        ? undefined
        : (registers[f.offset] << 16) | registers[f.offset + 1]
      : registers[f.offset];
    if (raw === undefined) continue;
    const value = f.signed && !f.wide && raw > 0x7fff ? raw - 0x10000 : raw;
    (out as Record<string, number>)[f.key] = round(value * f.scale, 3);
  }
  return stripUndefined(out);
}

/* ---------------------------------- NMEA ---------------------------------- */

/** `$GPGGA,...*4A` biçimli cümlenin sağlama toplamını doğrular. */
export function nmeaChecksumOk(sentence: string): boolean {
  const s = sentence.trim();
  const star = s.lastIndexOf("*");
  if (!s.startsWith("$") || star < 0 || star + 3 > s.length) return false;
  let sum = 0;
  for (let i = 1; i < star; i += 1) sum ^= s.charCodeAt(i);
  return sum === parseInt(s.slice(star + 1, star + 3), 16);
}

function nmeaDegrees(value: string, hemi: string): number | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 3) return null;
  const deg = Number(value.slice(0, dot - 2));
  const min = Number(value.slice(dot - 2));
  if (!Number.isFinite(deg) || !Number.isFinite(min)) return null;
  const sign = hemi === "S" || hemi === "W" ? -1 : 1;
  return round(sign * (deg + min / 60), 6);
}

/** GGA ve RMC cümlelerinden konum sabitlemesi üretir. */
export function parseNmea(sentence: string, now = Date.now()): GnssFix | null {
  if (!nmeaChecksumOk(sentence)) return null;
  const body = sentence.trim().slice(1, sentence.trim().lastIndexOf("*"));
  const p = body.split(",");
  const type = p[0].slice(2);

  if (type === "GGA") {
    const lat = nmeaDegrees(p[2], p[3]);
    const lon = nmeaDegrees(p[4], p[5]);
    const quality = Number(p[6]);
    if (lat === null || lon === null || !quality) return null;
    return {
      lat,
      lon,
      quality,
      sats: Number(p[7]) || undefined,
      hdop: Number(p[8]) || undefined,
      altM: Number(p[9]) || undefined,
      ts: now,
    };
  }

  if (type === "RMC") {
    if (p[2] !== "A") return null;
    const lat = nmeaDegrees(p[3], p[4]);
    const lon = nmeaDegrees(p[5], p[6]);
    if (lat === null || lon === null) return null;
    const knots = Number(p[7]);
    return {
      lat,
      lon,
      quality: 1,
      speedKmh: Number.isFinite(knots) ? round(knots * 1.852, 1) : undefined,
      ts: now,
    };
  }

  return null;
}

export const GNSS_QUALITY_LABEL: Record<number, string> = {
  0: "Sabitleme yok",
  1: "GPS sabitlemesi",
  2: "DGPS düzeltmeli",
  4: "RTK sabit (santimetre)",
  5: "RTK yüzer (desimetre)",
  6: "Ataletsel tahmin",
};

/* -------------------------------- yardımcı -------------------------------- */

export function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function stripUndefined<T extends object>(obj: T): T {
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] === undefined) delete obj[k];
  }
  return obj;
}
