import { ReportRender } from './report-render';
import type { Offer } from './offers-data';

export function ReportDrawer({
  offer,
  open,
  onClose,
}: {
  offer: Offer | null;
  open: boolean;
  onClose: () => void;
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
          <button
            type="button"
            className="cd-navbtn"
            aria-label="Close report"
            onClick={onClose}
          >
            ›
          </button>
          <span className="cd-navtitle">{offer?.summary.company ?? ''}</span>
        </div>
        <div className="cd-v1-body">
          {offer && (
            // key by offer num so the read-only TipTap editor remounts with
            // fresh content when the selected offer changes (it doesn't sync
            // its body on prop change otherwise).
            <div className="report-light report-wrap" key={offer.summary.num}>
              <ReportRender r={offer.report} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
