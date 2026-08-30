'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLedger } from '../lib/store';
import { monthLabel } from '../lib/dates';

export default function TopBar({ name }: { name: string }) {
  const ledger = useLedger((s) => s.ledger);
  const path = usePathname();

  return (
    <header className="chrome sticky top-0 z-20" style={{ boxShadow: '0 6px 16px -10px var(--nm-dark)' }}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="label">{name}</p>
          <p className="truncate text-[13px] text-ink2">
            {monthLabel(ledger.months.this)} · {ledger.expenses.length} expenses ·{' '}
            {ledger.pockets.length} pockets
          </p>
        </div>
        <Link
          href="/profile"
          aria-label="Your profile"
          aria-current={path === '/profile' ? 'page' : undefined}
          className="btn btn-ghost flex-none px-3.5"
          style={{ color: path === '/profile' ? 'var(--c-accent)' : undefined }}
        >
          Profile
        </Link>
      </div>
    </header>
  );
}
