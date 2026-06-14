import { useState } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { ReportDrawer } from './ReportDrawer';
import { OFFERS, DEFAULT_OPEN_NUM, type Offer } from './offers-data';

// The Report view of the flip-deck: a cut-down pipeline page — an "Offers"
// header + 3 columns of cards + a report drawer that's open by default, closes
// to reveal the board, and reopens on any card click. Prev/next cycle through
// the offers in board order.
export function PipelineCard() {
  const [selectedNum, setSelectedNum] = useState<number>(DEFAULT_OPEN_NUM);
  const [open, setOpen] = useState(true); // open by default (on Sift)

  const index = Math.max(0, OFFERS.findIndex(o => o.summary.num === selectedNum));
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
      <div className="pipe-head page-head">
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
          <button type="button" className="filter-pillbtn">
            Score ≥ 4.0 <span className="x" aria-hidden="true">×</span>
          </button>
          <button type="button" className="filter-pillbtn">
            Remote / Hybrid <span className="x" aria-hidden="true">×</span>
          </button>
        </div>
      </div>
      <div className="pipe-stage">
        <KanbanBoard offers={OFFERS} selectedNum={open ? selectedNum : null} onOpen={onOpen} />
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
    </div>
  );
}

export default PipelineCard;
