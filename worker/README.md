# sur9e-subscribe-worker

Cloudflare Worker handling newsletter (release-notes) subscriptions for the
sur9e.com landing. Single opt-in: subscribing is active immediately, no
confirmation email.

## Architecture

- **POST /api/subscribe** — validates email, upserts into Railway Postgres
  (`subscribers`) via Hyperdrive with `confirmed_at = NOW()`, fires a Resend
  welcome email (background). A previously-inactive row (unsubscribed, or a
  legacy unconfirmed one) is reactivated on resubmit.
- **GET/POST /api/subscribe/unsubscribe?e=&t=** — verifies the HMAC-signed
  token and sets `unsubscribed_at`. Supports RFC 8058 one-click POST.
- **Legacy shim** — `POST /api/waitlist` and `GET/POST /api/waitlist/unsubscribe`
  are still served (same handlers) so unsubscribe links in already-sent emails
  don't 404 during/after cutover. Old `/api/waitlist/confirm` is gone (404).
- Table: `subscribers` (renamed from `waitlist` by the maintainer). `notified_at`
  is deprecated (no longer written). "Active" = `confirmed_at IS NOT NULL AND
  unsubscribed_at IS NULL`.

## Setup (one-time)

```bash
cd worker
npm install
```

### Bindings & secrets

1. **Hyperdrive** — same Railway Postgres as before; the `[[hyperdrive]] id`
   in `wrangler.toml` is unchanged, only the binding name is `SUBSCRIBE_DB`.

2. **Resend secret** — `wrangler secret put RESEND_API_KEY` (Resend API key,
   `Sending access` scope restricted to `sur9e.com`).

3. **Unsubscribe HMAC secret** — `wrangler secret put UNSUBSCRIBE_SECRET`.
   **Cutover:** set this to the OLD worker's `CONFIRM_SECRET` value so the
   unsubscribe tokens already mailed out still verify. (`openssl rand -hex 32`
   for a fresh one if you don't need legacy links.)

### Route

After first deploy, configure the route in the CF dashboard:
Workers & Pages → `sur9e-subscribe` → Settings → Triggers → Routes → Add:
- Pattern: `sur9e.com/api/*`
- Zone: `sur9e.com`

## Cutover (maintainer)

Renaming the worker (`sur9e-waitlist` → `sur9e-subscribe`) creates a **new** CF
Worker; a route can only belong to one worker, so order matters:

1. `ALTER TABLE waitlist RENAME TO subscribers;` on Railway (the Worker SQL
   targets `subscribers`).
2. On the new `sur9e-subscribe` worker: `wrangler secret put RESEND_API_KEY`
   and `wrangler secret put UNSUBSCRIBE_SECRET` (= old `CONFIRM_SECRET` value).
3. Confirm the Hyperdrive id matches the live DB.
4. Remove the `sur9e.com/api/*` route from the **old** `sur9e-waitlist` worker.
5. `npm run deploy` the new worker; add the route to it.
6. Smoke-test: `POST /api/subscribe`, `GET` + one-click `POST` unsubscribe, and
   a legacy `/api/waitlist/unsubscribe` link.
7. Delete the old worker.

The legacy `/api/waitlist/*` shim means unsubscribe links in already-sent
emails keep working through and after the switch.

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
