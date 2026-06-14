'use client';

// READ-ONLY VENDOR STUB.
//
// The product's RunningModeView is a live "Running…" placeholder card that
// polls a server action and renders animated progress. A read-only report
// viewer never starts a mode, and the user-approved Sift report contains NO
// running-mode nodes, so this stub never actually mounts. It exists only so
// `running-mode-node.ts`'s `ReactNodeViewRenderer(RunningModeView)` has a
// valid component reference at extension-build time.
//
// It preserves the node-view contract (a NodeViewWrapper) and the DOM class
// the product uses, but does no polling, no network, and no server actions.

import { NodeViewWrapper } from '@tiptap/react';

export function RunningModeView() {
  return (
    <NodeViewWrapper className="running-mode-card" contentEditable={false} aria-hidden="true" />
  );
}
