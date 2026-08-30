'use server';

import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from '../../lib/db';
import {
  clearFailedLogins,
  createSession,
  destroySession,
  emailProblem,
  hashPassword,
  lockState,
  normaliseEmail,
  passwordProblem,
  recordFailedLogin,
  verifyPassword,
} from '../../lib/auth';

export interface FormState {
  error?: string;
  field?: 'email' | 'password' | 'name';
  /**
   * What the user typed, echoed back so a rejected form does not wipe the
   * fields they got right. The password is deliberately never included.
   */
  values?: { name?: string; email?: string; salary?: string };
}

const GENERIC_SIGNIN_ERROR = 'That email and password do not match an account.';

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  const name = String(form.get('name') ?? '').trim();
  const salary = String(form.get('salary') ?? '').replace(/[^\d]/g, '');

  const keep = { name, email: email.trim(), salary };

  const emailIssue = emailProblem(email);
  if (emailIssue) return { error: emailIssue, field: 'email', values: keep };

  const passwordIssue = passwordProblem(password);
  if (passwordIssue) return { error: passwordIssue, field: 'password', values: keep };

  const lower = normaliseEmail(email);

  try {
    const existing = (await sql()`SELECT id FROM users WHERE email_lower = ${lower}`) as Array<{
      id: string;
    }>;
    if (existing.length > 0) {
      return {
        error: 'An account already uses that email. Sign in instead.',
        field: 'email',
        values: keep,
      };
    }

    const id = randomUUID();
    const salaryPaisa = salary ? Number(salary) * 100 : 0;

    await sql()`
      INSERT INTO users (id, email, email_lower, password_hash, display_name, salary_paisa)
      VALUES (${id}, ${email.trim()}, ${lower}, ${await hashPassword(password)},
              ${name.slice(0, 80)}, ${salaryPaisa})
    `;

    // The account starts empty. Showing someone spending they never entered is
    // worse than an empty state; the demo account is the one that carries data.
    const ua = (await headers()).get('user-agent') ?? '';
    await createSession(id, ua);
  } catch (error) {
    return { error: databaseMessage(error), values: keep };
  }

  redirect('/');
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');

  const keep = { email: email.trim() };

  if (!email.trim() || !password) {
    return { error: 'Enter your email and password.', values: keep };
  }

  try {
    const rows = (await sql()`
      SELECT id, password_hash, failed_logins, locked_until
      FROM users WHERE email_lower = ${normaliseEmail(email)}
    `) as Array<Record<string, unknown>>;

    // Same message whether the account exists or the password is wrong, so the
    // form cannot be used to discover which emails are registered.
    if (rows.length === 0) return { error: GENERIC_SIGNIN_ERROR, values: keep };

    const user = rows[0];
    const lock = lockState((user.locked_until as string) ?? null);
    if (lock.locked) {
      return {
        error: `Too many attempts. Try again in ${lock.minutesLeft} minute${lock.minutesLeft === 1 ? '' : 's'}.`,
        values: keep,
      };
    }

    const ok = await verifyPassword(password, String(user.password_hash));
    if (!ok) {
      await recordFailedLogin(String(user.id), Number(user.failed_logins ?? 0));
      return { error: GENERIC_SIGNIN_ERROR, values: keep };
    }

    await clearFailedLogins(String(user.id));
    const ua = (await headers()).get('user-agent') ?? '';
    await createSession(String(user.id), ua);
  } catch (error) {
    return { error: databaseMessage(error), values: keep };
  }

  redirect('/');
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect('/login');
}

function databaseMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('DATABASE_URL')) {
    return 'The database is not configured on this deployment yet.';
  }
  return 'Something went wrong reaching the database. Try again.';
}
