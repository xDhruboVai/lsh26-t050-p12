import type { ISODate, MonthKey } from './dates';

export const CATEGORIES = [
  'Rent', 'Groceries', 'Food', 'Transport', 'Utilities',
  'Mobile', 'Health', 'Education', 'Entertainment', 'Clothing',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ExpenseSource = 'seed' | 'manual' | 'receipt';

export interface FieldConfidence {
  amount: number;
  date: number;
  shop: number;
}

/** Stored. */
export interface Expense {
  id: string;
  date: ISODate;
  category: Category;
  shop: string;
  amountPaisa: number;
  source: ExpenseSource;
  /** Present only for receipt-sourced rows; what the extractor reported. */
  confidence?: FieldConfidence;
}

/** Stored. */
export interface Pocket {
  id: string;
  name: string;
  item: string;
  targetPaisa: number;
  monthlyContribPaisa: number;
}

/** Stored. The whole application state. */
export interface LedgerState {
  caseId: string;
  today: ISODate;
  months: { last: MonthKey; this: MonthKey };
  salaryPaisa: number;
  dpsAnnualRatePct: string;
  dpsRule: string;
  expenses: Expense[];
  pockets: Pocket[];
}

/* ------------------------------------------------------------------ *
 * Everything below is DERIVED. Never stored, recomputed on each read.
 * That is what makes insights and pocket dates move when numbers move.
 * ------------------------------------------------------------------ */

export interface CategoryTotal {
  category: Category;
  paisa: number;
  sharePct: number;
  lastMonthPaisa: number;
  deltaPaisa: number;
}

export interface MonthSummary {
  month: MonthKey;
  isPartial: boolean;
  totalPaisa: number;
  salaryPaisa: number;
  leftPaisa: number;
  byCategory: CategoryTotal[];
  topExpenses: Expense[];
  lastMonthTotalPaisa: number;
  deltaPaisa: number;
  deltaPct: number;
  count: number;
}

export type InsightKind =
  | 'top-category'
  | 'biggest-rise'
  | 'biggest-expense'
  | 'salary-share'
  | 'shortfall'
  | 'recurring-due'
  | 'underspend';

export interface Insight {
  id: string;
  kind: InsightKind;
  text: string;
  category?: Category;
  amountPaisa: number;
  tone: 'warn' | 'info' | 'good';
}

export interface RecurringItem {
  key: string;
  category: Category;
  shop: string;
  expectedPaisa: number;
  seenThisMonth: boolean;
}

export interface Forecast {
  month: MonthKey;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  spentThisMonthPaisa: number;
  variableSpentPaisa: number;
  recurringSpentPaisa: number;
  variableDailyPaisa: number;
  recurringDuePaisa: number;
  restOfMonthPaisa: number;
  projectedMonthTotalPaisa: number;
  projectedLeftPaisa: number;
  monthlySurplusPaisa: number;
  recurring: RecurringItem[];
  insights: Insight[];
}

export interface ScheduleRow {
  month: MonthKey;
  contributionPaisa: number;
  balancePaisa: number;
  dpsBalancePaisa: number;
  dpsInterestPaisa: number;
}

export interface PocketPlan {
  pocketId: string;
  name: string;
  item: string;
  targetPaisa: number;
  monthlyContribPaisa: number;
  /** What this pocket actually receives each month once surplus is allocated. */
  effectiveContribPaisa: number;
  reachable: boolean;
  monthsToComplete: number | null;
  completionMonth: MonthKey | null;
  completionDate: ISODate | null;
  schedule: ScheduleRow[];
  dpsBalancePaisa: number;
  dpsInterestPaisa: number;
  dpsAnnualRatePct: string;
  /** Set when unreachable: how much monthly spending must fall to fund it. */
  shortfallPaisa: number;
}

export interface PocketsResult {
  monthlySurplusPaisa: number;
  totalRequestedPaisa: number;
  fullyFunded: boolean;
  plans: PocketPlan[];
}
