"use client";

import { useState } from "react";
import { useForecast, useLedger, usePockets } from "../../../lib/store";
import { buildCategoryCutForecast } from "../../../lib/engine/forecast";
import { buildPockets } from "../../../lib/engine/pockets";
import { fmt, parsePaisa } from "../../../lib/money";
import { monthLabel } from "../../../lib/dates";
import { CATEGORIES, type Category, type PocketPlan } from "../../../lib/types";
import { Card, Chip, EmptyState, SectionTitle } from "../../../components/ui";

/** Bullet 4 — pockets, completion dates from the forecast, and the DPS comparison. */
export default function PocketsPage() {
  const ledger = useLedger((s) => s.ledger);
  const updatePocket = useLedger((s) => s.updatePocket);
  const removePocket = useLedger((s) => s.removePocket);
  const f = useForecast();
  const result = usePockets();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">
          Savings pockets
        </h1>
        <p className="text-[13px] text-ink2">
          Dates come from your forecast, not from target divided by
          contribution.
        </p>
      </div>

      <Card className="card-lead">
        <SectionTitle hint={monthLabel(f.month)}>Monthly surplus</SectionTitle>
        <div className="flex items-baseline justify-between">
          <p
            className="num text-[24px] font-semibold"
            style={{
              color:
                result.monthlySurplusPaisa > 0
                  ? "var(--c-accent)"
                  : "var(--c-risk)",
            }}
          >
            {fmt(result.monthlySurplusPaisa, { paisa: false })}
          </p>
          <p className="text-[12.5px] text-ink3">
            {fmt(result.totalRequestedPaisa, { paisa: false })} requested
          </p>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink3">
          Salary {fmt(ledger.salaryPaisa, { paisa: false })} minus projected
          spending {fmt(f.projectedMonthTotalPaisa, { paisa: false })}. Surplus
          is allocated to pockets in order each month, up to each pocket&rsquo;s
          contribution; when one completes, its share passes to the pockets
          behind it. The first contribution lands next month.
        </p>
        {!result.fullyFunded && result.monthlySurplusPaisa > 0 && (
          <p className="mt-2 text-[12.5px]" style={{ color: "var(--c-warn)" }}>
            The surplus does not cover every contribution. Pockets are funded in
            order.
          </p>
        )}
      </Card>

      <AddPocketForm />

      {result.plans.length === 0 ? (
        <EmptyState
          title="No pockets yet"
          body="Create one above with a name, item, target and monthly contribution. Its forecast date appears immediately."
        />
      ) : (
        result.plans.map((plan) => (
          <PocketCard
            key={plan.pocketId}
            plan={plan}
            onContribution={(paisa) =>
              updatePocket(plan.pocketId, { monthlyContribPaisa: paisa })
            }
            onRemove={() => void removePocket(plan.pocketId)}
          />
        ))
      )}

      {result.plans.length > 0 && <WhatIfCard />}

      <Card>
        <SectionTitle hint={`${ledger.dpsAnnualRatePct}% per year`}>
          How DPS is calculated
        </SectionTitle>
        <p className="text-[12.5px] leading-relaxed text-ink2">
          {ledger.dpsRule}
        </p>
      </Card>
    </div>
  );
}

function AddPocketForm() {
  const addPocket = useLedger((s) => s.addPocket);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [item, setItem] = useState("");
  const [target, setTarget] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const moneyValid = (value: string) =>
    /^\d+(\.\d{1,2})?$/.test(value.trim()) && parsePaisa(value.trim()) > 0;
  const valid =
    name.trim().length > 0 &&
    item.trim().length > 0 &&
    moneyValid(target) &&
    moneyValid(monthly);

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      await addPocket({
        name: name.trim(),
        item: item.trim(),
        targetPaisa: parsePaisa(target.trim()),
        monthlyContribPaisa: parsePaisa(monthly.trim()),
      });
      setName("");
      setItem("");
      setTarget("");
      setMonthly("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that pocket.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-primary w-full"
        onClick={() => setOpen(true)}
      >
        Create a savings pocket
      </button>
    );
  }

  return (
    <Card>
      <SectionTitle hint="name, item, target, monthly amount">
        New pocket
      </SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="label mb-1.5 block">Name</span>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Laptop"
          />
        </label>
        <label>
          <span className="label mb-1.5 block">Item details</span>
          <input
            className="field"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="MacBook Air"
          />
        </label>
        <label>
          <span className="label mb-1.5 block">Target in taka</span>
          <input
            className="field num"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="145000.00"
          />
        </label>
        <label>
          <span className="label mb-1.5 block">Monthly contribution</span>
          <input
            className="field num"
            inputMode="decimal"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder="12000.00"
          />
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-2 text-[13px]"
          style={{ color: "var(--c-risk)" }}
        >
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={!valid || saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save pocket"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </Card>
  );
}

function WhatIfCard() {
  const ledger = useLedger((s) => s.ledger);
  const base = usePockets();
  const [category, setCategory] = useState<Category>("Food");
  const [cut, setCut] = useState(20);
  const scenario = buildCategoryCutForecast(ledger, category, cut);
  const changed = buildPockets(ledger, scenario.forecast);
  const answer = (plan: PocketPlan) =>
    plan.reachable ? monthLabel(plan.completionMonth!) : "Not reachable";

  return (
    <Card>
      <SectionTitle hint="bonus: every pocket re-dates live">
        What if you cut one category?
      </SectionTitle>
      <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr]">
        <label>
          <span className="label mb-1.5 block">Category</span>
          <select
            className="field"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label mb-1.5 block">
            Cut remaining spend by {cut}%
          </span>
          <input
            className="w-full accent-[var(--c-accent)]"
            type="range"
            min="0"
            max="50"
            step="5"
            value={cut}
            onChange={(e) => setCut(Number(e.target.value))}
          />
          <span className="num mt-1 block text-[12px] text-ink3">
            Saves {fmt(scenario.savingPaisa, { paisa: false })} from projected
            remaining {fmt(scenario.projectedCategoryPaisa, { paisa: false })}
          </span>
        </label>
      </div>
      <p className="mt-3 text-[12.5px] text-ink2">
        Monthly surplus: {fmt(base.monthlySurplusPaisa, { paisa: false })}
        {" → "}
        <strong style={{ color: "var(--c-accent)" }}>
          {fmt(changed.monthlySurplusPaisa, { paisa: false })}
        </strong>
      </p>
      <ul className="mt-3 border-t border-rule pt-2">
        {base.plans.map((plan, index) => {
          const next = changed.plans[index];
          const before = answer(plan);
          const after = answer(next);
          return (
            <li
              key={plan.pocketId}
              className="flex items-center justify-between gap-3 border-b border-rule py-2 last:border-0"
            >
              <span className="text-[13.5px] font-medium">{plan.name}</span>
              <span className="text-right text-[12.5px]">
                <span className="text-ink3">{before}</span>
                {" → "}
                <strong
                  style={{
                    color:
                      before === after ? "var(--c-ink2)" : "var(--c-accent)",
                  }}
                >
                  {after}
                </strong>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function PocketCard({
  plan,
  onContribution,
  onRemove,
}: {
  plan: PocketPlan;
  onContribution: (paisa: number) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const value = draft ?? String(plan.monthlyContribPaisa / 100);
  const positive = plan.schedule
    .map((r) => r.contributionPaisa)
    .filter((p) => p > 0);
  const minFunding = positive.length ? Math.min(...positive) : 0;
  const maxFunding = positive.length ? Math.max(...positive) : 0;
  const waitingMonths = plan.schedule.findIndex((r) => r.contributionPaisa > 0);

  function commit(next: string) {
    setDraft(next);
    if (!/^\d+(\.\d{1,2})?$/.test(next.trim())) return;
    onContribution(parsePaisa(next.trim()));
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

      <div
        className="mt-3 rounded-xl p-3.5"
        style={{
          background: plan.reachable
            ? "var(--c-accent-soft)"
            : "var(--c-warn-soft)",
        }}
      >
        {plan.reachable ? (
          <>
            <p className="label" style={{ color: "var(--c-accent)" }}>
              Expected completion
            </p>
            <p
              className="num text-[18px] font-semibold"
              style={{ color: "var(--c-accent)" }}
            >
              {monthLabel(plan.completionMonth!)}
            </p>
            <p
              className="mt-0.5 text-[12px]"
              style={{ color: "var(--c-accent)" }}
            >
              {plan.monthsToComplete} months from now.{" "}
              {waitingMonths > 0
                ? `Waits ${waitingMonths} month${waitingMonths === 1 ? "" : "s"} for higher-priority pockets; then `
                : ""}
              {minFunding === maxFunding
                ? `${fmt(maxFunding, { paisa: false })} when funded.`
                : `${fmt(minFunding, { paisa: false })}–${fmt(maxFunding, { paisa: false })} when funded.`}
            </p>
          </>
        ) : (
          <>
            <p className="label" style={{ color: "var(--c-warn)" }}>
              Not reachable at current spending
            </p>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: "var(--c-warn)" }}
            >
              {plan.monthlyContribPaisa === 0
                ? "Set a monthly contribution above zero to calculate a completion date."
                : plan.shortfallPaisa > 0
                  ? `Cut monthly spending by ${fmt(plan.shortfallPaisa, { paisa: false })} to make the requested contribution available.`
                  : "This target exceeds the 600-month forecast horizon. Raise the contribution or cut spending further."}
            </p>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="label flex-none" htmlFor={`c-${plan.pocketId}`}>
          Monthly
        </label>
        <input
          id={`c-${plan.pocketId}`}
          className="field num py-1.5 text-[14px]"
          inputMode="decimal"
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
                {fmt(plan.dpsBalancePaisa - plan.dpsInterestPaisa, {
                  paisa: false,
                })}
              </p>
            </div>
            <div>
              <p className="label">Same money in a DPS</p>
              <p
                className="num text-[15px] font-semibold"
                style={{ color: "var(--c-accent)" }}
              >
                {fmt(plan.dpsBalancePaisa, { paisa: false })}
              </p>
              <p className="text-[11.5px] text-ink3">
                {fmt(plan.dpsInterestPaisa, { paisa: false })} interest at{" "}
                {plan.dpsAnnualRatePct}%
              </p>
            </div>
          </div>
          <button
            type="button"
            className="tap mt-1 flex items-center gap-2.5 text-[12.5px] font-semibold"
            style={{ color: "var(--c-accent)" }}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "Hide" : "Show"} month-by-month schedule
          </button>
          {open && (
            <div className="well mt-2 max-h-64 overflow-auto p-1">
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
                      <td className="p-2 text-right">
                        {fmt(r.contributionPaisa, { paisa: false })}
                      </td>
                      <td className="p-2 text-right">
                        {fmt(r.balancePaisa, { paisa: false })}
                      </td>
                      <td
                        className="p-2 text-right"
                        style={{ color: "var(--c-accent)" }}
                      >
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

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-rule pt-3">
        <div className="flex flex-wrap gap-2">
          <Chip tone="info">
            Target {fmt(plan.targetPaisa, { paisa: false })}
          </Chip>
          <Chip tone={plan.reachable ? "good" : "warn"}>
            {fmt(plan.monthlyContribPaisa, { paisa: false })}/mo requested
          </Chip>
        </div>
        <button
          type="button"
          className="text-[12px] font-semibold"
          style={{ color: "var(--c-risk)" }}
          onClick={() => {
            if (window.confirm(`Delete ${plan.name}?`)) onRemove();
          }}
        >
          Delete
        </button>
      </div>
    </Card>
  );
}
