import { randomUUID } from "node:crypto";
import { sql } from "./db";
import { addMonths, monthKey, type ISODate } from "./dates";
import {
  CATEGORIES,
  type Category,
  type Expense,
  type LedgerState,
  type Pocket,
} from "./types";
import { DEFAULT_DPS_RULE } from "./caseLoader";
import type { SessionUser } from "./auth";

/**
 * Data access. Every query here is scoped by user_id in the WHERE clause, so
 * one user can never read or write another's rows even if an id leaks.
 */

function asCategory(value: unknown): Category {
  const s = String(value ?? "");
  return CATEGORIES.find((c) => c === s) ?? "Food";
}

/** A real account works on the real calendar, not a fixture's `today`. */
function todayISO(): ISODate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function loadLedger(user: SessionUser): Promise<LedgerState> {
  const today = todayISO();
  const thisMonth = monthKey(today);

  const [expenseRows, pocketRows] = await Promise.all([
    sql()`
      SELECT id, to_char(spent_on, 'YYYY-MM-DD') AS spent_on, category, shop,
             amount_paisa, source, confidence
      FROM expenses
      WHERE user_id = ${user.id}
      ORDER BY spent_on DESC, created_at DESC
    ` as Promise<Array<Record<string, unknown>>>,
    sql()`
      SELECT id, name, item, target_paisa, monthly_contrib_paisa
      FROM pockets
      WHERE user_id = ${user.id}
      ORDER BY position ASC, created_at ASC
    ` as Promise<Array<Record<string, unknown>>>,
  ]);

  const expenses: Expense[] = expenseRows.map((r) => ({
    id: String(r.id),
    date: String(r.spent_on),
    category: asCategory(r.category),
    shop: String(r.shop),
    amountPaisa: Number(r.amount_paisa),
    source: (String(r.source) as Expense["source"]) ?? "manual",
    confidence: (r.confidence as Expense["confidence"]) ?? undefined,
  }));

  const pockets: Pocket[] = pocketRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    item: String(r.item ?? ""),
    targetPaisa: Number(r.target_paisa),
    monthlyContribPaisa: Number(r.monthly_contrib_paisa),
  }));

  return {
    caseId: user.email,
    today,
    months: { last: addMonths(thisMonth, -1), this: thisMonth },
    salaryPaisa: user.salaryPaisa,
    dpsAnnualRatePct: user.dpsRatePct,
    dpsRule: DEFAULT_DPS_RULE,
    expenses,
    pockets,
  };
}

export async function addExpense(
  userId: string,
  e: {
    date: string;
    category: string;
    shop: string;
    amountPaisa: number;
    source: string;
    confidence?: unknown;
  },
): Promise<string> {
  const id = randomUUID();
  await sql()`
    INSERT INTO expenses (id, user_id, spent_on, category, shop, amount_paisa, source, confidence)
    VALUES (${id}, ${userId}, ${e.date}, ${asCategory(e.category)}, ${e.shop.slice(0, 120)},
            ${Math.max(0, Math.round(e.amountPaisa))}, ${e.source},
            ${e.confidence ? JSON.stringify(e.confidence) : null})
  `;
  return id;
}

export async function deleteExpense(userId: string, id: string): Promise<void> {
  await sql()`DELETE FROM expenses WHERE id = ${id} AND user_id = ${userId}`;
}

export async function setSalary(userId: string, paisa: number): Promise<void> {
  await sql()`UPDATE users SET salary_paisa = ${Math.max(0, Math.round(paisa))} WHERE id = ${userId}`;
}

export async function setProfile(
  userId: string,
  p: { displayName?: string; dpsRatePct?: string },
): Promise<void> {
  if (p.displayName !== undefined) {
    await sql()`UPDATE users SET display_name = ${p.displayName.slice(0, 80)} WHERE id = ${userId}`;
  }
  if (p.dpsRatePct !== undefined) {
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(p.dpsRatePct)) {
      throw new Error("Invalid DPS rate.");
    }
    await sql()`UPDATE users SET dps_rate_pct = ${p.dpsRatePct} WHERE id = ${userId}`;
  }
}

export async function addPocket(
  userId: string,
  p: {
    name: string;
    item: string;
    targetPaisa: number;
    monthlyContribPaisa: number;
  },
): Promise<string> {
  const id = randomUUID();
  const rows = (await sql()`
    SELECT COALESCE(MAX(position), -1) + 1 AS next FROM pockets WHERE user_id = ${userId}
  `) as Array<{ next: number }>;
  await sql()`
    INSERT INTO pockets (id, user_id, name, item, target_paisa, monthly_contrib_paisa, position)
    VALUES (${id}, ${userId}, ${p.name.slice(0, 80)}, ${p.item.slice(0, 160)},
            ${Math.max(0, Math.round(p.targetPaisa))},
            ${Math.max(0, Math.round(p.monthlyContribPaisa))}, ${Number(rows[0]?.next ?? 0)})
  `;
  return id;
}

export async function updatePocket(
  userId: string,
  id: string,
  patch: {
    name?: string;
    item?: string;
    targetPaisa?: number;
    monthlyContribPaisa?: number;
  },
): Promise<void> {
  if (patch.monthlyContribPaisa !== undefined) {
    await sql()`UPDATE pockets SET monthly_contrib_paisa = ${Math.max(0, Math.round(patch.monthlyContribPaisa))}
                WHERE id = ${id} AND user_id = ${userId}`;
  }
  if (patch.targetPaisa !== undefined) {
    await sql()`UPDATE pockets SET target_paisa = ${Math.max(0, Math.round(patch.targetPaisa))}
                WHERE id = ${id} AND user_id = ${userId}`;
  }
  if (patch.name !== undefined) {
    await sql()`UPDATE pockets SET name = ${patch.name.slice(0, 80)} WHERE id = ${id} AND user_id = ${userId}`;
  }
  if (patch.item !== undefined) {
    await sql()`UPDATE pockets SET item = ${patch.item.slice(0, 160)} WHERE id = ${id} AND user_id = ${userId}`;
  }
}

export async function deletePocket(userId: string, id: string): Promise<void> {
  await sql()`DELETE FROM pockets WHERE id = ${id} AND user_id = ${userId}`;
}

/**
 * Seeds the DEMO account only, from the migration.
 *
 * Real signups start empty: showing someone spending they never entered is
 * worse than an empty state. The demo account exists precisely so a judge can
 * see a populated ledger without registering.
 */
export async function seedNewAccount(
  userId: string,
  salaryPaisa: number,
): Promise<void> {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();

  const iso = (year: number, month: number, d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.max(1, d)).padStart(2, "0")}`;

  const lastY = m === 0 ? y - 1 : y;
  const lastM = m === 0 ? 11 : m - 1;

  // Recurring pairs appear in both months so the forecast has bills to detect.
  const recurring: Array<[Category, string, number, number]> = [
    ["Rent", "Landlord", Math.round(salaryPaisa * 0.25), 2],
    ["Utilities", "DESCO", 210000, 5],
    ["Mobile", "Grameenphone", 59900, 7],
  ];
  const variable: Array<[Category, string, number, number]> = [
    ["Groceries", "Meena Bazar", 247500, 3],
    ["Groceries", "Shwapno", 186000, 12],
    ["Food", "Sultan Dine", 92000, 9],
    ["Transport", "Uber", 43500, 6],
    ["Transport", "Pathao", 28000, 15],
    ["Health", "Lazz Pharma", 76000, 11],
    ["Entertainment", "Star Cineplex", 65000, 18],
  ];

  const rows: Array<{
    date: string;
    cat: Category;
    shop: string;
    paisa: number;
  }> = [];

  for (const [cat, shop, paisa, d] of [...recurring, ...variable]) {
    rows.push({ date: iso(lastY, lastM, d), cat, shop, paisa });
  }
  // This month, only up to today, and deliberately missing some bills so the
  // "not yet paid" branch of the forecast has something to report.
  for (const [cat, shop, paisa, d] of [recurring[0], ...variable.slice(0, 5)]) {
    if (d <= day) rows.push({ date: iso(y, m, d), cat, shop, paisa });
  }

  for (const r of rows) {
    await addExpense(userId, {
      date: r.date,
      category: r.cat,
      shop: r.shop,
      amountPaisa: r.paisa,
      source: "seed",
    });
  }

  await addPocket(userId, {
    name: "Laptop",
    item: "MacBook Air M4",
    targetPaisa: 14500000,
    monthlyContribPaisa: 1200000,
  });
  await addPocket(userId, {
    name: "Emergency fund",
    item: "three months of expenses",
    targetPaisa: 20000000,
    monthlyContribPaisa: 800000,
  });
}
