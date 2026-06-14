import { BoardCard } from './BoardCard';
import { COLUMNS, type Offer } from './offers-data';

// Cut-down kanban: 3 status columns of read-only offer cards. No app chrome
// (no sidebar/topbar). Reproduces the product board column DOM so the vendored
// pipeline-inline.css applies.
export function KanbanBoard({
  offers,
  selectedNum,
  onOpen,
}: {
  offers: Offer[];
  selectedNum: number | null;
  onOpen: (num: number) => void;
}) {
  return (
    <div className="board-wrap">
      <div className="board variant-dense">
        {COLUMNS.map(col => {
          const items = offers.filter(o => o.summary.column === col.key);
          return (
            <div className="column" data-status={col.key} key={col.key}>
              <div className="col-head">
                <div className="col-head-row">
                  <div className="col-title-block">
                    <span className="col-dot" aria-hidden="true" />
                    <span className="col-title">{col.label}</span>
                  </div>
                  <span className="col-count">{items.length}</span>
                </div>
              </div>
              <div className="col-body">
                {items.map(o => (
                  <BoardCard
                    key={o.summary.num}
                    offer={o.summary}
                    selected={o.summary.num === selectedNum}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
