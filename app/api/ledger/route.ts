import { NextResponse } from 'next/server';
import { currentUser } from '../../../lib/auth';
import {
  addExpense,
  addPocket,
  deleteExpense,
  deletePocket,
  setProfile,
  setSalary,
  updatePocket,
} from '../../../lib/repo';

export const runtime = 'nodejs';

/**
 * Every mutation the client makes. One endpoint keeps the write-through in the
 * store simple; the session is resolved server-side on each call, so a client
 * cannot address another user's rows by guessing an id.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { op?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request body.' }, { status: 400 });
  }

  const p = body.payload ?? {};

  try {
    switch (body.op) {
      case 'addExpense': {
        const id = await addExpense(user.id, {
          date: String(p.date),
          category: String(p.category),
          shop: String(p.shop),
          amountPaisa: Number(p.amountPaisa),
          source: String(p.source ?? 'manual'),
          confidence: p.confidence,
        });
        return NextResponse.json({ ok: true, id });
      }
      case 'deleteExpense':
        await deleteExpense(user.id, String(p.id));
        return NextResponse.json({ ok: true });

      case 'setSalary':
        await setSalary(user.id, Number(p.paisa));
        return NextResponse.json({ ok: true });

      case 'setProfile':
        await setProfile(user.id, {
          displayName: p.displayName === undefined ? undefined : String(p.displayName),
          dpsRatePct: p.dpsRatePct === undefined ? undefined : String(p.dpsRatePct),
        });
        return NextResponse.json({ ok: true });

      case 'addPocket': {
        const id = await addPocket(user.id, {
          name: String(p.name),
          item: String(p.item ?? ''),
          targetPaisa: Number(p.targetPaisa),
          monthlyContribPaisa: Number(p.monthlyContribPaisa),
        });
        return NextResponse.json({ ok: true, id });
      }
      case 'updatePocket':
        await updatePocket(user.id, String(p.id), {
          name: p.name === undefined ? undefined : String(p.name),
          item: p.item === undefined ? undefined : String(p.item),
          targetPaisa: p.targetPaisa === undefined ? undefined : Number(p.targetPaisa),
          monthlyContribPaisa:
            p.monthlyContribPaisa === undefined ? undefined : Number(p.monthlyContribPaisa),
        });
        return NextResponse.json({ ok: true });

      case 'deletePocket':
        await deletePocket(user.id, String(p.id));
        return NextResponse.json({ ok: true });

      default:
        return NextResponse.json({ error: `Unknown operation: ${body.op}` }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Could not save that. Try again.' }, { status: 500 });
  }
}
