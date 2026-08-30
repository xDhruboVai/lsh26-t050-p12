/**
 * Money. Every amount in this app is an INTEGER NUMBER OF PAISA.
 *
 * The fixtures hand us decimal strings ("50000.00") and the DPS rule specifies
 * "rounded half up to the paisa". A float cannot honour that: 4.63 * 75 is not
 * 347.25 in IEEE-754. So we parse to paisa at the boundary and never leave.
 *
 * 1 taka = 100 paisa.
 */

/** "50000.00" | "2475.5" | "9" -> integer paisa. Throws on garbage. */
export function parsePaisa(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`bad amount: ${value}`);
    return Math.round(value * 100);
  }
  const raw = String(value).trim().replace(/,/g, '');
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (!m) throw new Error(`bad amount string: ${JSON.stringify(value)}`);
  const [, sign, whole, frac = ''] = m;
  const paisa = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return sign === '-' ? -paisa : paisa;
}

/** Integer division rounded HALF UP (away from zero on a .5 tie). */
export function roundHalfUp(numerator: number, denominator: number): number {
  if (denominator === 0) throw new Error('divide by zero');
  const neg = numerator < 0 !== denominator < 0;
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const q = Math.floor((2 * n + d) / (2 * d));
  return neg ? -q : q;
}

/** paisa -> "50000.00", the wire format the fixtures use. */
export function toBdtString(paisa: number): string {
  const neg = paisa < 0;
  const abs = Math.abs(Math.trunc(paisa));
  const s = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  return neg ? `-${s}` : s;
}

/** paisa -> "BDT 50,000" for display. Paisa shown only when non-zero. */
export function fmt(paisa: number, opts: { paisa?: boolean; sign?: boolean } = {}): string {
  const neg = paisa < 0;
  const abs = Math.abs(Math.trunc(paisa));
  const taka = Math.floor(abs / 100);
  const rest = abs % 100;
  const grouped = taka.toLocaleString('en-US');
  const showPaisa = opts.paisa ?? rest !== 0;
  const body = showPaisa ? `${grouped}.${String(rest).padStart(2, '0')}` : grouped;
  const prefix = neg ? '-' : opts.sign ? '+' : '';
  return `${prefix}BDT ${body}`;
}

/** Compact display for chart axes and tight cards: "BDT 12.4k". */
export function fmtShort(paisa: number): string {
  const taka = Math.abs(paisa) / 100;
  const sign = paisa < 0 ? '-' : '';
  if (taka >= 100000) return `${sign}BDT ${(taka / 1000).toFixed(0)}k`;
  if (taka >= 1000) return `${sign}BDT ${(taka / 1000).toFixed(1)}k`;
  return `${sign}BDT ${Math.round(taka)}`;
}

/** Percentage of a whole, rounded to one decimal, safe when whole is 0. */
export function pctOf(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/** Sum helper that keeps everything integral. */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
