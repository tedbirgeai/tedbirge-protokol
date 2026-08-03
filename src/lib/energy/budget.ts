/**
 * Enerji bütçesi ve otonomi hesabı (Katman 12)
 * ------------------------------------------------------------------
 * Saha kurulum hizmetinin çekirdek hesabı: panel gücü, akü kapasitesi ve
 * yük profiliyle "kaç gün güneşsiz ayakta kalır?" sorusunu yanıtlar.
 * Tamamı saf fonksiyondur; ölçüm varsa gerçek ölçümle, yoksa yalnızca
 * kullanıcının girdiği tasarım değerleriyle çalışır — uydurma veri yok.
 */

import type { EnergyReading } from "@/lib/energy/protocol";
import { round } from "@/lib/energy/protocol";

export type LoadItem = {
  id: string;
  label: string;
  /** Ortalama çekilen güç (W) */
  watts: number;
  /** Günlük çalışma süresi (saat) */
  hours: number;
  /** Kritik yük mü — kısıtlama kipinde kapatılmaz */
  critical?: boolean;
};

export type SiteDesign = {
  /** Panel tepe gücü (Wp) */
  panelWp: number;
  /** Günlük etkin güneşlenme (saat) — tesisin ayına göre */
  sunHours: number;
  /** Akü nominal gerilimi (V) */
  batteryV: number;
  /** Akü kapasitesi (Ah) */
  batteryAh: number;
  /** İzin verilen deşarj derinliği (%) — LiFePO4 için tipik 80 */
  dodPct: number;
  /** Sistem verimi (%) — MPPT, kablo ve dönüştürücü kayıpları dahil */
  efficiencyPct: number;
  loads: LoadItem[];
};

export type BudgetResult = {
  dailyLoadWh: number;
  criticalLoadWh: number;
  dailyHarvestWh: number;
  usableWh: number;
  /** Günlük net enerji (Wh) — negatifse sistem her gün açık verir */
  netWh: number;
  /** Güneşsiz gün otonomisi (tüm yükler) */
  autonomyDays: number;
  /** Güneşsiz gün otonomisi (yalnızca kritik yükler) */
  criticalAutonomyDays: number;
  /** Bütçeyi kapatmak için gereken minimum panel gücü (Wp) */
  requiredPanelWp: number;
  /** 3 gün otonomi için gereken akü (Ah) */
  requiredBatteryAh: number;
  verdict: "yeterli" | "sinirda" | "yetersiz";
  notes: string[];
};

export const DEFAULT_DESIGN: SiteDesign = {
  panelWp: 100,
  sunHours: 3.2,
  batteryV: 12.8,
  batteryAh: 100,
  dodPct: 80,
  efficiencyPct: 80,
  loads: [
    { id: "node", label: "Mesh düğümü (LoRa/HaLow)", watts: 3, hours: 24, critical: true },
    { id: "router", label: "Yönlendirici / erişim noktası", watts: 6, hours: 24 },
    { id: "cam", label: "Saha kamerası", watts: 4, hours: 12 },
    { id: "modem", label: "Uydu terminali (aralıklı)", watts: 45, hours: 1 },
  ],
};

export function computeBudget(d: SiteDesign): BudgetResult {
  const eff = clamp(d.efficiencyPct, 30, 100) / 100;
  const dailyLoadWh = d.loads.reduce((s, l) => s + Math.max(0, l.watts) * clamp(l.hours, 0, 24), 0);
  const criticalLoadWh = d.loads
    .filter((l) => l.critical)
    .reduce((s, l) => s + Math.max(0, l.watts) * clamp(l.hours, 0, 24), 0);

  const dailyHarvestWh = d.panelWp * Math.max(0, d.sunHours) * eff;
  const usableWh = d.batteryV * d.batteryAh * (clamp(d.dodPct, 10, 100) / 100) * eff;
  const netWh = dailyHarvestWh - dailyLoadWh;

  const autonomyDays = dailyLoadWh > 0 ? usableWh / dailyLoadWh : Infinity;
  const criticalAutonomyDays = criticalLoadWh > 0 ? usableWh / criticalLoadWh : Infinity;

  const requiredPanelWp = d.sunHours > 0 ? (dailyLoadWh * 1.25) / (d.sunHours * eff) : Infinity;
  const requiredBatteryAh =
    d.batteryV > 0 ? (dailyLoadWh * 3) / (d.batteryV * (clamp(d.dodPct, 10, 100) / 100) * eff) : Infinity;

  const notes: string[] = [];
  if (netWh < 0) notes.push("Günlük üretim tüketimi karşılamıyor; panel gücünü artırın veya yükü kısın.");
  if (autonomyDays < 3) notes.push("Güneşsiz gün otonomisi 3 günün altında; akü kapasitesi yetersiz.");
  if (d.dodPct > 85) notes.push("Deşarj derinliği %85 üzerinde; akü ömrü kısalır (LiFePO4 için %80 önerilir).");
  if (d.sunHours > 5.5) notes.push("Güneşlenme değeri iyimser; kış ayı ortalamasıyla yeniden hesaplayın.");
  if (notes.length === 0) notes.push("Tasarım hedefleri karşılıyor; kış ayı değerleriyle de doğrulayın.");

  const verdict: BudgetResult["verdict"] =
    netWh >= 0 && autonomyDays >= 3 ? "yeterli" : netWh >= 0 || criticalAutonomyDays >= 3 ? "sinirda" : "yetersiz";

  return {
    dailyLoadWh: round(dailyLoadWh, 1),
    criticalLoadWh: round(criticalLoadWh, 1),
    dailyHarvestWh: round(dailyHarvestWh, 1),
    usableWh: round(usableWh, 1),
    netWh: round(netWh, 1),
    autonomyDays: finite(autonomyDays),
    criticalAutonomyDays: finite(criticalAutonomyDays),
    requiredPanelWp: Math.ceil(finite(requiredPanelWp)),
    requiredBatteryAh: Math.ceil(finite(requiredBatteryAh)),
    verdict,
    notes,
  };
}

/* ------------------------------ canlı ölçümler ----------------------------- */

export type EnergyAlarm = {
  level: "kritik" | "uyari" | "bilgi";
  text: string;
};

/** Gerçek ölçümden kalan çalışma süresi (saat). Ölçüm eksikse null. */
export function estimateRuntimeH(reading: EnergyReading, d: SiteDesign): number | null {
  if (reading.soc === undefined) return null;
  const usableWh = d.batteryV * d.batteryAh * (clamp(d.dodPct, 10, 100) / 100);
  const remainingWh = usableWh * (clamp(reading.soc, 0, 100) / 100);
  const netW =
    reading.loadW !== undefined && reading.pvW !== undefined
      ? reading.loadW - reading.pvW
      : reading.batteryV !== undefined && reading.batteryA !== undefined && reading.batteryA < 0
        ? Math.abs(reading.batteryV * reading.batteryA)
        : null;
  if (netW === null || netW <= 0) return null;
  return round(remainingWh / netW, 1);
}

/** Ölçümden alarm üretir; eşikler saha kurulum standardımızdır. */
export function energyAlarms(reading: EnergyReading, d: SiteDesign): EnergyAlarm[] {
  const out: EnergyAlarm[] = [];
  if (reading.alarm) out.push({ level: "kritik", text: reading.alarm });

  if (reading.soc !== undefined) {
    if (reading.soc < 20) out.push({ level: "kritik", text: `Akü %${reading.soc} — bakım ekibi yönlendirilmeli.` });
    else if (reading.soc < 40) out.push({ level: "uyari", text: `Akü %${reading.soc} — yük kısıtlama kipi önerilir.` });
  }

  if (reading.batteryV !== undefined && d.batteryV > 0) {
    const perCell = reading.batteryV / (d.batteryV / 3.2);
    if (perCell < 2.9) out.push({ level: "kritik", text: "Hücre gerilimi alt sınırın altında; derin deşarj riski." });
    else if (perCell > 3.65) out.push({ level: "uyari", text: "Hücre gerilimi üst sınırda; şarj kontrolcüsünü denetleyin." });
  }

  if (reading.tempC !== undefined) {
    if (reading.tempC < -20 || reading.tempC > 55)
      out.push({ level: "kritik", text: `Sıcaklık ${reading.tempC} °C — çalışma aralığı dışında, şarj kesilmeli.` });
    else if (reading.tempC > 45) out.push({ level: "uyari", text: `Sıcaklık ${reading.tempC} °C — havalandırmayı denetleyin.` });
  }

  if (reading.pvW !== undefined && reading.pvW === 0 && reading.soc !== undefined && reading.soc < 60)
    out.push({ level: "bilgi", text: "Panel üretimi yok; gölgelenme veya kablo kopukluğu kontrol edilmeli." });

  return out;
}

/** Pil durumuna göre önerilen düğüm rolü — enerji bütçesi ile mesh'i bağlar. */
export function suggestedNodeRole(soc: number | undefined): {
  role: "role" | "uc" | "uyku";
  reason: string;
} {
  if (soc === undefined) return { role: "role", reason: "Ölçüm yok; varsayılan röle rolü." };
  if (soc < 15) return { role: "uyku", reason: "Pil %15 altında; yalnızca acil trafik taşınır." };
  if (soc < 35) return { role: "uc", reason: "Pil düşük; yönlendirme yükü dolu düğümlere kaydırılır." };
  return { role: "role", reason: "Pil yeterli; tam röle görevi sürer." };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}

function finite(n: number) {
  return Number.isFinite(n) ? round(n, 1) : 999;
}
