import * as store from './storage.js';
import * as S from './stats.js';
import { renderChart } from './chart.js';
import {
  scoreActivity, scoreComment, COMPONENT_LABELS, estimatedMaxHr, metsFor, kcalFor,
} from './score.js';
import {
  TYPE_LABEL, TYPE_ICON, fmtNum, fmtKm, fmtDuration, fmtPace, fmtPaceUnit, fmtSpeedKmh,
  fmtHr, fmtDate, todayIso, fmtPercent,
} from './format.js';

const APP_VERSION = '0.3.1';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let activities = [];   // metriklerle zenginleştirilmiş, en yeni ilk
let scores = new Map();
let settings = store.getSettings();
let editingId = null;
let lastScoreId = null;

/* ---------- Görünüm yönetimi ---------- */

function showView(name) {
  $$('.view').forEach((v) => { v.hidden = v.id !== `view-${name}`; });
  $$('.tabbar button').forEach((b) => {
    const active = b.dataset.view === name;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', String(active));
  });
  location.hash = name;
  window.scrollTo({ top: 0 });
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2400);
}

// Metrik renkleri (CSS değişkenleriyle aynı sözlük)
const HUE = {
  run: 'var(--run)', walk: 'var(--walk)', dist: 'var(--dist)', time: 'var(--time)',
  speed: 'var(--speed)', hr: 'var(--hr)', energy: 'var(--energy)', goal: 'var(--goal)',
};

/* ---------- Hız gösterimi ---------- */
// Tüm hız değerleri tek yerden geçer; ayardaki birime göre km/sa ya da dk/km.

const usesKmh = () => settings.speedUnit !== 'pace';
const paceToKmh = (paceMin) => (Number.isFinite(paceMin) && paceMin > 0 ? 60 / paceMin : null);

// Etiket: "Hız" / "Tempo" (başlıklarda kullanılır)
const speedWord = (capital = true) => {
  const w = usesKmh() ? 'hız' : 'tempo';
  return capital ? w[0].toLocaleUpperCase('tr') + w.slice(1) : w;
};

// Tempo (dk/km) değerini seçili birimde yazdırır.
function fmtSpeed(paceMin) {
  return usesKmh() ? fmtSpeedKmh(paceToKmh(paceMin)) : fmtPaceUnit(paceMin);
}

// Fark hesabı gösterilen büyüklük üzerinden yapılır:
// km/sa'da yüksek olan iyi, dk/km'de düşük olan iyi.
function speedDelta(currentPace, previousPace) {
  return usesKmh()
    ? S.delta(paceToKmh(currentPace), paceToKmh(previousPace), false)
    : S.delta(currentPace, previousPace, true);
}

/* ---------- Yardımcılar ---------- */

function deltaHtml(d, format) {
  if (!Number.isFinite(d.pct)) return '<span class="flat">—</span>';
  // Ok, sayının yönünü gösterir; renk ise iyileşme mi kötüleşme mi olduğunu.
  const arrow = d.abs > 0 ? '▲' : d.abs < 0 ? '▼' : '▬';
  const extra = format ? ` (${format(Math.abs(d.abs))})` : '';
  return `<span class="${d.dir}">${arrow} ${fmtPercent(d.pct)}${extra}</span>`;
}

function statCard(key, value, deltaNode, hue) {
  return `<div class="stat"${hue ? ` style="--hue:${hue}"` : ''}>` +
         `<div class="k">${key}</div><div class="v">${value}</div>` +
         `<div class="d">${deltaNode || '<span class="flat">—</span>'}</div></div>`;
}

function cmpRow(label, cur, prev, d, hue) {
  return `<div class="cmp-row"${hue ? ` style="--hue:${hue}"` : ''}>` +
         `<span class="label">${label}</span><span>${cur}</span>` +
         `<span class="flat">${prev}</span><span class="delta">${d}</span></div>`;
}

/* ---------- Render ---------- */

function refresh() {
  activities = S.decorate(store.getActivities());
  settings = store.getSettings();
  computeScores();
  renderSummary();
  renderList();
  renderCompare();
  renderDataInfo();
}

// Her aktivite kendisinden ÖNCEKİ aktivitelerle kıyaslanarak puanlanır.
function computeScores() {
  scores = new Map();
  activities.forEach((a, i) => {
    scores.set(a.id, scoreActivity(a, settings, activities.slice(i + 1)));
  });
}

// Kalori puan motorunda hesaplanıyor; adım girilmemişse tahmin ediliyor.
const kcalOf = (act) => scores.get(act.id)?.detail.kcal ?? null;
const kcalNetOf = (act) => scores.get(act.id)?.detail.kcalNet ?? null;
const stepsOf = (act) => act.steps || S.estimateSteps(act, settings.heightCm);
// Toplamlarda 0 anlamlı bir değerdir; hesaplanamayan değerler null gelir.
const fmtSteps = (v) => (Number.isFinite(v) && v >= 0 ? `${Math.round(v).toLocaleString('tr-TR')} adım` : '—');
const fmtKcal = (v) => (Number.isFinite(v) && v >= 0 ? `${Math.round(v).toLocaleString('tr-TR')} kcal` : '—');

function sumBy(list, fn) {
  return list.reduce((sum, act) => sum + (Number(fn(act)) || 0), 0);
}

function profileReady() {
  return Boolean(Number(settings.age) && Number(settings.weightKg));
}

function renderSummary() {
  $('#coachMsg').textContent = S.coachMessage(activities, settings);

  const { thisWeek, lastWeek } = S.weekSummaries(activities);
  const weekList = S.inRange(activities, S.weekStartIso(0), S.weekStartIso(-1));
  const lastWeekList = S.inRange(activities, S.weekStartIso(1), S.weekStartIso(0));
  const goal = Number(settings.weeklyGoalKm) || 0;
  const goalList = settings.goalScope === 'run' ? weekList.filter((x) => x.type === 'run') : weekList;
  const goalDone = sumBy(goalList, (x) => x.distanceKm);
  const goalPct = goal > 0 ? Math.min(999, (goalDone / goal) * 100) : null;

  const scoreStat = recentScore();
  $('#weekStats').innerHTML = [
    statCard('Bu hafta mesafe', fmtKm(thisWeek.totalKm),
      deltaHtml(S.delta(thisWeek.totalKm, lastWeek.totalKm, false)), HUE.dist),
    statCard('Bu hafta süre', thisWeek.totalSec > 0 ? fmtDuration(thisWeek.totalSec) : '0:00',
      deltaHtml(S.delta(thisWeek.totalSec, lastWeek.totalSec, false)), HUE.time),
    statCard(`Ort. ${speedWord(false)}`, fmtSpeed(thisWeek.avgPace),
      deltaHtml(speedDelta(thisWeek.avgPace, lastWeek.avgPace)), HUE.speed),
    statCard('Ort. nabız', fmtHr(thisWeek.avgHr),
      deltaHtml(S.delta(thisWeek.avgHr, lastWeek.avgHr, true)), HUE.hr),
    statCard('Bu hafta kalori', fmtKcal(sumBy(weekList, kcalOf)),
      deltaHtml(S.delta(sumBy(weekList, kcalOf), sumBy(lastWeekList, kcalOf), false)), HUE.energy),
    statCard('Bu hafta adım', fmtSteps(sumBy(weekList, stepsOf)),
      deltaHtml(S.delta(sumBy(weekList, stepsOf), sumBy(lastWeekList, stepsOf), false)), HUE.walk),
    ...(scoreStat ? [scoreStat] : []),
  ].join('');

  // Haftalık hedef: yüzde yerine dolan çubuk
  renderGoalCard(goal, goalDone, goalPct);

  renderFatCard();
  renderMetricChart();
  renderRecords();
}

// Son 30 gündeki aktivitelerin ortalama puanı + son aktivitenin puanı
function recentScore() {
  const from = S.daysAgoIso(29);
  const recent = activities.filter((a) => a.date >= from);
  if (!recent.length) return null;
  const avg = recent.reduce((sum, a) => sum + scores.get(a.id).score, 0) / recent.length;
  const tier = scores.get(recent[0].id).tier;
  return `<div class="stat" style="--tier-color:${tier.color};--hue:${tier.color}">` +
    `<div class="k">Son 30 gün ort. puan</div>` +
    `<div class="v tinted">${fmtNum(avg, 1)}</div>` +
    `<div class="d"><span class="flat">son antrenman ${fmtNum(scores.get(recent[0].id).score, 1)} · ${tier.name}</span></div></div>`;
}

const GOAL_PRESETS = [10, 15, 20, 25, 30, 40, 50];
let goalPickerOpen = false;

// Hedef değeri: tam sayıysa ondalıksız, değilse tek basamakla (tr-TR virgülü)
const fmtGoal = (km) => fmtNum(km, Number.isInteger(km) ? 0 : 1);

// Haftalık hedef kartı. Hedef, karttaki hazır değerlerden ya da özel kutudan
// tek dokunuşla değiştirilebilir.
function renderGoalCard(goal, done, pct) {
  const box = $('#goalBar');
  const scopeLabel = settings.goalScope === 'run' ? 'sadece koşu' : 'koşu + yürüyüş';

  const picker = `
    <div class="goal-picker">
      ${GOAL_PRESETS.map((km) => `<button data-goal="${km}"${km === goal ? ' class="on"' : ''}>${fmtGoal(km)} km</button>`).join('')}
      <span class="custom">
        <input type="number" id="goalCustom" min="0" max="500" step="0.5"
               inputmode="decimal" value="${goal || ''}" aria-label="Özel hedef (km)">
        <button data-goal="custom">Uygula</button>
      </span>
    </div>`;

  if (!goal) {
    box.innerHTML = `
      <div class="goal">
        <div class="goal-head"><span>Haftalık hedef</span><b>yok</b></div>
        <div class="goal-note">Bir hedef seç, ilerlemeni burada takip edeyim.</div>
        ${picker}
      </div>`;
    return;
  }

  box.innerHTML = `
    <div class="goal">
      <div class="goal-head">
        <span>Haftalık hedef · ${scopeLabel}</span>
        <b>${fmtKm(done)} / ${fmtGoal(goal)} km</b>
      </div>
      <div class="goal-bar${pct >= 100 ? ' done' : ''}">
        <i style="width:${Math.min(100, pct)}%"></i>
      </div>
      <div class="goal-head">
        <span class="goal-note">${pct >= 100
          ? `Hedefi %${fmtNum(pct - 100, 0)} aşarak tamamladın.`
          : `Hedefe ${fmtKm(goal - done)} kaldı · %${fmtNum(pct, 0)}`}</span>
        <button data-goal="toggle">${goalPickerOpen ? 'Kapat' : 'Hedefi değiştir'}</button>
      </div>
      ${goalPickerOpen ? picker : ''}
    </div>`;
}

// Toplam net kaloriyi kaba yağ eşdeğerine çevirip motivasyon olarak gösterir.
function renderFatCard() {
  const box = $('#fatCard');
  const totalNet = sumBy(activities, kcalNetOf);

  if (!totalNet) {
    box.innerHTML = Number(settings.weightKg) ? '' : `
      <div class="fat">
        <div class="fat-title">Kalori takibi</div>
        <div class="fat-line">Kalori hesabı için Ayarlar'a kilonu gir — sonrasında
          harcadığın enerjiyi ve kaç kiloya denk geldiğini burada göreceksin.</div>
      </div>`;
    return;
  }

  const from = S.daysAgoIso(29);
  const recentNet = sumBy(activities.filter((act) => act.date >= from), kcalNetOf);
  const kgTotal = totalNet / S.KCAL_PER_KG_FAT;
  const kgRecent = recentNet / S.KCAL_PER_KG_FAT;
  const towardNext = totalNet % S.KCAL_PER_KG_FAT;
  const remaining = S.KCAL_PER_KG_FAT - towardNext;
  const pct = (towardNext / S.KCAL_PER_KG_FAT) * 100;

  box.innerHTML = `
    <div class="fat">
      <div class="fat-title">Yaktığın enerji</div>
      <div class="fat-main">${fmtNum(kgTotal, 2)} kg <small>yağ eşdeğeri · toplam ${fmtKcal(totalNet)} net</small></div>
      <div class="fat-bar"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="fat-line">
        Bir sonraki kiloya <b>${fmtKcal(remaining)}</b> kaldı${
          kgRecent > 0.01 ? ` · son 30 günde ${fmtNum(kgRecent, 2)} kg eşdeğeri yaktın` : ''}.
      </div>
      <div class="fat-note">Kaba bir tahmin: 1 kg yağ ≈ 7.700 kcal (Wishnofsky, 1958).
        Dinlenme metabolizman düşülerek net enerji kullanılır. Gerçek kilo değişimi
        beslenmene, su dengene ve metabolik uyuma bağlıdır — bu sayı sadece
        antrenmanla harcadığın enerjinin karşılığıdır.</div>
    </div>`;
}

const CHART_FORMATTERS = {
  distanceKm: { label: 'Mesafe', format: (v) => fmtNum(v, 1), color: '#38bdf8' },
  pace: {
    label: () => speedWord(),
    format: (v) => (usesKmh() ? fmtNum(v, 1) : fmtPace(v)),
    value: (a) => (usesKmh() ? paceToKmh(a.pace) : a.pace),
    color: '#fbbf24',
  },
  avgHr: { label: 'Ort. nabız', format: (v) => `${Math.round(v)}`, color: '#fb7185' },
  beatsPerKm: { label: 'Nabız verimi', format: (v) => `${Math.round(v)}`, color: '#a78bfa' },
  kcal: { label: 'Kalori', format: (v) => `${Math.round(v)}`, color: '#fb923c', value: (act) => kcalOf(act) },
  steps: { label: 'Adım', format: (v) => `${Math.round(v)}`, color: '#4ade80', value: (act) => stepsOf(act) },
  score: { label: 'Antrenman puanı', format: (v) => fmtNum(v, 1), color: '#4ade80' },
};

function renderMetricChart() {
  $('#chartMetric').querySelector('option[value="pace"]').textContent =
    usesKmh() ? 'Hız (km/sa)' : 'Tempo (dk/km)';
  const metric = $('#chartMetric').value;
  const conf = CHART_FORMATTERS[metric];
  const points = activities.slice(0, 12).reverse().map((a) => ({
    date: a.date,
    value: metric === 'score' ? scores.get(a.id).score
      : conf.value ? conf.value(a)
      : a[metric],
    type: a.type,
  }));
  renderChart($('#chart'), points, {
    ...conf,
    label: typeof conf.label === 'function' ? conf.label() : conf.label,
  });
}

function renderRecords() {
  const pr = S.personalRecords(activities);
  const rows = [
    ['En uzun mesafe', pr.longest, (a) => fmtKm(a.distanceKm), HUE.dist],
    [usesKmh() ? 'En yüksek hız (1 km+)' : 'En hızlı tempo (1 km+)', pr.fastest, (a) => fmtSpeed(a.pace), HUE.speed],
    ['En uzun süre', pr.longestTime, (a) => fmtDuration(a.durationSec), HUE.time],
    ['En düşük ort. nabız', pr.lowestHr, (a) => fmtHr(a.avgHr), HUE.hr],
    ['En iyi nabız verimi', pr.bestEfficiency, (a) => `${Math.round(a.beatsPerKm)} atış/km`, HUE.energy],
  ].filter(([, a]) => a);

  $('#records').innerHTML = rows.length
    ? rows.map(([k, a, f, hue]) =>
        `<div class="record" style="--hue:${hue}"><span class="k">${k}</span>` +
        `<span class="side"><span class="v">${f(a)}</span>` +
        `<span class="when">${TYPE_ICON[a.type]} ${fmtDate(a.date)}</span></span></div>`).join('')
    : '<p class="empty">Rekorlar için önce birkaç aktivite ekle.</p>';
}

const PART_DETAIL = (r, a) => ({
  load: r.detail.usedRpeFallback
    ? `Foster session-RPE: ${Math.round(r.detail.sessionRpeLoad)} birim (nabız girilmediği için)`
    : `Banister TRIMP: ${Math.round(r.detail.trimp)} birim`,
  intensity: r.detail.zone
    ? `Nabız rezervinin %${Math.round(r.detail.hrrRatio * 100)} seviyesi · ${r.detail.zone.name} bant`
    : 'Zorlanma notundan tahmin edildi',
  volume: `${fmtDuration(a.durationSec)} · ${fmtKm(a.distanceKm)}`,
  energy: r.detail.kcal
    ? `${Math.round(r.detail.kcal)} kcal · ${fmtNum(r.detail.mets, 1)} MET (ACSM)`
    : 'Kilo girilmediği için hesaplanamadı',
  efficiency: r.detail.efficiencyReference
    ? `${Math.round(a.beatsPerKm)} atış/km · geçmiş ortancan ${Math.round(r.detail.efficiencyReference)}`
    : 'Kıyas için aynı türde en az 2 nabızlı kayıt gerekiyor',
});

function renderScoreView(id) {
  const box = $('#scoreCard');
  const a = activities.find((x) => x.id === id) || activities[0];
  if (!a) {
    box.innerHTML = '<div class="card"><p class="empty">Önce bir aktivite ekle.</p></div>';
    return;
  }
  lastScoreId = a.id;
  const r = scores.get(a.id);
  const style = `--tier-color:${r.tier.color};--tier-tint:${r.tier.tint}`;
  const C = 2 * Math.PI * 70;
  const details = PART_DETAIL(r, a);

  const parts = Object.keys(COMPONENT_LABELS).map((k) => {
    const v = r.parts[k];
    const ok = Number.isFinite(v);
    return `<div class="part${ok ? '' : ' missing'}">
      <span class="pname">${COMPONENT_LABELS[k]} <small style="color:var(--muted)">%${Math.round(r.weights[k] * 100)}</small></span>
      <span class="pval">${ok ? `${fmtNum(v, 1)}/10` : 'yok'}</span>
      <span class="bar"><i style="width:${ok ? (v / 10) * 100 : 0}%"></i></span>
      <span class="pdesc">${details[k]}</span>
    </div>`;
  }).join('');

  const chips = [
    ['Mesafe', fmtKm(a.distanceKm), HUE.dist],
    ['Süre', fmtDuration(a.durationSec), HUE.time],
    [speedWord(), fmtSpeed(a.pace), HUE.speed],
    ['Ort. nabız', fmtHr(a.avgHr), HUE.hr],
    ['Maks. nabız', fmtHr(a.maxHr), HUE.hr],
    ['%HRR', r.detail.hrrRatio ? `%${Math.round(r.detail.hrrRatio * 100)}` : '—', HUE.hr],
    ['Kalori', fmtKcal(r.detail.kcal), HUE.energy],
    ['Net kalori', fmtKcal(r.detail.kcalNet), HUE.energy],
    [a.steps ? 'Adım' : 'Adım (tahmini)', fmtSteps(stepsOf(a)), HUE.goal],
    ['Maks. nabız (kullanılan)', `${r.detail.maxHrUsed || '—'}${r.detail.maxHrEstimated ? ' (tahmin)' : ''}`, HUE.hr],
  ].map(([k, v, hue]) => `<div class="chip" style="--hue:${hue}"><b>${k}</b>${v}</div>`).join('');

  box.innerHTML = `
    <div class="score-card" style="${style}">
      <div class="score-when">${TYPE_ICON[a.type]} ${TYPE_LABEL[a.type]} · ${fmtDate(a.date)}</div>
      <svg class="score-ring" viewBox="0 0 168 168" role="img"
           aria-label="Antrenman puanı ${fmtNum(r.score, 1)} bölü 10, ${r.tier.name}">
        <circle class="track" cx="84" cy="84" r="70" fill="none" stroke-width="12"></circle>
        <circle class="value" cx="84" cy="84" r="70" fill="none" stroke-width="12"
                stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}"></circle>
        <text class="num" x="84" y="80" text-anchor="middle" dominant-baseline="middle">${fmtNum(r.score, 1)}</text>
        <text class="max" x="84" y="114" text-anchor="middle">/ 10</text>
      </svg>
      <div class="score-tier">${r.tier.name}</div>
      <p class="score-comment">${scoreComment(r, a)}</p>
    </div>

    <div class="card" style="${style}">
      <div class="card-head"><h3>Puan nasıl oluştu</h3></div>
      <div class="score-parts">${parts}</div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Seans verileri</h3></div>
      <div class="chips">${chips}</div>
    </div>

    ${profileReady() ? '' : `<div class="card profile-cta">
      <p class="muted">Yaşını ve kilonu girersen puan tam hesaplanır: yaş maksimum
      nabzı (Tanaka), kilo ise kalori/MET değerini belirler.</p>
      <div class="actions"><button class="primary" data-go="settings">Profili doldur</button></div>
    </div>`}

    <div class="actions">
      <button class="ghost" data-go="list">Listeye dön</button>
      <button class="ghost" data-go="summary">Özete git</button>
    </div>`;

  // Halkayı puana kadar doldur
  const ring = box.querySelector('.score-ring .value');
  requestAnimationFrame(() => {
    ring.setAttribute('stroke-dashoffset', (C * (1 - r.score / 10)).toFixed(1));
  });
}

function renderList() {
  const filter = $('#listFilter').value;
  const list = filter === 'all' ? activities : activities.filter((a) => a.type === filter);
  const box = $('#activityList');

  if (!list.length) {
    box.innerHTML = '<p class="empty">Kayıt yok.</p>';
    return;
  }

  box.innerHTML = list.map((a) => {
    const metrics = [
      ['Mesafe', fmtKm(a.distanceKm), HUE.dist],
      ['Süre', fmtDuration(a.durationSec), HUE.time],
      [speedWord(), fmtSpeed(a.pace), HUE.speed],
      ['Ort. nabız', fmtHr(a.avgHr), HUE.hr],
      a.maxHr ? ['Maks.', fmtHr(a.maxHr), HUE.hr] : null,
      kcalOf(a) ? ['Kalori', fmtKcal(kcalOf(a)), HUE.energy] : null,
      stepsOf(a) ? [a.steps ? 'Adım' : 'Adım (~)', fmtSteps(stepsOf(a)), HUE.goal] : null,
      a.beatsPerKm ? ['Verim', `${Math.round(a.beatsPerKm)} atış/km`, HUE.energy] : null,
      a.effort ? ['Zorlanma', `${a.effort}/10`, HUE.walk] : null,
    ].filter(Boolean);

    const r = scores.get(a.id);
    return `<article class="item" data-id="${a.id}" style="--type-color:${a.type === 'walk' ? HUE.walk : HUE.run}">
      <div class="item-head">
        <span class="item-title">${TYPE_ICON[a.type]} ${TYPE_LABEL[a.type]}</span>
        <span class="item-date">${fmtDate(a.date)}</span>
      </div>
      <div class="item-metrics" style="margin-top:8px">
        <button class="score-badge" data-act="score" style="color:${r.tier.color};background:${r.tier.tint}"
                aria-label="Puan ${fmtNum(r.score, 1)} bölü 10, ${r.tier.name}. Ayrıntılar">
          ${fmtNum(r.score, 1)} <small>${r.tier.name}</small>
        </button>
      </div>
      <div class="item-metrics">${metrics
        .map(([k, v, hue]) => `<span data-hue style="--hue:${hue}"><b>${k}</b> ${v}</span>`).join('')}</div>
      ${a.note ? `<p class="item-note">${escapeHtml(a.note)}</p>` : ''}
      <div class="item-actions">
        <button class="ghost" data-act="edit">Düzenle</button>
        <button class="danger" data-act="delete">Sil</button>
      </div>
    </article>`;
  }).join('');
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderCompare() {
  // Dönem karşılaştırması
  const days = Number($('#comparePeriod').value);
  const { current, previous } = S.periodCompare(activities, days);
  const curList = S.inRange(activities, S.daysAgoIso(days - 1), S.daysAgoIso(-1));
  const prevList = S.inRange(activities, S.daysAgoIso(days * 2 - 1), S.daysAgoIso(days - 1));
  const head = `<div class="cmp-row head"><span>Metrik</span><span>Son ${days}g</span><span>Önceki ${days}g</span><span style="text-align:right">Fark</span></div>`;

  $('#periodCompare').innerHTML = current.count === 0 && previous.count === 0
    ? '<p class="empty">Bu dönemde kayıt yok.</p>'
    : head + [
        cmpRow('Aktivite', current.count, previous.count,
          deltaHtml(S.delta(current.count, previous.count, false)), HUE.walk),
        cmpRow('Mesafe', fmtKm(current.totalKm), fmtKm(previous.totalKm),
          deltaHtml(S.delta(current.totalKm, previous.totalKm, false)), HUE.dist),
        cmpRow('Süre', fmtDuration(current.totalSec), fmtDuration(previous.totalSec),
          deltaHtml(S.delta(current.totalSec, previous.totalSec, false)), HUE.time),
        cmpRow(`Ort. ${speedWord(false)}`, fmtSpeed(current.avgPace), fmtSpeed(previous.avgPace),
          deltaHtml(speedDelta(current.avgPace, previous.avgPace)), HUE.speed),
        cmpRow('Ort. nabız', fmtHr(current.avgHr), fmtHr(previous.avgHr),
          deltaHtml(S.delta(current.avgHr, previous.avgHr, true)), HUE.hr),
        cmpRow('Nabız verimi', beats(current.beatsPerKm), beats(previous.beatsPerKm),
          deltaHtml(S.delta(current.beatsPerKm, previous.beatsPerKm, true)), HUE.energy),
        cmpRow('Kalori', fmtKcal(sumBy(curList, kcalOf)), fmtKcal(sumBy(prevList, kcalOf)),
          deltaHtml(S.delta(sumBy(curList, kcalOf), sumBy(prevList, kcalOf), false)), HUE.energy),
        cmpRow('Adım', fmtSteps(sumBy(curList, stepsOf)), fmtSteps(sumBy(prevList, stepsOf)),
          deltaHtml(S.delta(sumBy(curList, stepsOf), sumBy(prevList, stepsOf), false)), HUE.goal),
      ].join('');

  // Son vs. önceki (aynı tür)
  const last = activities[0];
  const box = $('#lastCompare');
  if (!last) {
    box.innerHTML = '<p class="empty">Kayıt yok.</p>';
  } else {
    const { current: c, previous: p } = S.lastVsPrevious(activities, last.type);
    if (!p) {
      box.innerHTML = `<p class="empty">${TYPE_LABEL[last.type]} türünde kıyas için ikinci bir kayıt gerekiyor.</p>`;
    } else {
      box.innerHTML =
        `<div class="cmp-row head"><span>Metrik</span><span>${fmtDate(c.date)}</span><span>${fmtDate(p.date)}</span><span style="text-align:right">Fark</span></div>` +
        [
          cmpRow('Mesafe', fmtKm(c.distanceKm), fmtKm(p.distanceKm),
            deltaHtml(S.delta(c.distanceKm, p.distanceKm, false)), HUE.dist),
          cmpRow('Süre', fmtDuration(c.durationSec), fmtDuration(p.durationSec),
            deltaHtml(S.delta(c.durationSec, p.durationSec, false)), HUE.time),
          cmpRow(speedWord(), fmtSpeed(c.pace), fmtSpeed(p.pace),
            deltaHtml(speedDelta(c.pace, p.pace)), HUE.speed),
          cmpRow('Ort. nabız', fmtHr(c.avgHr), fmtHr(p.avgHr),
            deltaHtml(S.delta(c.avgHr, p.avgHr, true)), HUE.hr),
          cmpRow('Maks. nabız', fmtHr(c.maxHr), fmtHr(p.maxHr),
            deltaHtml(S.delta(c.maxHr, p.maxHr, true)), HUE.hr),
          cmpRow('Nabız verimi', beats(c.beatsPerKm), beats(p.beatsPerKm),
            deltaHtml(S.delta(c.beatsPerKm, p.beatsPerKm, true)), HUE.energy),
          cmpRow('Kalori', fmtKcal(kcalOf(c)), fmtKcal(kcalOf(p)),
            deltaHtml(S.delta(kcalOf(c), kcalOf(p), false)), HUE.energy),
          cmpRow('Adım', fmtSteps(stepsOf(c)), fmtSteps(stepsOf(p)),
            deltaHtml(S.delta(stepsOf(c), stepsOf(p), false)), HUE.goal),
        ].join('');
    }
  }

  // Tür ortalamaları
  const t = S.typeAverages(activities);
  const runs = activities.filter((act) => act.type === 'run');
  const walks = activities.filter((act) => act.type === 'walk');
  $('#typeAverages').innerHTML = (t.run.count || t.walk.count)
    ? `<div class="cmp-row head"><span>Metrik</span><span>🏃 Koşu</span><span>🚶 Yürüyüş</span><span></span></div>` +
      [
        cmpRow('Aktivite', t.run.count, t.walk.count, '', HUE.walk),
        cmpRow('Toplam mesafe', fmtKm(t.run.totalKm), fmtKm(t.walk.totalKm), '', HUE.dist),
        cmpRow(`Ort. ${speedWord(false)}`, fmtSpeed(t.run.avgPace), fmtSpeed(t.walk.avgPace), '', HUE.speed),
        cmpRow('Ort. nabız', fmtHr(t.run.avgHr), fmtHr(t.walk.avgHr), '', HUE.hr),
        cmpRow('Nabız verimi', beats(t.run.beatsPerKm), beats(t.walk.beatsPerKm), '', HUE.energy),
        cmpRow('Toplam kalori', fmtKcal(sumBy(runs, kcalOf)), fmtKcal(sumBy(walks, kcalOf)), '', HUE.energy),
        cmpRow('Toplam adım', fmtSteps(sumBy(runs, stepsOf)), fmtSteps(sumBy(walks, stepsOf)), '', HUE.goal),
      ].join('')
    : '<p class="empty">Kayıt yok.</p>';
}

function beats(v) {
  return Number.isFinite(v) ? `${Math.round(v)} atış/km` : '—';
}

function renderDataInfo() {
  const n = activities.length;
  const km = activities.reduce((s, a) => s + a.distanceKm, 0);
  $('#dataInfo').textContent = n
    ? `${n} aktivite · toplam ${fmtKm(km)} · ${fmtKcal(sumBy(activities, kcalOf))}` +
      ` · ${fmtSteps(sumBy(activities, stepsOf))} · ilk kayıt ${fmtDate(activities[n - 1].date)}`
    : 'Henüz veri yok.';
}

/* ---------- Form ---------- */

function readForm() {
  const h = Number($('#f-h').value) || 0;
  const m = Number($('#f-m').value) || 0;
  const s = Number($('#f-s').value) || 0;
  return {
    id: $('#f-id').value || null,
    type: $('input[name="type"]:checked').value,
    date: $('#f-date').value,
    distanceKm: Number($('#f-distance').value),
    durationSec: h * 3600 + m * 60 + s,
    avgHr: Number($('#f-avghr').value) || null,
    maxHr: Number($('#f-maxhr').value) || null,
    effort: Number($('#f-effort').value) || null,
    steps: Number($('#f-steps').value) || null,
    note: $('#f-note').value.trim(),
  };
}

function validate(a) {
  if (!a.date) return 'Tarih seçmelisin.';
  if (!Number.isFinite(a.distanceKm) || a.distanceKm <= 0) return 'Mesafe 0’dan büyük olmalı.';
  if (a.durationSec <= 0) return 'Süre girmelisin.';
  if (a.avgHr && (a.avgHr < 30 || a.avgHr > 240)) return 'Ortalama nabız 30–240 aralığında olmalı.';
  if (a.maxHr && a.avgHr && a.maxHr < a.avgHr) return 'Maksimum nabız, ortalamadan küçük olamaz.';
  const pace = (a.durationSec / 60) / a.distanceKm;
  if (pace < 2) {
    return usesKmh()
      ? 'Hız gerçekçi değil (30 km/sa üstü). Mesafe ya da süreyi kontrol et.'
      : 'Tempo gerçekçi değil (2 dk/km altı). Mesafe ya da süreyi kontrol et.';
  }
  return null;
}

function updatePreview() {
  const a = readForm();
  const out = $('#formPreview');
  if (!Number.isFinite(a.distanceKm) || a.distanceKm <= 0 || a.durationSec <= 0) {
    out.textContent = '';
    return;
  }
  const m = S.withMetrics(a);
  const mets = metsFor(a.type, a.distanceKm, a.durationSec);
  const kcal = kcalFor(mets, Number(settings.weightKg), a.durationSec);
  const steps = a.steps || S.estimateSteps(m, settings.heightCm);
  const extra = [
    m.beatsPerKm ? `${Math.round(m.beatsPerKm)} atış/km` : null,
    kcal ? fmtKcal(kcal) : null,
    steps ? `${a.steps ? '' : '~'}${fmtSteps(steps)}` : null,
  ].filter(Boolean).join(' · ');
  const speedPart = usesKmh()
    ? `Hız ${fmtSpeedKmh(m.speedKmh)} · tempo ${fmtPaceUnit(m.pace)}`
    : `Tempo ${fmtPaceUnit(m.pace)} · ${fmtSpeedKmh(m.speedKmh)}`;
  out.textContent = extra ? `${speedPart} · ${extra}` : speedPart;
}

function resetForm() {
  $('#activityForm').reset();
  $('#f-id').value = '';
  $('#f-date').value = todayIso();
  $('#effortOut').value = $('#f-effort').value;
  $('#formPreview').textContent = '';
  $('#formError').hidden = true;
  $('#saveBtn').textContent = 'Kaydet';
  $('#cancelEdit').hidden = true;
  editingId = null;
}

function fillForm(a) {
  editingId = a.id;
  $('#f-id').value = a.id;
  $(`input[name="type"][value="${a.type}"]`).checked = true;
  $('#f-date').value = a.date;
  $('#f-distance').value = a.distanceKm;
  $('#f-h').value = Math.floor(a.durationSec / 3600) || '';
  $('#f-m').value = Math.floor((a.durationSec % 3600) / 60);
  $('#f-s').value = a.durationSec % 60;
  $('#f-avghr').value = a.avgHr || '';
  $('#f-maxhr').value = a.maxHr || '';
  $('#f-steps').value = a.steps || '';
  $('#f-effort').value = a.effort || 5;
  $('#effortOut').value = $('#f-effort').value;
  $('#f-note').value = a.note || '';
  $('#saveBtn').textContent = 'Güncelle';
  $('#cancelEdit').hidden = false;
  updatePreview();
  showView('add');
}

/* ---------- Olaylar ---------- */

function bind() {
  $$('.tabbar button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

  $('#activityForm').addEventListener('input', updatePreview);
  $('#f-effort').addEventListener('input', (e) => { $('#effortOut').value = e.target.value; });

  $('#activityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const a = readForm();
    const err = validate(a);
    const errBox = $('#formError');
    if (err) {
      errBox.textContent = err;
      errBox.hidden = false;
      return;
    }
    const saved = store.upsertActivity(a);
    const wasEdit = Boolean(editingId);
    resetForm();
    refresh();
    toast(wasEdit ? 'Aktivite güncellendi.' : 'Aktivite kaydedildi.');
    renderScoreView(saved.id);
    showView('score');
  });

  $('#cancelEdit').addEventListener('click', () => { resetForm(); showView('list'); });

  $('#activityList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('.item').dataset.id;
    const a = activities.find((x) => x.id === id);
    if (!a) return;
    if (btn.dataset.act === 'score') {
      renderScoreView(id);
      showView('score');
    } else if (btn.dataset.act === 'edit') {
      fillForm(a);
    } else if (confirm(`${fmtDate(a.date)} tarihli ${TYPE_LABEL[a.type].toLowerCase()} kaydı silinsin mi?`)) {
      store.deleteActivity(id);
      refresh();
      toast('Kayıt silindi.');
    }
  });

  $('#goalBar').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-goal]');
    if (!btn) return;
    const value = btn.dataset.goal;
    if (value === 'toggle') {
      goalPickerOpen = !goalPickerOpen;
      renderSummary();
      return;
    }
    const km = value === 'custom' ? Number($('#goalCustom').value) : Number(value);
    if (!Number.isFinite(km) || km < 0) return;
    settings = store.saveSettings({ weeklyGoalKm: km });
    goalPickerOpen = false;
    refresh();
    syncSettingsForm();
    toast(km > 0 ? `Haftalık hedef ${fmtGoal(km)} km oldu.` : 'Haftalık hedef kaldırıldı.');
  });

  $('#scoreCard').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-go]');
    if (btn) showView(btn.dataset.go);
  });

  $('#chartMetric').addEventListener('change', renderMetricChart);
  $('#listFilter').addEventListener('change', renderList);
  $('#comparePeriod').addEventListener('change', renderCompare);

  $('#saveSettings').addEventListener('click', () => {
    settings = store.saveSettings({
      age: Number($('#s-age').value) || null,
      weightKg: Number($('#s-weight').value) || null,
      heightCm: Number($('#s-height').value) || null,
      sex: $('#s-sex').value === 'female' ? 'female' : 'male',
      speedUnit: $('#s-speedunit').value === 'pace' ? 'pace' : 'kmh',
      weeklyGoalKm: Number($('#s-weekly').value) || 0,
      goalScope: $('#s-goalscope').value === 'run' ? 'run' : 'all',
      restHr: Number($('#s-resthr').value) || null,
      maxHr: Number($('#s-maxhr').value) || null,
    });
    refresh();
    syncSettingsForm();
    if (lastScoreId) renderScoreView(lastScoreId);
    toast('Ayarlar kaydedildi, puanlar yeniden hesaplandı.');
  });

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paceup-yedek-${todayIso()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const count = store.importJson(await file.text(), 'merge');
      refresh();
      syncSettingsForm();
      toast(`${count} kayıt içe aktarıldı.`);
    } catch {
      toast('Dosya okunamadı: geçersiz JSON.');
    }
    e.target.value = '';
  });

  $('#wipeBtn').addEventListener('click', () => {
    if (!confirm('Tüm aktiviteler ve ayarlar silinecek. Emin misin?')) return;
    store.wipe();
    refresh();
    syncSettingsForm();
    toast('Tüm veriler silindi.');
  });

  window.addEventListener('hashchange', () => {
    const v = location.hash.slice(1);
    if (v && document.getElementById(`view-${v}`)) showView(v);
  });
}

function syncSettingsForm() {
  settings = store.getSettings();
  $('#s-age').value = settings.age ?? '';
  $('#s-weight').value = settings.weightKg ?? '';
  $('#s-height').value = settings.heightCm ?? '';
  $('#s-sex').value = settings.sex === 'female' ? 'female' : 'male';
  $('#s-speedunit').value = settings.speedUnit === 'pace' ? 'pace' : 'kmh';
  $('#s-weekly').value = settings.weeklyGoalKm ?? '';
  $('#s-goalscope').value = settings.goalScope === 'run' ? 'run' : 'all';
  $('#s-resthr').value = settings.restHr ?? '';
  const est = estimatedMaxHr(Number(settings.age));
  $('#s-maxhr').value = settings.maxHr ?? '';
  $('#s-maxhr').placeholder = est ? `${est} (yaşından tahmin)` : '190';
}

/* ---------- PWA kurulumu ---------- */

function setupInstall() {
  let deferred = null;
  const btn = $('#installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });
  btn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    btn.hidden = true;
  });
  window.addEventListener('appinstalled', () => { btn.hidden = true; });
}

function registerSw() {
  if (!('serviceWorker' in navigator)) return;
  let reloading = false;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // Yeni sürüm yüklendiğinde kullanıcıya haber ver ve bir kez yenile.
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state !== 'installed' || !navigator.serviceWorker.controller) return;
          if (reloading) return;
          reloading = true;
          toast('Yeni sürüm hazır, yenileniyor…');
          setTimeout(() => location.reload(), 1500);
        });
      });
      // Uygulama uzun süre açık kalırsa saatte bir güncelleme kontrolü.
      setInterval(() => reg.update(), 60 * 60 * 1000);
      // Uygulamaya geri dönüldüğünde de kontrol et.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update();
      });
    }).catch(() => { /* offline desteği yok, sorun değil */ });
  });
}

/* ---------- Başlangıç ---------- */

function init() {
  $('#appVersion').textContent = `v${APP_VERSION}`;
  bind();
  resetForm();
  syncSettingsForm();
  refresh();
  setupInstall();
  registerSw();
  const v = location.hash.slice(1);
  if (v === 'score') renderScoreView(activities[0]?.id);
  showView(v && document.getElementById(`view-${v}`) ? v : 'summary');
}

init();
