# sur9e-waitlist-worker

Cloudflare Worker handling `POST /api/waitlist` and `GET /api/waitlist/confirm` for the sur9e.com landing.

## Architecture

- **POST /api/waitlist** — validates email, inserts into Railway Postgres via Hyperdrive, fires Resend confirmation email
- **GET /api/waitlist/confirm?e=&t=** — verifies HMAC-signed token, sets `confirmed_at` (double opt-in)
- DDL lives in parent repo `sur9e-mvp/docs/strategy.md §18` — locked

## Setup (one-time)

```bash
cd worker
npm install
```

### Bindings & secrets

1. **Hyperdrive** — in CF dashboard, create a Hyperdrive config pointing at the Railway Postgres connection string. Paste the resulting ID into `wrangler.toml` `[[hyperdrive]] id = "..."`.

2. **Resend secret** — `wrangler secret put RESEND_API_KEY` (paste the Resend API key, `Sending access` scope restricted to `sur9e.com`).

3. **Confirmation HMAC secret** — `wrangler secret put CONFIRM_SECRET` (paste 32+ random hex chars; generate with `openssl rand -hex 32`).

### Route

After first deploy, configure the route in the CF dashboard:
Workers & Pages → `sur9e-waitlist` → Settings → Triggers → Routes → Add:
- Pattern: `sur9e.com/api/*`
- Zone: `sur9e.com`

## Local dev

```bash
npm run dev   # wrangler dev — local Worker, won't hit prod Hyperdrive without a remote config
```

## Deploy

```bash
npm run deploy   # wrangler deploy
```

## Logs

```bash
npm run tail
```
