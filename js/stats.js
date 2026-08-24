// Türetilmiş metrikler ve kıyaslama hesapları.

export function withMetrics(a) {
  const paceMin = a.distanceKm > 0 ? (a.durationSec / 60) / a.distanceKm : null;
  const speedKmh = a.durationSec > 0 ? a.distanceKm / (a.durationSec / 3600) : null;
  const beatsPerKm = a.avgHr && paceMin ? a.avgHr * paceMin : null;
  return { ...a, pace: paceMin, speedKmh, beatsPerKm };
}

export function decorate(list) {
  return list.map(withMetrics);
}

export function daysAgoIso(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// [fromIso, toIso) aralığındaki aktiviteler
export function inRange(list, fromIso, toIso) {
  return list.filter((a) => a.date >= fromIso && a.date < toIso);
}

export function summarize(list) {
  const n = list.length;
  const totalKm = list.reduce((s, a) => s + a.distanceKm, 0);
  const totalSec = list.reduce((s, a) => s + a.durationSec, 0);
  // Tempo ve nabız, mesafe/süreye göre ağırlıklı ortalanır.
  const avgPace = totalKm > 0 ? (totalSec / 60) / totalKm : null;
  const hrList = list.filter((a) => a.avgHr && a.durationSec > 0);
  const hrSec = hrList.reduce((s, a) => s + a.durationSec, 0);
  const avgHr = hrSec > 0
    ? hrList.reduce((s, a) => s + a.avgHr * a.durationSec, 0) / hrSec
    : null;
  const beatsPerKm = avgHr && avgPace ? avgHr * avgPace : null;
  const longest = list.reduce((m, a) => (!m || a.distanceKm > m.distanceKm ? a : m), null);
  return { count: n, totalKm, totalSec, avgPace, avgHr, beatsPerKm, longest };
}

// lowerIsBetter: tempo, nabız, atış/km için true
export const METRIC_META = {
  totalKm: { label: 'Mesafe', lowerIsBetter: false },
  count: { label: 'Aktivite', lowerIsBetter: false },
  totalSec: { label: 'Süre', lowerIsBetter: false },
  avgPace: { label: 'Ort. tempo', lowerIsBetter: true },
  avgHr: { label: 'Ort. nabız', lowerIsBetter: true },
  beatsPerKm: { label: 'Nabız verimi', lowerIsBetter: true },
  distanceKm: { label: 'Mesafe', lowerIsBetter: false },
  durationSec: { label: 'Süre', lowerIsBetter: false },
  pace: { label: 'Tempo', lowerIsBetter: true },
};

export function delta(current, previous, lowerIsBetter = false) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return { abs: null, pct: null, dir: 'flat' };
  }
  const abs = current - previous;
  const pct = (abs / Math.abs(previous)) * 100;
  let dir = 'flat';
  if (Math.abs(pct) >= 0.5) {
    const improved = lowerIsBetter ? abs < 0 : abs > 0;
    dir = improved ? 'up' : 'down';
  }
  return { abs, pct, dir };
}

// Bu dönem vs. bir önceki eşit uzunluktaki dönem
export function periodCompare(list, days) {
  const now = daysAgoIso(-1); // yarın: bugünü de kapsasın
  const start = daysAgoIso(days - 1);
  const prevStart = daysAgoIso(days * 2 - 1);
  return {
    current: summarize(inRange(list, start, now)),
    previous: summarize(inRange(list, prevStart, start)),
    days,
  };
}

// Aynı türdeki son iki aktivite
export function lastVsPrevious(list, type) {
  const same = list.filter((a) => a.type === type);
  return { current: same[0] || null, previous: same[1] || null };
}

export function personalRecords(list) {
  const withDist = list.filter((a) => a.distanceKm > 0);
  const measurable = withDist.filter((a) => a.distanceKm >= 1 && a.pace);
  const withHr = withDist.filter((a) => a.avgHr);
  const withEff = withDist.filter((a) => a.beatsPerKm);
  const best = (arr, fn, cmp) => arr.reduce((m, a) => (!m || cmp(fn(a), fn(m)) ? a : m), null);
  return {
    longest: best(withDist, (a) => a.distanceKm, (x, y) => x > y),
    fastest: best(measurable, (a) => a.pace, (x, y) => x < y),
    longestTime: best(withDist, (a) => a.durationSec, (x, y) => x > y),
    lowestHr: best(withHr, (a) => a.avgHr, (x, y) => x < y),
    bestEfficiency: best(withEff, (a) => a.beatsPerKm, (x, y) => x < y),
  };
}

// Bu hafta (Pazartesi başlangıçlı)
export function weekStartIso(offsetWeeks = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Pazartesi = 0
  d.setDate(d.getDate() - dow - offsetWeeks * 7);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function weekSummaries(list) {
  const thisStart = weekStartIso(0);
  const lastStart = weekStartIso(1);
  const nextStart = weekStartIso(-1);
  return {
    thisWeek: summarize(inRange(list, thisStart, nextStart)),
    lastWeek: summarize(inRange(list, lastStart, thisStart)),
  };
}

export function typeAverages(list) {
  return {
    run: summarize(list.filter((a) => a.type === 'run')),
    walk: summarize(list.filter((a) => a.type === 'walk')),
  };
}

// Basit koç mesajı: veriye göre tek cümlelik yönlendirme.
export function coachMessage(list, settings) {
  if (!list.length) {
    return 'Henüz kayıt yok. İlk aktiviteni ekle, kıyaslamaya hemen başlayalım.';
  }
  const { thisWeek, lastWeek } = weekSummaries(list);
  const goal = Number(settings.weeklyGoalKm) || 0;
  const last = list[0];
  const parts = [];

  if (goal > 0) {
    const remaining = goal - thisWeek.totalKm;
    parts.push(remaining <= 0
      ? `Haftalık ${goal} km hedefini tamamladın (${thisWeek.totalKm.toFixed(1)} km). Tebrikler.`
      : `Bu hafta ${thisWeek.totalKm.toFixed(1)}/${goal} km — hedefe ${remaining.toFixed(1)} km kaldı.`);
  } else {
    parts.push(`Bu hafta ${thisWeek.totalKm.toFixed(1)} km, ${thisWeek.count} aktivite.`);
  }

  const d = delta(thisWeek.totalKm, lastWeek.totalKm, false);
  if (Number.isFinite(d.pct) && Math.abs(d.pct) >= 5) {
    parts.push(d.pct > 0
      ? `Geçen haftaya göre hacmin %${Math.abs(d.pct).toFixed(0)} arttı${d.pct > 30 ? ' — sıçrama biraz sert, toparlanmaya dikkat.' : '.'}`
      : `Geçen haftaya göre hacmin %${Math.abs(d.pct).toFixed(0)} düştü.`);
  }

  const prev = list.filter((a) => a.type === last.type)[1];
  if (prev && last.beatsPerKm && prev.beatsPerKm) {
    const e = delta(last.beatsPerKm, prev.beatsPerKm, true);
    if (e.dir === 'up') parts.push('Son çıkışta aynı mesafeyi daha az nabızla götürdün: verim artıyor.');
    else if (e.dir === 'down') parts.push('Son çıkışta nabız verimi düştü; yorgunluk ya da hava/zemin etkisi olabilir.');
  }

  const daysSince = Math.floor((Date.now() - new Date(`${last.date}T00:00:00`).getTime()) / 86400000);
  if (daysSince >= 4) parts.push(`Son aktiviteden bu yana ${daysSince} gün geçti — kısa bir yürüyüşle geri dön.`);

  return parts.slice(0, 3).join(' ');
}
