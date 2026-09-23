/** 'YYYY-MM' -> 'YYYY-MM-01' */
export function monthToDate(month: string): string {
  return `${month}-01`;
}

/** First and last calendar day ('YYYY-MM-DD') of a month. */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, '0');
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

/** The current month as 'YYYY-MM' (UTC). */
export function currentMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

/** Shifts a 'YYYY-MM' month by `delta` months. */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
