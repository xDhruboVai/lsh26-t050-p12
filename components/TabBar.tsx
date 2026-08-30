'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Bottom navigation. Each icon sits in an extruded tile that presses in when
 * it is the current section, so the state reads as depth as well as colour.
 */
const TABS = [
  {
    href: '/',
    label: 'Month',
    d: 'M4 6.5h16M4 6.5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM8 10.5h3M8 14h6',
  },
  { href: '/add', label: 'Add', d: 'M12 6v12M6 12h12' },
  { href: '/forecast', label: 'Forecast', d: 'M4 16.5l4.5-5 3.5 3 4-6 4 4.5' },
  {
    href: '/pockets',
    label: 'Pockets',
    d: 'M4 9h16v10H4zM4 9l2-4h12l2 4M9.5 13h5',
  },
];

export default function TabBar() {
  const path = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="chrome fixed inset-x-0 bottom-0 z-20"
      style={{
        boxShadow: '0 -8px 20px -12px var(--nm-dark)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="mx-auto flex w-full max-w-2xl px-2 py-2">
        {TABS.map((tab) => {
          const active = path === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1 py-1"
              >
                <span className={`tile ${active ? 'tile-on' : ''}`} aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={active ? 2 : 1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={tab.d} />
                  </svg>
                </span>
                <span
                  className="text-[11px] font-semibold tracking-wide"
                  style={{ color: active ? 'var(--c-accent)' : 'var(--c-ink3)' }}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
