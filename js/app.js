import * as store from './storage.js';
import * as S from './stats.js';
import { renderChart } from './chart.js';
import {
  TYPE_LABEL, TYPE_ICON, fmtNum, fmtKm, fmtDuration, fmtPace, fmtPaceUnit,
  fmtHr, fmtDate, todayIso, fmtPercent,
} from './format.js';

const APP_VERSION = '0.0.2';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let activities = [];   // metriklerle zenginleştirilmiş, en yeni ilk
let settings = store.getSettings();
let editingId = null;

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

/* ---------- Yardımcılar ---------- */

function deltaHtml(d, format) {
  if (!Number.isFinite(d.pct)) return '<span class="flat">—</span>';
  // Ok, sayının yönünü gösterir; renk ise iyileşme mi kötüleşme mi olduğunu.
  const arrow = d.abs > 0 ? '▲' : d.abs < 0 ? '▼' : '▬';
  const extra = format ? ` (${format(Math.abs(d.abs))})` : '';
  return `<span class="${d.dir}">${arrow} ${fmtPercent(d.pct)}${extra}</span>`;
}

function statCard(key, value, deltaNode) {
  return `<div class="stat"><div class="k">${key}</div><div class="v">${value}</div>` +
         `<div class="d">${deltaNode || '<span class="flat">—</span>'}</div></div>`;
}

function cmpRow(label, cur, prev, d) {
  return `<div class="cmp-row"><span class="label">${label}</span><span>${cur}</span>` +
         `<span class="flat">${prev}</span><span class="delta">${d}</span></div>`;
}

/* ---------- Render ---------- */

function refresh() {
  activities = S.decorate(store.getActivities());
  settings = store.getSettings();
  renderSummary();
  renderList();
  renderCompare();
  renderDataInfo();
}

function renderSummary() {
  $('#coachMsg').textContent = S.coachMessage(activities, settings);

  const { thisWeek, lastWeek } = S.weekSummaries(activities);
  const goal = Number(settings.weeklyGoalKm) || 0;
  const goalPct = goal > 0 ? Math.min(999, (thisWeek.totalKm / goal) * 100) : null;

  $('#weekStats').innerHTML = [
    statCard('Bu hafta mesafe', fmtKm(thisWeek.totalKm),
      deltaHtml(S.delta(thisWeek.totalKm, lastWeek.totalKm, false))),
    statCard('Bu hafta süre', thisWeek.totalSec > 0 ? fmtDuration(thisWeek.totalSec) : '0:00',
      deltaHtml(S.delta(thisWeek.totalSec, lastWeek.totalSec, false))),
    statCard('Ort. tempo', fmtPaceUnit(thisWeek.avgPace),
      deltaHtml(S.delta(thisWeek.avgPace, lastWeek.avgPace, true))),
    statCard('Ort. nabız', fmtHr(thisWeek.avgHr),
      deltaHtml(S.delta(thisWeek.avgHr, lastWeek.avgHr, true))),
  ].join('') + (goalPct !== null
    ? statCard('Haftalık hedef', `%${fmtNum(goalPct, 0)}`,
        `<span class="${goalPct >= 100 ? 'up' : 'flat'}">${fmtKm(thisWeek.totalKm)} / ${goal} km</span>`)
    : '');

  renderMetricChart();
  renderRecords();
}

const CHART_FORMATTERS = {
  distanceKm: { label: 'Mesafe', format: (v) => fmtNum(v, 1) },
  pace: { label: 'Tempo', format: (v) => fmtPace(v) },
  avgHr: { label: 'Ort. nabız', format: (v) => `${Math.round(v)}` },
  beatsPerKm: { label: 'Nabız verimi', format: (v) => `${Math.round(v)}` },
};

function renderMetricChart() {
  const metric = $('#chartMetric').value;
  const conf = CHART_FORMATTERS[metric];
  const points = activities.slice(0, 12).reverse()
    .map((a) => ({ date: a.date, value: a[metric], type: a.type }));
  renderChart($('#chart'), points, conf);
}

function renderRecords() {
  const pr = S.personalRecords(activities);
  const rows = [
    ['En uzun mesafe', pr.longest, (a) => fmtKm(a.distanceKm)],
    ['En hızlı tempo (1 km+)', pr.fastest, (a) => fmtPaceUnit(a.pace)],
    ['En uzun süre', pr.longestTime, (a) => fmtDuration(a.durationSec)],
    ['En düşük ort. nabız', pr.lowestHr, (a) => fmtHr(a.avgHr)],
    ['En iyi nabız verimi', pr.bestEfficiency, (a) => `${Math.round(a.beatsPerKm)} atış/km`],
  ].filter(([, a]) => a);

  $('#records').innerHTML = rows.length
    ? rows.map(([k, a, f]) =>
        `<div class="record"><span class="k">${k}</span>` +
        `<span><span class="v">${f(a)}</span> <span class="when">${TYPE_ICON[a.type]} ${fmtDate(a.date)}</span></span></div>`).join('')
    : '<p class="empty">Rekorlar için önce birkaç aktivite ekle.</p>';
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
      ['Mesafe', fmtKm(a.distanceKm)],
      ['Süre', fmtDuration(a.durationSec)],
      ['Tempo', fmtPaceUnit(a.pace)],
      ['Ort. nabız', fmtHr(a.avgHr)],
      a.maxHr ? ['Maks.', fmtHr(a.maxHr)] : null,
      a.beatsPerKm ? ['Verim', `${Math.round(a.beatsPerKm)} atış/km`] : null,
      a.effort ? ['Zorlanma', `${a.effort}/10`] : null,
    ].filter(Boolean);

    return `<article class="item" data-id="${a.id}">
      <div class="item-head">
        <span class="item-title">${TYPE_ICON[a.type]} ${TYPE_LABEL[a.type]}</span>
        <span class="item-date">${fmtDate(a.date)}</span>
      </div>
      <div class="item-metrics">${metrics.map(([k, v]) => `<span><b>${k}</b> ${v}</span>`).join('')}</div>
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
  const head = `<div class="cmp-row head"><span>Metrik</span><span>Son ${days}g</span><span>Önceki ${days}g</span><span style="text-align:right">Fark</span></div>`;

  $('#periodCompare').innerHTML = current.count === 0 && previous.count === 0
    ? '<p class="empty">Bu dönemde kayıt yok.</p>'
    : head + [
        cmpRow('Aktivite', current.count, previous.count,
          deltaHtml(S.delta(current.count, previous.count, false))),
        cmpRow('Mesafe', fmtKm(current.totalKm), fmtKm(previous.totalKm),
          deltaHtml(S.delta(current.totalKm, previous.totalKm, false))),
        cmpRow('Süre', fmtDuration(current.totalSec), fmtDuration(previous.totalSec),
          deltaHtml(S.delta(current.totalSec, previous.totalSec, false))),
        cmpRow('Ort. tempo', fmtPaceUnit(current.avgPace), fmtPaceUnit(previous.avgPace),
          deltaHtml(S.delta(current.avgPace, previous.avgPace, true))),
        cmpRow('Ort. nabız', fmtHr(current.avgHr), fmtHr(previous.avgHr),
          deltaHtml(S.delta(current.avgHr, previous.avgHr, true))),
        cmpRow('Nabız verimi', beats(current.beatsPerKm), beats(previous.beatsPerKm),
          deltaHtml(S.delta(current.beatsPerKm, previous.beatsPerKm, true))),
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
            deltaHtml(S.delta(c.distanceKm, p.distanceKm, false))),
          cmpRow('Süre', fmtDuration(c.durationSec), fmtDuration(p.durationSec),
            deltaHtml(S.delta(c.durationSec, p.durationSec, false))),
          cmpRow('Tempo', fmtPaceUnit(c.pace), fmtPaceUnit(p.pace),
            deltaHtml(S.delta(c.pace, p.pace, true))),
          cmpRow('Ort. nabız', fmtHr(c.avgHr), fmtHr(p.avgHr),
            deltaHtml(S.delta(c.avgHr, p.avgHr, true))),
          cmpRow('Maks. nabız', fmtHr(c.maxHr), fmtHr(p.maxHr),
            deltaHtml(S.delta(c.maxHr, p.maxHr, true))),
          cmpRow('Nabız verimi', beats(c.beatsPerKm), beats(p.beatsPerKm),
            deltaHtml(S.delta(c.beatsPerKm, p.beatsPerKm, true))),
        ].join('');
    }
  }

  // Tür ortalamaları
  const t = S.typeAverages(activities);
  $('#typeAverages').innerHTML = (t.run.count || t.walk.count)
    ? `<div class="cmp-row head"><span>Metrik</span><span>🏃 Koşu</span><span>🚶 Yürüyüş</span><span></span></div>` +
      [
        cmpRow('Aktivite', t.run.count, t.walk.count, ''),
        cmpRow('Toplam mesafe', fmtKm(t.run.totalKm), fmtKm(t.walk.totalKm), ''),
        cmpRow('Ort. tempo', fmtPaceUnit(t.run.avgPace), fmtPaceUnit(t.walk.avgPace), ''),
        cmpRow('Ort. nabız', fmtHr(t.run.avgHr), fmtHr(t.walk.avgHr), ''),
        cmpRow('Nabız verimi', beats(t.run.beatsPerKm), beats(t.walk.beatsPerKm), ''),
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
    ? `${n} aktivite · toplam ${fmtKm(km)} · ilk kayıt ${fmtDate(activities[n - 1].date)}`
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
  if (pace < 2) return 'Tempo gerçekçi değil (2 dk/km altı). Mesafe ya da süreyi kontrol et.';
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
  const eff = m.beatsPerKm ? ` · ${Math.round(m.beatsPerKm)} atış/km` : '';
  out.textContent = `Tempo ${fmtPaceUnit(m.pace)} · ${fmtNum(m.speedKmh, 1)} km/sa${eff}`;
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
    store.upsertActivity(a);
    const wasEdit = Boolean(editingId);
    resetForm();
    refresh();
    toast(wasEdit ? 'Aktivite güncellendi.' : 'Aktivite kaydedildi.');
    showView(wasEdit ? 'list' : 'summary');
  });

  $('#cancelEdit').addEventListener('click', () => { resetForm(); showView('list'); });

  $('#activityList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('.item').dataset.id;
    const a = activities.find((x) => x.id === id);
    if (!a) return;
    if (btn.dataset.act === 'edit') {
      fillForm(a);
    } else if (confirm(`${fmtDate(a.date)} tarihli ${TYPE_LABEL[a.type].toLowerCase()} kaydı silinsin mi?`)) {
      store.deleteActivity(id);
      refresh();
      toast('Kayıt silindi.');
    }
  });

  $('#chartMetric').addEventListener('change', renderMetricChart);
  $('#listFilter').addEventListener('change', renderList);
  $('#comparePeriod').addEventListener('change', renderCompare);

  $('#saveSettings').addEventListener('click', () => {
    settings = store.saveSettings({
      weeklyGoalKm: Number($('#s-weekly').value) || 0,
      restHr: Number($('#s-resthr').value) || null,
      maxHr: Number($('#s-maxhr').value) || null,
    });
    refresh();
    toast('Ayarlar kaydedildi.');
  });

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koc-yedek-${todayIso()}.json`;
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
  $('#s-weekly').value = settings.weeklyGoalKm ?? '';
  $('#s-resthr').value = settings.restHr ?? '';
  $('#s-maxhr').value = settings.maxHr ?? '';
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
  showView(v && document.getElementById(`view-${v}`) ? v : 'summary');
}

init();
