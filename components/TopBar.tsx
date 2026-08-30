'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLedger } from '../lib/store';
import { monthLabel } from '../lib/dates';
import ThemeToggle from './ThemeToggle';

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
        <ThemeToggle />
        <Link
          href="/profile"
          aria-label="Your profile"
          aria-current={path === '/profile' ? 'page' : undefined}
          className={`tile flex-none ${path === '/profile' ? 'tile-on' : ''}`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 19.5a7 7 0 0 1 14 0" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
