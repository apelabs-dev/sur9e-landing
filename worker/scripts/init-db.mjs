// One-shot: applies the locked waitlist DDL from
// sur9e-mvp/docs/strategy.md §18 to the Railway Postgres.
// Run once: `node scripts/init-db.mjs`
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Tiny .dev.vars parser: KEY=value lines, ignores comments and blanks.
const envText = readFileSync(join(__dirname, '..', '.dev.vars'), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.RAILWAY_DATABASE_URL;
if (!url || url.includes('${{')) {
  console.error('RAILWAY_DATABASE_URL missing or unresolved in .dev.vars');
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: 'require' });

try {
  console.log('Connecting…');
  const [{ now }] = await sql`SELECT NOW() AS now`;
  console.log(`Connected. Server time: ${now.toISOString()}`);

  console.log('Applying DDL…');
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      source TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      confirmed_at TIMESTAMP,
      notified_at TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist(email);
  `);
  console.log('DDL applied.');

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM waitlist`;
  console.log(`waitlist row count: ${count}`);

  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'waitlist'
    ORDER BY ordinal_position
  `;
  console.log('Schema:');
  for (const c of cols) {
    console.log(
      `  ${c.column_name.padEnd(14)} ${c.data_type.padEnd(28)} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`,
    );
  }
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
