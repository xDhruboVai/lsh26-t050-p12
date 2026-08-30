import Link from 'next/link';
import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card p-4 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="label">{children}</h2>
      {hint && <span className="text-[11px] text-ink3">{hint}</span>}
    </div>
  );
}

/** Spend against salary. The fill turns risk-coloured once spending passes it. */
export function Meter({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const over = value > max;
  return (
    <div
      className="track h-2.5 w-full overflow-hidden rounded-full"
      role="img"
      aria-label={`${pct}% of salary`}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: over ? 'var(--c-risk)' : 'var(--c-spark)' }}
      />
    </div>
  );
}

export function Chip({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warn' | 'good' | 'risk';
}) {
  const map = {
    info: ['var(--c-surface2)', 'var(--c-ink2)'],
    good: ['var(--c-accent-soft)', 'var(--c-accent)'],
    warn: ['var(--c-warn-soft)', 'var(--c-warn)'],
    risk: ['var(--c-risk-soft)', 'var(--c-risk)'],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <span
      className="num inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  /** An empty state without a way out is just a dead end. */
  action?: { href: string; label: string };
}) {
  return (
    <div className="card p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink2">{body}</p>
      {action && (
        <Link href={action.href} className="btn btn-primary mt-4 inline-flex items-center justify-center">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** A single labelled figure. */
export function Stat({
  label,
  value,
  tone,
  sub,
  big,
}: {
  label: string;
  value: string;
  tone?: 'accent' | 'risk' | 'warn';
  sub?: string;
  /** The one figure the page exists to show. Exactly one per screen. */
  big?: boolean;
}) {
  const color =
    tone === 'risk' ? 'var(--c-risk)' : tone === 'warn' ? 'var(--c-warn)' : tone === 'accent' ? 'var(--c-accent)' : 'var(--c-ink)';
  return (
    <div>
      <p className="label">{label}</p>
      <p
        className={`num mt-0.5 font-semibold ${big ? 'text-[30px] leading-none tracking-tight' : 'text-[19px]'}`}
        style={{ color }}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[12px] text-ink3">{sub}</p>}
    </div>
  );
}

// Ordered by prominence: the spark takes the largest slice, then the teal family
// steps down, then the warm neutrals. Distinguishable in both themes.
const DONUT_COLORS = [
  '#ecff68', '#017d66', '#35c4a1', '#9c6413', '#c9a227',
  '#a63a52', '#6f7f9c', '#7a8f5a', '#c07a3e', '#8b9089',
];

export function donutColor(i: number) {
  return DONUT_COLORS[i % DONUT_COLORS.length];
}

/** Hand-drawn donut. No chart library, no hydration surprises. */
export function Donut({
  slices,
  size = 132,
}: {
  slices: { label: string; value: number }[];
  size?: number;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (total <= 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="No spending yet">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-surface2)" strokeWidth={16} />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={slices.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(', ')}
    >
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {slices.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={donutColor(i)}
              strokeWidth={16}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </g>
    </svg>
  );
}
