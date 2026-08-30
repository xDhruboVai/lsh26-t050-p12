'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Month', d: 'M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' },
  { href: '/add', label: 'Add', d: 'M12 5v14M5 12h14' },
  { href: '/forecast', label: 'Forecast', d: 'M3 17l5-6 4 4 5-7 4 5' },
  { href: '/pockets', label: 'Pockets', d: 'M4 7h16v12H4zM4 7l2-3h12l2 3M9 12h6' },
];

export default function TabBar() {
  const path = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="chrome fixed inset-x-0 bottom-0 z-20"
      style={{
        boxShadow: '0 -6px 16px -8px var(--nm-dark)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="mx-auto flex w-full max-w-2xl">
        {TABS.map((tab) => {
          const active = path === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1 py-2.5"
                style={{ color: active ? 'var(--c-accent)' : 'var(--c-ink3)' }}
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.1 : 1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={tab.d} />
                </svg>
                <span className="text-[11px] font-semibold tracking-wide">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
