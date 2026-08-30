'use client';

import { useState } from 'react';
import { useForecast, useLedger, usePockets } from '../../lib/store';
import { fmt, parsePaisa } from '../../lib/money';
import { monthLabel } from '../../lib/dates';
import { Card, Chip, EmptyState, SectionTitle } from '../../components/ui';

/** Bullet 4 — pockets, completion dates from the forecast, and the DPS comparison. */
export default function PocketsPage() {
  const ledger = useLedger((s) => s.ledger);
  const updatePocket = useLedger((s) => s.updatePocket);
  const f = useForecast();
  const result = usePockets();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Savings pockets</h1>
        <p className="text-[13px] text-ink2">
          Dates come from your forecast, not from target divided by contribution.
        </p>
      </div>

      {/* Where the money to save actually comes from */}
      <Card>
        <SectionTitle hint={monthLabel(f.month)}>Monthly surplus</SectionTitle>
        <div className="flex items-baseline justify-between">
          <p
            className="num text-[24px] font-semibold"
            style={{ color: result.monthlySurplusPaisa > 0 ? 'var(--c-accent)' : 'var(--c-risk)' }}
          >
            {fmt(result.monthlySurplusPaisa, { paisa: false })}
          </p>
          <p className="text-[12.5px] text-ink3">
            {fmt(result.totalRequestedPaisa, { paisa: false })} requested
          </p>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink3">
          Salary {fmt(ledger.salaryPaisa, { paisa: false })} minus projected spending{' '}
          {fmt(f.projectedMonthTotalPaisa, { paisa: false })}. Surplus is allocated to pockets in
          order each month, up to each pocket&rsquo;s contribution; when one completes, its share
          passes to the pockets behind it. The first contribution lands next month.
        </p>
        {!result.fullyFunded && result.monthlySurplusPaisa > 0 && (
          <p className="mt-2 text-[12.5px]" style={{ color: 'var(--c-warn)' }}>
            The surplus does not cover every contribution. Pockets are funded in order.
          </p>
        )}
      </Card>

      {result.plans.length === 0 ? (
        <EmptyState
          title="No pockets yet"
          body="A pocket is a specific thing you are saving for — a laptop, a deposit, a wedding — with a target and a monthly contribution."
        />
      ) : (
        result.plans.map((plan) => (
          <PocketCard
            key={plan.pocketId}
            plan={plan}
            onContribution={(paisa) => updatePocket(plan.pocketId, { monthlyContribPaisa: paisa })}
          />
        ))
      )}

      {/* The DPS rule, stated. Required by the problem. */}
      <Card>
        <SectionTitle hint={`${ledger.dpsAnnualRatePct}% per year`}>How DPS is calculated</SectionTitle>
        <p className="text-[12.5px] leading-relaxed text-ink2">{ledger.dpsRule}</p>
      </Card>
    </div>
  );
}

function PocketCard({
  plan,
  onContribution,
}: {
  plan: ReturnType<typeof usePockets>['plans'][number];
  onContribution: (paisa: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const value = draft ?? String(Math.round(plan.monthlyContribPaisa / 100));
  const funded = plan.effectiveContribPaisa;
  const capped = funded < plan.monthlyContribPaisa;

  function commit(next: string) {
    setDraft(next);
    const digits = next.replace(/[^\d]/g, '');
    if (digits === '') return;
    try {
      onContribution(parsePaisa(digits));
    } catch {
      /* keep the draft, the field shows what was typed */
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold">{plan.name}</h2>
          <p className="truncate text-[12.5px] text-ink3">{plan.item}</p>
        </div>
        <span className="num flex-none text-[14px] font-semibold">
          {fmt(plan.targetPaisa, { paisa: false })}
        </span>
      </div>

      {/* The answer */}
      <div
        className="mt-3 rounded-lg p-3"
        style={{ background: plan.reachable ? 'var(--c-accent-soft)' : 'var(--c-warn-soft)' }}
      >
        {plan.reachable ? (
          <>
            <p className="label" style={{ color: 'var(--c-accent)' }}>
              Expected completion
            </p>
            <p className="num text-[18px] font-semibold" style={{ color: 'var(--c-accent)' }}>
              {monthLabel(plan.completionMonth!)}
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--c-accent)' }}>
              {plan.monthsToComplete} monthly contributions of{' '}
              {fmt(funded, { paisa: false })}
              {capped && ' (capped by surplus)'}
            </p>
          </>
        ) : (
          <>
            <p className="label" style={{ color: 'var(--c-warn)' }}>
              Not reachable at current spending
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--c-warn)' }}>
              The forecast leaves{' '}
              {funded === 0 ? 'nothing' : fmt(funded, { paisa: false })} for this pocket each month.
              Cut monthly spending by {fmt(Math.max(plan.shortfallPaisa, 1), { paisa: false })} to
              fund it in full.
            </p>
          </>
        )}
      </div>

      {/* Bonus: change the contribution, every date moves immediately */}
      <div className="mt-3 flex items-center gap-2">
        <label className="label flex-none" htmlFor={`c-${plan.pocketId}`}>
          Monthly
        </label>
        <input
          id={`c-${plan.pocketId}`}
          className="field num py-1.5 text-[14px]"
          inputMode="numeric"
          value={value}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => setDraft(null)}
        />
      </div>

      {plan.reachable && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-rule pt-3">
            <div>
              <p className="label">Paid in</p>
              <p className="num text-[15px] font-semibold">
                {fmt(plan.dpsBalancePaisa - plan.dpsInterestPaisa, { paisa: false })}
              </p>
            </div>
            <div>
              <p className="label">Same money in a DPS</p>
              <p className="num text-[15px] font-semibold" style={{ color: 'var(--c-accent)' }}>
                {fmt(plan.dpsBalancePaisa, { paisa: false })}
              </p>
              <p className="text-[11.5px] text-ink3">
                {fmt(plan.dpsInterestPaisa, { paisa: false })} interest at {plan.dpsAnnualRatePct}%
              </p>
            </div>
          </div>

          <button
            type="button"
            className="mt-3 text-[12.5px] font-semibold"
            style={{ color: 'var(--c-accent)' }}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? 'Hide' : 'Show'} month-by-month schedule
          </button>

          {open && (
            <div className="mt-2 max-h-64 overflow-auto rounded-lg" style={{ background: 'var(--c-surface2)' }}>
              <table className="num w-full text-[12px]">
                <thead>
                  <tr className="text-ink3">
                    <th className="p-2 text-left font-semibold">Month</th>
                    <th className="p-2 text-right font-semibold">In</th>
                    <th className="p-2 text-right font-semibold">Balance</th>
                    <th className="p-2 text-right font-semibold">DPS</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.schedule.map((r) => (
                    <tr key={r.month} className="border-t border-rule">
                      <td className="p-2">{r.month}</td>
                      <td className="p-2 text-right">{fmt(r.contributionPaisa, { paisa: false })}</td>
                      <td className="p-2 text-right">{fmt(r.balancePaisa, { paisa: false })}</td>
                      <td className="p-2 text-right" style={{ color: 'var(--c-accent)' }}>
                        {fmt(r.dpsBalancePaisa, { paisa: false })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!plan.reachable && (
        <div className="mt-3 flex gap-2 border-t border-rule pt-3">
          <Chip tone="info">Target {fmt(plan.targetPaisa, { paisa: false })}</Chip>
          <Chip tone="warn">Asked for {fmt(plan.monthlyContribPaisa, { paisa: false })}/mo</Chip>
        </div>
      )}
    </Card>
  );
}
