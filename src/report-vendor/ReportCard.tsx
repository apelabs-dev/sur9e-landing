'use client';

// Client island entry point for the vendored report viewer.
//
// Wraps the render path in a `.report-light report-wrap` container. `.report-light`
// (defined in report-vendor/styles/report-light.css) pins the product's LIGHT
// design tokens locally so the card renders as white "paper" regardless of the
// host page's theme. The ReportContext provider lives in ReportRender.

import { ReportRender } from './report-render';
import type { ReportR } from './report-types';

export default function ReportCard({ report }: { report: ReportR }) {
  return (
    <div className="report-light report-wrap">
      <ReportRender r={report} />
    </div>
  );
}
