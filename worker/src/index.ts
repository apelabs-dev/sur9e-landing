import postgres from 'postgres';

export interface Env {
  SUBSCRIBE_DB: Hyperdrive;
  RESEND_API_KEY: string;
  BASE_URL: string;
  UNSUBSCRIBE_SECRET: string;
  // Where to send "new subscriber" admin pings. Optional — if unset, pings are skipped.
  ADMIN_NOTIFY_EMAIL?: string;
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

// CAN-SPAM (US) and most anti-spam laws require a valid physical postal address in
// commercial/marketing email. Leave EMPTY until you have a real address (a PO box or
// CMRA mailbox) — the footer line is conditionally hidden while empty, so no
// placeholder ever reaches a recipient. MUST be set before the first broadcast send.
const POSTAL_ADDRESS = '';

function welcomeEmailHtml(unsubscribeUrl: string): string {
  // Light theme — designed to look correct in every client without fighting
  // their dark/light auto-theming. Inline styles only; <table> layout for
  // Outlook compat. Single opt-in: no confirmation step, just a welcome with
  // a clear provenance line + prominent unsubscribe.
  return `<!doctype html>
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
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#4a4a52;">Sur9e is the free, self-hosted job-hunt copilot that runs inside your AI coding agent. It scores roles against your real CV before you apply, all on your machine.</p>
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
}

function welcomeEmailText(unsubscribeUrl: string): string {
  return [
    "You're subscribed.",
    '',
    "Thanks for subscribing to Sur9e release notes. We'll email occasionally when there's something worth your time. No spam, it's a promise.",
    '',
    "Sur9e is the free, self-hosted job-hunt copilot that runs inside your AI coding agent. It scores roles against your real CV before you apply, all on your machine.",
    '',
    'Star us on GitHub: https://github.com/arspesk/sur9e',
    '',
    '— Sur9e · Know which jobs are worth your time.',
    '',
    'You subscribed at sur9e.com.',
    `Unsubscribe: ${unsubscribeUrl}`,
    ...(POSTAL_ADDRESS ? ['', POSTAL_ADDRESS] : []),
  ].join('\n');
}

// Prod hosts always use the canonical configured BASE_URL; every other host
// (staging, *.pages.dev preview, `wrangler dev` localhost) self-hosts the link
// so it resolves on the same environment the signup came through — otherwise a
// stage/dev signup mails a sur9e.com link that 404s until prod is deployed.
const PROD_HOSTS = new Set(['sur9e.com', 'www.sur9e.com']);
function resolveBaseUrl(req: Request, env: Env): string {
  const u = new URL(req.url);
  return PROD_HOSTS.has(u.host) ? env.BASE_URL : u.origin;
}

async function buildUnsubscribeUrl(req: Request, env: Env, email: string): Promise<string> {
  const token = await hmacHex(env.UNSUBSCRIBE_SECRET, `unsub:${email}`);
  const e = encodeURIComponent(email);
  return `${resolveBaseUrl(req, env)}/api/subscribe/unsubscribe?e=${e}&t=${token}`;
}

async function sendWelcomeEmail(req: Request, env: Env, email: string): Promise<void> {
  const unsubscribeUrl = await buildUnsubscribeUrl(req, env, email);

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
      text: welcomeEmailText(unsubscribeUrl),
      html: welcomeEmailHtml(unsubscribeUrl),
      // RFC 8058 one-click unsubscribe — required by Gmail/Yahoo for bulk
      // and strongly recommended for transactional. The header URL must
      // accept POST with body `List-Unsubscribe=One-Click`.
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

async function sendSignupNotification(
  env: Env,
  email: string,
  source: string,
  action: 'new' | 'reenroll',
): Promise<void> {
  if (!env.ADMIN_NOTIFY_EMAIL) return;

  const label = action === 'new' ? 'New subscriber' : 'Re-subscribe (was inactive)';
  const text = [
    label,
    '',
    `Email:  ${email}`,
    `Source: ${source}`,
    `Time:   ${new Date().toISOString()}`,
    '',
    'Sent automatically by sur9e-subscribe Worker.',
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Sur9e Subscribers <noreply@send.sur9e.com>',
      to: [env.ADMIN_NOTIFY_EMAIL],
      subject: `${label}: ${email}`,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`Resend admin-notify ${res.status}: ${body}`);
  }
}

interface SignupBody {
  email?: unknown;
  source?: unknown;
}

async function handleSignup(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

  // Single opt-in: submitting the form IS the consent, so a successful signup
  // is active immediately (confirmed_at = NOW()). Three outcomes:
  //   'new'        — first-ever signup; insert active, send welcome
  //   'reenroll'   — an existing INACTIVE row (previously unsubscribed, OR a
  //                  legacy double-opt-in row that never confirmed) opting in
  //                  now; reactivate + stamp confirmed_at, send welcome
  //   'duplicate'  — already active (confirmed and not unsubscribed); no re-send
  //
  // We never proactively email legacy unconfirmed rows — only when they
  // themselves resubmit the form here (fresh consent).
  let action: 'new' | 'reenroll' | 'duplicate' = 'duplicate';
  // sql is constructed inside the try so a missing/broken Hyperdrive binding
  // surfaces as a clean CORS+JSON 500 rather than an unhandled throw.
  let sql: ReturnType<typeof postgres> | undefined;
  try {
    sql = postgres(env.SUBSCRIBE_DB.connectionString, { max: 5, fetch_types: false });
    const inserted = await sql<{ id: number }[]>`
      INSERT INTO subscribers (email, source, confirmed_at)
      VALUES (${email}, ${source}, NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    if (inserted.length > 0) {
      action = 'new';
    } else {
      // Email already exists. Activate it only if it is currently INACTIVE —
      // i.e. previously unsubscribed, or never confirmed (legacy opt-in row).
      const reenrolled = await sql<{ id: number }[]>`
        UPDATE subscribers
        SET unsubscribed_at = NULL, confirmed_at = NOW(), source = ${source}
        WHERE email = ${email}
          AND (unsubscribed_at IS NOT NULL OR confirmed_at IS NULL)
        RETURNING id
      `;
      if (reenrolled.length > 0) action = 'reenroll';
    }
  } catch (err) {
    console.error('DB upsert failed', err);
    return jsonResponse(req, { error: 'Server error' }, 500);
  } finally {
    if (sql) await sql.end({ timeout: 5 });
  }

  if (action === 'duplicate') {
    return jsonResponse(req, { ok: true, duplicate: true });
  }

  // Run both sends in the background so the API response returns fast.
  // ctx.waitUntil keeps the Worker alive until the work finishes; failures
  // are logged and don't affect the user-facing response.
  ctx.waitUntil(
    (async () => {
      const settled = await Promise.allSettled([
        sendWelcomeEmail(req, env, email),
        sendSignupNotification(env, email, source, action as 'new' | 'reenroll'),
      ]);
      for (const r of settled) {
        if (r.status === 'rejected') console.error('Background email failed', r.reason);
      }
    })(),
  );

  return jsonResponse(req, { ok: true, reenrolled: action === 'reenroll' });
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
<title>${opts.title} — Sur9e</title>
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
/* faint CSS starfield — ties these pages to the landing's dark sections (the
   subscribe flow ends here). Static, no JS, renders even with scripting off. */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    radial-gradient(1.5px 1.5px at 12% 18%, rgba(255,160,120,0.38), transparent 60%),
    radial-gradient(1px 1px at 78% 12%, rgba(255,255,255,0.24), transparent 60%),
    radial-gradient(1.5px 1.5px at 63% 72%, rgba(255,160,120,0.30), transparent 60%),
    radial-gradient(1px 1px at 31% 86%, rgba(255,255,255,0.20), transparent 60%),
    radial-gradient(1px 1px at 92% 56%, rgba(255,160,120,0.26), transparent 60%),
    radial-gradient(1px 1px at 46% 8%, rgba(255,255,255,0.18), transparent 60%),
    radial-gradient(1px 1px at 8% 62%, rgba(255,255,255,0.16), transparent 60%),
    radial-gradient(1.5px 1.5px at 88% 90%, rgba(255,160,120,0.22), transparent 60%),
    radial-gradient(1px 1px at 22% 44%, rgba(255,255,255,0.14), transparent 60%),
    radial-gradient(1px 1px at 70% 36%, rgba(255,255,255,0.14), transparent 60%);
}
main { position: relative; z-index: 1; width: 100%; max-width: 480px; text-align: center; }
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
  <img class="wordmark" src="https://sur9e.com/assets/sur9e-wordmark-email-v2.png" alt="Sur9e" width="180" height="40">
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

  const expected = await hmacHex(env.UNSUBSCRIBE_SECRET, `unsub:${email}`);
  if (!constantTimeEqual(token, expected)) return invalid();

  // sql is constructed inside the try so a missing/broken Hyperdrive binding
  // surfaces as a handled error rather than an unhandled throw.
  let sql: ReturnType<typeof postgres> | undefined;
  try {
    sql = postgres(env.SUBSCRIBE_DB.connectionString, { max: 5, fetch_types: false });
    // Soft-delete: keep the row, mark when they unsubscribed. handleSignup
    // checks this column so a re-signup doesn't auto-re-send unless they
    // explicitly resubmit the form (opt-in renewed).
    await sql`
      UPDATE subscribers
      SET unsubscribed_at = NOW()
      WHERE email = ${email} AND unsubscribed_at IS NULL
    `;
  } catch (err) {
    console.error('Unsubscribe UPDATE failed', err);
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
  } finally {
    if (sql) await sql.end({ timeout: 5 });
  }

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
    body: "We've taken your email off the Sur9e release-notes list. Changed your mind? You can resubscribe anytime at sur9e.com.",
    cta: { text: 'Back to sur9e.com', href: 'https://sur9e.com' },
  });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    // New subscribe endpoint
    if (url.pathname === '/api/subscribe' && req.method === 'POST') {
      return handleSignup(req, env, ctx);
    }

    if (
      url.pathname === '/api/subscribe/unsubscribe' &&
      (req.method === 'GET' || req.method === 'POST')
    ) {
      return handleUnsubscribe(req, env);
    }

    // ── Legacy /api/waitlist shim ──────────────────────────────────────────
    // The worker rename creates a new CF Worker, but it still owns the same
    // sur9e.com/api/* route — so it must keep serving the old paths that live
    // in already-sent emails. The unsubscribe alias is a compliance must
    // (RFC 8058 one-click links can't 404). It works for GET + POST and reuses
    // the same handler, which means UNSUBSCRIBE_SECRET must equal the OLD
    // CONFIRM_SECRET value for those legacy tokens to verify.
    // The signup alias covers any stale cached frontend still posting the old
    // path during cutover. Old /api/waitlist/confirm links are intentionally
    // gone (single opt-in) and will 404.
    if (url.pathname === '/api/waitlist' && req.method === 'POST') {
      return handleSignup(req, env, ctx);
    }
    if (
      url.pathname === '/api/waitlist/unsubscribe' &&
      (req.method === 'GET' || req.method === 'POST')
    ) {
      return handleUnsubscribe(req, env);
    }

    return new Response('Not found', {
      status: 404,
      headers: corsHeaders(req),
    });
  },
} satisfies ExportedHandler<Env>;
