import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [react()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: { sourcemap: false },
  },
});
