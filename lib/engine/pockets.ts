import { addMonths, firstOf } from '../dates';
import { parsePaisa, roundHalfUp, sum } from '../money';
import type { Forecast, LedgerState, PocketPlan, PocketsResult, ScheduleRow } from '../types';

const MAX_MONTHS = 600;

/**
 * Bullet 4. Pocket completion dates and the DPS comparison.
 *
 * The constraint is explicit: completion dates must come from the FORECAST, not
 * from target / contribution. So:
 *
 *   monthlySurplus = max(0, salary - projected monthly spend)   <- from forecast
 *
 *   Each month the surplus is allocated across pockets in list order, up to
 *   each pocket's stated monthly contribution. A pocket completes on the 1st of
 *   the first month its balance reaches its target. When a pocket completes its
 *   allocation is released to the pockets behind it, so later pockets speed up.
 *
 *   If the surplus is 0, or a pocket never receives an allocation, the pocket is
 *   reported UNREACHABLE at current spending rather than given a fabricated date.
 *
 * The first contribution lands on the 1st of the month after `today`: this
 * month's salary is already partly spent, and the forecast covers it.
 *
 * DPS runs alongside on the same deposits, per the rule carried in the case:
 *   balance += deposit
 *   interest = roundHalfUp(balance * rate / 12 / 100)
 *   balance += interest        (interest joins the balance and compounds)
 */
export function buildPockets(state: LedgerState, forecast: Forecast): PocketsResult {
  const surplus = forecast.monthlySurplusPaisa;
  const pockets = state.pockets;

  // "9.00" percent -> 900 hundredths of a percent, so the whole DPS calculation
  // stays in integers: interest = balance * 900 / (12 * 100 * 100).
  const rateHundredths = parsePaisa(state.dpsAnnualRatePct);
  const DPS_DIVISOR = 12 * 100 * 100;

  const live = pockets.map((p) => ({
    pocket: p,
    balance: 0,
    dpsBalance: 0,
    dpsInterest: 0,
    firstContribPaisa: 0,
    schedule: [] as ScheduleRow[],
    doneMonth: null as string | null,
  }));

  if (surplus > 0 && pockets.length > 0) {
    let month = state.months.this;

    for (let step = 0; step < MAX_MONTHS; step += 1) {
      month = addMonths(month, 1);
      let remaining = surplus;
      let anyOpen = false;

      for (const row of live) {
        if (row.doneMonth !== null) continue;
        anyOpen = true;

        const give = Math.min(row.pocket.monthlyContribPaisa, remaining);
        remaining -= give;
        if (step === 0) row.firstContribPaisa = give;

        row.balance += give;

        row.dpsBalance += give;
        const interest = give === 0 && row.dpsBalance === 0
          ? 0
          : roundHalfUp(row.dpsBalance * rateHundredths, DPS_DIVISOR);
        row.dpsBalance += interest;
        row.dpsInterest += interest;

        row.schedule.push({
          month,
          contributionPaisa: give,
          balancePaisa: row.balance,
          dpsBalancePaisa: row.dpsBalance,
          dpsInterestPaisa: row.dpsInterest,
        });

        if (row.balance >= row.pocket.targetPaisa && row.pocket.targetPaisa > 0) {
          row.doneMonth = month;
        }
      }

      if (!anyOpen) break;
    }
  }

  const plans: PocketPlan[] = live.map((row) => {
    const p = row.pocket;
    const reachable = row.doneMonth !== null;
    return {
      pocketId: p.id,
      name: p.name,
      item: p.item,
      targetPaisa: p.targetPaisa,
      monthlyContribPaisa: p.monthlyContribPaisa,
      effectiveContribPaisa: row.firstContribPaisa,
      reachable,
      monthsToComplete: reachable ? row.schedule.length : null,
      completionMonth: row.doneMonth,
      completionDate: row.doneMonth ? firstOf(row.doneMonth) : null,
      schedule: row.schedule,
      dpsBalancePaisa: row.dpsBalance,
      dpsInterestPaisa: row.dpsInterest,
      dpsAnnualRatePct: state.dpsAnnualRatePct,
      shortfallPaisa: Math.max(0, p.monthlyContribPaisa - row.firstContribPaisa),
    };
  });

  const totalRequestedPaisa = sum(pockets.map((p) => p.monthlyContribPaisa));

  return {
    monthlySurplusPaisa: surplus,
    totalRequestedPaisa,
    fullyFunded: surplus >= totalRequestedPaisa,
    plans,
  };
}
