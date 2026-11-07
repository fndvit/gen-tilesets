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
| `pressedOutside` | `(target, inside) => boolean` | True when none of `inside` (panel, trigger) contains `target`. |

The tile picker opens upward with less than 200px below and aligns its left side; the Explainer
with less than 420px, and aligns its right side.

### Callers

`controls/TilePicker.svelte`, `lib/ui/Explainer.svelte`, `lib/ui/Menu.svelte` (which opens upward
with less than about 40px per item left below, and aligns either side).

### Tests

`lib/ui/popover.test.ts`: placement under the trigger with both side offsets, opening upward, and
inside / outside presses, including an unmounted panel.
