'use client';

import { useRef } from 'react';
import { useLedger } from '../lib/store';
import type { LedgerState } from '../lib/types';

/**
 * Seeds the client store from the server-rendered ledger, once, before the
 * first paint. Keeping the store means every engine and screen carries over
 * from the fixture version unchanged.
 */
export default function LedgerProvider({
  initial,
  children,
}: {
  initial: LedgerState;
  children: React.ReactNode;
}) {
  const done = useRef(false);
  if (!done.current) {
    useLedger.setState({ ledger: initial });
    done.current = true;
  }
  return <>{children}</>;
}
