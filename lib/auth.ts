import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { sql } from './db';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = 'ledger_session';
const SESSION_DAYS = 30;

/** Five failures locks the account for fifteen minutes. */
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

/* ------------------------------------------------------------------ *
 * Passwords
 *
 * scrypt from node:crypto rather than bcrypt or argon2: both of those need a
 * native build, which is a bad thing to discover is broken at 21:50. scrypt is
 * a memory-hard KDF in the standard library and needs no toolchain.
 * ------------------------------------------------------------------ */

const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);

  // Constant time: a length-dependent early return leaks information.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ------------------------------------------------------------------ *
 * Sessions
 *
 * The cookie carries a random opaque token. Only its SHA-256 is stored, so a
 * dumped sessions table cannot be replayed as a login, and any session can be
 * revoked by deleting its row.
 * ------------------------------------------------------------------ */

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, userAgent = ''): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await sql()`
    INSERT INTO sessions (id, user_id, token_hash, user_agent, expires_at)
    VALUES (${randomUUID()}, ${userId}, ${hashToken(token)}, ${userAgent.slice(0, 200)}, ${expires.toISOString()})
  `;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  });

  return token;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  salaryPaisa: number;
  dpsRatePct: string;
}

/** The current user, or null. Every protected route goes through this. */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const rows = (await sql()`
      SELECT u.id, u.email, u.display_name, u.salary_paisa, u.dps_rate_pct
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now()
      LIMIT 1
    `) as Array<Record<string, unknown>>;

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: String(r.id),
      email: String(r.email),
      displayName: String(r.display_name ?? ''),
      salaryPaisa: Number(r.salary_paisa ?? 0),
      dpsRatePct: String(r.dps_rate_pct ?? '9.00'),
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await sql()`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
    } catch {
      /* clearing the cookie still logs the user out of this browser */
    }
  }
  jar.delete(SESSION_COOKIE);
}

/* ------------------------------------------------------------------ *
 * Validation and lockout
 * ------------------------------------------------------------------ */

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailProblem(email: string): string | null {
  const e = email.trim();
  if (e.length === 0) return 'Enter your email address.';
  if (e.length > 254) return 'That email address is too long.';
  // Deliberately permissive. The only real test of an address is sending to it.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'That does not look like an email address.';
  return null;
}

export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'Use at least 10 characters.';
  if (password.length > 200) return 'That password is too long.';
  if (!/[a-z]/i.test(password)) return 'Include at least one letter.';
  if (!/\d/.test(password)) return 'Include at least one number.';
  // The most common leaked passwords, rejected outright.
  if (/^(password|12345678|qwerty|letmein|welcome)/i.test(password)) {
    return 'That password is too easy to guess.';
  }
  return null;
}

export interface LockState {
  locked: boolean;
  minutesLeft: number;
}

export function lockState(lockedUntil: string | Date | null): LockState {
  if (!lockedUntil) return { locked: false, minutesLeft: 0 };
  const until = new Date(lockedUntil).getTime();
  const ms = until - Date.now();
  if (ms <= 0) return { locked: false, minutesLeft: 0 };
  return { locked: true, minutesLeft: Math.ceil(ms / 60_000) };
}

export async function recordFailedLogin(userId: string, currentFailures: number): Promise<void> {
  const next = currentFailures + 1;
  if (next >= MAX_FAILED_LOGINS) {
    const until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
    await sql()`UPDATE users SET failed_logins = 0, locked_until = ${until} WHERE id = ${userId}`;
  } else {
    await sql()`UPDATE users SET failed_logins = ${next} WHERE id = ${userId}`;
  }
}

export async function clearFailedLogins(userId: string): Promise<void> {
  await sql()`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ${userId}`;
}

export const LOCKOUT_POLICY = { maxAttempts: MAX_FAILED_LOGINS, minutes: LOCKOUT_MINUTES };
