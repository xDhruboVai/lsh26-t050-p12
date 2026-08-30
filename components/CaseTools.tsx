"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import publicCases from "../data/cases.json";
import { loadCase, loadFromText } from "../lib/caseLoader";
import { useLedger } from "../lib/store";
import { Card, SectionTitle } from "./ui";

/** Judge/private-case surface. Loaded cases are an explicit local preview. */
export default function CaseTools() {
  const router = useRouter();
  const loadPreview = useLedger((s) => s.loadPreview);
  const previewing = useLedger((s) => s.previewBaseline !== null);
  const [selected, setSelected] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function show(ledger: ReturnType<typeof loadFromText>) {
    loadPreview(ledger);
    setError("");
    router.push("/");
  }

  function loadPublic() {
    try {
      show(loadCase(publicCases.cases[selected]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that case.");
    }
  }

  function loadPasted() {
    try {
      show(loadFromText(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load that case.");
    }
  }

  return (
    <Card>
      <SectionTitle hint="public or private fixtures">Test a case</SectionTitle>
      <p className="mb-3 text-[13px] leading-relaxed text-ink2">
        Load any bundled case or paste a private case JSON. It opens as a local
        preview, so your account data is never overwritten and all four answers
        render immediately.
      </p>

      <div className="flex gap-2">
        <select
          className="field"
          aria-label="Public case"
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
        >
          {publicCases.cases.map((c, index) => (
            <option key={c.case_id} value={index}>
              {c.case_id}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-primary flex-none"
          onClick={loadPublic}
        >
          Load case
        </button>
      </div>

      <label className="mt-4 block">
        <span className="label mb-1.5 block">Paste case JSON</span>
        <textarea
          className="field min-h-36 font-mono text-[12px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'{"case_id":"PRIVATE-01", ...}'}
          spellCheck={false}
        />
      </label>
      <button
        type="button"
        className="btn btn-primary mt-3 w-full"
        onClick={loadPasted}
        disabled={text.trim().length === 0}
      >
        Preview pasted case
      </button>

      {previewing && (
        <p className="mt-2 text-[12px] text-ink3">
          A case preview is currently active.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-2 text-[13px]"
          style={{ color: "var(--c-risk)" }}
        >
          {error}
        </p>
      )}
    </Card>
  );
}
