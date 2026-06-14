'use client';

// READ-ONLY VENDOR STUB of the product's EnumPill.
//
// The product version is a clickable pill that opens a FieldPopover to change
// the value (archetype / seniority / work_mode) and mutates the report via
// useUpdateReportField. A read-only viewer never mutates, so this renders the
// SAME pill DOM (`pill pill-enum`, the value or placeholder text) as a static,
// non-interactive <span> — no popover, no mutation, no `drawer-status-trigger`
// chevron affordance (that hover treatment implies an action we don't offer).

import { cn } from '../lib/cn';
import type { FieldOption } from './field-popover';

interface EnumPillProps {
  num: number;
  field: string;
  value: string;
  options: FieldOption[];
  placeholder?: string;
}

export function EnumPill({ field, value, placeholder }: EnumPillProps) {
  const label = value || placeholder || `Set ${field.replace(/_/g, ' ')}`;
  return <span className={cn('pill', 'pill-enum')}>{label}</span>;
}
