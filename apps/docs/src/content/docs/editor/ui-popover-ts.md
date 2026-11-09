---
title: ui/popover.ts
description: Where a non-modal popover sits against its trigger, and whether a press landed outside it.
sidebar:
  order: 76
---

**Written from:** `apps/editor/src/lib/ui/popover.ts` and `lib/ui/popover.test.ts`.

## Overview

Two popovers open from a button and float over the page without blocking it: the
[tile picker](/editor/tile-picker/) and the [Explainer](/editor/ui-explainer/). Both are placed
`fixed` against their trigger, so the sidebar's scroll area cannot clip them, and both close when
the pointer is pressed somewhere else. These rules were in `TilePicker.svelte`; they moved here when
the Explainer needed the same ones (item 12), so the two cannot drift.

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `Box` | `{ top, bottom, left, right }` | The part of a `DOMRect` placement reads. |
| `Placement` | `{ top, left, right, up }` | `top` is the edge it hangs from; `left` and `right` are CSS offsets of the trigger's sides. |
| `placeAt` | `(anchor, viewport, room) => Placement` | Under the trigger, or above it when less than `room` px are left below. |
| `placeOnLargerSide` | `(anchor, viewport, height) => Placement` | Below the trigger, or above it when a panel `height` px tall does not fit below and above has more room. Below wins a tie. |
| `BesidePlacement` | `{ top, left, maxHeight }` | CSS offsets of a panel beside the sidebar, and the most it may be tall. |
| `placeBeside` | `(sidebar, anchor, viewport, size, margin) => BesidePlacement \| undefined` | Right of the sidebar, level with the trigger, moved up to stay `margin` inside the window; at the top margin, scrolling, when taller than the window. `undefined` when the panel does not fit beside the sidebar. |
| `keepInside` | `(offset, size, room, margin) => number` | An edge offset (`left`, or `right` from the window's right edge) moved just enough to keep a `size`-px panel `margin` px inside the window; a panel wider than the room keeps the near margin. |
| `pressedOutside` | `(target, inside) => boolean` | True when none of `inside` (panel, trigger) contains `target`. |

The tile picker opens upward with less than 200px below and aligns its left side. The Explainer
measures itself: beside the sidebar when it fits there (`placeBeside`, batch 02 D-04 A), otherwise
on the larger side of its trigger (`placeOnLargerSide`), aligning its right side. It used to open
upward with less than a fixed 420px below, which sent "How operations work" up into less room than
it had below.

### Callers

`controls/TilePicker.svelte`, `lib/ui/Explainer.svelte`, `lib/ui/Menu.svelte` (which opens upward
with less than about 40px per item left below, aligns either side, and uses `keepInside` once
the list has a width).

### Tests

`lib/ui/popover.test.ts`: placement under the trigger with both side offsets, opening upward,
the larger side (fits below, fits above, fits neither, a tie), beside the sidebar (level with the
trigger, moved up to stay inside, taller than the window, no room beside it),
`keepInside` (fits, pulled back from the far edge, wider than the room), and inside / outside
presses, including an unmounted panel.
