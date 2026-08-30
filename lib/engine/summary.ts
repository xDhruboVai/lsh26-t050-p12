import { monthKey } from '../dates';
import { pctOf, sum } from '../money';
import { CATEGORIES, type CategoryTotal, type Expense, type LedgerState, type MonthSummary } from '../types';
import type { MonthKey } from '../dates';

export function expensesIn(state: LedgerState, month: MonthKey): Expense[] {
  return state.expenses.filter((e) => monthKey(e.date) === month);
}

export function totalIn(state: LedgerState, month: MonthKey): number {
  return sum(expensesIn(state, month).map((e) => e.amountPaisa));
}

/**
 * Bullet 2. Totals against salary, category breakdown, largest expenses, and
 * the change against last month.
 *
 * `today` sits inside the current month in every case, so this month is a
 * PARTIAL period. We report it as partial rather than extrapolating; the
 * projection is bullet 3's job, not this card's.
 */
export function buildSummary(state: LedgerState): MonthSummary {
  const month = state.months.this;
  const last = state.months.last;

  const thisRows = expensesIn(state, month);
  const lastRows = expensesIn(state, last);

  const totalPaisa = sum(thisRows.map((e) => e.amountPaisa));
  const lastMonthTotalPaisa = sum(lastRows.map((e) => e.amountPaisa));

  const lastByCat = new Map<string, number>();
  for (const e of lastRows) {
    lastByCat.set(e.category, (lastByCat.get(e.category) ?? 0) + e.amountPaisa);
  }

  const thisByCat = new Map<string, number>();
  for (const e of thisRows) {
    thisByCat.set(e.category, (thisByCat.get(e.category) ?? 0) + e.amountPaisa);
  }

  const byCategory: CategoryTotal[] = CATEGORIES
    .map((category) => {
      const paisa = thisByCat.get(category) ?? 0;
      const lastMonthPaisa = lastByCat.get(category) ?? 0;
      return {
        category,
        paisa,
        lastMonthPaisa,
        deltaPaisa: paisa - lastMonthPaisa,
        sharePct: pctOf(paisa, totalPaisa),
      };
    })
    .filter((c) => c.paisa > 0 || c.lastMonthPaisa > 0)
    .sort((a, b) => b.paisa - a.paisa || a.category.localeCompare(b.category));

  const topExpenses = [...thisRows]
    .sort((a, b) => b.amountPaisa - a.amountPaisa || a.date.localeCompare(b.date))
    .slice(0, 5);

  return {
    month,
    isPartial: true,
    totalPaisa,
    salaryPaisa: state.salaryPaisa,
    leftPaisa: state.salaryPaisa - totalPaisa,
    byCategory,
    topExpenses,
    lastMonthTotalPaisa,
    deltaPaisa: totalPaisa - lastMonthTotalPaisa,
    deltaPct: pctOf(totalPaisa - lastMonthTotalPaisa, lastMonthTotalPaisa),
    count: thisRows.length,
  };
}
