import { daysInMonth as daysIn, dayOfMonth, monthLabelShort, dateLabel } from '../dates';
import { fmt, pctOf, roundHalfUp, sum } from '../money';
import { expensesIn } from './summary';
import type { Category, Forecast, Insight, LedgerState, RecurringItem } from '../types';

/**
 * Bullet 3. Forecast for the rest of the month plus written insights.
 *
 * Method (stated in the README verbatim):
 *
 *   A category+shop pair that appeared LAST month and has NOT yet appeared this
 *   month is treated as recurring and still due, at last month's amount.
 *   Everything else is variable and runs at the observed daily rate.
 *
 *     variableDailyRate = variable spend this month / days elapsed
 *     restOfMonth       = variableDailyRate * daysRemaining + recurringStillDue
 *     projectedTotal    = spentThisMonth + restOfMonth
 *     projectedLeft     = salary - projectedTotal          (negative = short)
 *
 * The variable projection is one rounded division
 * (variableSpent * daysRemaining / daysElapsed) rather than a rounded daily rate
 * multiplied out, so spent + rest === total holds exactly in paisa.
 */

function recurringKey(category: string, shop: string): string {
  return category + '::' + shop.trim().toLowerCase();
}

export function buildForecast(state: LedgerState): Forecast {
  const month = state.months.this;
  const thisRows = expensesIn(state, month);
  const lastRows = expensesIn(state, state.months.last);

  const totalDays = daysIn(month);
  const daysElapsed = Math.max(1, Math.min(dayOfMonth(state.today), totalDays));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  // Which category+shop pairs recurred last month, and at what amount.
  const lastByKey = new Map<string, { category: Category; shop: string; paisa: number }>();
  for (const e of lastRows) {
    const k = recurringKey(e.category, e.shop);
    const prev = lastByKey.get(k);
    if (prev) prev.paisa += e.amountPaisa;
    else lastByKey.set(k, { category: e.category, shop: e.shop, paisa: e.amountPaisa });
  }

  const seenThisMonth = new Set(thisRows.map((e) => recurringKey(e.category, e.shop)));

  const recurring: RecurringItem[] = [...lastByKey.entries()]
    .map(([key, v]) => ({
      key,
      category: v.category,
      shop: v.shop,
      expectedPaisa: v.paisa,
      seenThisMonth: seenThisMonth.has(key),
    }))
    .sort((a, b) => b.expectedPaisa - a.expectedPaisa);

  const recurringDuePaisa = sum(
    recurring.filter((r) => !r.seenThisMonth).map((r) => r.expectedPaisa),
  );

  // Split this month's actual spend into recurring-pair rows and variable rows.
  const recurringKeys = new Set(recurring.map((r) => r.key));
  const recurringSpentPaisa = sum(
    thisRows
      .filter((e) => recurringKeys.has(recurringKey(e.category, e.shop)))
      .map((e) => e.amountPaisa),
  );
  const spentThisMonthPaisa = sum(thisRows.map((e) => e.amountPaisa));
  const variableSpentPaisa = spentThisMonthPaisa - recurringSpentPaisa;

  const variableRestPaisa =
    daysRemaining === 0 ? 0 : roundHalfUp(variableSpentPaisa * daysRemaining, daysElapsed);
  const restOfMonthPaisa = variableRestPaisa + recurringDuePaisa;

  const projectedMonthTotalPaisa = spentThisMonthPaisa + restOfMonthPaisa;
  const projectedLeftPaisa = state.salaryPaisa - projectedMonthTotalPaisa;

  const forecast: Forecast = {
    month,
    daysInMonth: totalDays,
    daysElapsed,
    daysRemaining,
    spentThisMonthPaisa,
    variableSpentPaisa,
    recurringSpentPaisa,
    variableDailyPaisa: roundHalfUp(variableSpentPaisa, daysElapsed),
    recurringDuePaisa,
    restOfMonthPaisa,
    projectedMonthTotalPaisa,
    projectedLeftPaisa,
    monthlySurplusPaisa: Math.max(0, projectedLeftPaisa),
    recurring,
    insights: [],
  };

  forecast.insights = buildInsights(state, forecast);
  return forecast;
}

/**
 * At least three insights, each naming a specific category and amount.
 * Nothing here is a fixed sentence: every candidate is built from live numbers
 * and suppressed when its number is not there, so the list changes with the data.
 */
/** Whole taka. Paisa in a sentence reads as noise; the cards carry the exact figure. */
const tk = (paisa: number) => fmt(paisa, { paisa: false });

export function buildInsights(state: LedgerState, f: Forecast): Insight[] {
  const thisRows = expensesIn(state, state.months.this);
  const lastRows = expensesIn(state, state.months.last);
  if (thisRows.length === 0) return [];

  const byCat = new Map<Category, number>();
  for (const e of thisRows) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amountPaisa);
  const lastByCat = new Map<Category, number>();
  for (const e of lastRows) lastByCat.set(e.category, (lastByCat.get(e.category) ?? 0) + e.amountPaisa);

  const lastLabel = monthLabelShort(state.months.last);
  const monthLabel = monthLabelShort(f.month);
  const candidates: Array<Insight & { weight: number }> = [];

  // 1. Largest category this month, and its share of salary.
  const ranked = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length > 0) {
    const [category, paisa] = ranked[0];
    const share = pctOf(paisa, state.salaryPaisa);
    candidates.push({
      id: 'top-category',
      kind: 'top-category',
      category,
      amountPaisa: paisa,
      tone: share >= 30 ? 'warn' : 'info',
      weight: 100 + share,
      text:
        category + ' is your largest category at ' + tk(paisa) + ' so far this month — ' +
        share + '% of your ' + tk(state.salaryPaisa) + ' salary.',
    });
  }

  // 2. Biggest month-over-month rise by category.
  let rise: { category: Category; delta: number; now: number; before: number } | null = null;
  for (const [category, paisa] of byCat) {
    const before = lastByCat.get(category) ?? 0;
    const delta = paisa - before;
    if (delta > 0 && (!rise || delta > rise.delta)) rise = { category, delta, now: paisa, before };
  }
  if (rise) {
    const isNew = rise.before === 0;
    candidates.push({
      id: 'biggest-rise',
      kind: 'biggest-rise',
      category: rise.category,
      amountPaisa: rise.delta,
      tone: 'warn',
      weight: 90 + pctOf(rise.delta, Math.max(1, rise.before)) / 10,
      text: isNew
        ? rise.category + ' is new this month at ' + tk(rise.now) + ' — you spent nothing on it in ' +
          lastLabel + '.'
        : rise.category + ' is up ' + tk(rise.delta) + ' against ' + lastLabel + ' (' +
          pctOf(rise.delta, rise.before) + '% more) — ' + tk(rise.now) + ' versus ' +
          tk(rise.before) + '.',
    });
  }

  // 3. Single largest expense this month.
  const biggest = [...thisRows].sort((a, b) => b.amountPaisa - a.amountPaisa)[0];
  if (biggest) {
    candidates.push({
      id: 'biggest-expense',
      kind: 'biggest-expense',
      category: biggest.category,
      amountPaisa: biggest.amountPaisa,
      tone: 'info',
      weight: 70 + pctOf(biggest.amountPaisa, Math.max(1, f.spentThisMonthPaisa)),
      text:
        'Your single largest expense is ' + tk(biggest.amountPaisa) + ' at ' + biggest.shop +
        ' (' + biggest.category + ') on ' + dateLabel(biggest.date) + '.',
    });
  }

  // 4. Projected shortfall or headroom at month end.
  if (f.projectedLeftPaisa < 0) {
    candidates.push({
      id: 'shortfall',
      kind: 'shortfall',
      amountPaisa: -f.projectedLeftPaisa,
      tone: 'warn',
      weight: 200,
      text:
        'At this rate you finish ' + monthLabel + ' ' + tk(-f.projectedLeftPaisa) +
        ' short — projected spending is ' + tk(f.projectedMonthTotalPaisa) + ' against a ' +
        tk(state.salaryPaisa) + ' salary.',
    });
  } else {
    candidates.push({
      id: 'underspend',
      kind: 'underspend',
      amountPaisa: f.projectedLeftPaisa,
      tone: 'good',
      weight: 60,
      text:
        'You are on track to end ' + monthLabel + ' with ' + tk(f.projectedLeftPaisa) +
        ' left, after a projected ' + tk(f.restOfMonthPaisa) + ' over the remaining ' +
        f.daysRemaining + ' days.',
    });
  }

  // 5. Recurring bills not yet paid this month.
  const due = f.recurring.filter((r) => !r.seenThisMonth);
  if (due.length > 0 && f.recurringDuePaisa > 0) {
    const names = due.slice(0, 2).map((r) => r.shop).join(' and ');
    const more = due.length > 2 ? ' and ' + (due.length - 2) + ' more' : '';
    candidates.push({
      id: 'recurring-due',
      kind: 'recurring-due',
      category: due[0].category,
      amountPaisa: f.recurringDuePaisa,
      tone: 'warn',
      weight: 120,
      text:
        tk(f.recurringDuePaisa) + ' of usual bills has not appeared yet this month — ' +
        names + more + ', based on ' + lastLabel + '.',
    });
  }

  // 6. Any other category eating an outsized share of salary.
  for (const [category, paisa] of ranked.slice(1, 3)) {
    const share = pctOf(paisa, state.salaryPaisa);
    if (share >= 15) {
      const count = thisRows.filter((e) => e.category === category).length;
      candidates.push({
        id: 'salary-share-' + category,
        kind: 'salary-share',
        category,
        amountPaisa: paisa,
        tone: 'info',
        weight: 50 + share,
        text:
          category + ' has taken ' + tk(paisa) + ', ' + share +
          '% of your salary, across ' + count + ' payments this month.',
      });
    }
  }

  return candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(({ weight: _w, ...rest }) => rest);
}
