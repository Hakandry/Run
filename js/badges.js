// Mesafe rozetleri: tek bir antrenmanda ulaşılan koşu mesafeleri.
// Rozet verisi ayrıca saklanmaz; her zaman kayıtlardan hesaplanır.
// Böylece bir kaydı silersen ya da düzeltirsen rozetler de doğru kalır.

export const BADGES = [
  {
    id: 'run-1k',
    km: 1,
    name: '1 km',
    title: 'İlk kilometre',
    desc: 'Tek antrenmanda 1 km koşu',
    color: '#38bdf8',
  },
  {
    id: 'run-3k',
    km: 3,
    name: '3 km',
    title: 'Üç bin',
    desc: 'Tek antrenmanda 3 km koşu',
    color: '#4ade80',
  },
  {
    id: 'run-5k',
    km: 5,
    name: '5 km',
    title: 'Beşlik',
    desc: 'Tek antrenmanda 5 km koşu',
    color: '#fbbf24',
  },
  {
    id: 'run-10k',
    km: 10,
    name: '10 km',
    title: 'Onluk',
    desc: 'Tek antrenmanda 10 km koşu',
    color: '#fb7185',
  },
];

// Rozeti kazandıran aktivite: hedefi ilk kez geçtiğin koşu.
function firstQualifying(runs, km) {
  const qualified = runs.filter((a) => a.distanceKm >= km);
  if (!qualified.length) return null;
  return qualified.reduce((earliest, a) =>
    (!earliest || a.date < earliest.date ? a : earliest), null);
}

/**
 * @param activities tüm aktiviteler (en yeni ilk)
 * @returns her rozet için { badge, earned, activity, best, remaining, progress }
 */
export function badgeState(activities) {
  const runs = activities.filter((a) => a.type === 'run' && a.distanceKm > 0);
  const best = runs.reduce((m, a) => Math.max(m, a.distanceKm), 0);

  return BADGES.map((badge) => {
    const activity = firstQualifying(runs, badge.km);
    return {
      badge,
      earned: Boolean(activity),
      activity,
      best,
      remaining: Math.max(0, badge.km - best),
      progress: badge.km > 0 ? Math.min(1, best / badge.km) : 0,
    };
  });
}

export function earnedIds(activities) {
  return new Set(badgeState(activities).filter((s) => s.earned).map((s) => s.badge.id));
}

// Kayıt sonrası yeni kazanılanları bulmak için.
export function newlyEarned(beforeIds, activities) {
  return badgeState(activities)
    .filter((s) => s.earned && !beforeIds.has(s.badge.id))
    .map((s) => s.badge);
}
