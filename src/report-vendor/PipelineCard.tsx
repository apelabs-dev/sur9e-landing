import { useState } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { ReportDrawer } from './ReportDrawer';
import { OFFERS, DEFAULT_OPEN_NUM, type Offer } from './offers-data';

// The Report view of the flip-deck: a cut-down sur9e Offers page — the app's
// page-head + filter-bar (exact styles) + 3 columns of cards, with the report
// drawer hovering OVER the whole canvas (open by default; close reveals the
// board; any card reopens it). Prev/next cycle through the offers.
export function PipelineCard() {
  const [selectedNum, setSelectedNum] = useState<number>(DEFAULT_OPEN_NUM);
  const [open, setOpen] = useState(true); // open by default (on Sift)

  const index = Math.max(
    0,
    OFFERS.findIndex(o => o.summary.num === selectedNum),
  );
  const selected: Offer | null = OFFERS[index] ?? null;

  const onOpen = (num: number) => {
    setSelectedNum(num);
    setOpen(true);
  };
  const go = (delta: number) => {
    const next = (index + delta + OFFERS.length) % OFFERS.length;
    setSelectedNum(OFFERS[next].summary.num);
  };

  return (
    <div className={`deck-pipe report-light${open ? ' is-open' : ''}`}>
      {/* exact app Offers header (styles vendored verbatim) */}
      <div className="page-head">
        <div>
          <h1>Offers</h1>
          <div className="sub">{OFFERS.length} scored — your pipeline, ranked by fit.</div>
        </div>
      </div>
      <div className="filter-bar">
        <input
          className="search filter-search"
          type="search"
          aria-label="Search offers"
          autoComplete="off"
          placeholder="Search offers…"
          defaultValue=""
        />
        <div className="active-pills" aria-label="Active filters">
          <button type="button" className="chip chip--filter">
            Score ≥ 4.0 <span className="x" aria-hidden="true">×</span>
          </button>
          <button type="button" className="chip chip--filter">
            Remote / Hybrid <span className="x" aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <KanbanBoard offers={OFFERS} selectedNum={open ? selectedNum : null} onOpen={onOpen} />

      {/* drawer + scrim hover over the whole canvas (header + board) */}
      <div className="deck-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <ReportDrawer
        offer={selected}
        open={open}
        index={index + 1}
        total={OFFERS.length}
        onClose={() => setOpen(false)}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
      />
    </div>
  );
}

export default PipelineCard;
