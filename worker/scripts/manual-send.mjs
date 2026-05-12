// One-shot: send the welcome email manually via Resend, bypassing the
// Worker's INSERT path. Use when a row already exists in the DB and you
// want to (re-)deliver the confirmation without deleting + re-submitting.
//
// Usage: node scripts/manual-send.mjs <email>

import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
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

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/manual-send.mjs <email>');
  process.exit(1);
}

const token = createHmac('sha256', env.CONFIRM_SECRET).update(email).digest('hex');
const confirmUrl = `https://sur9e.com/api/waitlist/confirm?e=${encodeURIComponent(email)}&t=${token}`;

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${env.RESEND_API_KEY}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Sur9e <hello@send.sur9e.com>',
    reply_to: 'hello@sur9e.com',
    to: [email],
    subject: 'Welcome to the sur9e waitlist',
    text: [
      'Thanks for joining.',
      '',
      "Sur9e ships at sur9e.com on September 24, 2026 — we'll email you the moment it's live.",
      '',
      `Confirm your email: ${confirmUrl}`,
    ].join('\n'),
    html: `<p>Thanks for joining.</p>
<p>Sur9e ships at <a href="https://sur9e.com">sur9e.com</a> on September 24, 2026 — we'll email you the moment it's live.</p>
<p><a href="${confirmUrl}">Confirm your email</a></p>`,
  }),
});
console.log('Resend response:', res.status, await res.text());
