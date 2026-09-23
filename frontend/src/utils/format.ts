const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, fractionDigits: number): Intl.NumberFormat {
  const key = `${currency}-${fractionDigits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, f);
  }
  return f;
}

// Indian short scale for chart axes: thousand, lakh (1,00,000), crore (1,00,00,000).
const COMPACT_UNITS: [number, string][] = [
  [1e7, 'Cr'],
  [1e5, 'L'],
  [1e3, 'K'],
];

/** ₹1,234.50 — or ₹1.2K / ₹3.4L / ₹1.1Cr when `compact`. */
export function formatCurrency(amount: number, currency = 'INR', compact = false): string {
  if (!compact) return formatter(currency, 2).format(amount);
  const unit = COMPACT_UNITS.find(([size]) => Math.abs(amount) >= size);
  if (!unit) return formatter(currency, 0).format(amount);
  const symbol = formatter(currency, 0).formatToParts(0).find((p) => p.type === 'currency')?.value ?? '';
  const scaled = Math.round((Math.abs(amount) / unit[0]) * 10) / 10;
  return `${amount < 0 ? '-' : ''}${symbol}${scaled}${unit[1]}`;
}

/** 'YYYY-MM-DD' -> '5 Mar 2026' (parsed as a calendar date, no timezone shift). */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** 'YYYY-MM' -> 'March 2026' (or 'Mar 26' when short). */
export function formatMonth(month: string, short = false): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', short ? { month: 'short', year: '2-digit' } : { month: 'long', year: 'numeric' });
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Today's local date as 'YYYY-MM-DD'. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Current local month as 'YYYY-MM'. */
export function currentMonth(now: Date = new Date()): string {
  return todayIso(now).slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Percentage change from `previous` to `current`, or null when not meaningful. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
