# sur9e-landing

Pre-launch marketing site for [sur9e.com](https://sur9e.com).

## Stack

- **Astro 6.x** — static output, no client framework
- **Cloudflare Pages** — hosting
- **Cloudflare Worker** + **Railway Postgres** + **Resend** — waitlist capture (see `HANDOFF.md` if not yet wired)
- **Cloudflare Web Analytics** — visitor tracking

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

Push to `main` → Cloudflare Pages auto-builds + deploys → live on sur9e.com.

See `HANDOFF.md` for one-time service wiring (Worker, DB, Resend, Analytics).
See `CLAUDE.md` for ongoing Claude-assisted edit conventions.

License: All rights reserved. Private repo.
