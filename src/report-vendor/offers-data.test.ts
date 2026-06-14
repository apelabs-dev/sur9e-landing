import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLUMNS, DEFAULT_OPEN_NUM, type ColumnKey, type Offer, parseOffer } from './offers-data';

// vitest has no Vite/Astro plugin in the landing's default config, so the
// `?raw` imports that build OFFERS don't resolve here. Read the same 5 files
// with node:fs and call the pure parseOffer directly — this exercises the real
// parsing path that the build-time OFFERS array uses, without depending on ?raw.
const read = (f: string) =>
  readFileSync(fileURLToPath(new URL(`./data/${f}`, import.meta.url)), 'utf8');

const OFFERS: Offer[] = [
  parseOffer(read('005-siftstack.md'), 'evaluated'),
  parseOffer(read('746-stripe.md'), 'evaluated'),
  parseOffer(read('559-bitwarden.md'), 'applied'),
  parseOffer(read('569-cleo.md'), 'applied'),
  parseOffer(read('694-tiptap.md'), 'interview'),
];

describe('offers-data', () => {
  it('has 5 offers across 3 columns', () => {
    expect(OFFERS).toHaveLength(5);
    expect(COLUMNS.map(c => c.key)).toEqual(['evaluated', 'applied', 'interview']);
    const byCol = (k: ColumnKey) => OFFERS.filter(o => o.summary.column === k).length;
    expect(byCol('evaluated')).toBe(2);
    expect(byCol('applied')).toBe(2);
    expect(byCol('interview')).toBe(1);
  });
  it('default-open offer is Sift and carries a parsed report', () => {
    const sift = OFFERS.find(o => o.summary.num === DEFAULT_OPEN_NUM);
    expect(sift?.summary.company).toBe('Sift');
    expect(sift?.report.body).toMatch(/TL;DR/);
    expect(sift?.summary.status).toBe(sift?.summary.column); // status set to column
  });
  it('no third-party PII in any report body', () => {
    const all = OFFERS.map(o => o.report.body ?? '').join('\n');
    expect(all).not.toMatch(/linkedin\.com/i);
    expect(all).not.toMatch(/##\s*Outreach/);
  });
});
