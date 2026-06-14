import { CompanyAvatar } from './domain/company-avatar';
import { scoreLevel } from './domain';
import { fmtDate } from './report-types';
import type { OfferSummary } from './offers-data';

// Read-only kanban card — same class contract as the product board-card so the
// vendored pipeline-inline.css applies. No drag, no kebab, no inline edit.
export function BoardCard({
  offer,
  selected,
  onOpen,
}: {
  offer: OfferSummary;
  selected: boolean;
  onOpen: (num: number) => void;
}) {
  const score = Number.parseFloat(offer.score) || 0;
  return (
    <button
      type="button"
      className="card"
      data-num={offer.num}
      data-selected={selected ? 'true' : 'false'}
      aria-label={`${offer.company} — ${offer.role}. Open report.`}
      onClick={() => onOpen(offer.num)}
    >
      <div className="card-top">
        <CompanyAvatar company={offer.company} logoUrl={offer.company_logo} className="cmk" />
        <div className="card-id">
          <div className="card-id-line">
            <span className="card-company">{offer.company}</span>
            <span className={`score-num ${scoreLevel(score)}`}>{score.toFixed(1)}</span>
          </div>
          <div className="card-role">{offer.role}</div>
        </div>
      </div>
      <div className="card-chips">
        {offer.archetype && <span className="pill pill-enum">{offer.archetype}</span>}
        {offer.seniority && <span className="pill pill-enum">{offer.seniority}</span>}
        {offer.work_mode && <span className="pill pill-enum">{offer.work_mode}</span>}
      </div>
      <div className="card-meta">
        {offer.loc && <span>{offer.loc}</span>}
        {offer.loc && offer.comp && <span className="dot-sep">·</span>}
        {offer.comp && <span>{offer.comp}</span>}
        {(offer.loc || offer.comp) && offer.date && <span className="dot-sep">·</span>}
        {offer.date && <span className="card-meta__added">Added {fmtDate(offer.date)}</span>}
      </div>
    </button>
  );
}
