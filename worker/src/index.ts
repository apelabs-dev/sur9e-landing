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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>You're subscribed to sur9e release notes</title></head>
<body style="margin:0;padding:0;background:#f5f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0b;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;">You're on the sur9e release-notes list. Occasional updates, nothing else.&#8203;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f4f1;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border:1px solid rgba(0,0,0,0.08);border-radius:18px;">
        <tr><td style="padding:32px 32px 0;">
          <img src="https://sur9e.com/assets/sur9e-wordmark-email-light.png" width="160" height="35" alt="sur9e" style="display:block;border:0;outline:none;text-decoration:none;color:#0a0a0b;font-size:26px;font-weight:700;letter-spacing:-0.025em;line-height:1;">
          <div style="margin-top:10px;font-family:'IBM Plex Mono',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#ff5a1f;">Know which jobs are worth your time.</div>
        </td></tr>
        <tr><td style="padding:30px 32px 28px;">
          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.18;font-weight:700;letter-spacing:-0.025em;color:#0a0a0b;">You're subscribed.</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#4a4a52;">Thanks for subscribing to sur9e release notes. We'll email occasionally when there's something worth your time. No spam, it's a promise.</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#4a4a52;">Sur9e is the free, self-hosted job-hunt copilot that runs inside your AI coding agent. It scores roles against your real CV before you apply, all on your machine.</p>
          <p style="margin:14px 0 0;font-size:13.5px;line-height:1.6;color:#7a7a82;">Star us on <a href="https://github.com/apelabs-dev/sur9e" style="color:#c9430f;text-decoration:none;">GitHub</a>.</p>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:11px;line-height:1.6;color:#9a9a9a;">
        You're getting this because you subscribed at sur9e.com.<br>
        <a href="${unsubscribeUrl}" style="color:#7a7a82;text-decoration:underline;">Unsubscribe</a> &middot; <a href="mailto:hello@sur9e.com" style="color:#9a9a9a;text-decoration:none;">hello@sur9e.com</a> &middot; &copy; 2026 sur9e${POSTAL_ADDRESS ? `<br>${POSTAL_ADDRESS}` : ''}
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function welcomeEmailText(unsubscribeUrl: string): string {
  return [
    "You're subscribed.",
    '',
    "Thanks for subscribing to sur9e release notes. We'll email occasionally when there's something worth your time. No spam, it's a promise.",
    '',
    'Sur9e is the free, self-hosted job-hunt copilot that runs inside your AI coding agent. It scores roles against your real CV before you apply, all on your machine.',
    '',
    'Star us on GitHub: https://github.com/apelabs-dev/sur9e',
    '',
    '— sur9e · Know which jobs are worth your time.',
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
      from: 'sur9e <noreply@send.sur9e.com>',
      reply_to: 'hello@sur9e.com',
      to: [email],
      subject: "You're subscribed to sur9e release notes",
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
      from: 'sur9e Subscribers <noreply@send.sur9e.com>',
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
/* canvas starfield — same treatment as the landing's dark sections (hero/§3/§6):
   a real, dense twinkling field, painted once + frozen under reduced motion. */
.stars { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
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
<canvas class="stars" aria-hidden="true"></canvas>
<main>
  <svg class="wordmark" viewBox="0 0 1063 234" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="sur9e">
    <path d="M683.049 233.502C672.897 232.452 656.98 229.783 648.652 228.091C641.808 226.72 641.217 226.392 640.77 223.729L640.323 220.824L655.641 216.541C677.198 210.481 702.786 197.391 721.727 188.504C771.574 164.992 786.489 145.113 786.489 131.865C786.489 127.418 783.373 122.25 778.658 118.617C776.301 116.839 769.734 113.206 764.179 110.537C758.623 107.867 752.391 104.555 750.376 103.263C742.21 97.7673 741.198 85.9751 748.189 77.0818C750.799 73.7698 759.635 67.4671 773.362 59.0657C786.913 50.8217 793.063 46.3029 799.793 39.6722L805.096 34.4189L797.265 31.5135L789.434 28.5228V25.4535V22.3841L801.891 16.8881C808.711 13.8974 819.903 8.80804 826.723 5.73867C834.212 2.26268 840.191 0 841.872 0H844.564V4.28269C844.482 6.54536 843.806 12.284 842.884 16.9668C842.043 21.6561 839.856 33.6909 838.169 43.8697L834.971 62.2138H831.855C828.91 62.2138 828.486 61.8924 825.965 57.6097C820.997 49.2083 821.673 49.3657 817.375 55.1043C811.991 62.4564 801.72 72.3138 791.532 79.9085C786.646 83.6272 782.355 87.1819 782.02 87.8246C780.756 89.8446 783.872 92.0286 796.165 97.7607C810.31 104.306 817.628 109.881 824.031 118.846C831.773 129.832 835.059 141.794 834.219 156.499C833.126 175.728 826.224 189.868 811.239 203.601C795.748 217.82 784.774 226.95 750.71 231.96C740.677 233.416 733.793 233.738 714.056 233.98C700.745 234.059 686.766 233.902 683.04 233.495L683.049 233.502Z" fill="#FF5A1F"/>
    <path d="M300.904 233.179C262.954 227.012 239.788 205.796 231.569 169.743L229.297 159.606L228.95 88.8582L228.687 18H257.538H286.482V76.8379C286.482 141.105 286.745 144.142 291.557 155.534C296.632 167.343 306.334 175.283 319.01 178.006C330.466 180.406 345.065 176.021 353.022 167.657C354.768 165.884 357.394 161.591 358.877 158.249C364.3 146.127 364.3 145.915 364.3 78.9332V18.0085H392.633H420.874L421.577 73.1902C422.45 148.332 421.754 161.812 415.984 179.685C407.062 207.068 386.515 225.146 356.698 231.83C347.606 233.917 310.621 234.757 300.912 233.188L300.904 233.179Z" fill="#f4f4f5"/>
    <path d="M77.1941 232.731C48.2601 228.809 28.1616 220.035 15.8266 205.789C6.11626 194.535 1.84434 182.351 0.583256 162.842L0 152.728L30.4867 152.937L60.9734 153.247L61.5567 157.999C62.4315 163.99 64.2759 167.803 68.4532 172.035C76.3192 180.088 92.8237 184.32 112.922 183.39C129.915 182.56 138.262 179.778 143.314 173.376C146.908 168.834 147.295 166.563 145.253 162.742C141.178 155.409 134.479 153.448 97.3872 148.705C45.7301 141.993 29.2256 136.73 15.8266 122.686C6.69951 113.082 3.2 103.068 3.2 86.141C3.2 51.6577 25.3399 28.7386 65.9232 21.2051C96.2207 15.5235 139.72 17.5933 162.83 25.8476C177.884 31.3196 192.055 42.4649 197.691 53.518C201.671 61.1605 204.193 73.1354 204.193 83.7695V92.8533H174.093C150.786 92.8533 143.898 92.5432 143.606 91.6131C140.981 80.979 137.971 76.2275 131.176 72.6158C114.278 63.532 79.8109 65.7024 69.4227 76.437C65.0562 81.0795 65.4424 85.5209 70.6838 89.1326C74.7587 91.9231 83.2079 93.6745 107.098 96.465C134.093 99.5656 151.472 102.457 161.474 105.339C189.241 113.183 202.065 124.747 207.204 146.527C209.923 157.982 209.435 178.429 206.235 189.063C199.338 211.672 180.989 225.197 148.847 231.39C134.085 234.18 93.7931 234.901 77.1862 232.731H77.1941Z" fill="#f4f4f5"/>
    <path d="M939.264 232.385C917.445 228.127 898.633 218.052 885.157 203.196C869.549 186.056 861.882 164.658 860.528 134.332C858.883 99.2247 867.801 69.8341 886.905 48.2253C904.552 28.1763 930.441 18 964.09 18C985.909 18 1001.23 21.3218 1017.23 29.6349C1026.25 34.3057 1028.38 35.9666 1036.62 44.9035C1046.71 55.8132 1052.33 65.1548 1056.5 78.0375C1061.06 91.9571 1061.93 98.4996 1062.51 121.145L1063 142.645H991.726H920.358L921.908 148.15C927.143 167.263 940.335 179.412 958.95 182.321C968.742 183.881 976.306 182.532 985.909 177.439C993.473 173.393 1000.75 165.805 1002.79 159.785C1003.46 157.812 1004.53 156.05 1005.01 155.839C1005.6 155.628 1018.59 155.628 1034.01 155.94L1061.84 156.463V160.721C1061.84 167.988 1058.16 182.009 1053.89 190.845C1047.98 202.893 1037.21 214.317 1025.48 220.758C1015.29 226.264 1004.04 230.311 992.316 232.494C981.454 234.568 949.938 234.467 939.272 232.393L939.264 232.385ZM1003.65 96.4256C994.245 69.9437 966.995 59.2447 942.751 72.4308C934.124 77.1016 926.269 86.1397 922.585 95.3885L921.231 99.0223H962.925H1004.62L1003.65 96.4256Z" fill="#f4f4f5"/>
    <path d="M441.602 128.616C441.602 70.6063 441.894 23.241 442.383 23.241C442.769 23.1373 456.755 23.025 473.46 22.9213L503.765 22.7053V32.8143V42.9233L506.682 39.0956C510.955 33.35 521.637 25.7898 530.964 21.9623C538.635 18.8777 540.29 18.558 554.276 18.1347C571.856 17.599 576.713 18.4543 588.073 24.5197C603.028 32.2872 612.647 45.9127 617.503 66.3553C619.151 73.1638 619.639 79.3414 620.026 96.4748L620.609 117.98L590.596 117.764L560.583 117.444L559.999 106.264C559.321 94.3407 558.06 89.6578 553.59 83.9121C550.097 79.2291 542.324 75.3929 536.593 75.3929C525.91 75.3929 513.864 84.0158 509.008 95.2998C504.246 106.48 503.86 112.433 503.765 175.774V234H472.688H441.61V128.625L441.602 128.616Z" fill="#f4f4f5"/>
    <path d="M684.654 158.046C663.719 153.779 646.967 138.505 641.92 118.771C639.558 109.544 639.881 93.1837 642.461 83.7555C654.698 39.3197 711.177 10.3587 767.019 19.7789C778.62 21.7595 779.901 22.46 779.901 26.2281C779.901 30.0928 778.507 30.8898 760.683 37.5323C721.165 52.0168 695.933 70.7605 692.394 88.3207C690.782 95.9615 699.262 106.871 710.863 112.225C713.652 113.514 720.851 116.291 726.752 118.377C741.029 123.433 743.399 125.72 743.399 134.447C743.399 138.014 742.754 141.983 741.9 143.57C739.861 147.136 733.847 151.999 728.26 154.681C718.385 159.246 698.521 160.832 684.663 158.054L684.654 158.046Z" fill="#FF5A1F"/>
  </svg>
  <div class="eyebrow">Know which jobs are worth your time.</div>
  <section class="card">
    <div class="icon" aria-hidden="true">${opts.icon}</div>
    <h1>${opts.heading}</h1>
    <p>${opts.body}</p>
    ${ctaHtml}
  </section>
  <p class="footer">&copy; 2026 sur9e &middot; <a href="https://sur9e.com">sur9e.com</a></p>
</main>
<script>
(function(){
  var c=document.querySelector('.stars'); if(!c||!c.getContext) return;
  var ctx=c.getContext('2d');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var field=[],w=0,h=0;
  function build(){
    w=innerWidth; h=innerHeight;
    var dpr=Math.min(devicePixelRatio||1,2);
    c.width=Math.round(w*dpr); c.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    var n=Math.floor(w*h/6000); field=[];
    for(var i=0;i<n;i++){field.push({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.1+0.3,o:Math.random(),sp:Math.random()*0.014+0.003,d:Math.random()<0.5?1:-1,ember:Math.random()<0.22});}
  }
  function paint(tw){
    ctx.clearRect(0,0,w,h);
    for(var i=0;i<field.length;i++){var s=field[i];
      if(tw){s.o+=s.sp*s.d; if(s.o>1){s.o=1;s.d=-1;} if(s.o<0.15){s.o=0.15;s.d=1;}}
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,7);
      var a=tw?s.o:0.55*s.o+0.18;
      ctx.fillStyle=s.ember?('rgba(255,160,110,'+a+')'):('rgba(244,244,245,'+a+')');
      ctx.fill();
    }
  }
  build();
  if(reduce){paint(false);} else {(function tick(){paint(true);requestAnimationFrame(tick);})();}
  var rt; addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){build(); if(reduce) paint(false);},150);});
})();
</script>
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
    icon: '&#10003;',
    iconColor: 'linear-gradient(135deg, #c9430f, #ff6a2a)',
    heading: "You've been removed.",
    body: "We've taken your email off the sur9e release-notes list. Changed your mind? You can resubscribe anytime at sur9e.com.",
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
