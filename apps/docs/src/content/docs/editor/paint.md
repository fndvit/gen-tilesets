---
title: paint.ts
description: The cellList brush. Find the in-grid cell under a pointer, and keep the painted-cell list free of duplicates.
sidebar:
  order: 12
---

**Written from:** `apps/editor/src/paint.ts`, `paint.test.ts`, and the call sites in
`lib/PaintLayer.svelte` and `App.svelte`.

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

Engine: [`GridGeometry`](/api/render/interfaces/gridgeometry/).

### Inputs → outputs

- **`cellUnder`** calls `toRenderSpace(box, clientX, clientY)`, then `cellAt(g, px, py)`. If
  `x < 0`, `y < 0`, `x >= g.columns` or `y >= g.rows`, it returns `null`. Otherwise `[x, y]`.
- **`addCell`** returns a copy unchanged if the cell is present, otherwise appends.
- **`removeCell`** filters by value. Removing an absent cell is a no-op copy.
- **`strandedCells`** returns the entries outside the grid, in order.

### Invariants

- **`cellAt` stays unbounded; the brush bounds at the call site.** The two tools want opposite
  answers:

  | Tool | Bounds? | Why |
  | --- | --- | --- |
  | `rect` drag | no | A rectangle dragged to the edge is not silently resized. |
  | `cellList` brush | yes | A painted cell outside the grid can never be drawn, seen or clicked. |

  The asymmetry is that a `rect` states an intention that survives the grid growing, while a
  `cellList` entry is a claim about one specific cell.
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
| `App.svelte:67` | `type Cell`, for `painting` and `paintCells` |

`strandedCells` has **no caller outside `paint.test.ts`**.

Callees: [`cellAt`](/api/render/functions/cellat/) and
[`toRenderSpace`](/api/render/functions/torenderspace/) from `@fndvit/gen-tilesets/render`.

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
