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
            <div className="report-light report-wrap">
              <ReportRender r={offer.report} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
