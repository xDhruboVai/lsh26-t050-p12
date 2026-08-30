'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function TopBar() {
  const path = usePathname();

  return (
    <header className="chrome sticky top-0 z-20" style={{ boxShadow: '0 6px 16px -10px var(--nm-dark)' }}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Link href="/" aria-label="Ledger, go to this month" className="flex min-w-0 flex-1 items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true" className="flex-none">
            <rect width="64" height="64" rx="14" fill="var(--c-spark-ink)" />
            <rect x="12" y="20" width="40" height="8" rx="4" fill="#2a3327" />
            <rect x="12" y="20" width="27" height="8" rx="4" fill="var(--c-spark)" />
            <rect x="12" y="36" width="40" height="8" rx="4" fill="#2a3327" />
            <rect x="12" y="36" width="16" height="8" rx="4" fill="#35c4a1" />
          </svg>
          <span className="text-[17px] font-bold tracking-tight">Ledger</span>
        </Link>

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
