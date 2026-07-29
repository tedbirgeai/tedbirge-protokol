export type PlanStep = {
  hafta: string;
  baslik: string;
  aciklama: string;
  sorumlu: string;
};

export type PlanDoc = {
  belge: string;
  kurum: string;
  zorunlu: boolean;
  not: string;
};

export type LeadPlan = {
  ozet: string;
  adimlar: PlanStep[];
  belgeler: PlanDoc[];
  riskler: string[];
  olusturuldu: string;
};

export const PLAN_SYSTEM_PROMPT = `Sen Tedbirge Gateway pilot planlama asistanısın. Verilen müşteri talebine göre kurum/izin/pilot süreci için gerçekçi bir takvim ve belge kontrol listesi üret.

KURALLAR:
- Türkçe yaz. Kısa ve uygulanabilir maddeler.
- 4-7 adım üret; her adım "hafta" alanında "1. hafta", "2-3. hafta" gibi aralık taşısın.
- Belgeler: TR pilotu için BTK (lisanssız bant beyanı/duty cycle kaydı), KVKK VERBİS/aydınlatma metni, 5651 log politikası, AFAD/valilik saha izni, TSE/CE-uygunluk beyanı, iş sağlığı-güvenliği izinleri gibi gerçek kalemlerden ilgili olanları seç. Yurt dışı senaryoda ilgili ülke düzenleyicisini (ETSI/FCC vb.) yaz.
- Uydurma belge adı verme; emin değilsen "not" alanında "pilot kapsamında teyit edilecek" yaz.
- 2-4 risk maddesi yaz (spektrum, izin süresi, saha erişimi, veri koruma gibi).`;

export function planPrompt(input: {
  kurum?: string | null;
  ulke?: string | null;
  senaryo?: string | null;
  tasiyici?: string | null;
  dugum?: string | null;
  aciliyet?: string | null;
}) {
  return [
    `Kurum: ${input.kurum ?? "belirtilmedi"}`,
    `Ülke/bölge: ${input.ulke ?? "Türkiye (varsayılan pilot bölgesi)"}`,
    `Senaryo: ${input.senaryo ?? "belirtilmedi"}`,
    `Taşıyıcı ihtiyacı: ${input.tasiyici ?? "belirtilmedi"}`,
    `Düğüm sayısı: ${input.dugum ?? "belirtilmedi"}`,
    `Aciliyet: ${input.aciliyet ?? "belirtilmedi"}`,
  ].join("\n");
}
