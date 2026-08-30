/**
 * Runs every public case through the three engines and asserts the invariants
 * that would otherwise fail silently in front of a judge.
 *
 *   npm run verify
 *
 * This is not a unit-test suite. It is a smoke harness over real fixture data,
 * which is what the problem actually gives us: 25 cases, inputs only.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { loadCase } from '../lib/caseLoader';
import { buildSummary } from '../lib/engine/summary';
import { buildForecast } from '../lib/engine/forecast';
import { buildPockets } from '../lib/engine/pockets';
import { fmt, sum } from '../lib/money';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '../data/cases.json');
const doc = JSON.parse(readFileSync(file, 'utf8')) as { cases: Record<string, unknown>[] };

const failures: string[] = [];
const seenInsightText = new Set<string>();
let distinctInsightSets = 0;

function check(caseId: string, label: string, ok: boolean, detail = '') {
  if (!ok) failures.push(`${caseId}  ${label}${detail ? '  — ' + detail : ''}`);
}

function finite(caseId: string, label: string, values: number[]) {
  const bad = values.find((v) => !Number.isFinite(v) || !Number.isInteger(v));
  check(caseId, label, bad === undefined, bad === undefined ? '' : `got ${bad}`);
}

console.log(`\nP12 engine verification — ${doc.cases.length} public cases\n`);
console.log(
  'case    salary      spent      rest    projected      left   surplus  ins  pockets reached',
);
console.log('-'.repeat(88));

for (const raw of doc.cases) {
  const state = loadCase(raw);
  const id = state.caseId;

  const summary = buildSummary(state);
  const forecast = buildForecast(state);
  const pockets = buildPockets(state, forecast);

  // --- money must stay integral -------------------------------------------
  finite(id, 'summary integers', [summary.totalPaisa, summary.leftPaisa, summary.deltaPaisa]);
  finite(id, 'forecast integers', [
    forecast.spentThisMonthPaisa,
    forecast.restOfMonthPaisa,
    forecast.projectedMonthTotalPaisa,
    forecast.projectedLeftPaisa,
    forecast.monthlySurplusPaisa,
  ]);

  // --- the forecast must reconcile exactly ---------------------------------
  check(
    id,
    'spent + rest === projected',
    forecast.spentThisMonthPaisa + forecast.restOfMonthPaisa === forecast.projectedMonthTotalPaisa,
  );
  check(
    id,
    'salary - projected === left',
    state.salaryPaisa - forecast.projectedMonthTotalPaisa === forecast.projectedLeftPaisa,
  );
  check(
    id,
    'variable + recurring === spent',
    forecast.variableSpentPaisa + forecast.recurringSpentPaisa === forecast.spentThisMonthPaisa,
  );

  // --- calendar sanity -----------------------------------------------------
  check(id, 'daysRemaining >= 0', forecast.daysRemaining >= 0);
  check(
    id,
    'elapsed + remaining === daysInMonth',
    forecast.daysElapsed + forecast.daysRemaining === forecast.daysInMonth,
  );
  check(id, 'summary total matches forecast', summary.totalPaisa === forecast.spentThisMonthPaisa);

  // --- insights: at least three, and they must vary between cases ----------
  check(id, 'at least 3 insights', forecast.insights.length >= 3, `got ${forecast.insights.length}`);
  const signature = forecast.insights.map((i) => i.text).join('|');
  if (!seenInsightText.has(signature)) {
    seenInsightText.add(signature);
    distinctInsightSets += 1;
  }
  for (const i of forecast.insights) {
    check(id, `insight "${i.id}" names an amount`, /\d/.test(i.text));
  }

  // --- pockets -------------------------------------------------------------
  check(id, 'a plan per pocket', pockets.plans.length === state.pockets.length);
  for (const plan of pockets.plans) {
    check(
      id,
      `pocket ${plan.pocketId} resolves`,
      plan.reachable ? plan.completionDate !== null : plan.completionDate === null,
    );
    if (plan.reachable) {
      const deposits = sum(plan.schedule.map((r) => r.contributionPaisa));
      check(id, `pocket ${plan.pocketId} reaches target`, deposits >= plan.targetPaisa);
      check(
        id,
        `pocket ${plan.pocketId} DPS >= deposits`,
        plan.dpsBalancePaisa >= deposits,
        `dps ${plan.dpsBalancePaisa} vs deposits ${deposits}`,
      );
      check(
        id,
        `pocket ${plan.pocketId} DPS interest reconciles`,
        plan.dpsBalancePaisa === deposits + plan.dpsInterestPaisa,
      );
      finite(id, `pocket ${plan.pocketId} integers`, [plan.dpsBalancePaisa, plan.dpsInterestPaisa]);
    }
  }

  const reached = pockets.plans.filter((p) => p.reachable).length;
  console.log(
    [
      id.padEnd(7),
      fmt(state.salaryPaisa, { paisa: false }).replace('BDT ', '').padStart(9),
      fmt(forecast.spentThisMonthPaisa, { paisa: false }).replace('BDT ', '').padStart(10),
      fmt(forecast.restOfMonthPaisa, { paisa: false }).replace('BDT ', '').padStart(9),
      fmt(forecast.projectedMonthTotalPaisa, { paisa: false }).replace('BDT ', '').padStart(12),
      fmt(forecast.projectedLeftPaisa, { paisa: false }).replace('BDT ', '').padStart(9),
      fmt(forecast.monthlySurplusPaisa, { paisa: false }).replace('BDT ', '').padStart(9),
      String(forecast.insights.length).padStart(4),
      `${reached}/${pockets.plans.length}`.padStart(8),
    ].join(''),
  );
}

console.log('-'.repeat(88));
console.log(
  `\ndistinct insight sets: ${distinctInsightSets} of ${doc.cases.length} ` +
    '(insights must change with the data)',
);

if (distinctInsightSets < doc.cases.length) {
  failures.push(`insights repeated across cases: only ${distinctInsightSets} distinct sets`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILURES\n`);
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}

console.log('\nall invariants hold\n');
