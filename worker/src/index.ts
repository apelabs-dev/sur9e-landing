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

async function sendConfirmationEmail(env: Env, email: string): Promise<void> {
  const token = await hmacHex(env.CONFIRM_SECRET, email);
  const confirmUrl = `${env.CONFIRM_BASE_URL}/api/waitlist/confirm?e=${encodeURIComponent(email)}&t=${token}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Sur9e <hello@sur9e.com>',
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

async function handleConfirm(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const email = (url.searchParams.get('e') || '').trim().toLowerCase();
  const token = url.searchParams.get('t') || '';

  if (!validEmail(email) || !token) {
    return new Response('Invalid confirmation link', { status: 400 });
  }

  const expected = await hmacHex(env.CONFIRM_SECRET, email);
  if (!constantTimeEqual(token, expected)) {
    return new Response('Invalid confirmation link', { status: 400 });
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
    return new Response('Server error', { status: 500 });
  }
  await sql.end({ timeout: 5 });

  return new Response(
    `<!doctype html>
<meta charset="utf-8">
<title>Confirmed — sur9e</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0b; color: #fff8ef; display: grid; place-items: center; min-height: 100vh; margin: 0; text-align: center; padding: 24px; }
  h1 { color: #ff5a1f; margin: 0 0 12px; letter-spacing: -0.025em; }
  p { color: #a0a0a0; max-width: 440px; line-height: 1.6; }
  a { color: #ff5a1f; }
</style>
<h1>You're confirmed.</h1>
<p>Welcome to the sur9e waitlist. We'll email you the moment we ship at sur9e.com on September 24, 2026.</p>
<p><a href="https://sur9e.com">← back to sur9e.com</a></p>`,
    {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    },
  );
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

    return new Response('Not found', { status: 404, headers: corsHeaders(req) });
  },
} satisfies ExportedHandler<Env>;
