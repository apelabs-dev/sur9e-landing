// READ-ONLY VENDOR STUBS for product hooks/stores the report hero imports.
//
// The product wires these through React Query (useProfileQuery) and a zustand
// store (useStatusPopoverStore) that drive editing affordances — picking a
// status, reading the user's profile archetypes for the archetype dropdown.
// A standalone read-only card has no profile API and no editable status, so:
//
//   * useProfileQuery → returns { data: undefined }. The hero falls back to
//     just the "Off-target" archetype option (only used by the now-static
//     EnumPill, which ignores its options anyway).
//   * useStatusPopoverStore → a no-op selector store. The status pill's
//     onClick still calls .show(), but show() does nothing and aria-expanded
//     is always false. No popover ever opens.

interface ProfileShape {
  target_roles?: { archetypes?: { name?: string }[] };
}

export function useProfileQuery(): { data: ProfileShape | undefined } {
  return { data: undefined };
}

interface StatusPopoverState {
  open: { num: number } | null;
  show: (args: { anchor: HTMLElement; num: number; currentStatus: string }) => void;
}

const STATE: StatusPopoverState = {
  open: null,
  show: () => {},
};

// Mimics the zustand `(selector) => slice` call signature plus the
// `.getState()` static accessor the hero uses.
export function useStatusPopoverStore<T>(selector: (s: StatusPopoverState) => T): T {
  return selector(STATE);
}
useStatusPopoverStore.getState = (): StatusPopoverState => STATE;
