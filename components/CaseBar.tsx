'use client';

import { useState } from 'react';
import { CASE_IDS, useLedger } from '../lib/store';
import { monthLabel } from '../lib/dates';

/**
 * The judge surface. A case picker over the 25 public cases, plus a paste box
 * so a private case JSON can be dropped straight in and rendered without any
 * code change. It doubles as the demo control during the video.
 */
export default function CaseBar() {
  const ledger = useLedger((s) => s.ledger);
  const loadCaseId = useLedger((s) => s.loadCaseId);
  const loadPastedJson = useLedger((s) => s.loadPastedJson);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function paste() {
    try {
      loadPastedJson(text);
      setError(null);
      setOpen(false);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that case.');
    }
  }

  return (
    <header className="chrome sticky top-0 z-20" style={{ boxShadow: '0 6px 16px -10px var(--nm-dark)' }}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="label">Case</p>
          <p className="truncate text-[13px] text-ink2">
            {monthLabel(ledger.months.this)} · {ledger.expenses.length} expenses ·{' '}
            {ledger.pockets.length} pockets
          </p>
        </div>

        <label className="sr-only" htmlFor="case-select">
          Load a public case
        </label>
        <select
          id="case-select"
          className="field w-auto max-w-[104px] flex-none py-2 text-[13px]"
          style={{ minHeight: 40 }}
          value={CASE_IDS.includes(ledger.caseId) ? ledger.caseId : ''}
          onChange={(e) => loadCaseId(e.target.value)}
        >
          {!CASE_IDS.includes(ledger.caseId) && <option value="">{ledger.caseId}</option>}
          {CASE_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-ghost flex-none px-3 text-[13px]"
          style={{ minHeight: 40 }}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          Paste
        </button>
      </div>

      {open && (
        <div className="px-4 pb-3">
          <label className="label mb-1.5 block" htmlFor="case-json">
            Paste a case JSON
          </label>
          <textarea
            id="case-json"
            className="field font-mono text-[12px]"
            rows={4}
            placeholder='{ "case_id": "PRIV-01", "today": "...", "salary_bdt": "...", "expenses": [...], "pockets": [...] }'
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && (
            <p className="mt-2 text-[13px]" style={{ color: 'var(--c-risk)' }}>
              {error}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn btn-primary" onClick={paste} disabled={!text.trim()}>
              Load case
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
