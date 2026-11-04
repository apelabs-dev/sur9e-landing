import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sur9e.com',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [react(), sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: { sourcemap: false },
    server: {
      // Dev only: forward /api/* to the local Worker (`wrangler dev` in
      // worker/, default :8787). In production Cloudflare routes
      // sur9e.com/api/* to the Worker; this reproduces that locally so the
      // subscribe form works against `npm run dev`. No effect on the static
      // build (the static site ships no server).
      proxy: {
        '/api': { target: 'http://localhost:8787', changeOrigin: true },
      },
    },
  },
});
