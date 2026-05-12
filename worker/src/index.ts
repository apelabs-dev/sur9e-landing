import postgres from 'postgres';

export interface Env {
  WAITLIST_DB: Hyperdrive;
  RESEND_API_KEY: string;
  CONFIRM_BASE_URL: string;
  CONFIRM_SECRET: string;
}

const ALLOWED_ORIGINS = new Set(['https://sur9e.com', 'https://www.sur9e.com']);

// Pages preview deployments live at <hash>.sur9e-landing.pages.dev — let them
// hit the API too so we can smoke-test before promoting to production.
const ALLOWED_ORIGIN_SUFFIX = '.sur9e-landing.pages.dev';

function chooseOrigin(req: Request): string {
  const origin = req.headers.get('origin') ?? '';
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (origin.endsWith(ALLOWED_ORIGIN_SUFFIX)) return origin;
  return 'https://sur9e.com';
}

function corsHeaders(req: Request): Record<string, string> {
  return {
    'access-control-allow-origin': chooseOrigin(req),
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validEmail(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0 && s.length <= 254 && EMAIL_RE.test(s);
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'content-type': 'application/json' },
  });
}

interface EmailUrls {
  confirmUrl: string;
  unsubscribeUrl: string;
}

function welcomeEmailHtml({ confirmUrl, unsubscribeUrl }: EmailUrls): string {
  // Inline styles only — email clients strip <style> blocks. Layout uses
  // <table> for Outlook compat; modern clients render the same.
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to the sur9e waitlist</title></head>
<body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#fff8ef;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0b;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#131110;border:1px solid rgba(255,255,255,0.08);border-radius:18px;">
        <tr><td style="padding:32px 32px 0;">
          <img src="https://sur9e.com/assets/sur9e-wordmark-white.png" width="160" height="35" alt="sur9e" style="display:block;border:0;outline:none;text-decoration:none;color:#ff5a1f;font-size:26px;font-weight:700;letter-spacing:-0.025em;line-height:1;">
          <div style="margin-top:10px;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#888;">Know which jobs are worth your time.</div>
        </td></tr>
        <tr><td style="padding:30px 32px 4px;">
          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.18;font-weight:700;letter-spacing:-0.025em;color:#fff8ef;">You're on the list.</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#cccccc;">Thanks for joining. Sur9e ships at <a href="https://sur9e.com" style="color:#ff5a1f;text-decoration:none;">sur9e.com</a> in <strong style="color:#fff8ef;">Q4 2026</strong> &mdash; we'll email you the moment it's live.</p>
          <p style="margin:0 0 26px;font-size:14px;line-height:1.6;color:#9a9a9a;">One last step: confirm your email so we know it's you.</p>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 30px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
            <td bgcolor="#c9430f" style="border-radius:999px;background:#c9430f;">
              <a href="${confirmUrl}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">Confirm your email &rarr;</a>
            </td>
          </tr></table>
          <p style="margin:18px 0 0;font-size:11px;line-height:1.5;color:#666;">Or paste this link into your browser:<br><a href="${confirmUrl}" style="color:#888;word-break:break-all;">${confirmUrl}</a></p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;color:#888;">
            <span style="color:#34c759;">&#10003;</span> Free to start &nbsp;&middot;&nbsp;
            <span style="color:#34c759;">&#10003;</span> No spam, ever
          </p>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#555;">
        You're getting this because you joined the waitlist at sur9e.com.<br>
        <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a> &middot; <a href="mailto:hello@send.sur9e.com" style="color:#555;text-decoration:none;">hello@send.sur9e.com</a> &middot; &copy; 2026 Sur9e
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function welcomeEmailText({ confirmUrl, unsubscribeUrl }: EmailUrls): string {
  return [
    "You're on the list.",
    '',
    "Thanks for joining. Sur9e ships at sur9e.com in Q4 2026 — we'll email you the moment it's live.",
    '',
    "One last step: confirm your email so we know it's you.",
    '',
    `Confirm your email: ${confirmUrl}`,
    '',
    '— sur9e · Know which jobs are worth your time.',
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');
}

function buildSignupUrls(
  env: Env,
  email: string,
  confirmToken: string,
  unsubscribeToken: string,
): EmailUrls {
  const base = env.CONFIRM_BASE_URL;
  const e = encodeURIComponent(email);
  return {
    confirmUrl: `${base}/api/waitlist/confirm?e=${e}&t=${confirmToken}`,
    unsubscribeUrl: `${base}/api/waitlist/unsubscribe?e=${e}&t=${unsubscribeToken}`,
  };
}

async function sendConfirmationEmail(env: Env, email: string): Promise<void> {
  const [confirmToken, unsubscribeToken] = await Promise.all([
    hmacHex(env.CONFIRM_SECRET, email),
    hmacHex(env.CONFIRM_SECRET, `unsub:${email}`),
  ]);
  const urls = buildSignupUrls(env, email, confirmToken, unsubscribeToken);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Sur9e <hello@send.sur9e.com>',
      reply_to: 'hello@send.sur9e.com',
      to: [email],
      subject: 'Welcome to the sur9e waitlist',
      text: welcomeEmailText(urls),
      html: welcomeEmailHtml(urls),
      // RFC 8058 one-click unsubscribe — required by Gmail/Yahoo for bulk
      // and strongly recommended for transactional. The header URL must
      // accept POST with body `List-Unsubscribe=One-Click`.
      headers: {
        'List-Unsubscribe': `<${urls.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

interface SignupBody {
  email?: unknown;
  source?: unknown;
}

async function handleSignup(req: Request, env: Env): Promise<Response> {
  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return jsonResponse(req, { error: 'Invalid JSON body' }, 400);
  }

  const email = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase();
  if (!validEmail(email)) {
    return jsonResponse(req, { error: 'Invalid email' }, 400);
  }

  const sourceRaw = typeof body.source === 'string' ? body.source : 'landing';
  const source = sourceRaw.length <= 32 ? sourceRaw : 'landing';

  const sql = postgres(env.WAITLIST_DB.connectionString, {
    max: 5,
    fetch_types: false,
  });

  let isNew = false;
  try {
    const rows = await sql<{ id: number }[]>`
      INSERT INTO waitlist (email, source)
      VALUES (${email}, ${source})
      RETURNING id
    `;
    isNew = rows.length > 0;
  } catch (err) {
    // Postgres unique_violation = 23505. Treat as success, don't re-send email.
    const code = (err as { code?: string } | null)?.code;
    if (code === '23505') {
      await sql.end({ timeout: 5 });
      return jsonResponse(req, { ok: true, duplicate: true });
    }
    console.error('DB insert failed', err);
    await sql.end({ timeout: 5 });
    return jsonResponse(req, { error: 'Server error' }, 500);
  }

  // Send email best-effort. If it fails, the row is still there — the user
  // can re-submit (we'll detect duplicate) or we can backfill manually.
  if (isNew) {
    try {
      await sendConfirmationEmail(env, email);
    } catch (err) {
      console.error('Resend send failed', err);
    }
  }

  await sql.end({ timeout: 5 });
  return jsonResponse(req, { ok: true });
}

interface BrandedPageOpts {
  title: string;
  icon: string;
  iconColor: string;
  heading: string;
  body: string;
  cta?: { text: string; href: string };
  status?: number;
}

function brandedPage(opts: BrandedPageOpts): Response {
  const status = opts.status ?? 200;
  const ctaHtml = opts.cta
    ? `<a href="${opts.cta.href}" style="display:inline-block;margin-top:6px;padding:12px 24px;border-radius:999px;background:#c9430f;color:#fff;text-decoration:none;font-weight:600;font-size:14.5px;">${opts.cta.text}</a>`
    : '';
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opts.title} — sur9e</title>
<link rel="icon" href="https://sur9e.com/favicon.svg">
<style>
:root { color-scheme: dark; }
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(255,106,42,0.10), transparent 70%),
    linear-gradient(180deg, #0a0a0b 0%, #131110 60%, #1a1411 100%);
  color: #fff8ef;
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  display: grid;
  place-items: center;
  padding: 32px 24px;
}
main { width: 100%; max-width: 480px; text-align: center; }
.wordmark { display: inline-block; width: 180px; height: auto; }
.eyebrow { margin-top: 6px; font-family: 'IBM Plex Mono', Menlo, Consolas, monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #888; }
.card {
  margin-top: 36px;
  padding: 40px 28px 36px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 22px;
  background: rgba(255,255,255,0.045);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 30px 80px -40px rgba(0,0,0,0.86);
}
.icon {
  display: inline-grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 999px;
  background: ${opts.iconColor};
  margin-bottom: 18px;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}
h1 { margin: 0 0 12px; font-size: 26px; line-height: 1.15; font-weight: 700; letter-spacing: -0.025em; }
p { margin: 0 0 22px; font-size: 15px; line-height: 1.65; color: #cccccc; }
.footer { margin-top: 22px; font-family: 'IBM Plex Mono', Menlo, Consolas, monospace; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: #666; }
.footer a { color: #888; text-decoration: none; }
</style>
</head><body>
<main>
  <img class="wordmark" src="https://sur9e.com/assets/sur9e-wordmark-white.png" alt="sur9e" width="180" height="40">
  <div class="eyebrow">Know which jobs are worth your time.</div>
  <section class="card">
    <div class="icon" aria-hidden="true">${opts.icon}</div>
    <h1>${opts.heading}</h1>
    <p>${opts.body}</p>
    ${ctaHtml}
  </section>
  <p class="footer">&copy; 2026 Sur9e &middot; <a href="https://sur9e.com">sur9e.com</a></p>
</main>
</body></html>`;
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

async function handleConfirm(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const email = (url.searchParams.get('e') || '').trim().toLowerCase();
  const token = url.searchParams.get('t') || '';

  if (!validEmail(email) || !token) {
    return brandedPage({
      title: 'Invalid link',
      icon: '!',
      iconColor: '#3a3a3d',
      heading: 'Link looks broken',
      body: "We couldn't verify that confirmation link. If you copied it from your email and it's still not working, try submitting your email again.",
      cta: { text: 'Back to sur9e.com', href: 'https://sur9e.com' },
      status: 400,
    });
  }

  const expected = await hmacHex(env.CONFIRM_SECRET, email);
  if (!constantTimeEqual(token, expected)) {
    return brandedPage({
      title: 'Invalid link',
      icon: '!',
      iconColor: '#3a3a3d',
      heading: 'Link looks broken',
      body: "We couldn't verify that confirmation link. If you copied it from your email and it's still not working, try submitting your email again.",
      cta: { text: 'Back to sur9e.com', href: 'https://sur9e.com' },
      status: 400,
    });
  }

  const sql = postgres(env.WAITLIST_DB.connectionString, { max: 5, fetch_types: false });
  try {
    await sql`
      UPDATE waitlist
      SET confirmed_at = NOW()
      WHERE email = ${email} AND confirmed_at IS NULL
    `;
  } catch (err) {
    console.error('Confirm UPDATE failed', err);
    await sql.end({ timeout: 5 });
    return brandedPage({
      title: 'Server error',
      icon: '!',
      iconColor: '#3a3a3d',
      heading: 'Something went wrong',
      body: 'We hit an error confirming your email. Please try the link again in a minute.',
      cta: { text: 'Back to sur9e.com', href: 'https://sur9e.com' },
      status: 500,
    });
  }
  await sql.end({ timeout: 5 });

  return brandedPage({
    title: 'Confirmed',
    icon: '&#10003;',
    iconColor: 'linear-gradient(135deg,#c9430f,#ff6a2a)',
    heading: "You're confirmed.",
    body: "Welcome to the sur9e waitlist. We'll email you the moment we ship at sur9e.com in Q4 2026.",
    cta: { text: 'Back to sur9e.com', href: 'https://sur9e.com' },
  });
}

async function handleUnsubscribe(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const email = (url.searchParams.get('e') || '').trim().toLowerCase();
  const token = url.searchParams.get('t') || '';
  const isOneClickPost = req.method === 'POST';

  const invalid = (): Response => {
    if (isOneClickPost) return new Response('Bad request', { status: 400 });
    return brandedPage({
      title: 'Invalid link',
      icon: '!',
      iconColor: '#3a3a3d',
      heading: 'Link looks broken',
      body: "We couldn't verify that unsubscribe link. If you keep getting messages you don't want, just reply to one — we'll get it.",
      cta: { text: 'Back to sur9e.com', href: 'https://sur9e.com' },
      status: 400,
    });
  };

  if (!validEmail(email) || !token) return invalid();

  const expected = await hmacHex(env.CONFIRM_SECRET, `unsub:${email}`);
  if (!constantTimeEqual(token, expected)) return invalid();

  const sql = postgres(env.WAITLIST_DB.connectionString, { max: 5, fetch_types: false });
  try {
    await sql`DELETE FROM waitlist WHERE email = ${email}`;
  } catch (err) {
    console.error('Unsubscribe DELETE failed', err);
    await sql.end({ timeout: 5 });
    if (isOneClickPost) return new Response('Server error', { status: 500 });
    return brandedPage({
      title: 'Server error',
      icon: '!',
      iconColor: '#3a3a3d',
      heading: 'Something went wrong',
      body: 'We hit an error processing your unsubscribe. Please try the link again in a minute.',
      cta: { text: 'Back to sur9e.com', href: 'https://sur9e.com' },
      status: 500,
    });
  }
  await sql.end({ timeout: 5 });

  if (isOneClickPost) {
    return new Response('Unsubscribed', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return brandedPage({
    title: 'Unsubscribed',
    icon: '&#8722;',
    iconColor: '#3a3a3d',
    heading: "You've been removed.",
    body: "We've taken your email off the sur9e waitlist. Changed your mind? You can rejoin anytime at sur9e.com.",
    cta: { text: 'Back to sur9e.com', href: 'https://sur9e.com' },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    if (url.pathname === '/api/waitlist' && req.method === 'POST') {
      return handleSignup(req, env);
    }

    if (url.pathname === '/api/waitlist/confirm' && req.method === 'GET') {
      return handleConfirm(req, env);
    }

    if (
      url.pathname === '/api/waitlist/unsubscribe' &&
      (req.method === 'GET' || req.method === 'POST')
    ) {
      return handleUnsubscribe(req, env);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders(req) });
  },
} satisfies ExportedHandler<Env>;
