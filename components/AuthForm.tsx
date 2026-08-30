'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { FormState } from '../app/actions/auth';

/** Mirrors passwordProblem() on the server, so the rules are visible while typing. */
const RULES = [
  { test: (p: string) => p.length >= 10, label: 'At least 10 characters' },
  { test: (p: string) => /[a-z]/i.test(p), label: 'One letter' },
  { test: (p: string) => /\d/.test(p), label: 'One number' },
];

export default function AuthForm({
  mode,
  action,
  demo,
}: {
  mode: 'signin' | 'signup';
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  demo?: { email: string; password: string };
}) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const isSignUp = mode === 'signup';

  const [password, setPassword] = useState('');
  const unmet = RULES.filter((r) => !r.test(password));
  const passwordReady = password.length > 0 && unmet.length === 0;

  const kept = state.values ?? {};

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-7">
        <svg width="42" height="42" viewBox="0 0 64 64" aria-hidden="true" className="mb-4">
          <rect width="64" height="64" rx="14" fill="var(--c-spark-ink)" />
          <rect x="12" y="20" width="40" height="8" rx="4" fill="#2a3327" />
          <rect x="12" y="20" width="27" height="8" rx="4" fill="var(--c-spark)" />
          <rect x="12" y="36" width="40" height="8" rx="4" fill="#2a3327" />
          <rect x="12" y="36" width="16" height="8" rx="4" fill="#35c4a1" />
        </svg>
        <h1 className="text-[26px] font-bold tracking-tight">
          {isSignUp ? 'Create your ledger' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-[14px] text-ink2">
          {isSignUp
            ? 'One place for what you spend and what you are saving for.'
            : 'Sign in to pick up where the month left off.'}
        </p>
      </div>

      <form action={formAction} className="card flex flex-col gap-4 p-5">
        {isSignUp && (
          <label className="block">
            <span className="label mb-1.5 block">Your name</span>
            <input
              name="name"
              disabled={pending}
              className="field disabled:opacity-60"
              autoComplete="name"
              placeholder="Rafi"
              defaultValue={kept.name ?? ''}
            />
          </label>
        )}

        <label className="block">
          <span className="label mb-1.5 block">Email</span>
          <input
            name="email"
            type="email"
            required
            disabled={pending}
            className="field disabled:opacity-60"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            defaultValue={kept.email ?? ''}
            aria-invalid={!pending && state.field === 'email' ? true : undefined}
          />
          {!pending && state.field === 'email' && state.error && (
            <span className="mt-1.5 block text-[13px]" style={{ color: 'var(--c-risk)' }}>
              {state.error}
            </span>
          )}
        </label>

        <label className="block">
          <span className="label mb-1.5 block">Password</span>
          <input
            name="password"
            type="password"
            required
            disabled={pending}
            className="field disabled:opacity-60"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!pending && state.field === 'password' ? true : undefined}
          />

          {isSignUp && (
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {RULES.map((rule) => {
                const met = rule.test(password);
                return (
                  <li
                    key={rule.label}
                    className="flex items-center gap-1.5 text-[12px]"
                    style={{ color: met ? 'var(--c-accent)' : 'var(--c-ink3)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {met ? <path d="M4 12.5l5.5 5.5L20 7" /> : <circle cx="12" cy="12" r="8" />}
                    </svg>
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          )}

          {!pending && state.field === 'password' && state.error && (
            <span className="mt-1.5 block text-[13px]" style={{ color: 'var(--c-risk)' }}>
              {state.error}
            </span>
          )}
        </label>

        {isSignUp && (
          <label className="block">
            <span className="label mb-1.5 block">Monthly salary (optional)</span>
            <input
              name="salary"
              disabled={pending}
              className="field num disabled:opacity-60"
              inputMode="numeric"
              placeholder="50000"
              defaultValue={kept.salary ?? ''}
            />
            <span className="mt-1.5 block text-[12px] text-ink3">
              You can change this any time in your profile.
            </span>
          </label>
        )}

        {/* Anything not already shown beside the field it belongs to. */}
        {!pending && state.error && state.field !== 'email' && state.field !== 'password' && (
          <p
            role="alert"
            className="rounded-xl px-3.5 py-2.5 text-[13.5px]"
            style={{ background: 'var(--c-risk-soft)', color: 'var(--c-risk)' }}
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending || (isSignUp && !passwordReady)}
        >
          {pending && (
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <span>
            {pending
              ? isSignUp
                ? 'Creating your ledger…'
                : 'Signing in…'
              : isSignUp
                ? 'Create account'
                : 'Sign in'}
          </span>
        </button>

        {pending && (
          <p className="text-center text-[12.5px] text-ink3 animate-pulse">
            Connecting to secure database… please hold on.
          </p>
        )}
      </form>

      {demo && (
        <div className="card mt-4 p-4">
          <p className="label mb-1.5">Just looking?</p>
          <p className="text-[13.5px] text-ink2">
            Sign in with <span className="num">{demo.email}</span> and{' '}
            <span className="num">{demo.password}</span> to see a ledger with two months of
            spending already in it.
          </p>
        </div>
      )}

      <p className="mt-5 text-center text-[14px] text-ink2">
        {isSignUp ? 'Already have an account? ' : 'No account yet? '}
        <Link
          href={isSignUp ? '/login' : '/signup'}
          className="font-semibold"
          style={{ color: 'var(--c-accent)' }}
        >
          {isSignUp ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </div>
  );
}
