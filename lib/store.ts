'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import cases from '../data/cases.json';
import { loadCase, loadFromText } from './caseLoader';
import { buildSummary } from './engine/summary';
import { buildForecast } from './engine/forecast';
import { buildPockets } from './engine/pockets';
import type { Expense, LedgerState, Pocket } from './types';

const ALL_CASES = (cases as { cases: Record<string, unknown>[] }).cases;

export const CASE_IDS = ALL_CASES.map((c) => String(c.case_id));

function caseById(id: string) {
  return ALL_CASES.find((c) => String(c.case_id) === id) ?? ALL_CASES[0];
}

interface Store {
  ledger: LedgerState;
  loadCaseId: (id: string) => void;
  loadPastedJson: (text: string) => void;
  setSalary: (paisa: number) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
  addPocket: (pocket: Omit<Pocket, 'id'>) => void;
  updatePocket: (id: string, patch: Partial<Pocket>) => void;
  removePocket: (id: string) => void;
  reset: () => void;
}

export const useLedger = create<Store>()(
  persist(
    (set) => ({
      ledger: loadCase(ALL_CASES[0]),

      loadCaseId: (id) => set({ ledger: loadCase(caseById(id)) }),

      loadPastedJson: (text) => set({ ledger: loadFromText(text) }),

      setSalary: (paisa) =>
        set((s) => ({ ledger: { ...s.ledger, salaryPaisa: paisa } })),

      addExpense: (expense) =>
        set((s) => ({
          ledger: {
            ...s.ledger,
            expenses: [
              ...s.ledger.expenses,
              { ...expense, id: 'X' + Date.now().toString(36).toUpperCase() },
            ],
          },
        })),

      removeExpense: (id) =>
        set((s) => ({
          ledger: { ...s.ledger, expenses: s.ledger.expenses.filter((e) => e.id !== id) },
        })),

      addPocket: (pocket) =>
        set((s) => ({
          ledger: {
            ...s.ledger,
            pockets: [
              ...s.ledger.pockets,
              { ...pocket, id: 'SP-' + (s.ledger.pockets.length + 1) + '-' + Date.now().toString(36) },
            ],
          },
        })),

      updatePocket: (id, patch) =>
        set((s) => ({
          ledger: {
            ...s.ledger,
            pockets: s.ledger.pockets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          },
        })),

      removePocket: (id) =>
        set((s) => ({
          ledger: { ...s.ledger, pockets: s.ledger.pockets.filter((p) => p.id !== id) },
        })),

      reset: () => set({ ledger: loadCase(ALL_CASES[0]) }),
    }),
    { name: 'p12-ledger', version: 1 },
  ),
);

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
