/**
 * Proaktif ağ içgörüleri.
 * Gerçek düğüm ve telemetri verisinden türetilir; hiçbir örnek/sahte veri kullanılmaz.
 */

export type InsightSeverity = "critical" | "warning" | "info";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  action: string;
  ask: string;
};

export type InsightDevice = {
  id: string;
  node_id: string;
  region: string;
  carrier: string | null;
  role: string | null;
  status: string;
  last_seen_at: string | null;
  last_error_code: string | null;
};

export type InsightSample = {
  device_id: string;
  rtt_ms: number | null;
  packet_loss_pct: number | null;
  throughput_kbps: number | null;
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isFresh(lastSeen: string | null) {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}

export function buildInsights(devices: InsightDevice[], samples: InsightSample[]): Insight[] {
  const out: Insight[] = [];
  const active = devices.filter((d) => d.status === "active");
  const online = active.filter((d) => isFresh(d.last_seen_at));

  if (active.length === 0) {
    out.push({
      id: "no-nodes",
      severity: "info",
      title: "Henüz aktif düğüm yok",
      detail: "Ağ topolojisi kurulmadı; ilk düğümü başlattığınızda içgörüler otomatik üretilir.",
      action: "Genel bakış sekmesinden ağı başlatın veya QR ile ikinci cihazı ekleyin.",
      ask: "İlk düğümümü nasıl kurarım?",
    });
    return out;
  }

  if (online.length === 0) {
    out.push({
      id: "all-offline",
      severity: "critical",
      title: "Hiçbir düğüm telemetri göndermiyor",
      detail: `${active.length} kayıtlı düğümün tamamı 5 dakikadan uzun süredir sessiz.`,
      action: "Gateway ajanının çalıştığını ve lisans anahtarının doğru olduğunu doğrulayın.",
      ask: "Düğümlerim çevrimdışı görünüyor, neden telemetri gelmiyor?",
    });
  }

  const gateway = online.some((d) => d.role === "gateway" || /^(ev|gw|home)/i.test(d.node_id));
  if (!gateway && online.length > 0) {
    out.push({
      id: "no-gateway",
      severity: "critical",
      title: "Çevrimiçi ağ geçidi yok",
      detail: "Röle ve saha uçları var ancak yukarı yönlü çıkışı sağlayan gateway düğümü sessiz.",
      action: "Ev/ofis köprüsünü açın ya da bir düğümü gateway rolüne atayın.",
      ask: "Gateway rolünü hangi düğüme vermeliyim?",
    });
  }

  for (const d of active) {
    const own = samples.filter((s) => s.device_id === d.id);
    if (own.length >= 3) {
      const loss = avg(own.map((s) => s.packet_loss_pct));
      const rtt = avg(own.map((s) => s.rtt_ms));
      const kbps = avg(own.map((s) => s.throughput_kbps));
      if (loss !== null && loss >= 8) {
        out.push({
          id: `loss-${d.id}`,
          severity: loss >= 20 ? "critical" : "warning",
          title: `${d.node_id}: paket kaybı %${loss.toFixed(1)}`,
          detail: `${d.region} bölgesindeki bu düğümde bağlantı kalitesi düşüyor (taşıyıcı: ${d.carrier ?? "bilinmiyor"}).`,
          action:
            "Anten yüksekliğini artırın, yönelimi düzeltin veya aradaki mesafeye bir röle ekleyin.",
          ask: `${d.node_id} düğümünde paket kaybını nasıl düşürürüm?`,
        });
      }
      if (rtt !== null && rtt >= 400) {
        out.push({
          id: `rtt-${d.id}`,
          severity: "warning",
          title: `${d.node_id}: gecikme ${Math.round(rtt)} ms`,
          detail:
            "Yüksek gecikme, çok atlamalı yönlendirme veya doygun bir taşıyıcıya işaret eder.",
          action: "Daha kısa atlama zinciri kurun veya bu düğüme yedek taşıyıcı tanımlayın.",
          ask: `${d.node_id} düğümünde gecikmeyi nasıl azaltırım?`,
        });
      }
      if (kbps !== null && kbps > 0 && kbps < 20) {
        out.push({
          id: `thr-${d.id}`,
          severity: "info",
          title: `${d.node_id}: düşük verim (${kbps.toFixed(0)} kbps)`,
          detail:
            "Dar bantlı taşıyıcıda beklenen bir değer olabilir; veri hacmi artacaksa planlayın.",
          action: "Yoğun trafik için HaLow/WiGig gibi geniş bantlı bir taşıyıcı köprüsü ekleyin.",
          ask: "Hangi taşıyıcıya yükseltmeliyim?",
        });
      }
    }

    if (d.last_error_code) {
      out.push({
        id: `err-${d.id}`,
        severity: "warning",
        title: `${d.node_id}: hata kodu ${d.last_error_code}`,
        detail: "Düğüm son çalışmasında hata bildirdi.",
        action:
          "Ajan günlüklerini kontrol edin; anahtar veya taşıyıcı yapılandırması hatalı olabilir.",
        ask: `${d.last_error_code} hata kodu ne anlama geliyor?`,
      });
    }
  }

  const noCarrier = active.filter((d) => !d.carrier);
  if (noCarrier.length > 0) {
    out.push({
      id: "carrier-missing",
      severity: "info",
      title: `${noCarrier.length} düğümde taşıyıcı tanımı yok`,
      detail: "Taşıyıcı bilgisi olmayan düğümler failover planına dahil edilemez.",
      action:
        "Düğümler sekmesinden taşıyıcı köprüsünü bağlayın veya ajan ortam değişkenini ayarlayın.",
      ask: "Düğüme taşıyıcı tanımını nasıl eklerim?",
    });
  }

  const revoked = devices.filter((d) => d.status !== "active").length;
  if (revoked > 0) {
    out.push({
      id: "revoked",
      severity: "info",
      title: `${revoked} iptal edilmiş düğüm kaydı`,
      detail: "İptal edilen düğümler lisans limitini işgal etmez ancak kayıt listesinde görünür.",
      action: "Kullanılmayacaksa düğümler sekmesinden silin.",
      ask: "İptal edilmiş düğümleri silmeli miyim?",
    });
  }

  if (online.length === 1) {
    out.push({
      id: "single-node",
      severity: "warning",
      title: "Tek düğümlü ağ yedeksiz",
      detail: "Tek çevrimiçi düğüm düşerse taşıma tamamen durur; mesh dayanıklılığı oluşmaz.",
      action: "İkinci bir cihazı QR ile ekleyip failover grubunu tanımlayın.",
      ask: "Yedekli mesh için en az kaç düğüm gerekir?",
    });
  }

  const order: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

function avg(values: (number | null)[]) {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
