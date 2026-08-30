/**
 * Applies the schema and creates the demo account.
 *
 *   npm run db:migrate
 *
 * Idempotent: every statement is CREATE ... IF NOT EXISTS, and the demo user is
 * upserted, so running it twice is safe.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

import { SCHEMA } from '../lib/db';
import { hashPassword } from '../lib/auth';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../lib/demo';

// Load .env by hand: this runs outside Next, which normally does it for us.
for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* file is optional */
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    '\nDATABASE_URL is not set.\n' +
      'Create a Neon project at https://console.neon.tech, copy the pooled\n' +
      'connection string, and put it in .env as DATABASE_URL=...\n',
  );
  process.exit(1);
}

const sql = neon(url);

async function main() {
  console.log('\napplying schema...');
  for (const statement of SCHEMA) {
    await sql.query(statement);
    console.log('  ' + statement.trim().split('\n')[0].slice(0, 72));
  }

  // The demo account exists so a judge can get in without registering. The
  // rulebook asks for a live URL with no setup; this is how the auth wall and
  // that requirement coexist.
  const existing = (await sql`SELECT id FROM users WHERE email_lower = ${DEMO_EMAIL}`) as Array<{
    id: string;
  }>;

  if (existing.length === 0) {
    const id = randomUUID();
    const hash = await hashPassword(DEMO_PASSWORD);
    await sql`
      INSERT INTO users (id, email, email_lower, password_hash, display_name, salary_paisa)
      VALUES (${id}, ${DEMO_EMAIL}, ${DEMO_EMAIL}, ${hash}, 'Demo', 8000000)
    `;
    const { seedNewAccount } = await import('../lib/repo');
    process.env.DATABASE_URL = url;
    await seedNewAccount(id, 8000000);
    console.log(`\ndemo account created: ${DEMO_EMAIL}`);
  } else {
    console.log(`\ndemo account already present: ${DEMO_EMAIL}`);
  }

  const counts = (await sql`
    SELECT
      (SELECT count(*) FROM users)    AS users,
      (SELECT count(*) FROM expenses) AS expenses,
      (SELECT count(*) FROM pockets)  AS pockets
  `) as Array<Record<string, string>>;

  console.log('\nrows:', counts[0]);
  console.log('\nmigration complete\n');
}

main().catch((error) => {
  console.error('\nmigration failed:', error instanceof Error ? error.message : error, '\n');
  process.exit(1);
});
