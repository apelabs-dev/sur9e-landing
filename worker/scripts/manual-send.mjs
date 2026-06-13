// One-shot: send the welcome email manually via Resend, bypassing the
// Worker's INSERT path. Use when a row already exists in the DB and you
// want to (re-)deliver the confirmation without deleting + re-submitting.
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
  console.error('Usage: node scripts/manual-send.mjs <email>');
  process.exit(1);
}

const e = encodeURIComponent(email);
const confirmToken = createHmac('sha256', env.CONFIRM_SECRET).update(email).digest('hex');
const unsubscribeToken = createHmac('sha256', env.CONFIRM_SECRET)
  .update(`unsub:${email}`)
  .digest('hex');
const confirmUrl = `https://sur9e.com/api/waitlist/confirm?e=${e}&t=${confirmToken}`;
const unsubscribeUrl = `https://sur9e.com/api/waitlist/unsubscribe?e=${e}&t=${unsubscribeToken}`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>Welcome to the sur9e waitlist</title></head>
<body style="margin:0;padding:0;background:#f5f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f1;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:18px;">
        <tr><td style="padding:32px 32px 0;">
          <img src="https://sur9e.com/assets/sur9e-wordmark-email-light.png" width="160" height="35" alt="sur9e" style="display:block;border:0;outline:none;text-decoration:none;color:#0a0a0b;font-size:26px;font-weight:700;letter-spacing:-0.025em;line-height:1;">
          <div style="margin-top:10px;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#ff5a1f;">Know which jobs are worth your time.</div>
        </td></tr>
        <tr><td style="padding:30px 32px 4px;">
          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.18;font-weight:700;letter-spacing:-0.025em;color:#0a0a0b;">You're on the list.</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#4a4a52;">Thanks for joining. We'll send release notes occasionally. No spam, no gates.</p>
          <p style="margin:0 0 26px;font-size:14px;line-height:1.6;color:#7a7a82;">One last step: confirm your email so we know it's you.</p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 30px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
            <td bgcolor="#c9430f" style="border-radius:999px;background:#c9430f;">
              <a href="${confirmUrl}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">Confirm your email &rarr;</a>
            </td>
          </tr></table>
          <p style="margin:18px 0 0;font-size:11px;line-height:1.5;color:#9a9a9a;">Or paste this link into your browser:<br><a href="${confirmUrl}" style="color:#7a7a82;word-break:break-all;">${confirmUrl}</a></p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid rgba(0,0,0,0.06);">
          <p style="margin:0;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:#7a7a82;">
            <span style="color:#1ea34c;">&#10003;</span> Free to start &nbsp;&middot;&nbsp;
            <span style="color:#1ea34c;">&#10003;</span> No spam, ever
          </p>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#9a9a9a;">
        You're getting this because you joined the waitlist at sur9e.com.<br>
        <a href="${unsubscribeUrl}" style="color:#7a7a82;text-decoration:underline;">Unsubscribe</a> &middot; <a href="mailto:hello@sur9e.com" style="color:#9a9a9a;text-decoration:none;">hello@sur9e.com</a> &middot; &copy; 2026 Sur9e
      </p>
    </td></tr>
  </table>
</body></html>`;

const text = [
  "You're on the list.",
  '',
  "Thanks for joining. We'll send release notes occasionally. No spam, no gates.",
  '',
  "One last step: confirm your email so we know it's you.",
  '',
  `Confirm your email: ${confirmUrl}`,
  '',
  '— sur9e · Know which jobs are worth your time.',
  '',
  `Unsubscribe: ${unsubscribeUrl}`,
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
    subject: 'Welcome to the sur9e waitlist',
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }),
});
console.log('Resend response:', res.status, await res.text());
