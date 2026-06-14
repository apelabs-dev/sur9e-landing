import { ReportRender } from './report-render';
import type { Offer } from './offers-data';

// Minimal lucide-style inline icons (16px, stroke) so the drawer nav row
// matches the app without pulling lucide-react into the landing.
const ic = {
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  'aria-hidden': true as const,
};
const ChevronsRight = () => (
  <svg {...ic}>
    <path d="m6 17 5-5-5-5" />
    <path d="m13 17 5-5-5-5" />
  </svg>
);
const Maximize2 = () => (
  <svg {...ic}>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
);
const ChevronLeft = () => (
  <svg {...ic}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);
const ChevronRight = () => (
  <svg {...ic}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
const MoreHorizontal = () => (
  <svg {...ic}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

// Read-only drawer that slides in within the card. Nav row reproduces the
// app's DrawerNavRow (close · open-full · divider · prev/counter/next · kebab);
// close + prev/next are functional, expand/kebab are decorative in the demo.
export function ReportDrawer({
  offer,
  open,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  offer: Offer | null;
  open: boolean;
  index: number; // 1-based position of the open offer
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className={`cd-drawer${open ? ' on' : ''}`}
      role="dialog"
      aria-label={offer ? `${offer.summary.company} report` : 'Report'}
      aria-hidden={open ? 'false' : 'true'}
    >
      <div className="cd-v1">
        <div className="cd-v1-navrow">
          <div className="cd-nav-actions">
            <button type="button" className="icon-btn" aria-label="Close" title="Close" onClick={onClose}>
              <ChevronsRight />
            </button>
            <button type="button" className="icon-btn" aria-label="Open full report" title="Open full report">
              <Maximize2 />
            </button>
            <span className="cd-nav-divider" aria-hidden="true" />
            <div className="cd-nav-group">
              <button type="button" className="icon-btn" aria-label="Previous offer" title="Previous offer" onClick={onPrev}>
                <ChevronLeft />
              </button>
              <span className="cd-nav-counter">
                {index} / {total}
              </span>
              <button type="button" className="icon-btn" aria-label="Next offer" title="Next offer" onClick={onNext}>
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="cd-nav-actions">
            <button type="button" className="icon-btn" aria-label="Drawer actions" title="More actions">
              <MoreHorizontal />
            </button>
          </div>
        </div>
        <div className="cd-v1-body">
          {offer && (
            // key by offer num so the read-only TipTap editor remounts with
            // fresh content when the selected offer changes.
            <div className="report-light report-wrap" key={offer.summary.num}>
              <ReportRender r={offer.report} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
