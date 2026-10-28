# sur9e-landing

Pre-launch marketing site for [sur9e.com](https://sur9e.com).

## Stack

- **Astro 6.x** — static output, no client framework
- **Cloudflare Pages** — hosting
- **Cloudflare Worker** (`worker/`) + **Railway Postgres** + **Resend** — waitlist capture
- **Cloudflare Web Analytics** — visitor tracking
- **Cloudflare Email Routing** — `hello@sur9e.com` forwarded to personal inbox

## Local dev

```bash
npm install
npm run dev
# → http://localhost:4321
```

## Build

```bash
npm run build
# → outputs to dist/
```

## Deploy

Push to `main` → Cloudflare Pages auto-builds + deploys → live at https://sur9e.com.

Worker deploys separately from `worker/`:

```bash
cd worker
npx wrangler deploy
```

License: All rights reserved.
