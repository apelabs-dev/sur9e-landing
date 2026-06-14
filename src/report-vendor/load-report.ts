// Build-time loader: parse the vendored public-safe report .md into the
// ReportR shape the read-only report island consumes. Mirrors the product's
// mapEntryToR field mapping for the frontmatter-format path.
//
// The .md is imported via Vite's `?raw` suffix so its contents are inlined at
// build time (bundler-safe — no fs / import.meta.url path resolution). Safe to
// import from .astro frontmatter.

import yaml from 'js-yaml';
// The public-safe report: the real Sift report with the Outreach section
// (third-party names + LinkedIn URLs) dropped and the hiring-manager name
// redacted. Generated from PRODUCT/artifacts/reports/005-siftstack-*.md.
// @ts-expect-error — Vite `?raw` import returns the file contents as a string.
import raw from './data/sample-report.md?raw';
import type { ReportR } from './report-types';

export function loadReport(): ReportR {
  const m = (raw as string).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('report .md has no YAML frontmatter');
  const fm = (yaml.load(m[1]) ?? {}) as Record<string, unknown>;
  const body = m[2];

  const scoreRaw = fm.score;
  const score: number | 'N/A' =
    typeof scoreRaw === 'number'
      ? scoreRaw
      : scoreRaw === 'N/A'
        ? 'N/A'
        : Number.parseFloat(String(scoreRaw)) || 0;

  return {
    id: 'O' + String(fm.num ?? 0).padStart(3, '0'),
    num: Number(fm.num ?? 0),
    status: String(fm.status ?? fm.state ?? 'evaluated')
      .toLowerCase()
      .trim(),
    state: String(fm.state ?? 'evaluated'),
    company: String(fm.company ?? ''),
    role: String(fm.role ?? ''),
    archetype: String(fm.archetype ?? ''),
    archetype_detail: String(fm.archetype ?? ''),
    date: fm.date ? String(fm.date) : undefined,
    posted: fm.posted ? String(fm.posted) : undefined,
    url: fm.url ? String(fm.url) : '',
    score,
    seniority: String(fm.seniority ?? ''),
    remote: String(fm.remote ?? ''),
    locations: (fm.locations as string | string[]) ?? '',
    comp: String(fm.comp ?? ''),
    tldr: String(fm.tldr ?? ''),
    work_mode: String(fm.work_mode ?? ''),
    location: String(fm.location ?? ''),
    company_logo: String(fm.company_logo ?? ''),
    legitimacy: (fm.legitimacy as string) ?? '',
    tier: (fm.legitimacy as string) ?? 'likely_legitimate',
    score_breakdown: (fm.score_breakdown as ReportR['score_breakdown']) ?? {
      cv_match: 0,
      seniority: 0,
      compensation: 0,
      domain: 0,
      geo: 0,
      legitimacy: 0,
    },
    snapshot: fm.snapshot as ReportR['snapshot'],
    body,
    format: 'frontmatter',
  };
}
