'use client';

import { create } from 'zustand';

import { buildSummary } from './engine/summary';
import { buildForecast } from './engine/forecast';
import { buildPockets } from './engine/pockets';
import { DEFAULT_DPS_RULE } from './caseLoader';
import { monthKey, addMonths } from './dates';
import type { Expense, LedgerState, Pocket } from './types';

/**
 * The store is seeded from the server by LedgerProvider, then written through
 * to /api/ledger on every change.
 *
 * Local state updates first and the request follows. A dropped write shows an
 * error rather than silently diverging, because the alternative is a figure on
 * screen that is not in the database.
 */

const EMPTY: LedgerState = {
  caseId: '',
  today: new Date().toISOString().slice(0, 10),
  months: {
    last: addMonths(monthKey(new Date().toISOString().slice(0, 10)), -1),
    this: monthKey(new Date().toISOString().slice(0, 10)),
  },
  salaryPaisa: 0,
  dpsAnnualRatePct: '9.00',
  dpsRule: DEFAULT_DPS_RULE,
  expenses: [],
  pockets: [],
};

async function send(op: string, payload: Record<string, unknown>): Promise<{ id?: string }> {
  const res = await fetch('/api/ledger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, payload }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'Could not save that change.');
  }
  return (await res.json()) as { id?: string };
}

interface Store {
  ledger: LedgerState;
  saveError: string | null;
  clearError: () => void;

  setSalary: (paisa: number) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  addPocket: (pocket: Omit<Pocket, 'id'>) => Promise<void>;
  updatePocket: (id: string, patch: Partial<Pocket>) => void;
  removePocket: (id: string) => Promise<void>;
  setProfile: (patch: { displayName?: string; dpsRatePct?: string }) => Promise<void>;
}

/** Coalesces the keystrokes in a number field into one write. */
function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const useLedger = create<Store>()((set, get) => {
  const fail = (e: unknown) =>
    set({ saveError: e instanceof Error ? e.message : 'Could not save that change.' });

  const pushSalary = debounce((paisa: number) => {
    void send('setSalary', { paisa }).catch(fail);
  }, 500);

  const pushContribution = debounce((id: string, monthlyContribPaisa: number) => {
    void send('updatePocket', { id, monthlyContribPaisa }).catch(fail);
  }, 500);

  return {
    ledger: EMPTY,
    saveError: null,
    clearError: () => set({ saveError: null }),

    setSalary: (paisa) => {
      set((s) => ({ ledger: { ...s.ledger, salaryPaisa: paisa } }));
      pushSalary(paisa);
    },

    addExpense: async (expense) => {
      try {
        const { id } = await send('addExpense', { ...expense });
        set((s) => ({
          ledger: {
            ...s.ledger,
            expenses: [...s.ledger.expenses, { ...expense, id: id ?? crypto.randomUUID() }],
          },
        }));
      } catch (e) {
        fail(e);
        throw e;
      }
    },

    removeExpense: async (id) => {
      const before = get().ledger.expenses;
      set((s) => ({ ledger: { ...s.ledger, expenses: before.filter((e) => e.id !== id) } }));
      try {
        await send('deleteExpense', { id });
      } catch (e) {
        set((s) => ({ ledger: { ...s.ledger, expenses: before } }));
        fail(e);
      }
    },

    addPocket: async (pocket) => {
      try {
        const { id } = await send('addPocket', { ...pocket });
        set((s) => ({
          ledger: {
            ...s.ledger,
            pockets: [...s.ledger.pockets, { ...pocket, id: id ?? crypto.randomUUID() }],
          },
        }));
      } catch (e) {
        fail(e);
        throw e;
      }
    },

    updatePocket: (id, patch) => {
      set((s) => ({
        ledger: {
          ...s.ledger,
          pockets: s.ledger.pockets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        },
      }));
      if (patch.monthlyContribPaisa !== undefined) {
        pushContribution(id, patch.monthlyContribPaisa);
      } else {
        void send('updatePocket', { id, ...patch }).catch(fail);
      }
    },

    removePocket: async (id) => {
      const before = get().ledger.pockets;
      set((s) => ({ ledger: { ...s.ledger, pockets: before.filter((p) => p.id !== id) } }));
      try {
        await send('deletePocket', { id });
      } catch (e) {
        set((s) => ({ ledger: { ...s.ledger, pockets: before } }));
        fail(e);
      }
    },

    setProfile: async (patch) => {
      if (patch.dpsRatePct !== undefined) {
        set((s) => ({ ledger: { ...s.ledger, dpsAnnualRatePct: patch.dpsRatePct! } }));
      }
      try {
        await send('setProfile', { ...patch });
      } catch (e) {
        fail(e);
        throw e;
      }
    },
  };
});

/**
 * Derived views. These recompute on every read rather than being stored, which
 * is what makes the insights and the pocket dates move when the numbers move —
 * both of which the problem states as constraints.
 */
export function useSummary() {
  return buildSummary(useLedger((s) => s.ledger));
}

export function useForecast() {
  return buildForecast(useLedger((s) => s.ledger));
}

export function usePockets() {
  const ledger = useLedger((s) => s.ledger);
  return buildPockets(ledger, buildForecast(ledger));
}
