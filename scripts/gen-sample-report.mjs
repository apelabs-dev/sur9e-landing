// Generate the public-safe report shown by the landing's <ReportCard> demo
// from the real (gitignored) product report. Keeps the candidate-facing
// report intact while removing third-party PII and fixing a source markdown
// glitch. Run: node scripts/gen-sample-report.mjs
//
//   1. Drop the Outreach section (third-party names + LinkedIn URLs) and
//      everything after it.
//   2. Redact the hiring-manager name in the Next Steps callout (public page).
//   3. Fix source markdown: the "4c. Lunch" / "4e. Final engineering" onsite
//      blocks were authored as blockquotes; they are section sub-headers, so
//      render them as h4 like a heading (matches the surrounding 4a/4b/4d).

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '../sur9e/artifacts/reports/005-siftstack-2026-06-05.md';
const OUT = new URL('../src/report-vendor/data/sample-report.md', import.meta.url);

const raw = readFileSync(SRC, 'utf8');
const m = raw.match(/^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/);
if (!m) throw new Error('no frontmatter');
const front = m[1];
let body = m[2];

// 1. Truncate before the Outreach section.
const cut = body.indexOf('\n## Outreach');
if (cut !== -1) body = body.slice(0, cut) + '\n';

// 2. Redact the hiring-manager name (only appears in Next Steps after the cut).
body = body
  .replace(
    /Send Tom Berger['’]s connect note today \(drafted in Outreach below\)/g,
    'Send the hiring manager’s connect note today',
  )
  .replace(/Tom Berger['’]s/g, 'the hiring manager’s')
  .replace(/Tom Berger/g, 'the hiring manager');

// 3. Blockquote → h4 for the onsite sub-headers (source authoring glitch).
body = body
  .replace(/^> (4c\. Lunch \/ team break \(60 min\))\s*$/m, '#### $1')
  .replace(/^> (4e\. Final engineering team interview \(30 min\))\s*$/m, '#### $1');

const out = front + body.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
writeFileSync(OUT, out, 'utf8');
console.log('wrote src/report-vendor/data/sample-report.md');
