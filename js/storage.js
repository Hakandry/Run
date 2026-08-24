// Yerel depolama katmanı. Tüm veriler cihazda kalır.
const KEY = 'kocpwa.v1';

const DEFAULT_SETTINGS = {
  weeklyGoalKm: 20,
  goalScope: 'all',   // 'all' | 'run'
  restHr: 60,
  maxHr: null,   // boşsa yaştan tahmin edilir (Tanaka)
  age: null,
  weightKg: null,
  heightCm: null,
  bodyFatPct: null,
  vo2max: null,
  sex: 'male',
  speedUnit: 'kmh',   // 'kmh' (araç göstergesi gibi) veya 'pace' (dk/km)
};

const EMPTY = { version: 1, activities: [], settings: { ...DEFAULT_SETTINGS } };

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const data = JSON.parse(raw);
    return normalize(data);
  } catch {
    return structuredClone(EMPTY);
  }
}

function normalize(data) {
  const out = structuredClone(EMPTY);
  if (data && Array.isArray(data.activities)) {
    out.activities = data.activities.filter(isActivity).map(cleanActivity);
  }
  if (data && data.settings && typeof data.settings === 'object') {
    out.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  }
  return out;
}

function isActivity(a) {
  return a && typeof a === 'object'
    && typeof a.date === 'string'
    && Number.isFinite(Number(a.distanceKm))
    && Number.isFinite(Number(a.durationSec));
}

function cleanActivity(a) {
  return {
    id: String(a.id || newId()),
    type: a.type === 'walk' ? 'walk' : 'run',
    date: a.date.slice(0, 10),
    distanceKm: Number(a.distanceKm),
    durationSec: Math.round(Number(a.durationSec)),
    avgHr: numOrNull(a.avgHr),
    maxHr: numOrNull(a.maxHr),
    effort: numOrNull(a.effort),
    steps: numOrNull(a.steps),
    note: typeof a.note === 'string' ? a.note.slice(0, 500) : '',
    createdAt: a.createdAt || new Date().toISOString(),
  };
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

let state = read();

// Yeniden eskiye sıralı (en yeni ilk).
export function getActivities() {
  return [...state.activities].sort((a, b) =>
    b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function getSettings() {
  return { ...state.settings };
}

export function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  write(state);
  return getSettings();
}

export function upsertActivity(activity) {
  const clean = cleanActivity({ ...activity, id: activity.id || newId() });
  const i = state.activities.findIndex((a) => a.id === clean.id);
  if (i >= 0) state.activities[i] = { ...state.activities[i], ...clean };
  else state.activities.push(clean);
  write(state);
  return clean;
}

export function deleteActivity(id) {
  state.activities = state.activities.filter((a) => a.id !== id);
  write(state);
}

export function exportJson() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

// mode: 'merge' (aynı id üzerine yazar) veya 'replace'
export function importJson(text, mode = 'merge') {
  const incoming = normalize(JSON.parse(text));
  if (mode === 'replace') {
    state = incoming;
  } else {
    const byId = new Map(state.activities.map((a) => [a.id, a]));
    for (const a of incoming.activities) byId.set(a.id, a);
    state.activities = [...byId.values()];
    state.settings = { ...state.settings, ...incoming.settings };
  }
  write(state);
  return incoming.activities.length;
}

export function wipe() {
  state = structuredClone(EMPTY);
  write(state);
}
