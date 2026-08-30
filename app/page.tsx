'use client';

import { useLedger, useSummary } from '../lib/store';
import { fmt, pctOf } from '../lib/money';
import { dateLabel, monthLabel, monthLabelShort } from '../lib/dates';
import { Card, Chip, Donut, EmptyState, Meter, SectionTitle, Stat, donutColor } from '../components/ui';

/** Bullet 2 — the monthly dashboard. */
export default function DashboardPage() {
  const ledger = useLedger((s) => s.ledger);
  const s = useSummary();

  const spentPct = pctOf(s.totalPaisa, s.salaryPaisa);
  const top = s.byCategory.filter((c) => c.paisa > 0);
  const maxCat = top[0]?.paisa ?? 0;
  const barMax = Math.max(s.totalPaisa, s.lastMonthTotalPaisa, 1);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">{monthLabel(s.month)}</h1>
        <p className="text-[13px] text-ink2">
          Month to date, through {dateLabel(ledger.today)}. This month is still running.
        </p>
      </div>

      {/* Spend against salary */}
      <Card>
        <div className="flex items-end justify-between gap-3">
          <Stat
            label="Spent this month"
            value={fmt(s.totalPaisa, { paisa: false })}
            tone={s.leftPaisa < 0 ? 'risk' : undefined}
            sub={`${s.count} expenses`}
          />
          <div className="text-right">
            <p className="label">Salary</p>
            <p className="num mt-0.5 text-[15px] font-semibold text-ink2">
              {fmt(s.salaryPaisa, { paisa: false })}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <Meter value={s.totalPaisa} max={s.salaryPaisa} />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="num text-[12px] text-ink3">{spentPct}% of salary</span>
            <span className="num text-[12px]" style={{ color: s.leftPaisa < 0 ? 'var(--c-risk)' : 'var(--c-ink3)' }}>
              {s.leftPaisa < 0 ? `${fmt(-s.leftPaisa, { paisa: false })} over` : `${fmt(s.leftPaisa, { paisa: false })} unspent`}
            </span>
          </div>
        </div>
      </Card>

      {/* Against last month */}
      <Card>
        <SectionTitle hint={`vs ${monthLabelShort(ledger.months.last)}`}>Change on last month</SectionTitle>
        {s.lastMonthTotalPaisa === 0 ? (
          <p className="text-[14px] text-ink2">No spending recorded for {monthLabel(ledger.months.last)}.</p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <Chip tone={s.deltaPaisa > 0 ? 'risk' : 'good'}>
                {s.deltaPaisa > 0 ? '+' : ''}
                {fmt(s.deltaPaisa, { paisa: false }).replace('BDT ', '')} ({s.deltaPct > 0 ? '+' : ''}
                {s.deltaPct}%)
              </Chip>
              <span className="text-[12.5px] text-ink3">so far, against the full last month</span>
            </div>
            {[
              { key: ledger.months.this, value: s.totalPaisa, accent: true },
              { key: ledger.months.last, value: s.lastMonthTotalPaisa, accent: false },
            ].map((row) => (
              <div key={row.key} className="mb-2 last:mb-0">
                <div className="mb-1 flex justify-between text-[12.5px]">
                  <span className="text-ink2">{monthLabelShort(row.key)}</span>
                  <span className="num text-ink2">{fmt(row.value, { paisa: false })}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded" style={{ background: 'var(--c-surface2)' }}>
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${Math.round((row.value / barMax) * 100)}%`,
                      background: row.accent ? 'var(--c-accent)' : 'var(--c-ink3)',
                    }}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </Card>

      {/* Category breakdown */}
      <Card>
        <SectionTitle hint={`${top.length} categories`}>Where it went</SectionTitle>
        {top.length === 0 ? (
          <p className="text-[14px] text-ink2">
            Nothing recorded this month yet. Add an expense and this fills in.
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <Donut slices={top.map((c) => ({ label: c.category, value: c.paisa }))} />
            <ul className="min-w-0 flex-1">
              {top.slice(0, 6).map((c, i) => (
                <li key={c.category} className="mb-1.5 last:mb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-[13px]">
                      <span
                        className="h-2 w-2 flex-none rounded-full"
                        style={{ background: donutColor(i) }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{c.category}</span>
                    </span>
                    <span className="num flex-none text-[12.5px] text-ink2">
                      {fmt(c.paisa, { paisa: false })}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 overflow-hidden rounded" style={{ background: 'var(--c-surface2)' }}>
                    <div
                      className="h-full rounded"
                      style={{ width: `${maxCat > 0 ? Math.round((c.paisa / maxCat) * 100) : 0}%`, background: donutColor(i) }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Largest expenses */}
      <Card>
        <SectionTitle hint="this month">Largest expenses</SectionTitle>
        {s.topExpenses.length === 0 ? (
          <p className="text-[14px] text-ink2">No expenses yet this month.</p>
        ) : (
          <ul>
            {s.topExpenses.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 border-b border-rule py-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{e.shop}</p>
                  <p className="text-[12px] text-ink3">
                    {e.category} · {dateLabel(e.date)}
                    {e.source === 'receipt' && ' · from receipt'}
                  </p>
                </div>
                <span className="num flex-none text-[14px] font-semibold">
                  {fmt(e.amountPaisa, { paisa: false })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {ledger.expenses.length === 0 && (
        <EmptyState
          title="No data loaded"
          body="Pick a case from the bar above, paste a case JSON, or add your first expense."
        />
      )}
    </div>
  );
}
