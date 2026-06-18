export const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function startOfWeek(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return toISODate(d);
}

export function buildMonthGrid(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(y, m - 1, 1 - startOffset);
  const days: { iso: string; day: number; outside: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({ iso: toISODate(d), day: d.getDate(), outside: d.getMonth() !== m - 1 });
  }
  // remove a última linha se for inteiramente fora do mês
  if (days.slice(35, 42).every((d) => d.outside)) days.splice(35, 7);
  return days;
}
