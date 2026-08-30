import { neon } from '@neondatabase/serverless';

/**
 * Neon over HTTP. Every call is a single round trip with no pool to manage,
 * which is what a serverless deployment wants.
 *
 * The client is created lazily so that importing this module during a build,
 * or in a context with no database configured, does not throw.
 */
let client: ReturnType<typeof neon> | null = null;

export function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL is not set. Create a Neon project and put its pooled connection string in .env.',
      );
    }
    client = neon(url);
  }
  return client;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Schema. Applied by `npm run db:migrate`, which is idempotent, so it is safe
 * to run repeatedly against the same database.
 *
 * Money is stored as BIGINT paisa for the same reason it is held as an integer
 * in the app: NUMERIC would round-trip through a float somewhere and quietly
 * lose a paisa.
 */
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id            TEXT PRIMARY KEY,
     email         TEXT NOT NULL,
     email_lower   TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     display_name  TEXT NOT NULL DEFAULT '',
     salary_paisa  BIGINT NOT NULL DEFAULT 0,
     dps_rate_pct  TEXT NOT NULL DEFAULT '9.00',
     failed_logins INTEGER NOT NULL DEFAULT 0,
     locked_until  TIMESTAMPTZ,
     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,

  // Sessions are opaque tokens stored as a hash. A leaked database row cannot
  // be replayed as a cookie, and any session can be revoked server-side.
  `CREATE TABLE IF NOT EXISTS sessions (
     id         TEXT PRIMARY KEY,
     user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token_hash TEXT NOT NULL UNIQUE,
     user_agent TEXT NOT NULL DEFAULT '',
     expires_at TIMESTAMPTZ NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at)`,

  `CREATE TABLE IF NOT EXISTS expenses (
     id           TEXT PRIMARY KEY,
     user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     spent_on     DATE NOT NULL,
     category     TEXT NOT NULL,
     shop         TEXT NOT NULL,
     amount_paisa BIGINT NOT NULL CHECK (amount_paisa >= 0),
     source       TEXT NOT NULL DEFAULT 'manual',
     confidence   JSONB,
     created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON expenses(user_id, spent_on DESC)`,

  `CREATE TABLE IF NOT EXISTS pockets (
     id                    TEXT PRIMARY KEY,
     user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name                  TEXT NOT NULL,
     item                  TEXT NOT NULL DEFAULT '',
     target_paisa          BIGINT NOT NULL CHECK (target_paisa >= 0),
     monthly_contrib_paisa BIGINT NOT NULL CHECK (monthly_contrib_paisa >= 0),
     position              INTEGER NOT NULL DEFAULT 0,
     created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS pockets_user_idx ON pockets(user_id, position)`,
];
