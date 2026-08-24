// Ay takvimi: antrenman yapılan günler işaretlenir, gün seçilebilir.
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function monthLabel(year, month) {
  return new Date(year, month, 1)
    .toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

export function isoOf(year, month, day) {
  const p = (n) => String(n).padStart(2, '0');
  return `${year}-${p(month + 1)}-${p(day)}`;
}

export function monthRange(year, month) {
  return { from: isoOf(year, month, 1), to: isoOf(year, month + 1 === 12 ? year + 1 : year, 1) };
}

/**
 * @param year, month (0-11)
 * @param byDate     Map<iso, activity[]>
 * @param selected   seçili gün (iso) ya da null
 * @param todayIso   bugünün tarihi
 * @returns takvim ızgarasının HTML'i
 */
export function renderMonth(year, month, byDate, selected, todayIso) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;        // Pazartesi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push('<div class="cal-cell empty"></div>');

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = isoOf(year, month, day);
    const list = byDate.get(iso) || [];
    const classes = ['cal-cell'];
    if (list.length) classes.push('has');
    if (iso === todayIso) classes.push('today');
    if (iso === selected) classes.push('selected');

    const dots = list.slice(0, 3).map((a) =>
      `<i class="dot ${a.type}"></i>`).join('');
    const more = list.length > 3 ? '<i class="dot more"></i>' : '';
    const label = list.length
      ? `${day}. gün, ${list.length} antrenman`
      : `${day}. gün, antrenman yok`;

    cells.push(
      `<button class="${classes.join(' ')}" data-date="${iso}"${list.length ? '' : ' disabled'}
               aria-label="${label}"><span class="num">${day}</span>` +
      `<span class="dots">${dots}${more}</span></button>`
    );
  }

  return `<div class="cal-grid" role="grid">
    ${WEEKDAYS.map((d) => `<div class="cal-weekday">${d}</div>`).join('')}
    ${cells.join('')}
  </div>`;
}
