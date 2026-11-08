---
title: preview/NoticeStack.svelte
description: The notices, stacked at the preview's top-right, in two live regions. Failures first and assertive, advisories polite.
sidebar:
  order: 40
---

**Written from:** `apps/editor/src/lib/preview/NoticeStack.svelte`, and the call site in
`App.svelte`.

## Overview

The stack is where notices appear: at the preview's top-right, 12px under the top bar's hairline,
floating over the picture (Pol, W0, 2026-11-06). It never covers the sidebar and never takes
space in the layout. Failures come first, then advisories.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `notices` | `readonly Notice[]` | What to show, already ordered and filtered (`notices.shown`). |
| `onDismiss` | `(notice) => void` | A notice's ✕. App passes `notices.dismiss`. |
| `draft` | `boolean` (default `false`) | Shows the draft cue's "Draft · not saved" tag at the top, above every notice (item 12). It is not a notice and not a live region, and nothing dismisses it. |

### Inputs → outputs

- It is positioned absolutely in the preview's `.canvas`, outside its `ScrollArea`, so it stays put
  while the picture scrolls.
- Its width is `--notice-w` (360px), or the preview's width less 12px on each side when the
  preview is narrower. It scrolls itself if the notices are taller than the preview.
- There are two live regions, always in the DOM so that what appears in them is announced:
  failures in `role="alert"` (assertive), advisories in `role="status"` (polite). A notice never
  takes focus.
- The stack lets the pointer through (`pointer-events: none`) except on the notices themselves,
  so the picture under its empty part stays paintable.

### Callers / callees

Caller: `App.svelte`. Callee: `lib/ui/Notice.svelte`.

### Tests

None (the vitest config cannot load `.svelte`). Checked in the editor:
- with doctored imports, it sits 12px from the canvas's top and right edges and is 360px wide;
- failures come first;
- both live regions exist when the stack is empty.
