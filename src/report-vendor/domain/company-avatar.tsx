'use client';

// READ-ONLY VENDOR STUB of the product's CompanyAvatar.
//
// The product version probes a same-origin /api/favicon proxy, caches
// hit/miss verdicts in localStorage, and gates probes behind an
// IntersectionObserver to avoid request storms across 500+ table rows. None
// of that applies to a single static report card with no backend, so this
// stub renders the logoUrl <img> directly (the Sift report ships a public
// Google-favicon URL) with the same `.company-mark` tile DOM + a letter
// fallback on error. No network proxy, no localStorage, no observer.

import { useState } from 'react';
import { cn } from '../lib/cn';

interface CompanyAvatarProps {
  company: string;
  logoUrl?: string;
  className?: string;
  href?: string;
}

export function CompanyAvatar({ company, logoUrl, className, href }: CompanyAvatarProps) {
  const [broken, setBroken] = useState(false);
  const initial = (company || '?').trim().charAt(0).toUpperCase();
  const src = logoUrl && !broken ? logoUrl : null;

  const inner = src ? (
    <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
  ) : (
    initial
  );

  if (href) {
    return (
      <a
        className={cn('company-mark', 'company-mark--link', className)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${company || 'job'} posting in a new tab`}
        title="Open job posting"
        onClick={e => e.stopPropagation()}
      >
        {inner}
      </a>
    );
  }

  return (
    <span className={cn('company-mark', className)} aria-hidden="true">
      {inner}
    </span>
  );
}
