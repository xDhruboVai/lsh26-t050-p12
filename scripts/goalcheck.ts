/**
 * Checks the app against what P12 actually scores: the four required bullets
 * and the four constraints attached to them. Run against a live server.
 *
 *   npx tsx scripts/goalcheck.ts [baseUrl]
 */
import { readFileSync } from 'node:fs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { loadCase } from '../lib/caseLoader';
import { buildSummary } from '../lib/engine/summary';
import { buildForecast } from '../lib/engine/forecast';
import { buildPockets } from '../lib/engine/pockets';

for (const f of ['.env.local', '.env']) {
  try {
    for (const l of readFileSync(f, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
}

const BASE = process.argv[2] ?? 'http://localhost:3000';
const SHOT = process.env.RECEIPT_PNG ?? 'scripts/fixtures/receipt.png';
const BLANK = process.env.BLANK_PNG ?? 'scripts/fixtures/blank.png';
const sql = neon(process.env.DATABASE_URL!);
const cases = (JSON.parse(readFileSync('data/cases.json', 'utf8')) as { cases: Record<string, unknown>[] }).cases;

let pass = 0, fail = 0;
const ok = (l: string, p: boolean, x = '') => { p ? pass++ : fail++; console.log(`  ${p ? 'PASS' : 'FAIL'}  ${l}${x ? '  — ' + x : ''}`); };

async function main() {
  const users = (await sql`SELECT id FROM users WHERE email_lower = 'demo@ledger.app'`) as any[];
  const token = randomBytes(32).toString('base64url');
  await sql`INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES
    (${randomUUID()}, ${users[0].id}, ${createHash('sha256').update(token).digest('hex')},
     ${new Date(Date.now() + 900_000).toISOString()})`;
  const cookie = `ledger_session=${token}`;
  const page = async (p: string) => (await fetch(BASE + p, { headers: { cookie } })).text();

  console.log('\nBULLET 1 — salary, expenses, receipt photo');
  const add = await page('/add');
  ok('salary can be set', /Salary/i.test(add));
  ok('camera capture is wired', /capture="environment"|capture/.test(add));
  // A real receipt, through the real route, so this exercises what a judge does.
  const receipt = readFileSync(SHOT).toString('base64');
  const shot = await fetch(BASE + '/api/extract', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: 'data:image/png;base64,' + receipt, mediaType: 'image/png' }),
  });
  const ex = await shot.json();
  ok('extract route reads a receipt', shot.ok && !ex.error, ex.error ?? '');
  ok('every field carries a confidence', Boolean(ex.confidence && 'amount' in ex.confidence));
  ok('reads the grand total, not the subtotal', ex.amount_bdt === '3475.00', String(ex.amount_bdt));
  ok('reads a day/month date correctly', ex.date === '2026-09-14', String(ex.date));
  ok('reads the shop', /meena/i.test(String(ex.shop)), String(ex.shop));

  console.log('\nBULLET 2 — dashboard');
  const dash = await page('/');
  ok('total spent against salary', /Spent this month/i.test(dash) && /Salary/i.test(dash));
  ok('category breakdown', /Where it went/i.test(dash));
  ok('largest expenses', /Largest expenses/i.test(dash));
  ok('change on last month', /Change on last month/i.test(dash));
  ok('partial month is labelled, not extrapolated', /still running/i.test(dash));

  console.log('\nBULLET 3 — forecast and insights');
  const fc = await page('/forecast');
  ok('rest-of-month spending', /Still to spend/i.test(fc));
  ok('money left or short at month end', /(Left|Short) at month end/i.test(fc));
  ok('method is stated on screen', /Method:/i.test(fc));

  console.log('\nBULLET 4 — pockets, dates, DPS');
  const pk = await page('/pockets');
  ok('monthly surplus shown', /Monthly surplus/i.test(pk));
  ok('dates derive from the forecast', /not from target divided by contribution/i.test(pk));
  ok('DPS rule stated on screen', /How DPS is calculated/i.test(pk));

  console.log('\nCONSTRAINT 1 — never fill an amount it is unsure about');
  // A field the reader cannot read must be null AND score zero, because the
  // client decides what to leave blank from the confidence alone.
  const blank = await fetch(BASE + '/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: 'data:image/png;base64,' + readFileSync(BLANK).toString('base64'),
      mediaType: 'image/png',
    }),
  });
  const bl = await blank.json();
  ok('an unreadable amount comes back null', bl.amount_bdt === null, String(bl.amount_bdt));
  ok('and is scored zero', bl.confidence?.amount === 0, JSON.stringify(bl.confidence));
  ok('the receipt above was NOT blanked', ex.amount_bdt === '3475.00', String(ex.amount_bdt));

  console.log('\nCONSTRAINT 2 — insights change with the numbers');
  const sets = new Set<string>();
  let minInsights = 99;
  for (const raw of cases) {
    const f = buildForecast(loadCase(raw));
    sets.add(f.insights.map((i) => i.text).join('|'));
    minInsights = Math.min(minInsights, f.insights.length);
  }
  ok('at least 3 insights on every case', minInsights >= 3, `min ${minInsights}`);
  ok('all 25 cases give different insights', sets.size === cases.length, `${sets.size}/${cases.length}`);

  console.log('\nCONSTRAINT 3 — pocket dates come from the forecast');
  let derived = 0, naive = 0;
  for (const raw of cases) {
    const st = loadCase(raw);
    const f = buildForecast(st);
    const r = buildPockets(st, f);
    for (const p of r.plans) {
      if (!p.reachable) continue;
      const naiveMonths = Math.ceil(p.targetPaisa / Math.max(1, p.monthlyContribPaisa));
      if (p.monthsToComplete !== naiveMonths) derived++; else naive++;
    }
  }
  ok('completion differs from target/contribution somewhere', derived > 0, `${derived} forecast-driven, ${naive} coincidental`);

  console.log('\nCONSTRAINT 4 — DPS rate is stated');
  ok('rate printed on the pockets page', /% per year/i.test(pk));
  ok('compounding rule printed', /interest/i.test(pk));

  console.log('\nARITHMETIC — all 25 public cases');
  let reconciles = true;
  for (const raw of cases) {
    const st = loadCase(raw);
    const f = buildForecast(st);
    const s = buildSummary(st);
    if (f.spentThisMonthPaisa + f.restOfMonthPaisa !== f.projectedMonthTotalPaisa) reconciles = false;
    if (s.totalPaisa !== f.spentThisMonthPaisa) reconciles = false;
    if (!Number.isInteger(f.projectedLeftPaisa)) reconciles = false;
  }
  ok('spent + rest === projected, in integer paisa', reconciles);

  await sql`DELETE FROM sessions WHERE token_hash = ${createHash('sha256').update(token).digest('hex')}`;
  console.log(`\n${pass} passed, ${fail} failed\n`);
  if (fail) process.exit(1);
}
main().catch((e) => { console.error('threw:', e.message); process.exit(1); });
