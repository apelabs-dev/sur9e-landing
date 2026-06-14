// Build-time: parse the 5 public-safe report .md files (Vite ?raw) into the
// Offer[] the pipeline demo renders. Each offer carries a board-card summary +
// the full parsed ReportR for the drawer. The card status is set to its board
// column (a demo-curation choice; all other data is the real report verbatim).

import yaml from 'js-yaml';
import type { ReportR } from './report-types';

// @ts-expect-error Vite ?raw string imports
import sift from './data/005-siftstack.md?raw';
// @ts-expect-error
import stripe from './data/746-stripe.md?raw';
// @ts-expect-error
import bitwarden from './data/559-bitwarden.md?raw';
// @ts-expect-error
import cleo from './data/569-cleo.md?raw';
// @ts-expect-error
import tiptap from './data/694-tiptap.md?raw';

export type ColumnKey = 'evaluated' | 'applied' | 'interview';
export const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'evaluated', label: 'Evaluated' },
  { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interview' },
];

export interface OfferSummary {
  num: number;
  company: string;
  role: string;
  score: string; // string form, e.g. "4.3" (BoardCard parses)
  status: ColumnKey;
  column: ColumnKey;
  company_logo?: string;
  archetype?: string;
  seniority?: string;
  work_mode?: string;
  loc?: string;
  comp?: string;
  date?: string;
  posted?: string;
}
export interface Offer {
  summary: OfferSummary;
  report: ReportR;
}

export function parseOffer(raw: string, column: ColumnKey): Offer {
  const m = (raw as string).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('report .md has no YAML frontmatter');
  const fm = (yaml.load(m[1]) ?? {}) as Record<string, unknown>;
  const body = m[2];
  const num = Number(fm.num ?? 0);
  const scoreRaw = fm.score;
  const scoreNum =
    typeof scoreRaw === 'number' ? scoreRaw : Number.parseFloat(String(scoreRaw)) || 0;

  const report: ReportR = {
    id: 'O' + String(num).padStart(3, '0'),
    num,
    status: column, // set to board column so hero + card agree
    state: 'evaluated',
    company: String(fm.company ?? ''),
    role: String(fm.role ?? ''),
    archetype: String(fm.archetype ?? ''),
    archetype_detail: String(fm.archetype ?? ''),
    date: fm.date ? String(fm.date) : undefined,
    posted: fm.posted ? String(fm.posted) : undefined,
    url: fm.url ? String(fm.url) : '',
    score: scoreNum,
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

  const summary: OfferSummary = {
    num,
    company: report.company,
    role: report.role,
    score: scoreNum.toFixed(1),
    status: column,
    column,
    company_logo: report.company_logo,
    archetype: report.archetype,
    seniority: report.seniority,
    work_mode: report.work_mode,
    loc: report.location || '',
    comp: report.comp || '',
    date: report.date,
    posted: report.posted,
  };
  return { summary, report };
}

export const OFFERS: Offer[] = [
  parseOffer(sift, 'evaluated'),
  parseOffer(stripe, 'evaluated'),
  parseOffer(bitwarden, 'applied'),
  parseOffer(cleo, 'applied'),
  parseOffer(tiptap, 'interview'),
];

export const DEFAULT_OPEN_NUM = 5; // Sift
