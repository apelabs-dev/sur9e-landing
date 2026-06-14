'use client';

// Frontmatter-format report renderer — vendored from the product's
// report-render.tsx. Hero + read-only body + Attachments.
//
// Difference from the product: the product mounts <ReportBodyEditor> (a
// next/dynamic-loaded, debounced, auto-saving TipTap editor wired to
// useSaveReportBody + the TOC store). A read-only viewer needs none of that,
// so ReportBodyEditor is replaced inline with a <ReadOnlyTipTap> in the same
// `<article className="report-body prose-novel">` wrapper the product uses —
// identical body markup, no save/TOC machinery. The body is preprocessed the
// same way the product does (legacy toggles + running-mode comments) so any
// such content would round-trip; the Sift report contains neither, so both
// passes are no-ops for it.

import { useMemo } from 'react';
import { ReadOnlyTipTap } from './ReadOnlyTipTap';
import { preprocessLegacyToggles } from './extensions/legacy-toggle-shim';
import { preprocessRunningModeComments } from './extensions/running-mode-node';
import { ReportContext } from './report-context';
import type { ReportR } from './report-types';
import { ReportAttachments } from './sections/report-attachments';
import { ReportHero } from './sections/report-hero';

function ReadOnlyReportBody({ initialBody }: { initialBody: string }) {
  const body = useMemo(
    () => preprocessLegacyToggles(preprocessRunningModeComments(initialBody ?? '')),
    [initialBody],
  );
  return (
    <article className="report-body prose-novel">
      <ReadOnlyTipTap body={body} />
    </article>
  );
}

interface ReportRenderProps {
  r: ReportR;
}

export function ReportRender({ r }: ReportRenderProps) {
  // ReportContext makes `r` available to the SnapshotNodeView mounted by
  // ProseMirror inside the read-only body (ReactNodeViewRenderer reuses the
  // host React tree's context, so the node-view picks this up).
  return (
    <ReportContext.Provider value={r}>
      <div data-testid="report-body">
        <ReportHero r={r} />
        <ReadOnlyReportBody initialBody={r.body ?? ''} />
        <ReportAttachments r={r} />
      </div>
    </ReportContext.Provider>
  );
}
