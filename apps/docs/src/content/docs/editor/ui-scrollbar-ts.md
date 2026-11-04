---
title: ui/scrollbar.ts
description: The overlay scroll handle's size and position, and how a drag maps back to scrolling.
sidebar:
  order: 74
---

**Written from:** `apps/editor/src/lib/ui/scrollbar.ts` and `lib/ui/scrollbar.test.ts`.

## Overview

`scrollbar.ts` works out the geometry of [ScrollArea](/editor/ui-scroll-area/)'s handle: how long
it is, where it sits, and how far the content scrolls when it is dragged.

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `Thumb` | `{ size, offset }` | Handle length and distance from the top, in px. `size: 0` = no handle. |
| `thumbFor` | `(client, scroll, top, minPx) => Thumb` | The handle for a viewport `client` px tall showing `scroll` px of content, scrolled `top` px. |
| `scrollForDrag` | `(client, scroll, startTop, deltaPx, minPx) => number` | The `scrollTop` after dragging the handle `deltaPx` from where it was at `startTop`. |

- Size is `client² / scroll` (the visible share of the track), at least `minPx` and at most
  `client`. The handle travels `client - size`.
- The offset clamps an overscrolled `top` (rubber-banding) to the ends.
- A drag maps through the same ratio, `deltaPx / travel × (scroll - client)`, clamped to
  `0 … scroll - client`, so the handle stays under the pointer.

### Callers / callees

Caller: `lib/ui/ScrollArea.svelte`. No callees.

### Tests

`lib/ui/scrollbar.test.ts`: no handle when the content fits, size from the visible share, the
minimum size, travel from top to bottom, clamping, drag mapping and its clamping.
