"use client";

import { useRouter } from "next/navigation";
import { useLedger } from "../lib/store";

export default function CasePreviewBanner() {
  const router = useRouter();
  const caseId = useLedger((s) => s.ledger.caseId);
  const previewing = useLedger((s) => s.previewBaseline !== null);
  const exitPreview = useLedger((s) => s.exitPreview);

  if (!previewing) return null;
  return (
    <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
      <span>
        <strong>Case preview:</strong> {caseId}. Changes stay local.
      </span>
      <button
        type="button"
        className="font-semibold underline underline-offset-2"
        onClick={() => {
          exitPreview();
          router.push("/");
        }}
      >
        Return to account
      </button>
    </div>
  );
}
