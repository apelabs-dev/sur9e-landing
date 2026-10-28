// Generate public-safe report .md files for the pipeline demo from the real
// (gitignored) product reports. For each: drop the Outreach section (third-party
// names + LinkedIn URLs), redact the hiring-manager name, fix the 4c/4e
// blockquote->h4 source glitch. Run: node scripts/gen-sample-report.mjs
// (set SUR9E_REPORTS_DIR to override the default sibling ../sur9e/artifacts/reports)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC_DIR =
  process.env.SUR9E_REPORTS_DIR ??
  fileURLToPath(new URL('../../sur9e/artifacts/reports', import.meta.url));
const OUT_DIR = new URL('../src/report-vendor/data/', import.meta.url);

// product filename (stem) -> output filename (stem)
const REPORTS = [
  ['005-siftstack-2026-06-05', '005-siftstack'],
  ['746-stripe-2026-06-07', '746-stripe'],
  ['559-bitwarden-2026-06-06', '559-bitwarden'],
  ['569-cleo-2026-06-06', '569-cleo'],
  ['694-tiptap-2026-06-07', '694-tiptap'],
];

function publicSafe(raw) {
  const m = raw.match(/^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter');
  // Strip raw LinkedIn job-posting URLs from the frontmatter `url:` field. Some
  // postings are `linkedin.com/jobs/view/...` links; the public demo should not
  // expose them (the accepted Sift report carries no linkedin.com URL). Blank
  // only LinkedIn URLs, keep the field so the build-time loader still parses it;
  // non-LinkedIn `url:` values (e.g. the Ashby link) are left untouched.
  const front = m[1].replace(/^(url:\s*).*linkedin\.com.*$/im, '$1""');
  let body = m[2];
  const cut = body.indexOf('\n## Outreach');
  if (cut !== -1) body = body.slice(0, cut) + '\n';
  body = body
    .replace(
      /Send [A-Z][a-zA-Z.'’-]+ [A-Z][a-zA-Z.'’-]+['’]s connect note today \(drafted in Outreach below\)/g,
      'Send the hiring manager’s connect note today',
    )
    // generic: redact "Firstname Lastname's" possessive before "connect note"
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+['’]s connect note/g, 'the hiring manager’s connect note')
    // non-possessive: "the Firstname Lastname connect note" -> "the hiring manager’s connect note"
    .replace(/\bthe [A-Z][a-z]+ [A-Z][a-z]+ connect note/g, 'the hiring manager’s connect note')
    // reversed phrasing: "connect note to [**]Firstname Lastname[**]" -> "...the hiring manager"
    .replace(
      /\bconnect note to (\*\*)?[A-Z][a-z]+ [A-Z][a-z]+(\*\*)?/g,
      'connect note to $1the hiring manager$2',
    )
    .replace(/^> (4[ce]\..*\(\d+ min\))\s*$/gm, '#### $1');
  return front + body.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

for (const [src, out] of REPORTS) {
  const raw = readFileSync(`${SRC_DIR}/${src}.md`, 'utf8');
  writeFileSync(new URL(`${out}.md`, OUT_DIR), publicSafe(raw), 'utf8');
  console.log(`wrote ${out}.md`);
}
console.log('done');
