---
title: PaintLayer.svelte
description: The cellList brush over the preview. Turns pointer strokes into added or removed cells, and draws only the hover outline.
sidebar:
  order: 58
---

**Written from:** `apps/editor/src/lib/PaintLayer.svelte`, `paint.test.ts`, and the call site in
`App.svelte`. The pointer maths is in [paint.ts](/editor/paint/).

## Overview

The paint layer is the brush. It appears over the preview only while the author is building or
editing an operation whose Selection is a hand-painted list of cells (`cellList`). The author
clicks or drags across the picture to paint cells into the list; starting a stroke on a cell that
is already painted erases instead, for the whole stroke.

The layer itself draws only an outline around the cell under the pointer, red-ish when that cell
would be erased. The painted cells are drawn by the selection overlay underneath. A small readout
says which parameter is being painted, how many cells it holds and which cell the pointer is on.

In the editor's pipeline (import → document → **draft**/history → **preview** → export), it writes
into the draft's parameters from the preview. Nothing reaches the document until the draft is
committed.

## In detail

### Purpose

The component is the **gesture** only. The header comment explains what is absent: painted cells
are `SelectionOverlay`'s, because **E7** admits exactly one kind of overlay and a `cellList`'s
set is resolved through the package's `selection()` like any other (**E8**). Drawing them here as
well would be "two drawings of the same cells", the drift E8 exists to prevent. Which cell is under
the pointer is decided by the package's `cellAt`, through `cellUnder` in `paint.ts`, never
re-implemented.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `g` | [`GridGeometry`](/api/render/interfaces/gridgeometry/) | required | The grid as drawn at this width. |
| `box` | `HTMLElement \| null` | required | The render box element, bound out of `<Tileset>`. `null` until it mounts. |
| `cells` | `Cell[]` | required | The current list (`Cell` is `[number, number]`). |
| `onChange` | `(cells: Cell[]) => void` | required | Receives the whole new list. |
| `param` | `string` | required | The parameter name, for the label and readout. |

### Inputs → outputs

- `at(event)`: `null` if `box` is `null`; otherwise `cellUnder(g, metricsOf(box), clientX,
  clientY)`, which converts to render space (undoing the display zoom), calls `cellAt`, and returns
  `null` outside `rows × columns`.
- **`pointerdown`** on a cell: capture the pointer; `stroke = { pointerId, painting:
  !hasCell(cells, cell) }`; apply to that cell; `preventDefault()`.
- **`pointermove`**: update `hovered`; if the same pointer is stroking and over a cell, apply.
- **`pointerup` / `pointercancel`**: release and end the stroke. **`pointerleave`** clears
  `hovered`.
- `apply(cell, painting)`: `addCell` or `removeCell`, and `onChange(next)` only if the length
  changed.
- Output: `<div class="layer" role="application" aria-label="Paint <param> cells">` (`absolute`,
  `inset: 0`, crosshair cursor, `touch-action: none`, `user-select: none`), the hover `.cell`
  (`erasing` when it is painted), and the readout.

### Invariants

- **The stroke keeps one mode**, decided by the cell it started on (cited as D25). A stroke that
  re-decided per cell would toggle every cell it crossed.
- **Re-entering a cell is a no-op.** `addCell` is idempotent and `removeCell` is total.
- **Bounded at the call site, not in `cellAt`.** `cellAt` stays unbounded because a `rect` drag
  needs the coordinates it actually reached.
- **Nothing touches the file.** `onChange` writes `draft.selectionParams` (`App.svelte:336`–`339`).

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:62` | import |
| `App.svelte:854`–`860` | only when `painting !== null && renderBox !== null`; `g` from `shapedAt(Wpx)`, `box={renderBox}`, `cells={brush.cells}`, `param={brush.name}`, `onChange` → `paintCells(name, cells)` |

Callees (`PaintLayer.svelte:26`–`31`): [`cellPlacementPercent`](/api/render/functions/cellplacementpercent/),
[`naturalHeight`](/api/render/functions/naturalheight/); `addCell`, `cellUnder`, `hasCell`,
`metricsOf` (re-exported from the package's [`metricsOf`](/api/render/functions/metricsof/)),
`removeCell` from [paint.ts](/editor/paint/).

### Tests

No test file for the component. `paint.test.ts` pins every helper it calls: client coordinates to
render space (offset subtraction, undoing the display zoom, the same ratio vertically, a
zero-sized box); `cellUnder` (the cell a point falls in, a shared edge going to the higher index,
`null` outside the grid, bounding by `columns × rows` rather than the box, `yOffset`, converting
through the zoom before bounding); and the list helpers (idempotent add, remove by value, no
`(x, y)`/`(y, x)` confusion, inputs never mutated).

### Gotchas & rejected alternatives

- **`role="application"`.** The comment: this is a drawing surface, and the keyboard equivalent is
  a genuinely different affordance (naming cells by coordinates), not a missing one.
- **Canvas substrate only.** Like `SelectionOverlay`, the hover outline uses the ideal geometry,
  which is where cells land only under `substrate: "canvas"`.
- **Brush wins over the reference image.** `App.svelte` passes `painting` to `PreviewFrame`, which
  removes the reference image's drag surface while the brush is active.

### Review notes

- `styleOf`, `height`, `vScale` and their long comment are duplicated verbatim from
  `SelectionOverlay.svelte`. (inconsistency)
- The paint gesture has no keyboard path. The comment defends that choice, but there is no other
  way in the editor to add a cell to a `cellList`. (doc gap)
