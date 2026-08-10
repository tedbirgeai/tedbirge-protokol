import { buildMeshPlan, type Measurement } from "@/lib/mesh-plan";

export type CalibrationResult = {
  sampleCount: number;
  modelHopKm: number;
  calibratedHopKm: number;
  maeKm: number;
  biasKm: number;
  accuracyPct: number;
  verdict: "gecti" | "sinirda" | "kaldi" | "yetersiz_veri";
  folds: { distanceKm: number; linkOk: boolean; predictedOk: boolean; hopKm: number }[];
};

/**
 * Model kalibrasyon testi — "leave-one-out" doğrulama.
 * Her ölçüm sırayla dışarıda bırakılır, kalan ölçümlerle kalibre edilen model
 * o ölçümü doğru tahmin edebiliyor mu diye bakılır. Böylece modelin gerçek
 * sahadaki isabeti sahte veri olmadan ölçülür.
 */
export function runCalibration(
  carrierId: string,
  terrainId: string,
  heightId: string,
  samples: Measurement[],
): CalibrationResult {
  const relevant = samples.filter(
    (s) =>
      s.carrier === carrierId &&
      s.terrain === terrainId &&
      s.antenna_height === heightId &&
      Number.isFinite(Number(s.distance_km)),
  );

  const base = buildMeshPlan({ carrierId, terrainId, heightId, distanceKm: 1, measurements: [] });
  const full = buildMeshPlan({
    carrierId,
    terrainId,
    heightId,
    distanceKm: 1,
    measurements: relevant,
  });

  if (relevant.length < 4) {
    return {
      sampleCount: relevant.length,
      modelHopKm: round(base.modelHopKm),
      calibratedHopKm: round(full.hopKm),
      maeKm: 0,
      biasKm: round(full.hopKm - base.modelHopKm),
      accuracyPct: 0,
      verdict: "yetersiz_veri",
      folds: [],
    };
  }

  const folds: CalibrationResult["folds"] = [];
  let correct = 0;
  let errorSum = 0;
  let hopSum = 0;

  relevant.forEach((sample, index) => {
    const rest = relevant.filter((_, i) => i !== index);
    const plan = buildMeshPlan({
      carrierId,
      terrainId,
      heightId,
      distanceKm: 1,
      measurements: rest,
    });
    const distance = Number(sample.distance_km);
    const predictedOk = distance <= plan.hopKm;
    if (predictedOk === sample.link_ok) correct += 1;
    else errorSum += Math.abs(distance - plan.hopKm);
    hopSum += plan.hopKm;
    folds.push({
      distanceKm: distance,
      linkOk: sample.link_ok,
      predictedOk,
      hopKm: round(plan.hopKm),
    });
  });

  const accuracy = (correct / relevant.length) * 100;
  const wrong = relevant.length - correct;

  return {
    sampleCount: relevant.length,
    modelHopKm: round(base.modelHopKm),
    calibratedHopKm: round(full.hopKm),
    maeKm: round(wrong ? errorSum / wrong : 0),
    biasKm: round(hopSum / relevant.length - base.modelHopKm),
    accuracyPct: Math.round(accuracy * 10) / 10,
    verdict: accuracy >= 90 ? "gecti" : accuracy >= 70 ? "sinirda" : "kaldi",
    folds,
  };
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
