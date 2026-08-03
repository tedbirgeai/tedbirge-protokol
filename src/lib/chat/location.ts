/**
 * Konum paylaşımı ve acil durum bilgisi — afet anında hayati katman.
 * ------------------------------------------------------------------
 * - Konum, cihazın GPS/ağ sağlayıcısından alınır ve mesaj gövdesinde
 *   uçtan uca şifreli olarak taşınır; hiçbir harita sunucusuna istek
 *   atılmaz.
 * - "Harita karesi" tamamen çevrimdışı üretilir: koordinat, ızgara,
 *   ölçek ve yön oku cihaz üzerinde canvas ile çizilir. İnternet yokken
 *   de görünür ve yazdırılabilir.
 * - Pil seviyesi ve doğruluk, kurtarma ekibinin önceliklendirme yapması
 *   için birlikte iletilir.
 */

export type GeoPoint = {
  lat: number;
  lon: number;
  /** Metre cinsinden yatay doğruluk. */
  acc?: number;
  /** Metre cinsinden rakım. */
  alt?: number;
  ts: number;
};

export type EmergencyInfo = {
  point: GeoPoint | null;
  /** 0-100 arası pil yüzdesi. */
  battery: number | null;
  charging: boolean | null;
  /** Kullanıcının yazdığı kısa not. */
  note?: string;
};

export async function currentPosition(timeoutMs = 12_000): Promise<GeoPoint> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Bu cihaz konum sağlamıyor.");
  }
  return new Promise<GeoPoint>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          acc: Number.isFinite(p.coords.accuracy) ? Math.round(p.coords.accuracy) : undefined,
          alt: p.coords.altitude != null ? Math.round(p.coords.altitude) : undefined,
          ts: Date.now(),
        }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Konum izni verilmedi. Tarayıcı ayarlarından izin verin."
              : "Konum alınamadı. Açık alanda tekrar deneyin.",
          ),
        ),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}

type BatteryLike = { level: number; charging: boolean };

export async function batteryStatus(): Promise<{ level: number | null; charging: boolean | null }> {
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
  if (typeof nav.getBattery !== "function") return { level: null, charging: null };
  try {
    const b = await nav.getBattery();
    return { level: Math.round(b.level * 100), charging: b.charging };
  } catch {
    return { level: null, charging: null };
  }
}

export async function collectEmergency(note?: string): Promise<EmergencyInfo> {
  const [point, battery] = await Promise.all([
    currentPosition().catch(() => null),
    batteryStatus(),
  ]);
  return { point, battery: battery.level, charging: battery.charging, note };
}

/** İnsan okunur derece-dakika-saniye gösterimi (telsizle okumak için). */
export function toDms(value: number, axis: "lat" | "lon"): string {
  const dir = axis === "lat" ? (value >= 0 ? "K" : "G") : value >= 0 ? "D" : "B";
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = ((mFloat - m) * 60).toFixed(1);
  return `${d}°${String(m).padStart(2, "0")}'${s}" ${dir}`;
}

export function geoText(p: GeoPoint): string {
  return `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}${p.acc ? ` (±${p.acc} m)` : ""}`;
}

/** Çevrimiçi olunduğunda açılacak evrensel bağlantı (tıklanabilir). */
export function geoUri(p: GeoPoint): string {
  return `geo:${p.lat},${p.lon}?q=${p.lat},${p.lon}`;
}

/**
 * Çevrimdışı harita karesi: 480×360 PNG. Ağ isteği yok.
 * 200 m ızgara, merkez işareti, koordinat ve DMS bilgisi çizilir.
 */
export function offlineMapFrame(p: GeoPoint, label = "Konum"): string {
  const W = 480;
  const H = 360;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#0f1c17";
  ctx.fillRect(0, 0, W, H);

  // Izgara — her kare ~200 m
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }

  // Doğruluk halkası (48 px = 200 m ölçeğine göre)
  const cx = W / 2;
  const cy = H / 2 - 8;
  if (p.acc) {
    const r = Math.max(10, Math.min(140, (p.acc / 200) * 48));
    ctx.fillStyle = "rgba(37,211,102,0.16)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Merkez işareti
  ctx.fillStyle = "#25d366";
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.stroke();

  // Kuzey oku
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.moveTo(W - 28, 18);
  ctx.lineTo(W - 20, 40);
  ctx.lineTo(W - 28, 34);
  ctx.lineTo(W - 36, 40);
  ctx.closePath();
  ctx.fill();
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("K", W - 31, 54);

  // Ölçek çubuğu
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, H - 26);
  ctx.lineTo(16 + 48, H - 26);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("200 m", 16, H - 32);

  // Bilgi bandı
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText(label, 12, 22);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, H - 18, W, 18);
  ctx.fillStyle = "#e7f5ee";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText(`${geoText(p)} · ${toDms(p.lat, "lat")} ${toDms(p.lon, "lon")}`, 12, H - 5);

  return canvas.toDataURL("image/png");
}
