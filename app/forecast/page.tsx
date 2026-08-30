'use client';

import { useForecast, useLedger } from '../../lib/store';
import { fmt } from '../../lib/money';
import { monthLabel, monthLabelShort } from '../../lib/dates';
import { Card, Chip, EmptyState, SectionTitle, Stat } from '../../components/ui';

/** Bullet 3 — forecast for the rest of the month, and insights from the numbers. */
export default function ForecastPage() {
  const ledger = useLedger((s) => s.ledger);
  const f = useForecast();

  const short = f.projectedLeftPaisa < 0;
  const due = f.recurring.filter((r) => !r.seenThisMonth);

  if (ledger.expenses.length === 0) {
    return (
      <EmptyState
        title="Nothing to forecast yet"
        body="A forecast needs at least a few days of spending. Add expenses or load a case."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Rest of {monthLabelShort(f.month)}</h1>
        <p className="text-[13px] text-ink2">
          Day {f.daysElapsed} of {f.daysInMonth} · {f.daysRemaining} days left
        </p>
      </div>

      {/* Headline */}
      <Card className="card-lead">
        <Stat
          label={short ? 'Short at month end' : 'Left at month end'}
          value={fmt(Math.abs(f.projectedLeftPaisa), { paisa: false })}
          tone={short ? 'risk' : 'accent'}
          sub="if nothing changes"
          big
        />

        <div className="mt-3 border-t border-rule pt-3">
          <Stat
            label="Still to spend"
            value={fmt(f.restOfMonthPaisa, { paisa: false })}
            sub={`over the remaining ${f.daysRemaining} days`}
          />
        </div>

        <div className="mt-4 border-t border-rule pt-3">
          <div className="flex justify-between py-1 text-[13.5px]">
            <span className="text-ink2">Spent so far</span>
            <span className="num">{fmt(f.spentThisMonthPaisa, { paisa: false })}</span>
          </div>
          <div className="flex justify-between py-1 text-[13.5px]">
            <span className="text-ink2">
              Variable, at {fmt(f.variableDailyPaisa, { paisa: false })}/day
            </span>
            <span className="num">
              {fmt(f.restOfMonthPaisa - f.recurringDuePaisa, { paisa: false })}
            </span>
          </div>
          <div className="flex justify-between py-1 text-[13.5px]">
            <span className="text-ink2">Usual bills not yet paid</span>
            <span className="num">{fmt(f.recurringDuePaisa, { paisa: false })}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-rule pt-2 text-[14px] font-semibold">
            <span>Projected {monthLabelShort(f.month)} total</span>
            <span className="num">{fmt(f.projectedMonthTotalPaisa, { paisa: false })}</span>
          </div>
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-ink3">
          Method: a category and shop that appeared in {monthLabel(ledger.months.last)} but not yet
          this month is treated as a bill still due, at last month&rsquo;s amount. Everything else runs
          at the daily rate observed so far.
        </p>
      </Card>

      {/* Insights */}
      <Card>
        <SectionTitle hint={`${f.insights.length} from your numbers`}>What stands out</SectionTitle>
        <ul className="flex flex-col gap-2">
          {f.insights.map((i) => (
            <li
              key={i.id}
              className="rounded-lg border-l-2 p-3 text-[13.5px] leading-relaxed"
              style={{
                borderColor:
                  i.tone === 'warn' ? 'var(--c-warn)' : i.tone === 'good' ? 'var(--c-accent)' : 'var(--c-ink3)',
                background:
                  i.tone === 'warn'
                    ? 'var(--c-warn-soft)'
                    : i.tone === 'good'
                      ? 'var(--c-accent-soft)'
                      : 'var(--c-surface2)',
              }}
            >
              {i.text}
            </li>
          ))}
        </ul>
      </Card>

      {/* Recurring detail */}
      <Card>
        <SectionTitle hint={`${due.length} of ${f.recurring.length} still due`}>
          Usual monthly bills
        </SectionTitle>
        {f.recurring.length === 0 ? (
          <p className="text-[14px] text-ink2">
            Nothing repeated from {monthLabel(ledger.months.last)} yet, so the whole month is treated
            as variable spending.
          </p>
        ) : (
          <ul>
            {f.recurring.slice(0, 8).map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between gap-3 border-b border-rule py-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{r.shop}</p>
                  <p className="text-[12px] text-ink3">{r.category}</p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <span className="num text-[13.5px]">{fmt(r.expectedPaisa, { paisa: false })}</span>
                  <Chip tone={r.seenThisMonth ? 'good' : 'warn'}>{r.seenThisMonth ? 'paid' : 'due'}</Chip>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
