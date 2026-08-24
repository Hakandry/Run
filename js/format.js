export const TYPE_LABEL = { run: 'Koşu', walk: 'Yürüyüş' };
export const TYPE_ICON = { run: '🏃', walk: '🚶' };

export function fmtNum(v, digits = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return v.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtKm(v) {
  return v === null || !Number.isFinite(v) ? '—' : `${fmtNum(v, 2)} km`;
}

export function fmtDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
}

// Tempo: dakika/km -> "5:42"
export function fmtPace(paceMin) {
  if (!Number.isFinite(paceMin) || paceMin <= 0) return '—';
  const total = Math.round(paceMin * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtPaceUnit(paceMin) {
  const p = fmtPace(paceMin);
  return p === '—' ? p : `${p} /km`;
}

export function fmtHr(v) {
  return Number.isFinite(v) && v > 0 ? `${Math.round(v)} bpm` : '—';
}

export function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateShort(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

export function todayIso() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function fmtSigned(v, digits = 1, unit = '') {
  if (!Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `${sign}${fmtNum(Math.abs(v), digits)}${unit}`;
}

export function fmtPercent(v) {
  if (!Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `${sign}%${fmtNum(Math.abs(v), 1)}`;
}
