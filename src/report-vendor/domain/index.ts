// READ-ONLY VENDOR BARREL.
//
// The product barrel also re-exports ActionsMenu / ScoreChip / StatusPill. The
// report hero only consumes `scoreLevel` (and StatusPill's `statusLabel`, which
// it imports directly from ./status-pill). Keep the barrel to the surface the
// vendored render path actually uses.

export { scoreLevel } from '../lib/scoring';
export { StatusPill, statusLabel } from './status-pill';
