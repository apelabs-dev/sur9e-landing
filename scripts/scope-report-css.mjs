// One-off generator: prefix every selector in the vendored report CSS with
// `.report-light` so the report card's styles can be imported globally (the
// only way they reach the client-rendered React island) WITHOUT leaking onto
// the landing page (whose .hero/.pill/.btn/etc. would otherwise collide).
//
// Run: node scripts/scope-report-css.mjs
// Inputs:  src/report-vendor/styles/<name>.css
// Outputs: src/report-vendor/styles/scoped/<name>.css
//
// :root / html / body selectors map to `.report-light` itself; @keyframes
// interiors are left untouched by postcss-prefix-selector.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import prefixer from 'postcss-prefix-selector';

const here = dirname(fileURLToPath(import.meta.url));
const stylesDir = join(here, '..', 'src', 'report-vendor', 'styles');
const outDir = join(stylesDir, 'scoped');
mkdirSync(outDir, { recursive: true });

const PREFIX = '.report-light';
const FILES = [
  'report-hero.css',
  'report-snapshot.css',
  'report-inline.css',
  'tiptap-editor.css',
  'chrome.css',
];

const plugin = prefixer({
  prefix: PREFIX,
  transform(prefix, selector, prefixedSelector) {
    // Root/host selectors → the scope itself (tokens live on .report-light).
    if (selector === ':root' || selector === 'html' || selector === 'body' || selector === '*') {
      return prefix;
    }
    // Already scoped (defensive) — don't double-prefix.
    if (selector.startsWith(prefix)) return selector;
    return prefixedSelector;
  },
});

for (const file of FILES) {
  const css = readFileSync(join(stylesDir, file), 'utf8');
  const out = postcss([plugin]).process(css, { from: file }).css;
  writeFileSync(join(outDir, file), out, 'utf8');
  console.log(`scoped ${file} -> scoped/${file}`);
}
console.log('done');
