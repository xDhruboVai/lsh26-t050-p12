'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLedger } from '../../../lib/store';
import { fmt, parsePaisa } from '../../../lib/money';
import { CATEGORIES, type Category } from '../../../lib/types';
import { Card, Chip, SectionTitle } from '../../../components/ui';

/** Below this, a field is shown blank and flagged rather than pre-filled. */
const SURE_ENOUGH = 0.75;

interface Extracted {
  mode?: 'live' | 'mock';
  amount_bdt: string | null;
  date: string | null;
  shop: string | null;
  category: string | null;
  confidence: { amount: number; date: number; shop: number };
  notes?: string | null;
  error?: string;
}

type Status = 'idle' | 'reading' | 'review' | 'error';

/** Bullet 1 — salary, manual entry, and adding an expense from a photo. */
export default function AddPage() {
  const router = useRouter();
  const ledger = useLedger((s) => s.ledger);
  const addExpense = useLedger((s) => s.addExpense);
  const setSalary = useLedger((s) => s.setSalary);
  const saveError = useLedger((s) => s.saveError);

  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [read, setRead] = useState<Extracted | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [shop, setShop] = useState('');
  const [category, setCategory] = useState<Category>('Groceries');

  // Drafts stay null until the user (or an extraction) touches them, so switching
  // case in the bar re-derives these from the loaded ledger instead of stranding
  // the first case's salary and date in the form.
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [salaryDraft, setSalaryDraft] = useState<string | null>(null);

  const date = dateDraft ?? ledger.today;
  const salaryValue = salaryDraft ?? String(Math.round(ledger.salaryPaisa / 100));

  const lowAmount = read !== null && read.confidence.amount < SURE_ENOUGH;
  const lowDate = read !== null && read.confidence.date < SURE_ENOUGH;
  const lowShop = read !== null && read.confidence.shop < SURE_ENOUGH;

  const amountValid = /^\d+(\.\d{1,2})?$/.test(amount.trim());
  const canSave = amountValid && /^\d{4}-\d{2}-\d{2}$/.test(date) && shop.trim().length > 0;

  async function onPick(file: File) {
    setStatus('reading');
    setErrorMsg('');
    setRead(null);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not open that file.'));
      reader.readAsDataURL(file);
    }).catch((e: Error) => {
      setErrorMsg(e.message);
      setStatus('error');
      return '';
    });
    if (!dataUrl) return;

    setPreview(dataUrl);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mediaType: file.type || 'image/jpeg' }),
      });
      const data = (await res.json()) as Extracted;

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? 'The reader did not respond. Enter the fields by hand.');
        setStatus('error');
        return;
      }

      setRead(data);

      // Only fields the reader is confident about are pre-filled.
      // An uncertain amount is left EMPTY on purpose.
      setAmount(data.confidence.amount >= SURE_ENOUGH && data.amount_bdt ? data.amount_bdt : '');
      setDateDraft(data.confidence.date >= SURE_ENOUGH && data.date ? data.date : ledger.today);
      setShop(data.confidence.shop >= SURE_ENOUGH && data.shop ? data.shop : '');
      const cat = CATEGORIES.find((c) => c.toLowerCase() === String(data.category ?? '').toLowerCase());
      if (cat) setCategory(cat);

      setStatus('review');
    } catch {
      setErrorMsg('Network error reaching the reader. Enter the fields by hand.');
      setStatus('error');
    }
  }

  const [saving, setSaving] = useState(false);

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // Only navigate once the row is actually in the database. Pushing first
      // would show a dashboard that does not include the expense just added.
      await addExpense({
        date,
        category,
        shop: shop.trim(),
        amountPaisa: parsePaisa(amount.trim()),
        source: read ? 'receipt' : 'manual',
        confidence: read?.confidence,
      });
      router.push('/');
      router.refresh();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Add an expense</h1>
        <p className="text-[13px] text-ink2">Photograph the bill, or type it in.</p>
      </div>

      {/* Salary */}
      <Card>
        <SectionTitle hint="monthly">Salary</SectionTitle>
        <div className="flex items-center gap-2">
          <input
            className="field num"
            inputMode="numeric"
            aria-label="Monthly salary in taka"
            value={salaryValue}
            onChange={(e) => {
              setSalaryDraft(e.target.value);
              const digits = e.target.value.replace(/[^\d]/g, '');
              if (digits) setSalary(parsePaisa(digits));
            }}
          />
          <span className="num flex-none text-[13px] text-ink3">
            {fmt(ledger.salaryPaisa, { paisa: false })}
          </span>
        </div>
      </Card>

      {/* Capture */}
      <Card>
        <SectionTitle hint="amount, date and shop">Read from a photo</SectionTitle>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPick(file);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          className="btn btn-primary w-full"
          onClick={() => fileRef.current?.click()}
          disabled={status === 'reading'}
        >
          {status === 'reading' ? 'Reading the bill…' : 'Photograph a bill'}
        </button>

        {status === 'reading' && (
          <div className="mt-3 flex items-center gap-2 text-[13px] text-ink2">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: 'var(--c-accent)', borderRightColor: 'var(--c-accent)' }}
              aria-hidden="true"
            />
            Reading amount, date and shop. Nothing is saved until you confirm.
          </div>
        )}

        {status === 'error' && (
          <div
            className="mt-3 rounded-lg p-3 text-[13px]"
            style={{ background: 'var(--c-risk-soft)', color: 'var(--c-risk)' }}
          >
            {errorMsg} The fields below still work.
          </div>
        )}

        {read && status === 'review' && (
          <div className="mt-3">
            {read.mode === 'mock' && (
              <div
                className="mb-3 rounded-lg p-3 text-[12.5px]"
                style={{ background: 'var(--c-warn-soft)', color: 'var(--c-warn)' }}
              >
                <strong>Mock reader.</strong> No API key is configured on this deployment, so nothing
                was read from the image. Every field is marked unsure and left for you to fill in.
              </div>
            )}

            <p className="label mb-2">What was read</p>
            <div className="flex flex-col gap-1.5">
              <ReadRow label="Amount" value={read.amount_bdt} score={read.confidence.amount} />
              <ReadRow label="Date" value={read.date} score={read.confidence.date} />
              <ReadRow label="Shop" value={read.shop} score={read.confidence.shop} />
            </div>

            {read.notes && <p className="mt-2 text-[12px] text-ink3">{read.notes}</p>}

            {(lowAmount || lowDate || lowShop) && (
              <p className="mt-2 text-[12.5px]" style={{ color: 'var(--c-warn)' }}>
                Anything marked unsure was left blank rather than guessed. Fill it in below.
              </p>
            )}

            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="The bill you photographed"
                className="well mt-3 max-h-48 w-full rounded-xl object-contain p-2"
              />
            )}
          </div>
        )}
      </Card>

      {/* Review and correct — every field editable before anything is saved */}
      <Card>
        <SectionTitle hint={read ? 'check and correct' : 'or type it in'}>Expense details</SectionTitle>

        <div className="flex flex-col gap-3">
          <Field label="Amount in taka" flagged={lowAmount}>
            <input
              className="field num"
              inputMode="decimal"
              placeholder={lowAmount ? 'Not read — enter the total' : '2475.00'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={amount.length > 0 && !amountValid}
            />
            {amount.length > 0 && !amountValid && (
              <p className="mt-1 text-[12px]" style={{ color: 'var(--c-risk)' }}>
                Use digits only, up to two decimal places.
              </p>
            )}
          </Field>

          <Field label="Date" flagged={lowDate}>
            <input
              className="field num"
              type="date"
              value={date}
              onChange={(e) => setDateDraft(e.target.value)}
            />
          </Field>

          <Field label="Shop" flagged={lowShop}>
            <input
              className="field"
              placeholder={lowShop ? 'Not read — enter the shop' : 'Meena Bazar'}
              value={shop}
              onChange={(e) => setShop(e.target.value)}
            />
          </Field>

          <Field label="Category">
            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <button
          type="button"
          className="btn btn-primary mt-4 w-full"
          onClick={save}
          disabled={!canSave || saving}
        >
          {saving
            ? 'Saving…'
            : canSave
              ? `Save ${fmt(parsePaisa(amount.trim()), { paisa: false })}`
              : 'Fill in amount, date and shop'}
        </button>
        {saveError && (
          <p className="mt-2 text-center text-[13px]" style={{ color: 'var(--c-risk)' }}>
            {saveError}
          </p>
        )}
        <p className="mt-2 text-center text-[12px] text-ink3">
          Nothing is saved until you press save.
        </p>
      </Card>
    </div>
  );
}

function Field({
  label,
  flagged,
  children,
}: {
  label: string;
  flagged?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="label">{label}</span>
        {flagged && <Chip tone="warn">check this</Chip>}
      </div>
      {children}
    </div>
  );
}

function ReadRow({ label, value, score }: { label: string; value: string | null; score: number }) {
  const sure = score >= SURE_ENOUGH;
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ${sure ? 'well' : ''}`}
      style={sure ? undefined : { background: 'var(--c-warn-soft)' }}
    >
      <span className="text-[13px] text-ink2">{label}</span>
      <span className="flex items-center gap-2">
        <span className="num text-[13.5px] font-semibold">
          {sure && value ? value : <span style={{ color: 'var(--c-warn)' }}>not read</span>}
        </span>
        <Chip tone={sure ? 'good' : 'warn'}>{Math.round(score * 100)}%</Chip>
      </span>
    </div>
  );
}
