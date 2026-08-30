'use client';

import { useState } from 'react';
import { createLedgerStore, LedgerContext } from '../lib/store';
import type { LedgerState } from '../lib/types';

/**
 * Creates one store per render tree, seeded with the ledger the server already
 * loaded. Because the data is there before the first render, the pages render
 * complete on the server instead of flashing an empty state, and no state is
 * shared between concurrent requests.
 */
export default function LedgerProvider({
  initial,
  children,
}: {
  initial: LedgerState;
  children: React.ReactNode;
}) {
  const [store] = useState(() => createLedgerStore(initial));
  return <LedgerContext.Provider value={store}>{children}</LedgerContext.Provider>;
}
