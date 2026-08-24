// Aktivite puanlama (0–10).
//
// Referanslar:
// - Tanaka ve ark. (2001, JACC): tahmini maksimum nabız = 208 − 0,7 × yaş.
//   351 çalışma / 18.712 kişilik meta-analiz; "220 − yaş"a göre belirgin daha doğru.
// - Karvonen: nabız rezervi oranı = (ort. nabız − dinlenme) / (maks. − dinlenme).
// - Banister TRIMP: süre(dk) × HRR oranı × Y, Y = 0,64·e^(1,92x) (erkek) /
//   0,86·e^(1,67x) (kadın). Şiddet arttıkça yükün üstel artışını yakalar.
// - Foster (2001) session-RPE: yük = RPE × süre(dk). Nabız verisi yoksa yedek yöntem.
// - ACSM metabolik denklemleri (düz zemin, eğim = 0):
//   yürüyüş VO2 = 0,1 × hız(m/dk) + 3,5 ; koşu VO2 = 0,2 × hız(m/dk) + 3,5
//   MET = VO2 / 3,5 ; kcal/dk = MET × 3,5 × kilo(kg) / 200
// - ACSM şiddet sınıflaması (%HRR): <30 çok hafif, 30–39 hafif, 40–59 orta,
//   60–89 şiddetli, ≥90 maksimuma yakın. Haftalık hedef: 150 dk orta şiddet
//   (şiddetli dakikalar iki katı sayılır) — seans hacmi buna göre ölçeklenir.

export const TIERS = [
  { min: 9.0, name: 'Zirve',     color: '#fb7185', tint: 'rgba(251,113,133,0.14)' },
  { min: 8.0, name: 'Güçlü',     color: '#fbbf24', tint: 'rgba(251,191,36,0.14)' },
  { min: 6.5, name: 'Verimli',   color: '#a3e635', tint: 'rgba(163,230,53,0.14)' },
  { min: 5.0, name: 'Dengeli',   color: '#4ade80', tint: 'rgba(74,222,128,0.14)' },
  { min: 3.0, name: 'Hafif',     color: '#38bdf8', tint: 'rgba(56,189,248,0.14)' },
  { min: 0,   name: 'Çok hafif', color: '#94a3b8', tint: 'rgba(148,163,184,0.12)' },
];

export function tierFor(score) {
  return TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
}

export function estimatedMaxHr(age) {
  return Number.isFinite(age) && age > 0 ? Math.round(208 - 0.7 * age) : null;
}

// Noktalar arası doğrusal ara değer; aralık dışı uçlara sabitlenir.
function curve(points, v) {
  if (!Number.isFinite(v)) return null;
  if (v <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (v >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (v <= x1) return y0 + ((v - x0) / (x1 - x0)) * (y1 - y0);
  }
  return last[1];
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function hrReserveRatio(avgHr, restHr, maxHr) {
  if (!avgHr || !restHr || !maxHr || maxHr <= restHr) return null;
  return clamp((avgHr - restHr) / (maxHr - restHr), 0, 1.1);
}

export function intensityZone(x) {
  if (!Number.isFinite(x)) return null;
  const p = x * 100;
  if (p < 30) return { key: 'veryLight', name: 'Çok hafif' };
  if (p < 40) return { key: 'light', name: 'Hafif' };
  if (p < 60) return { key: 'moderate', name: 'Orta' };
  if (p < 90) return { key: 'vigorous', name: 'Şiddetli' };
  return { key: 'nearMax', name: 'Maksimuma yakın' };
}

export function banisterTrimp(durationMin, x, sex) {
  if (!Number.isFinite(x) || durationMin <= 0) return null;
  const y = sex === 'female' ? 0.86 * Math.exp(1.67 * x) : 0.64 * Math.exp(1.92 * x);
  return durationMin * x * y;
}

// ACSM denklemleri. Koşu denklemi ~4,8 km/sa (80 m/dk) üzerindeki koşu/jog için,
// altındaki hızlarda yürüyüş denklemi daha doğru sonuç verir.
export function metsFor(type, distanceKm, durationSec) {
  if (!(distanceKm > 0) || !(durationSec > 0)) return null;
  const speedMmin = (distanceKm * 1000) / (durationSec / 60);
  const running = type === 'run' && speedMmin >= 80;
  const vo2 = running ? 0.2 * speedMmin + 3.5 : 0.1 * speedMmin + 3.5;
  return vo2 / 3.5;
}

export function kcalFor(mets, weightKg, durationSec) {
  if (!mets || !weightKg || !(durationSec > 0)) return null;
  return (mets * 3.5 * weightKg / 200) * (durationSec / 60);
}

/* ---- Alt puanlar (her biri 0–10) ---- */

const LOAD_CURVE = [[0, 0], [20, 2.5], [40, 4.5], [60, 6], [85, 7.5], [120, 8.8], [170, 9.6], [250, 10]];

const INTENSITY_CURVE = {
  // Koşuda verimli bant %60–85 HRR; yürüyüşte %40–65.
  run: [[0.2, 2], [0.35, 4], [0.5, 6.5], [0.6, 8.5], [0.7, 9.5], [0.78, 10], [0.88, 9.5], [0.95, 8.5], [1, 7.5]],
  walk: [[0.15, 2], [0.3, 4], [0.4, 7], [0.5, 9], [0.6, 10], [0.72, 10], [0.85, 8], [1, 6.5]],
};

const TIME_CURVE = [[0, 0], [10, 2.5], [20, 4.5], [30, 6.5], [45, 8.5], [60, 9.5], [90, 10]];
const DIST_CURVE = {
  run: [[0, 0], [2, 2.5], [3, 4], [5, 6.5], [8, 8.5], [12, 9.5], [18, 10]],
  walk: [[0, 0], [1, 2], [2, 3.5], [3, 5.5], [5, 7.5], [8, 9.5], [12, 10]],
};
const ENERGY_CURVE = [[0, 0], [100, 3], [200, 5], [300, 6.5], [450, 8], [650, 9.3], [900, 10]];
// Kişisel nabız verimi (atış/km) geçmiş ortalamana oranı; düşük = iyi.
const EFFICIENCY_CURVE = [[0.85, 10], [0.92, 9], [0.97, 7.5], [1, 6.5], [1.05, 5], [1.12, 3.5], [1.25, 2]];

const WEIGHTS = { load: 0.35, intensity: 0.25, volume: 0.2, energy: 0.1, efficiency: 0.1 };

export const COMPONENT_LABELS = {
  load: 'Yük',
  intensity: 'Şiddet',
  volume: 'Hacim',
  energy: 'Enerji',
  efficiency: 'Verim',
};

/**
 * @param activity  metriklerle zenginleştirilmiş aktivite (pace, beatsPerKm dahil)
 * @param settings  { age, weightKg, sex, restHr, maxHr }
 * @param history   aynı türden, bu aktiviteden ÖNCEKİ aktiviteler (verim kıyası için)
 */
export function scoreActivity(activity, settings = {}, history = []) {
  const durationMin = activity.durationSec / 60;
  const age = Number(settings.age) || null;
  const restHr = Number(settings.restHr) || 60;
  const maxHr = Number(settings.maxHr) || estimatedMaxHr(age) || null;
  const weightKg = Number(settings.weightKg) || null;
  const sex = settings.sex === 'female' ? 'female' : 'male';

  const x = hrReserveRatio(activity.avgHr, restHr, maxHr);
  const zone = intensityZone(x);
  const mets = metsFor(activity.type, activity.distanceKm, activity.durationSec);
  const kcal = kcalFor(mets, weightKg, activity.durationSec);

  // Yük: nabız varsa Banister TRIMP, yoksa Foster session-RPE'den TRIMP eşdeğeri.
  const trimp = banisterTrimp(durationMin, x, sex);
  const rpe = Number(activity.effort) || 5;
  const sessionRpeLoad = rpe * durationMin;
  const loadValue = trimp !== null ? trimp : sessionRpeLoad / 3.5;

  // Şiddet: nabız yoksa algılanan zorlanma (RPE/10) vekil olarak kullanılır.
  const intensityValue = x !== null ? x : rpe / 10;

  const parts = {
    load: curve(LOAD_CURVE, loadValue),
    intensity: curve(INTENSITY_CURVE[activity.type] || INTENSITY_CURVE.run, intensityValue),
    volume: null,
    energy: kcal !== null ? curve(ENERGY_CURVE, kcal) : null,
    efficiency: null,
  };

  // Hacim: şiddetle ağırlıklandırılmış dakika (WHO/ACSM mantığı) + mesafe.
  const factor = intensityValue >= 0.6 ? 2 : intensityValue >= 0.4 ? 1 : 0.5;
  const mvpaMin = durationMin * factor;
  parts.volume = 0.6 * curve(TIME_CURVE, mvpaMin)
    + 0.4 * curve(DIST_CURVE[activity.type] || DIST_CURVE.run, activity.distanceKm);

  // Verim: aynı türdeki son 10 aktivitenin nabız verimi ortancasıyla kıyas.
  const past = history
    .filter((h) => h.type === activity.type && h.beatsPerKm && (!activity.id || h.id !== activity.id))
    .slice(0, 10)
    .map((h) => h.beatsPerKm);
  let reference = null;
  if (activity.beatsPerKm && past.length >= 2) {
    const sorted = [...past].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    reference = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    parts.efficiency = curve(EFFICIENCY_CURVE, activity.beatsPerKm / reference);
  }

  // Hesaplanamayan bileşenlerin ağırlığı kalanlara dağıtılır.
  const active = Object.keys(parts).filter((k) => Number.isFinite(parts[k]));
  const totalWeight = active.reduce((s, k) => s + WEIGHTS[k], 0);
  const total = active.reduce((s, k) => s + parts[k] * WEIGHTS[k], 0) / (totalWeight || 1);
  const score = Math.round(clamp(total, 0, 10) * 10) / 10;

  return {
    score,
    tier: tierFor(score),
    parts,
    weights: WEIGHTS,
    missing: Object.keys(parts).filter((k) => !Number.isFinite(parts[k])),
    detail: {
      hrrRatio: x,
      zone,
      trimp,
      usedRpeFallback: trimp === null,
      sessionRpeLoad,
      mets,
      kcal,
      maxHrUsed: maxHr,
      maxHrEstimated: !Number(settings.maxHr) && Boolean(maxHr),
      restHrUsed: restHr,
      efficiencyReference: reference,
    },
  };
}

// Puanın en zayıf/en güçlü bileşenine göre tek cümlelik yorum.
export function scoreComment(result, activity) {
  const { parts, detail, score } = result;
  const named = Object.entries(parts).filter(([, v]) => Number.isFinite(v));
  if (!named.length) return '';
  const weakest = named.reduce((m, e) => (e[1] < m[1] ? e : m));
  const strongest = named.reduce((m, e) => (e[1] > m[1] ? e : m));
  const zoneName = detail.zone ? detail.zone.name.toLowerCase() : null;

  const lines = [];
  if (score >= 9) lines.push('Sert bir seans — bu kalitede bir çıkışın ardından toparlanmaya gün bırak.');
  else if (score >= 6.5) lines.push('Verimli bir antrenman: şiddet ve süre birbirini iyi tamamlamış.');
  else if (score >= 5) lines.push('Dengeli bir seans; temel dayanıklılık için tam da bu tempo.');
  else lines.push('Hafif bir çıkış — toparlanma günü olarak yerinde.');

  if (zoneName) {
    lines.push(`Ortalama nabzın, nabız rezervinin %${Math.round(detail.hrrRatio * 100)} seviyesinde — ACSM sınıflamasında ${zoneName} bant.`);
  } else {
    lines.push('Nabız girmediğin için şiddet, zorlanma notundan tahmin edildi.');
  }

  const tips = {
    load: 'Yükü artırmak için süreyi ya da hızını kademeli yükselt.',
    intensity: activity.type === 'run'
      ? 'Şiddet düşük kalmış; nabzını rezervinin %60–85 bandına taşımayı dene.'
      : 'Şiddet düşük kalmış; biraz daha tempolu yürü.',
    volume: 'Hacim kısa kalmış; süreyi 30 dakikanın üzerine çıkarmak puanı belirgin yükseltir.',
    energy: 'Enerji harcaman düşük; mesafeyi biraz uzatmak yeter.',
    efficiency: 'Nabız verimin son çıkışlarının gerisinde — yorgunluk, sıcak ya da zemin etkisi olabilir.',
  };
  if (weakest[1] < 6 && tips[weakest[0]]) lines.push(tips[weakest[0]]);
  else if (strongest[1] >= 9) lines.push(`En güçlü yanın: ${COMPONENT_LABELS[strongest[0]].toLowerCase()}.`);

  return lines.join(' ');
}
