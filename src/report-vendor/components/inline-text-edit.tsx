'use client';

// READ-ONLY VENDOR STUB of the product's InlineTextEdit.
//
// The product version is a button that swaps to an <input> on click and saves
// via useUpdateReportField. A read-only viewer never edits, so this renders the
// value (or the placeholder when empty) as a static `.inline-edit` span — same
// class hooks for layout/typography, no click handler, no input, no mutation.

interface InlineTextEditProps {
  num: number;
  field: string;
  value: string;
  ariaLabel: string;
  placeholder?: string;
}

export function InlineTextEdit({ value, placeholder }: InlineTextEditProps) {
  return (
    <span className="inline-edit">
      {value || <span className="inline-edit__empty">{placeholder ?? '—'}</span>}
    </span>
  );
}
