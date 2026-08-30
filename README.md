# Personal Ledger Manager — P12

**Live URL:** https://hackathon-lofi.vercel.app
**Demo video:** _TODO — paste the link here_

LofiStack Hackathon 2026 · Problem P12 · Tier 02 · AI and Automation · Team `LSH26-T050`

---

## What it does

A mobile-first web app for a salaried person in Dhaka who knows their income and has no idea where the money goes. It records spending with almost no typing — including straight from a photo of a bill — shows where the month went, forecasts the rest of it, and puts a real date on every savings goal.

Open the live URL on a phone or a laptop. No install, no account, no setup.

**For judges:** the app is behind a login, but you do not need to register. Sign in with

> **demo@ledger.app** · **demo-ledger-2026**

That account already holds two months of spending and two savings pockets, so every one of the four required items is populated the moment you land. Creating your own account works too; a new account starts empty by design.

---

## The four required items

### 1. Salary, expenses, and reading a bill from a photo

Set a monthly salary. Add an expense by form, or tap **Photograph a bill** — on a phone that opens the rear camera directly.

The app sends the photo to Gemini 2.0 Flash, which returns **amount, date and shop** with a confidence score per field under a strict JSON schema. Every value it read is shown **before anything is saved**.

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

## Accounts and data

Every person has their own ledger behind an email-and-password login.

- **Passwords** are hashed with scrypt (`node:crypto`) using a 16-byte random salt and compared in constant time. bcrypt and argon2 both need a native build, which is a bad thing to discover is broken during an event.
- **Sessions** are 32 random bytes in an httpOnly, SameSite=Lax cookie (Secure in production). Only the SHA-256 of the token is stored, so a dumped `sessions` table cannot be replayed, and deleting a row revokes that session immediately.
- **Brute force**: five wrong passwords locks an account for fifteen minutes.
- **Enumeration**: sign-in returns the same message whether the account exists or the password is wrong.
- **Scoping**: every query carries `user_id` in its `WHERE` clause, including updates (`WHERE id = $1 AND user_id = $2`), so a guessed row id returns nothing. The client never states who it is; the session is resolved server-side on every call.
- The Zustand store is created **per request**, not at module scope, so no state is shared between concurrent server renders.

Money is stored as `BIGINT` paisa, for the same reason it is an integer in the app.

## How to run

```bash
npm install
cp .env.example .env.local     # GEMINI_API_KEY and DATABASE_URL
npm run db:migrate             # creates the schema and the demo account
npm run dev                    # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run verify` | Runs all 25 public cases through the three engines and asserts the invariants |
| `npm run goalcheck` | Checks the running app against the four required items and the four constraints |
| `npm run db:migrate` | Applies the schema and creates the demo account. Idempotent |
| `npm run typecheck` | `tsc --noEmit` |

`npm run verify` prints a row per case and fails loudly on any arithmetic that does not reconcile. `npm run goalcheck` goes further and drives the live app, including a real receipt through the extract route: 27 checks, all passing.

Deployed with `vercel --prod`. `GEMINI_API_KEY` and `DATABASE_URL` are set as Vercel environment variables.

---

## Technical notes

- **All money is integer paisa.** Amounts arrive as decimal strings and the DPS rule specifies rounding half up to the paisa, so no float touches the money path. `lib/money.ts` owns `parsePaisa`, `roundHalfUp` and formatting; `roundHalfUp` is integer-only division.
- **Neon Postgres over HTTP**, one round trip per query and no pool to manage, which is what a serverless deployment wants.
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

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zustand · Neon Postgres · Gemini 3.6 Flash for receipt vision · deployed on Vercel.

Five production dependencies. Gemini is called over its REST endpoint with `fetch` rather than through a client library, and authentication is built on `node:crypto` rather than a framework: fewer dependencies, no SDK version drift, and the whole contract sits in files you can read.

No chart library and no date library: the donut and bars are hand-drawn SVG and CSS, and `lib/dates.ts` is a few dozen lines. Both were dropped deliberately — fewer dependencies, no hydration surprises, and a shorter `LICENSES.md`.

Typefaces are Instrument Sans and IBM Plex Mono, downloaded and self-hosted at build time by `next/font`, so there is no runtime request and nothing to fail offline. Every money figure uses the mono face for tabular figures, so digits line up in columns.

### Look and feel

The interface is neumorphic: surfaces are the same colour as the page and are separated by two opposed shadows rather than borders, so cards read as extruded and inputs as pressed into the page.

Neumorphism has a deserved accessibility reputation, because taken literally it flattens contrast until nothing is readable or obviously clickable. Two rules keep it honest here:

1. **The softness is in the surfaces only.** WCAG measures text against the surface it sits on, not surface against page. Every text pair in both themes was computed and passes AA — the weakest is 4.94.
2. **Primary actions keep a flat, saturated fill.** A fully neumorphic button is this style's worst failure mode. The lime CTA carries 16.62 against its own ink and never depends on shadow to look pressable.

The palette gives each colour one job:

| Colour | Role |
|---|---|
| `#ecff68` acid lime | Primary action, spend meter. A fill only — it scores 1.10 against white and can never be text in light mode |
| `#cdf128` deep lime | The same action, pressed |
| `#016653` / `#35c4a1` teal | Structural accent, positive figures, active navigation |
| `#1e45fc` / `#6d8cff` blue | Focus ring only, so keyboard focus is never confused with an accent |

Grounds are an off-white `#e9eae4` and a near-black `#1b201a` — never pure white or pure black, which kill the shadow on one side and collapse the effect.

Full third-party list with licences: [`LICENSES.md`](./LICENSES.md).

---

## Mocks and known limits

- **Receipt reading falls back to a mock.** With no `GEMINI_API_KEY`, `/api/extract` returns a clearly labelled mock result with every confidence at zero, and the UI shows a "Mock reader" banner. The review-and-correct flow is identical either way. This is the only mocked behaviour in the app.
- **Photos are downscaled to 1600px in the browser** before upload, because a full phone photo exceeds the request-body limit on a serverless deployment.
- **The model's confidence is not taken on trust.** Any field returned as null is scored 0 server-side regardless of what the model claimed, because the client relies on confidence alone to decide what to leave blank.
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

- Dihan Islam Dhrubo | Backend DevS
- Sultan Sajed Shahriar | Full Stack Dev
- Sirajul Muttakin | Full Stack Dev
- Sheikh Fatin Aman | Full Stack Dev

Built during the LofiStack Hackathon 2026 build window, 30 August 2026. AI coding assistants were used as permitted by the rulebook; see `LICENSES.md`.
