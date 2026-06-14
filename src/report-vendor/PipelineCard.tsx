import { useState } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { ReportDrawer } from './ReportDrawer';
import { OFFERS, DEFAULT_OPEN_NUM, type Offer } from './offers-data';

// The Report view of the flip-deck: a cut-down pipeline (3 columns of cards)
// with a report drawer that's open by default, closes to reveal the board, and
// reopens on any card click. The wrapper carries both `deck-pipe` (board/drawer
// fit scope) and `report-light` (token + report CSS scope).
export function PipelineCard() {
  const [selectedNum, setSelectedNum] = useState<number>(DEFAULT_OPEN_NUM);
  const [open, setOpen] = useState(true); // open by default (on Sift)

  const selected: Offer | null = OFFERS.find(o => o.summary.num === selectedNum) ?? null;

  const onOpen = (num: number) => {
    setSelectedNum(num);
    setOpen(true);
  };

  return (
    <div className={`deck-pipe report-light${open ? ' is-open' : ''}`}>
      <KanbanBoard offers={OFFERS} selectedNum={open ? selectedNum : null} onOpen={onOpen} />
      <div className="deck-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <ReportDrawer offer={selected} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export default PipelineCard;
