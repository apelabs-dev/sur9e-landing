// One-shot: send the welcome email manually via Resend, bypassing the
// Worker's INSERT path. Use when a row already exists in the DB and you
// want to (re-)deliver the welcome without deleting + re-submitting.
//
// Single opt-in: there is no confirmation step — this just (re)sends the
// welcome with a working one-click unsubscribe link.
//
// Email template is intentionally duplicated from worker/src/index.ts to
// keep this script standalone (Node .mjs can't import the TS Worker code).
// If you change the email template in the Worker, change it here too.
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
  console.error('Usage: node scripts/manual-send.mjs <email> [baseUrl]');
  console.error('  baseUrl defaults to https://sur9e.com; pass a stage/dev host');
  console.error('  (e.g. http://localhost:8787) to match the Worker you are testing.');
  process.exit(1);
}

// Match the host the unsubscribe link should resolve on: prod by default, or a
// stage/dev base passed as the 2nd arg (or BASE_URL in .dev.vars). Mirrors the
// Worker's resolveBaseUrl() so a test send's link hits the Worker you're running.
const base = (process.argv[3] || env.BASE_URL || 'https://sur9e.com').replace(/\/+$/, '');

const e = encodeURIComponent(email);
const unsubscribeToken = createHmac('sha256', env.UNSUBSCRIBE_SECRET)
  .update(`unsub:${email}`)
  .digest('hex');
const unsubscribeUrl = `${base}/api/subscribe/unsubscribe?e=${e}&t=${unsubscribeToken}`;

// Keep in sync with POSTAL_ADDRESS in worker/src/index.ts. Empty until a real
// address exists; the footer line is hidden while empty so no placeholder is sent.
const POSTAL_ADDRESS = '';

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>You're subscribed to Sur9e release notes</title></head>
<body style="margin:0;padding:0;background:#f5f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0b;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;">You're on the Sur9e release-notes list. Occasional updates, nothing else.&#8203;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f1;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:18px;">
        <tr><td style="padding:32px 32px 0;">
          <img src="https://sur9e.com/assets/sur9e-wordmark-email-light.png" width="160" height="35" alt="Sur9e" style="display:block;border:0;outline:none;text-decoration:none;color:#0a0a0b;font-size:26px;font-weight:700;letter-spacing:-0.025em;line-height:1;">
          <div style="margin-top:10px;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#ff5a1f;">Know which jobs are worth your time.</div>
        </td></tr>
        <tr><td style="padding:30px 32px 28px;">
          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.18;font-weight:700;letter-spacing:-0.025em;color:#0a0a0b;">You're subscribed.</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#4a4a52;">Thanks for subscribing to Sur9e release notes. We'll email occasionally when there's something worth your time. No spam, it's a promise.</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#4a4a52;">Sur9e is the free, self-hosted job-hunt copilot that runs inside your AI coding agent. Release notes are how you'll hear what's new and what's next.</p>
          <p style="margin:14px 0 0;font-size:13.5px;line-height:1.6;color:#7a7a82;">Star us on <a href="https://github.com/arspesk/sur9e" style="color:#c9430f;text-decoration:none;">GitHub</a>.</p>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#9a9a9a;">
        You're getting this because you subscribed at sur9e.com.<br>
        <a href="${unsubscribeUrl}" style="color:#7a7a82;text-decoration:underline;">Unsubscribe</a> &middot; <a href="mailto:hello@sur9e.com" style="color:#9a9a9a;text-decoration:none;">hello@sur9e.com</a> &middot; &copy; 2026 Sur9e${POSTAL_ADDRESS ? `<br>${POSTAL_ADDRESS}` : ''}
      </p>
    </td></tr>
  </table>
</body></html>`;

const text = [
  "You're subscribed.",
  '',
  "Thanks for subscribing to Sur9e release notes. We'll email occasionally when there's something worth your time. No spam, it's a promise.",
  '',
  "Sur9e is the free, self-hosted job-hunt copilot that runs inside your AI coding agent. Release notes are how you'll hear what's new and what's next.",
  '',
  'Star us on GitHub: https://github.com/arspesk/sur9e',
  '',
  '— Sur9e · Know which jobs are worth your time.',
  '',
  'You subscribed at sur9e.com.',
  `Unsubscribe: ${unsubscribeUrl}`,
  ...(POSTAL_ADDRESS ? ['', POSTAL_ADDRESS] : []),
].join('\n');

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${env.RESEND_API_KEY}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Sur9e <noreply@send.sur9e.com>',
    reply_to: 'hello@sur9e.com',
    to: [email],
    subject: "You're subscribed to Sur9e release notes",
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }),
});
console.log('Resend response:', res.status, await res.text());
