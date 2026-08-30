'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLedger } from '../lib/store';
import { fmt, parsePaisa } from '../lib/money';
import { Card, SectionTitle } from './ui';

export default function ProfileForm({
  displayName,
  email,
  salaryPaisa,
  dpsRatePct,
}: {
  displayName: string;
  email: string;
  salaryPaisa: number;
  dpsRatePct: string;
}) {
  const router = useRouter();
  const setSalary = useLedger((s) => s.setSalary);
  const setProfile = useLedger((s) => s.setProfile);
  const ledger = useLedger((s) => s.ledger);
  const saveError = useLedger((s) => s.saveError);

  const [name, setName] = useState(displayName);
  const [salary, setSalary_] = useState(String(Math.round(salaryPaisa / 100)));
  const [rate, setRate] = useState(dpsRatePct);
  const [saved, setSaved] = useState(false);

  async function save() {
    const digits = salary.replace(/[^\d]/g, '');
    if (digits) setSalary(parsePaisa(digits));
    await setProfile({ displayName: name, dpsRatePct: rate });
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <Card>
        <SectionTitle hint={email}>Your details</SectionTitle>

        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="label mb-1.5 block">Name</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="block">
            <span className="label mb-1.5 block">Monthly salary</span>
            <input
              className="field num"
              inputMode="numeric"
              value={salary}
              onChange={(e) => setSalary_(e.target.value)}
            />
            <span className="mt-1.5 block text-[12px] text-ink3">
              Currently {fmt(ledger.salaryPaisa, { paisa: false })}. Every forecast and pocket date
              is derived from this.
            </span>
          </label>

          <label className="block">
            <span className="label mb-1.5 block">DPS annual rate</span>
            <input
              className="field num"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="9.00"
            />
            <span className="mt-1.5 block text-[12px] text-ink3">
              Percent per year. Interest is added monthly and compounds:
              balance += deposit, then interest = balance × rate ÷ 12 ÷ 100, rounded half up to the
              paisa.
            </span>
          </label>
        </div>

        {saveError && (
          <p className="mt-3 text-[13px]" style={{ color: 'var(--c-risk)' }}>
            {saveError}
          </p>
        )}

        <button type="button" className="btn btn-primary mt-4 w-full" onClick={save}>
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </Card>

      <Card>
        <SectionTitle>Security</SectionTitle>
        <ul className="flex flex-col gap-1.5 text-[13px] text-ink2">
          <li>Password stored as a salted scrypt hash, never in plain text.</li>
          <li>Sessions are opaque tokens; only their hash is kept, so they can be revoked.</li>
          <li>Five wrong passwords locks the account for fifteen minutes.</li>
          <li>Your data is scoped to your account on every query.</li>
        </ul>
      </Card>
    </>
  );
}
