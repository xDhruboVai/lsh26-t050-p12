# Personal Ledger Manager — P12

**Live URL:** _TODO — paste the Vercel URL here_
**Demo video:** _TODO — paste the link here_

LofiStack Hackathon 2026 · Problem P12 · Tier 02 · AI and Automation · Team `LSH26-T050`

---

## What it does

A mobile-first web app for a salaried person in Dhaka who knows their income and has no idea where the money goes. It records spending with almost no typing — including straight from a photo of a bill — shows where the month went, forecasts the rest of it, and puts a real date on every savings goal.

Open the live URL on a phone or a laptop. No install, no account, no setup.

**For judges:** the bar at the top loads any of the 25 public cases, and **Paste** accepts a case JSON directly. Dropping a private case in renders all four required items immediately, with no code change.

---

## The four required items

### 1. Salary, expenses, and reading a bill from a photo

Set a monthly salary. Add an expense by form, or tap **Photograph a bill** — on a phone that opens the rear camera directly.

The app reads **amount, date and shop** from the image and shows every value it read with a confidence score, **before anything is saved**.

Uncertainty is never hidden. Any field scoring below **0.75** is rendered **empty and marked "check this"** — the app never fills in an amount it guessed. Save stays disabled until amount, date and shop are present, and every field stays editable. Nothing reaches the store until you press save.

### 2. Monthly dashboard

Total spent against salary with a meter, a category breakdown (donut plus ranked bars), the five largest expenses, and the change against last month.

`today` sits mid-month in every case, so the current month is **partial**. The comparison card says so rather than presenting a misleading drop against a full previous month.

### 3. Forecast and insights

Spending is split into **recurring** and **variable**:

> A category and shop pair that appeared **last month** and has **not yet** appeared this month is treated as a bill **still due**, at last month's amount. Everything else is variable.

```
daysRemaining       = daysInMonth(thisMonth) - dayOfMonth(today)
variableDailyRate   = variable spend this month / days elapsed
restOfMonth         = variableDailyRate * daysRemaining + recurringStillDue
projectedMonthTotal = spentThisMonth + restOfMonth
projectedLeft       = salary - projectedMonthTotal        // negative means short
```

The variable part is computed as a single rounded division (`variableSpent × daysRemaining / daysElapsed`) rather than a rounded daily rate multiplied out, so `spent + rest === projected` holds exactly in paisa. `verify.ts` asserts it on all 25 cases.

Insights are **generated from the live numbers**, never fixed text. Six candidates are built and ranked — largest category and its share of salary, largest month-over-month rise, single largest expense, projected shortfall or headroom, bills not yet paid, and any secondary category over 15% of salary — and the strongest are shown. All 25 public cases produce a **different** set; the verify script fails the build if any two match.

### 4. Savings pockets, completion dates, and DPS

Each pocket has a name, item, target and monthly contribution.

**Completion dates come from the forecast, not from target ÷ contribution:**

```
monthlySurplus = max(0, salary - projectedMonthTotal)     // from the forecast

each month:
    the surplus is allocated across pockets in list order,
    up to each pocket's monthly contribution
a pocket completes on the 1st of the first month its balance reaches its target
when a pocket completes, its share passes to the pockets behind it
```

The first contribution lands on the 1st of the month **after** `today`, because this month's salary is already partly spent and the forecast covers it.

If the forecast leaves no surplus, the pocket is reported **"not reachable at current spending"** with the monthly cut needed to fund it — rather than a fabricated date. Seven of the 25 public cases project a shortfall and land in exactly this state.

Changing a pocket's monthly contribution re-dates every pocket immediately.

**DPS.** The rate is read from the case (7.50%–10.00% across the public set) and printed on screen with the rule. Interest is added exactly as the case states:

```
each month:  balance += deposit
             interest = roundHalfUp(balance * rate / 12 / 100)
             balance += interest        // interest joins the balance and compounds
```

---

## How to run

```bash
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY for live receipt reading
npm run dev                    # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run verify` | Runs all 25 public cases through the three engines and asserts the invariants |
| `npm run typecheck` | `tsc --noEmit` |

`npm run verify` is the one to run first — it prints a row per case and fails loudly on any arithmetic that does not reconcile.

Deployed with `vercel --prod`; `ANTHROPIC_API_KEY` is set as a Vercel environment variable.

---

## Technical notes

- **All money is integer paisa.** Amounts arrive as decimal strings and the DPS rule specifies rounding half up to the paisa, so no float touches the money path. `lib/money.ts` owns `parsePaisa`, `roundHalfUp` and formatting; `roundHalfUp` is integer-only division.
- **No database.** State lives in a Zustand store persisted to `localStorage`, seeded from a case. The only server code is the receipt route.
- **The three engines are pure functions** — `lib/engine/summary.ts`, `forecast.ts`, `pockets.ts`: state in, derived object out, no side effects, no store access. That is why `scripts/verify.ts` can exercise them headlessly, and why every derived value recomputes on render, which is what makes insights and pocket dates move when the numbers move.
- `pockets.ts` depends on `forecast.ts` by design: the surplus driving completion dates is a forecast output.
- **Nothing is hardcoded from the fixtures** — not pocket count, expense count, DPS rate, salary, or category set. The bundled `format_note` is truncated and claims one pocket per case while every public case carries three, so every count is read at runtime.
- **Dates are handled as strings**, not `Date` objects. A local-timezone `Date` shifts the calendar day across UTC+6 and silently moves expenses between months.

### Layout

```
lib/money.ts          integer paisa arithmetic
lib/dates.ts          calendar-day helpers, no Date objects
lib/types.ts          stored vs derived types
lib/caseLoader.ts     case JSON -> state, tolerant of missing fields
lib/engine/           summary (2) · forecast (3) · pockets (4)
lib/store.ts          zustand + persist, derived selectors
app/                  dashboard · add · forecast · pockets
app/api/extract/      receipt vision, the only server code
scripts/verify.ts     25-case invariant harness
```

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · `@anthropic-ai/sdk` (`claude-sonnet-5`, receipt vision) · Zustand · deployed on Vercel.

No chart library and no date library: the donut and bars are hand-drawn SVG and CSS, and `lib/dates.ts` is a few dozen lines. Both were dropped deliberately — fewer dependencies, no hydration surprises, and a shorter `LICENSES.md`. No webfont either; the system stack renders instantly on the phone this is designed for.

Full third-party list with licences: [`LICENSES.md`](./LICENSES.md).

---

## Mocks and known limits

- **Receipt reading falls back to a mock.** With no `ANTHROPIC_API_KEY`, `/api/extract` returns a clearly labelled mock result with every confidence at or near zero, and the UI shows a "Mock reader" banner. The review-and-correct flow is identical either way. This is the only mocked behaviour in the app.
- The forecast uses a flat daily rate for variable spending. It does not model weekday and weekend differences, or salary-day effects.
- Pocket funding priority is list order. There is no drag-to-reorder.
- Recurring detection matches on exact category and shop. A shop that changes its printed name between months reads as two separate merchants.
- Data is per-browser (`localStorage`). No accounts, no sync across devices.
- Public cases carry two months, so month-over-month comparison has exactly one prior month to work with.

## Next steps

- Auto-mark an expense recurring once the same shop and a similar amount appear two months running (bonus 2)
- A "what if" control that cuts one category by a percentage and re-dates every pocket (bonus 3) — the shortfall figure on unreachable pockets is already the input for it
- History beyond the two months a case carries
- Bangla numerals and date formatting

---

## Team

_TODO — names and roles._

Built during the LofiStack Hackathon 2026 build window, 30 August 2026. AI coding assistants were used as permitted by the rulebook; see `LICENSES.md`.
