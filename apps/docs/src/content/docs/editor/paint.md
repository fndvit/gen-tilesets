---
title: paint.ts
description: The cellList brush and the rectangle drag. Find the cell under a pointer, keep the painted-cell list free of duplicates, and turn two cells into a rectangle.
sidebar:
  order: 12
---

**Written from:** `apps/editor/src/paint.ts`, `paint.test.ts`, and the call sites in
`lib/PaintLayer.svelte`, `lib/RectLayer.svelte` and `App.svelte`.

## Overview

The paint module is the arithmetic behind the editor's cell brush. One kind of operation affects
an exact list of cells that the author paints by hand, clicking and dragging over the preview.
This module turns a mouse position into the grid cell under it, and adds or removes that cell
from the list.

A click outside the grid paints nothing. A cell painted there could never be seen or clicked
again to remove it. Painting a cell that is already in the list does nothing, so a drag that
passes over the same cell twice does not add it twice.

In the editor's pipeline, import → document → **draft**/history → preview → export, the brush
writes into the operation draft from the preview. The painted list reaches the document only when
the draft is committed.

Since batch 02 (T-01) it also holds the arithmetic for dragging a rectangle Selection: two cells
become an `x, y, width, height`, clamped to the grid, and a Selection counts as a rectangle when its
parameters are exactly those four integers.

## In detail

### Purpose

`paint.ts` exists for exactly one parameter type: `cellList`. The source calls it the one
exception to E9's rule that every control can be generated mechanically, permitted because the
schema names it explicitly. The work splits in two:

- **Into render space.** Convert client coordinates into render space, then call
  [`cellAt`](/api/render/functions/cellat/). The editor never reimplements `cellAt`.
- **List bookkeeping.** Add, remove and test cells in the list.

The conversion itself (`metricsOf`, `toRenderSpace`, `BoxMetrics`) lived here until 0.6.0. It
now lives in the package's `render/space.ts`, because the keep-out tracker became its second
caller. It is **re-exported** so this module's callers and tests are unchanged.

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `Cell` | `[number, number]` | A painted cell, as a tuple in the file. |
| `metricsOf`, `toRenderSpace`, `BoxMetrics` | re-exports | See [`metricsOf`](/api/render/functions/metricsof/), [`toRenderSpace`](/api/render/functions/torenderspace/), [`BoxMetrics`](/api/render/interfaces/boxmetrics/). |
| `cellUnder(g, box, clientX, clientY)` | `(GridGeometry, BoxMetrics, number, number) → Cell \| null` | The in-grid cell under a pointer, or `null`. |
| `hasCell(cells, cell)` | `(readonly Cell[], Cell) → boolean` | Membership by value. |
| `addCell(cells, cell)` | `(readonly Cell[], Cell) → Cell[]` | Idempotent append; always a fresh array. |
| `removeCell(cells, cell)` | `(readonly Cell[], Cell) → Cell[]` | Removes every equal entry; always a fresh array. |
| `strandedCells(cells, columns, rows)` | `(readonly Cell[], number, number) → Cell[]` | Cells outside `[0, columns) × [0, rows)`. |
| `Rect` | `{ x, y, width, height }` | A rectangle Selection's parameters. |
| `cellReached(g, box, clientX, clientY)` | `(GridGeometry, BoxMetrics, number, number) → Cell` | The cell under a pointer, unbounded. |
| `rectFrom(a, b, bound?)` | `(Cell, Cell, { columns, rows }?) → Rect` | The rectangle two cells span: smaller corner, inclusive size. With `bound`, both cells are clamped into the grid first. |
| `rectParams(schema)` | `(ParamSchema) → boolean` | Whether the params are exactly the integers `x`, `y`, `width`, `height`. |

Engine: [`GridGeometry`](/api/render/interfaces/gridgeometry/).

### Inputs → outputs

- **`cellUnder`** calls `toRenderSpace(box, clientX, clientY)`, then `cellAt(g, px, py)`. If
  `x < 0`, `y < 0`, `x >= g.columns` or `y >= g.rows`, it returns `null`. Otherwise `[x, y]`.
- **`addCell`** returns a copy unchanged if the cell is present, otherwise appends.
- **`removeCell`** filters by value. Removing an absent cell is a no-op copy.
- **`strandedCells`** returns the entries outside the grid, in order.
- **`cellReached`** is `cellUnder` without the bound: `[x, y]` from `cellAt`, possibly negative or
  past the last column.
- **`rectFrom`** clamps each cell to `[0, columns-1] × [0, rows-1]` when given a bound (and the
  grid has at least one cell), then returns `{ x: min, y: min, width: |Δx| + 1, height: |Δy| + 1 }`.
  A click is 1×1; all four drag directions give the same rectangle.
- **`rectParams`** sorts the keys and compares them with `height, width, x, y`, each of type
  `integer`.

### Invariants

- **`cellAt` stays unbounded; the brush bounds at the call site.** The two tools want opposite
  answers:

  | Tool | Bounds? | Why |
  | --- | --- | --- |
  | `rect` drag | the result, not the gesture | Batch 02 D-01. |
  | `cellList` brush | yes | A painted cell outside the grid can never be drawn, seen or clicked. |

  The `rect` row used to read "no". Pol's D-01 split it: the dragged outline follows the pointer
  past the edge, but the rectangle written covers only cells the grid has. A `rect` typed into the
  fields may still extend past the grid, and `cellAt` stays unbounded because the outline needs
  the coordinates the drag reached.
- **No duplicates.** A duplicate would be legal and invisible, since membership is all the
  predicate tests. It would grow the file on every stroke, with nothing to show for it and nothing
  to remove it by.
- **Whole-value.** No helper mutates its input.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `lib/PaintLayer.svelte:31` | imports `addCell`, `cellUnder`, `hasCell`, `metricsOf`, `removeCell`, `Cell` |
| `lib/PaintLayer.svelte:65` | `cellUnder(g, metricsOf(box), event.clientX, event.clientY)` |
| `lib/PaintLayer.svelte:72` | `addCell` or `removeCell` per stroke; `onChange(next)` only if the length changed |
| `lib/PaintLayer.svelte:80`, `:176` | `hasCell`: a stroke paints if it starts on an empty cell and erases otherwise; the hover style |
| `App.svelte:62` | `rectParams`, `type Cell`, `type Rect`, for `painting`, `rectangle`, `paintCells` and `drawRect` |
| `lib/RectLayer.svelte:29` | imports `cellReached`, `cellUnder`, `metricsOf`, `rectFrom`, `Cell`, `Rect` |

`strandedCells` has **no caller outside `paint.test.ts`**.

Callees: [`cellAt`](/api/render/functions/cellat/) and
[`toRenderSpace`](/api/render/functions/torenderspace/) from `@vit-foundation/gen-tilesets/render`.

### Tests: `paint.test.ts`

The header says `cellAt` itself is **not** tested here. The package covers it. These tests cover
only what the editor owns.

- **To render space** (through the re-export). It subtracts the box position and undoes the
  display zoom, the same ratio vertically, and survives a zero-sized box (one frame after mount).
- **`cellUnder`.** It finds the cell and puts a shared edge in the higher-indexed cell
  (half-open). It returns `null` outside the grid, bounds against `columns`/`rows` rather than
  the render box, accounts for `yOffset`, and converts through the zoom before bounding.
- **The list.** `addCell` is idempotent; `removeCell` removes by value and is a no-op when absent;
  `(x, y)` is not confused with `(y, x)`; inputs are never mutated.
- **`strandedCells`** names the out-of-grid cells and finds nothing when all fit.
- **The rectangle drag.** `rectFrom`: a click is 1×1, the four directions agree, the bound clamps
  past either edge, and without a bound it follows the pointer. `cellReached` returns the
  unbounded cell where `cellUnder` says `null`.
- **`rectParams`.** True for the four integers in any order; false with a fifth, a missing one, a
  non-integer, a `cellList` or nothing. It matches the registered `rect`, and no registered
  Selection is both a rectangle and a brush.

### Gotchas & rejected alternatives

- **The pointer conversion is called *"the single most likely place to get this wrong"*.** That
  is why it is a function of a plain record rather than of an element, and why it now has exactly
  one implementation, in the package.
- **Paint-or-erase is decided at pointer-down** in `PaintLayer.svelte`, not here. A drag never
  toggles.

### Review notes

- `strandedCells` is exported and tested but never called. Its docstring says it supplies *"what
  §9.3's confirmation needs to say"*. The confirmation and the advisories use `orphans()` from
  [orphans.ts](/editor/orphans/) instead (`App.svelte:224`, `:231`). (dead code)
