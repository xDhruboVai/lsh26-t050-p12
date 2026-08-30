/**
 * Dates. All fixture dates are plain ISO calendar days ("2026-04-17") with no
 * timezone attached, so we treat them as strings and integer parts rather than
 * Date objects. A local-timezone Date would shift the day across UTC+6 and
 * silently move expenses between months.
 */

export type MonthKey = string; // "YYYY-MM"
export type ISODate = string;  // "YYYY-MM-DD"

export function monthKey(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

export function dayOfMonth(date: ISODate): number {
  return Number(date.slice(8, 10));
}

export function yearOf(key: MonthKey): number {
  return Number(key.slice(0, 4));
}

export function monthOf(key: MonthKey): number {
  return Number(key.slice(5, 7)); // 1-12
}

export function daysInMonth(key: MonthKey): number {
  const y = yearOf(key);
  const m = monthOf(key);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** "2026-04" + 3 -> "2026-07" */
export function addMonths(key: MonthKey, n: number): MonthKey {
  const total = yearOf(key) * 12 + (monthOf(key) - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** "2026-04" -> "2026-04-01" */
export function firstOf(key: MonthKey): ISODate {
  return `${key}-01`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-04" -> "April 2026" */
export function monthLabel(key: MonthKey): string {
  return `${MONTH_NAMES[monthOf(key) - 1]} ${yearOf(key)}`;
}

/** "2026-04" -> "Apr 2026" */
export function monthLabelShort(key: MonthKey): string {
  return `${MONTH_NAMES[monthOf(key) - 1].slice(0, 3)} ${yearOf(key)}`;
}

/** "2026-04-17" -> "17 Apr 2026" */
export function dateLabel(date: ISODate): string {
  return `${dayOfMonth(date)} ${MONTH_NAMES[monthOf(monthKey(date)) - 1].slice(0, 3)} ${yearOf(date.slice(0, 7))}`;
}
