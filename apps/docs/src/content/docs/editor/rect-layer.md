---
title: RectLayer.svelte
description: The rectangle drag over the preview. Turns a pointer drag into a rectangle Selection's x, y, width and height, clamped to the grid.
sidebar:
  order: 58
---

**Written from:** `apps/editor/src/lib/RectLayer.svelte`, `paint.test.ts`, and the call site in
`App.svelte`. The arithmetic is in [paint.ts](/editor/paint/). Added in batch 02 (T-01, B-011).

## Overview

The rectangle layer lets the author draw a rectangle Selection by dragging on the preview. It
appears while an operation is being built or edited and its Selection is a rectangle (Drag). Press
on a cell, drag to the opposite corner and let go: the Selection's X, Y, Width and Height fields
follow as you drag, and so does the selection overlay. A click selects that one cell.

A translucent marquee follows the pointer even past the grid's edge, but the rectangle written covers
only the cells the grid has (Pol's batch 02 decision D-01). The overlay underneath shows what was
actually selected. The number fields stay the keyboard path, and can still be typed past the
grid's edge.

Like the paint layer, it writes into the operation draft, never into the document.

## In detail

### Purpose

The component is the **gesture** only, on the same terms as [PaintLayer](/editor/paint-layer/):
the selected cells are `SelectionOverlay`'s (**E7**, **E8**), resolved by the package's
`selection()` from the four numbers this writes. What it draws is a marquee (solid edge,
low-opacity fill) of the rectangle the pointer traced, and a dashed one-cell hover outline when no
drag is under way.

### Which Selection gets it

Decided by the Selection's **parameter shape**, in `App.svelte`'s `rectangle`: `rectParams(schema)`
from [paint.ts](/editor/paint/), true when the params are exactly the integers `x`, `y`, `width`,
`height`. Rejected: a registry flag (changes the Registry contract) and a check on the type's name
(the editor names no Selection type).

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `g` | [`GridGeometry`](/api/render/interfaces/gridgeometry/) | required | The grid as drawn at this width. |
| `box` | `HTMLElement \| null` | required | The render box element, bound out of `<Tileset>`. |
| `rect` | `Rect \| null` | required | The draft's four values; `null` while one of them is not a number. Shown in the readout. |
| `onChange` | `(rect: Rect) => void` | required | Receives the clamped rectangle on every move that changes it. |

### Inputs → outputs

- **`pointerdown`** (primary button) on a cell inside the grid (`cellUnder`): capture the pointer,
  start a drag at that cell, write a 1×1 rectangle.
- **`pointermove`** during a drag: `cellReached` (unbounded) becomes the drag's far corner; when
  it changed, write `rectFrom(from, to, { columns, rows })`. Without a drag, update the hover cell.
- **`pointerup`**, **`pointercancel`**, **Esc**: end the drag and keep what was written. Nothing
  has reached the file; the draft can still be discarded.
- Output: `<div class="layer" role="application" aria-label="Drag to draw the selection
  rectangle">`, the filled `.outline` marquee from `rectFrom(from, to)` (unclamped), and a readout
  `rectangle · x, y · w × h`.

### Invariants

- **Never mounted with the brush.** `App.svelte` mounts it in the `{:else if}` of `PaintLayer`,
  and `rectangle` is `null` whenever `painting` is not. `paint.test.ts` checks that no registered
  Selection has both shapes.
- **What is written never covers a cell outside the grid** (D-01); the outline may.
- **Nothing touches the file.** `onChange` is `drawRect`, which assigns into
  `draft.selectionParams`.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:46` | import |
| `App.svelte:544` | only when `painting === null`, `rectangle !== null` and `renderBox !== null`; `onChange={drawRect}` |

Callees: [`cellPlacementPercent`](/api/render/functions/cellplacementpercent/),
[`naturalHeight`](/api/render/functions/naturalheight/); `cellReached`, `cellUnder`, `metricsOf`,
`rectFrom` from [paint.ts](/editor/paint/).

### Tests

No test file for the component. `paint.test.ts` covers `rectFrom` (a click, the four directions,
the clamp, the unclamped outline), `cellReached`, and `rectParams` (including the registered
`rect`).

### Gotchas & rejected alternatives

- **Esc ends, it does not restore.** The batch plan asks that Esc and `pointercancel` end the
  drag; the values were already written on every move.
- **Canvas substrate only**, like `PaintLayer` and `SelectionOverlay`: the outline uses the ideal
  geometry.
