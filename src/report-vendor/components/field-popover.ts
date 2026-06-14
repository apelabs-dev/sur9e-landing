// READ-ONLY VENDOR STUB — type-only.
//
// The product's field-popover.tsx is an interactive dropdown (portal,
// keyboard nav, outside-click close). A read-only report renders pills as
// static text, so only the FieldOption *type* is vendored here — the
// interactive popover component is intentionally omitted.

export interface FieldOption {
  key: string;
  label: string;
  disabled?: boolean;
  pillClass?: string;
}
