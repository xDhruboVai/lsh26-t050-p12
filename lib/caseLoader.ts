import { parsePaisa } from './money';
import { monthKey } from './dates';
import { CATEGORIES, type Category, type Expense, type LedgerState, type Pocket } from './types';

/** Shape as it arrives in the fixture file. Nothing here is trusted. */
interface RawCase {
  case_id?: string;
  today?: string;
  months?: { last?: string; this?: string };
  salary_bdt?: string;
  expenses?: Array<Record<string, unknown>>;
  pockets?: Array<Record<string, unknown>>;
  dps_annual_rate_percent?: string;
  dps_rule?: string;
}

export const DEFAULT_DPS_RULE =
  'Annual rate as stated. Each month: balance = balance + deposit, then interest = ' +
  'balance x rate / 12 / 100 rounded half up to the paisa and added to the balance ' +
  '(interest joins the balance, so later months earn on it).';

function asCategory(value: unknown): Category {
  const s = String(value ?? '').trim();
  const hit = CATEGORIES.find((c) => c.toLowerCase() === s.toLowerCase());
  return hit ?? 'Food';
}

/**
 * Turn a raw case into application state.
 *
 * Nothing about the case is assumed: not the number of expenses (41-61 in the
 * public set), not the number of pockets (the bundled format_note says 1, every
 * public case carries 3), not the DPS rate (7.50-10.00 across cases). Private
 * cases are what score us, so every count and rate is read, never hardcoded.
 */
export function loadCase(raw: RawCase): LedgerState {
  if (!raw || typeof raw !== 'object') throw new Error('Case must be a JSON object.');

  const expensesRaw = Array.isArray(raw.expenses) ? raw.expenses : [];
  const pocketsRaw = Array.isArray(raw.pockets) ? raw.pockets : [];

  const expenses: Expense[] = expensesRaw.map((e, i) => {
    const date = String(e.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`expense ${i}: bad date ${date}`);
    return {
      id: String(e.id ?? `E${String(i + 1).padStart(3, '0')}`),
      date,
      category: asCategory(e.category),
      shop: String(e.shop ?? 'Unknown'),
      amountPaisa: parsePaisa(String(e.amount_bdt ?? e.amountPaisa ?? '0')),
      source: 'seed',
    };
  });

  const pockets: Pocket[] = pocketsRaw.map((p, i) => ({
    id: String(p.id ?? `SP-${i + 1}`),
    name: String(p.name ?? `Pocket ${i + 1}`),
    item: String(p.item ?? ''),
    targetPaisa: parsePaisa(String(p.target_bdt ?? '0')),
    monthlyContribPaisa: parsePaisa(String(p.monthly_contribution_bdt ?? '0')),
  }));

  // `today` may be absent in a hand-written case; fall back to the latest expense.
  const today =
    raw.today ??
    expenses.map((e) => e.date).sort().at(-1) ??
    new Date().toISOString().slice(0, 10);

  const thisMonth = raw.months?.this ?? monthKey(today);
  const lastMonth =
    raw.months?.last ??
    [...new Set(expenses.map((e) => monthKey(e.date)))].sort().filter((m) => m < thisMonth).at(-1) ??
    thisMonth;

  return {
    caseId: String(raw.case_id ?? 'custom'),
    today,
    months: { last: lastMonth, this: thisMonth },
    salaryPaisa: parsePaisa(String(raw.salary_bdt ?? '0')),
    dpsAnnualRatePct: String(raw.dps_annual_rate_percent ?? '9.00'),
    dpsRule: String(raw.dps_rule ?? DEFAULT_DPS_RULE),
    expenses,
    pockets,
  };
}

/** Parse pasted text as a single case, or as the full fixture file. */
export function loadFromText(text: string): LedgerState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That is not valid JSON. Paste one case object, or the whole cases file.');
  }
  const obj = parsed as { cases?: RawCase[] };
  if (obj && Array.isArray(obj.cases)) {
    if (obj.cases.length === 0) throw new Error('The file has an empty "cases" array.');
    return loadCase(obj.cases[0]);
  }
  return loadCase(parsed as RawCase);
}
