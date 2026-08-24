// Bağımlılıksız, tek dosyalık SVG grafik.
import { fmtDateShort } from './format.js';

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, text) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * points: [{ date, value, type }] — eskiden yeniye sıralı
 * opts: { format(v), lowerIsBetter }
 */
export function renderChart(container, points, opts = {}) {
  container.textContent = '';
  const valid = points.filter((p) => Number.isFinite(p.value));
  if (valid.length < 2) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = valid.length === 0
      ? 'Bu metrik için yeterli veri yok.'
      : 'Grafik için en az 2 kayıt gerekiyor.';
    container.append(p);
    return;
  }

  const W = 640, H = 240;
  const pad = { top: 16, right: 12, bottom: 28, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const values = valid.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  min -= span * 0.12;
  max += span * 0.12;

  const x = (i) => pad.left + (valid.length === 1 ? innerW / 2 : (i / (valid.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - ((v - min) / (max - min)) * innerH;

  const color = opts.color || '#22d3ee';

  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-label': `${opts.label || 'Metrik'} grafiği, ${valid.length} kayıt`,
  });

  // Izgara + eksen etiketleri
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = min + ((max - min) * i) / ticks;
    const yy = y(v);
    svg.append(el('line', {
      x1: pad.left, x2: W - pad.right, y1: yy, y2: yy,
      stroke: '#2a3040', 'stroke-width': 1,
    }));
    svg.append(el('text', {
      x: pad.left - 8, y: yy + 4, 'text-anchor': 'end',
      fill: '#9aa4b8', 'font-size': 11,
    }, opts.format ? opts.format(v) : v.toFixed(1)));
  }

  // Alan + çizgi
  const line = valid.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(valid.length - 1).toFixed(1)},${pad.top + innerH} L${x(0).toFixed(1)},${pad.top + innerH} Z`;

  const grad = el('linearGradient', { id: 'chartFill', x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.append(el('stop', { offset: '0', 'stop-color': color, 'stop-opacity': '0.32' }));
  grad.append(el('stop', { offset: '1', 'stop-color': color, 'stop-opacity': '0' }));
  const defs = el('defs');
  defs.append(grad);
  svg.append(defs);

  svg.append(el('path', { d: area, fill: 'url(#chartFill)' }));
  svg.append(el('path', {
    d: line, fill: 'none', stroke: color,
    'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  }));

  // Noktalar
  valid.forEach((p, i) => {
    const c = el('circle', {
      cx: x(i), cy: y(p.value), r: 4.5,
      fill: p.type === 'walk' ? '#4ade80' : '#22d3ee',
      // nokta rengi türü, çizgi rengi metriği gösterir
      stroke: '#0f1115', 'stroke-width': 2,
    });
    c.append(el('title', {}, `${fmtDateShort(p.date)} · ${opts.format ? opts.format(p.value) : p.value}`));
    svg.append(c);
  });

  // X etiketleri (ilk, orta, son)
  const idxs = [...new Set([0, Math.floor((valid.length - 1) / 2), valid.length - 1])];
  for (const i of idxs) {
    svg.append(el('text', {
      x: x(i), y: H - 8,
      'text-anchor': i === 0 ? 'start' : i === valid.length - 1 ? 'end' : 'middle',
      fill: '#9aa4b8', 'font-size': 11,
    }, fmtDateShort(valid[i].date)));
  }

  container.append(svg);
}
