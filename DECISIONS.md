# Decisions and limitations — P12 Personal Ledger Manager

Team `LSH26-T050` · repository `lsh26-t050-p12`

The published clarifications in [`CLARIFICATIONS.md`](./CLARIFICATIONS.md) carry rulings for P02, P08 and P10. **P12 has none.** Every point below is therefore a decision this team made where the problem statement left room, not a ruling issued by the organisers. Each states what the statement requires, what it left open, and the reading we implemented.

---

## 1. Money is an integer number of paisa

**The statement gives** amounts as decimal strings (`"50000.00"`, `"2475.00"`) and specifies DPS interest *"rounded half up to the paisa"*.

**Open:** the representation to compute in.

**Our reading:** every amount is parsed to an integer number of paisa at the boundary and never leaves that form. `4.63 * 75` is not `347.25` in IEEE-754, and a rule that says "half up to the paisa" cannot be honoured by a float. `lib/money.ts` owns parsing, `roundHalfUp` (integer division, away from zero on a tie) and formatting. The database stores `BIGINT` paisa for the same reason.

## 2. The current month is partial and is not extrapolated on the dashboard

**The statement gives** `today` inside `months.this` in every case, and asks the dashboard for "the change compared to last month".

**Open:** whether to compare a partial month against a full one, or scale it.

**Our reading:** the dashboard compares month-to-date against the full previous month and **says so on screen**. Extrapolating would invent spending that has not happened; the projection is bullet 3's job, not this card's.

## 3. Recurring versus variable spending

**The statement asks** for "expected spending for the rest of the month".

**Open:** how to model it.

**Our reading:**

> A `category + shop` pair that appeared **last month** and has **not yet** appeared this month is a bill **still due**, at last month's amount. Everything else is variable and runs at the observed daily rate.

```
daysRemaining       = daysInMonth(thisMonth) - dayOfMonth(today)
variableDailyRate   = variable spend this month / days elapsed
restOfMonth         = variableDailyRate * daysRemaining + recurringStillDue
projectedMonthTotal = spentThisMonth + restOfMonth
projectedLeft       = salary - projectedMonthTotal      (negative means short)
```

The variable part is a **single rounded division** (`variableSpent × daysRemaining / daysElapsed`) rather than a rounded daily rate multiplied out, so `spent + rest === projected` holds exactly in paisa. `npm run verify` asserts this on all 25 public cases.

## 4. Insights are generated and ranked, never fixed

**The constraint:** *"The insights must change when the numbers change. Fixed advice will not score."*

**Our reading:** six candidates are built from live figures — largest category and its share of salary, largest month-over-month rise, single largest expense, projected shortfall or headroom, bills not yet paid, and any secondary category over 15% of salary. Each is suppressed when its number is absent, then they are weighted and the strongest shown. Every insight names a category and an amount. All 25 public cases produce a **different** set; the harness fails if any two match.

A category with no spend last month reads *"is new this month"* rather than *"up X against 0"*.

## 5. Pocket completion comes from the forecast

**The constraint:** *"Pocket completion dates must come from the forecast, not from target divided by contribution."*

**Open:** how surplus is shared when it cannot fund every pocket, and when the first contribution lands.

**Our reading:**

```
monthlySurplus = max(0, salary - projectedMonthTotal)        <- a forecast output

each month:
    surplus is allocated across pockets in list order,
    up to each pocket's stated monthly contribution
a pocket completes on the 1st of the first month its balance reaches its target
when a pocket completes, its share passes to the pockets behind it
```

- **Priority is list order.** Stated rather than inferred, so the allocation is reproducible.
- **The first contribution lands on the 1st of the month after `today`**, because this month's salary is already partly spent and the forecast already covers it.
- **A completed pocket releases its allocation**, so later pockets accelerate. This is why completion months differ from `target ÷ contribution` even when the arithmetic would otherwise coincide.

## 6. An unreachable pocket is reported, not fabricated

**Open:** what to show when the forecast leaves no surplus.

**Our reading:** the pocket is reported **"not reachable at current spending"**, with the monthly reduction needed to fund it. Seven of the 25 public cases project a shortfall and land here. Emitting a date from a zero surplus would be a fabricated answer, and the constraint in §5 forbids reaching one by any route other than the forecast.

## 7. The DPS rate and how interest is added

**The statement asks** for *"what a DPS at a rate you state would return"*, and separately: *"State your DPS rate and how interest is added."*

**Our reading:** in the fixtures the rate arrives per case (7.50–10.00). Real accounts have no fixture, so the rate lives on the **profile**, editable, defaulting to **9.00% per year**. Both the rate and the rule are printed on the pockets screen:

```
each month:  balance += deposit
             interest = roundHalfUp(balance * rate / 12 / 100)
             balance += interest        (interest joins the balance and compounds)
```

## 8. Receipt confidence decides what is shown, and the model is not trusted about it

**The constraint:** *"If the receipt reading is unsure about a field, show that clearly and let the user fix it. Never fill in an amount the app is not sure about."*

**Our reading:** the reader returns a confidence per field. Anything below **0.75** renders **empty and flagged "check this"** rather than pre-filled. Save stays disabled until amount, date and shop are present, and every field is editable. Nothing reaches the database before the confirm step.

The model's own bookkeeping is not taken on trust: **any field returned as `null` is scored 0 server-side regardless of the confidence it claimed**, because the client decides what to blank from the confidence alone. A blank image returns all nulls at 0; a real receipt still reads.

## 9. Reading a bill: grand total, and day/month dates

**Open:** which figure on a bill is "the amount", and how to read an ambiguous date.

**Our reading:** the **grand total actually paid**, in preference to any subtotal or line item — Bangladeshi bills routinely print `SUBTOTAL`, `VAT`, `BILL AMOUNT`, `BILL AFT SUB` and `NET BILL`. Dates are read as **day/month/year**, the local convention. Verified against a receipt whose grand total (3,475.00) deliberately differs from its subtotal (3,358.00) and whose date is `14/09/2026`.

## 10. Calendar dates are strings, never `Date` objects

**Open:** date handling.

**Our reading:** fixture dates are plain calendar days with no timezone. A local-timezone `Date` shifts the day across UTC+6 and silently moves expenses between months, which would corrupt the month-boundary logic every bullet depends on. `lib/dates.ts` works on `YYYY-MM-DD` strings and integer parts.

## 11. Accounts, and how the login wall coexists with "no setup required"

**Open:** the problem asks for "one place" to record spending but does not mention accounts; the rulebook requires a live URL judges open with no setup.

**Our reading:** the app is behind email-and-password authentication so each person's ledger is genuinely their own, **and** the login screen offers a real pre-seeded demo account (`demo@ledger.app` / `demo-ledger-2026`) that a judge can enter with one click. Both hold: the wall is real, and no judge has to register.

**A new account starts empty.** Seeding a real signup would show someone spending they never entered, which reads as broken. Only the demo account carries data, because that is what it exists for.

## 12. Security decisions

- **scrypt** (`node:crypto`) with a 16-byte random salt and constant-time comparison. bcrypt and argon2 both need a native build; discovering that broken during an event is not a risk worth taking.
- **Sessions are opaque random tokens**; only their SHA-256 is stored, so a dumped table cannot be replayed and deleting a row revokes access immediately.
- **Five wrong passwords lock an account for fifteen minutes.**
- **Sign-in returns one message** whether the account exists or the password is wrong, so the form cannot enumerate registered emails.
- **Every query is scoped by `user_id`**, updates included (`WHERE id = $1 AND user_id = $2`), so a guessed row id returns nothing.
- **The client store is created per request**, not at module scope, so no state is shared between concurrent server renders.

## 13. Photos are downscaled before upload

A phone photo is 2–8 MB and base64 inflates it by a third, which exceeds the request-body limit on a serverless deployment: the upload never reaches the reader. Photos are drawn to a canvas at **1600px on the long edge** and re-encoded as JPEG 0.82 first. Printed figures stay legible at that size.

## 14. One committed look

The interface is light by default and dark only on request, stored per browser. The device preference is deliberately ignored so that everyone, judges included, sees the interface as designed unless they ask otherwise. Every text and background pair in both themes was **computed** against WCAG AA rather than eyeballed; the weakest is 4.94.

---

## Limitations

- No password reset and no email verification; an address is only an identifier here.
- The forecast uses a flat daily rate for variable spending. It does not model weekday and weekend differences or salary-day effects.
- Pocket funding priority is list order, with no reordering in the interface.
- Recurring detection matches on exact category and shop, so a merchant that changes its printed name between months reads as two merchants.
- Public cases carry two months, so month-over-month comparison has exactly one prior month to work from.
- Without `GEMINI_API_KEY` the extract route returns a clearly labelled mock and the banner says so. This is the only mocked behaviour in the app.

---

## How these were verified

| Command | What it proves |
|---|---|
| `npm run verify` | All 25 public cases through the three engines; arithmetic reconciles exactly in paisa |
| `npm run goalcheck` | The running app against the four required items and four constraints, including a real receipt through the live extract route |

Latest local run: **33 checks, 0 failures.**
