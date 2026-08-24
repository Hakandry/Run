// Rozetler üç grupta toplanır:
//   single  — tek bir antrenmanda ulaşılan koşu mesafesi (1 km'den 100 km'ye)
//   streak  — süreklilik (haftalık antrenman sayısı, üst üste aktif gün)
//   total   — birikimli toplam mesafe (koşu + yürüyüş)
//
// Rozet verisi saklanmaz; her zaman kayıtlardan hesaplanır. Bir kaydı silersen
// ya da düzeltirsen rozet durumu da kendiliğinden düzelir.

export const GROUPS = [
  { id: 'single', name: 'Mesafe', desc: 'Tek bir antrenmanda koştuğun mesafe' },
  { id: 'streak', name: 'Süreklilik', desc: 'Antrenmanı alışkanlığa çevirmek' },
  { id: 'total', name: 'Toplam yol', desc: 'Bugüne kadar biriken mesafe (koşu + yürüyüş)' },
];

// Kademeler, kolaydan zora. En üst kademeyi bulurken bu sıra kullanılır.
export const LEVELS = ['Başlangıç', 'Amatör', 'Deneyimli', 'İleri', 'Yarışçı', 'Profesyonel'];

export const BADGES = [
  // --- Tek antrenmanda mesafe ---
  {
    id: 'run-1k', group: 'single', target: 1, unit: 'km',
    name: '1 km', title: 'İlk kilometre', level: 'Başlangıç', color: '#38bdf8',
    note: 'Standart atletizm pistinin 2,5 turu.',
  },
  {
    id: 'run-3k', group: 'single', target: 3, unit: 'km',
    name: '3 km', title: 'Üç bin', level: 'Başlangıç', color: '#22d3ee',
    note: 'Okul ve kulüp yarışlarının giriş mesafesi; pistte 7,5 tur.',
  },
  {
    id: 'run-5k', group: 'single', target: 5, unit: 'km',
    name: '5 km', title: 'Beşlik', level: 'Amatör', color: '#4ade80',
    note: 'Parkrun mesafesi — dünyada en yaygın koşulan halk koşusu.',
  },
  {
    id: 'run-10k', group: 'single', target: 10, unit: 'km',
    name: '10 km', title: 'Onluk', level: 'Amatör', color: '#a3e635',
    note: 'Pistteki 10.000 metrenin yol karşılığı; olimpik mesafe.',
  },
  {
    id: 'run-15k', group: 'single', target: 15, unit: 'km',
    name: '15 km', title: 'Uzun mesafe', level: 'Deneyimli', color: '#fbbf24',
    note: 'Yarı maratonun dörtte üçü — uzun koşuya geçiş noktası.',
  },
  {
    id: 'run-half', group: 'single', target: 21.0975, unit: 'km',
    name: '21,1 km', title: 'Yarı maraton', level: 'Deneyimli', color: '#fb923c',
    note: 'Maratonun tam yarısı: 21,0975 km. Resmî yarış mesafesi.',
  },
  {
    id: 'run-30k', group: 'single', target: 30, unit: 'km',
    name: '30 km', title: 'Duvar provası', level: 'İleri', color: '#f97316',
    note: 'Maraton hazırlığının kilit uzun koşusu; "duvar" burada tanınır.',
  },
  {
    id: 'run-marathon', group: 'single', target: 42.195, unit: 'km',
    name: '42,2 km', title: 'Maraton', level: 'Yarışçı', color: '#fb7185',
    note: '1908 Londra Olimpiyatları\'nda koşulan, 1921\'de resmîleşen mesafe.',
  },
  {
    id: 'run-50k', group: 'single', target: 50, unit: 'km',
    name: '50 km', title: 'Ultra', level: 'Yarışçı', color: '#e879f9',
    note: 'Ultramaratonun giriş kapısı; dünya şampiyonası düzenlenen resmî mesafe.',
  },
  {
    id: 'run-100k', group: 'single', target: 100, unit: 'km',
    name: '100 km', title: 'Yüzlük', level: 'Profesyonel', color: '#a78bfa',
    note: '100 km Dünya Şampiyonası mesafesi — profesyonel ultra dayanıklılık.',
  },

  // --- Süreklilik ---
  {
    id: 'week-3', group: 'streak', target: 3, unit: 'antrenman', kind: 'weekly',
    name: '3/hafta', title: 'Üçlü hafta', level: 'Amatör', color: '#4ade80',
    note: 'Bir takvim haftasında 3 antrenman: haftalık 150 dakika önerisine giden en pratik yol.',
  },
  {
    id: 'week-5', group: 'streak', target: 5, unit: 'antrenman', kind: 'weekly',
    name: '5/hafta', title: 'Beşli hafta', level: 'Deneyimli', color: '#fbbf24',
    note: 'Bir haftada 5 antrenman — kulüp koşucularının tipik hafta düzeni.',
  },
  {
    id: 'streak-7', group: 'streak', target: 7, unit: 'gün', kind: 'streak',
    name: '7 gün', title: 'Bir hafta seri', level: 'Deneyimli', color: '#fb923c',
    note: 'Yedi gün üst üste hareket. Kısa yürüyüşler de seriyi ayakta tutar.',
  },
  {
    id: 'streak-30', group: 'streak', target: 30, unit: 'gün', kind: 'streak',
    name: '30 gün', title: 'Bir ay seri', level: 'Profesyonel', color: '#a78bfa',
    note: 'Otuz gün kesintisiz — alışkanlığın artık kendini taşıdığı eşik.',
  },

  // --- Toplam yol ---
  {
    id: 'total-100', group: 'total', target: 100, unit: 'km', kind: 'total',
    name: '100 km', title: 'İlk yüz', level: 'Amatör', color: '#38bdf8',
    note: 'Maraton mesafesinin yaklaşık 2,4 katı.',
  },
  {
    id: 'total-250', group: 'total', target: 250, unit: 'km', kind: 'total',
    name: '250 km', title: 'Yol alan', level: 'Deneyimli', color: '#4ade80',
    note: 'Yarı maratonun yaklaşık 12 katı.',
  },
  {
    id: 'total-500', group: 'total', target: 500, unit: 'km', kind: 'total',
    name: '500 km', title: 'Uzun yol', level: 'İleri', color: '#fbbf24',
    note: 'Haftada 10 km ile yaklaşık bir yıl demek.',
  },
  {
    id: 'total-1000', group: 'total', target: 1000, unit: 'km', kind: 'total',
    name: '1000 km', title: 'Bin kilometre', level: 'Profesyonel', color: '#fb7185',
    note: 'Maratonun 23 katı; ciddi koşucuların yıllık hacmi.',
  },
];

/* ---------- Ölçüler ---------- */

function weekKey(iso) {
  // Pazartesi başlangıçlı takvim haftası anahtarı
  const d = new Date(`${iso}T00:00:00`);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

// En kalabalık takvim haftası: { count, weekStart }
function bestWeek(activities) {
  const counts = new Map();
  for (const a of activities) {
    const key = weekKey(a.date);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = { count: 0, weekStart: null };
  for (const [weekStart, count] of counts) {
    if (count > best.count) best = { count, weekStart };
  }
  return best;
}

// En uzun ardışık aktif gün serisi: { length, start, end }
function bestStreak(activities) {
  const days = [...new Set(activities.map((a) => a.date))].sort();
  let best = { length: 0, start: null, end: null };
  let run = { length: 0, start: null, end: null };

  for (const day of days) {
    const prev = run.end ? new Date(`${run.end}T00:00:00`) : null;
    const cur = new Date(`${day}T00:00:00`);
    const consecutive = prev && (cur - prev) === 86400000;
    run = consecutive
      ? { length: run.length + 1, start: run.start, end: day }
      : { length: 1, start: day, end: day };
    if (run.length > best.length) best = { ...run };
  }
  return best;
}

function firstQualifying(runs, km) {
  const qualified = runs.filter((a) => a.distanceKm >= km);
  if (!qualified.length) return null;
  return qualified.reduce((earliest, a) => (!earliest || a.date < earliest.date ? a : earliest), null);
}

// Toplam mesafe hedefinin aşıldığı ilk gün (eskiden yeniye biriktirerek)
function totalReachedOn(activities, km) {
  const chronological = [...activities].sort((a, b) => a.date.localeCompare(b.date));
  let sum = 0;
  for (const a of chronological) {
    sum += a.distanceKm;
    if (sum >= km) return a;
  }
  return null;
}

/* ---------- Durum ---------- */

export function badgeState(activities) {
  const runs = activities.filter((a) => a.type === 'run' && a.distanceKm > 0);
  const bestRun = runs.reduce((m, a) => Math.max(m, a.distanceKm), 0);
  const totalKm = activities.reduce((s, a) => s + a.distanceKm, 0);
  const week = bestWeek(activities);
  const streak = bestStreak(activities);

  return BADGES.map((badge) => {
    let current = 0;
    let activity = null;

    if (badge.kind === 'weekly') {
      current = week.count;
    } else if (badge.kind === 'streak') {
      current = streak.length;
    } else if (badge.kind === 'total') {
      current = totalKm;
      activity = current >= badge.target ? totalReachedOn(activities, badge.target) : null;
    } else {
      current = bestRun;
      activity = firstQualifying(runs, badge.target);
    }

    const earned = badge.kind === 'weekly' || badge.kind === 'streak'
      ? current >= badge.target
      : Boolean(activity);

    return {
      badge,
      earned,
      activity,
      current,
      remaining: Math.max(0, badge.target - current),
      progress: badge.target > 0 ? Math.min(1, current / badge.target) : 0,
      context: badge.kind === 'weekly' ? week : badge.kind === 'streak' ? streak : null,
    };
  });
}

export function earnedIds(activities) {
  return new Set(badgeState(activities).filter((s) => s.earned).map((s) => s.badge.id));
}

export function newlyEarned(beforeIds, activities) {
  return badgeState(activities)
    .filter((s) => s.earned && !beforeIds.has(s.badge.id))
    .map((s) => s.badge);
}
