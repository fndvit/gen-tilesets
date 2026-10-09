---
title: derive.ts
description: The one derivation in editor code. columns from the design width, cell size and alignment, and the bleed that results.
sidebar:
  order: 5
---

**Written from:** `apps/editor/src/derive.ts`, `derive.test.ts`, and the call sites in
`document.ts` and `App.svelte`.

## Overview

The derive module works out how many columns the grid has. The author never types that number.
They choose a design width, a cell size, and whether the page's centre line should fall through
the middle of a cell or on the line between two cells. From those three choices this module
computes the column count.

It always rounds up, so the grid is at least as wide as the design and there are no gaps at the
edges. It then adds one more column if needed, so the centre lands where the author asked. The
small overhang this creates on each side is intentional. The module also reports that overhang so
the editor can show it.

In the editor's pipeline, import → document → draft/history → preview → export, this is called
by the document whenever one of the three width fields changes.

## In detail

### Purpose

`derive.ts` implements:

```
n = ceil(referenceWidth / cellSize)
if parity(n) does not match horizontalAlignment: n += 1
columns = n
```

The header calls this one of the guarantees that invariant **E1** says the editor *manufactures*
and that nothing checks:

- `columns * cellSize >= referenceWidth`, so there are no gutters at the viewport edges;
- `columns`' parity matches `horizontalAlignment`.

The schema's diagnostics are described as these guarantees' *shadows*. So `columns` is derived
here, written only by the transitions in [document.ts](/editor/document/), and **displayed, never
edited**.

### Public surface

| Function | Signature | Returns |
| --- | --- | --- |
| `deriveColumns` | `(referenceWidth: number, cellSize: number, horizontalAlignment: Layout["horizontalAlignment"]) → number` | The column count. |
| `bleed` | `(referenceWidth: number, cellSize: number, columns: number) → number` | `columns * cellSize - referenceWidth`, in design px. |

Engine type: [`Layout`](/api/index/interfaces/layout/).

### Inputs → outputs

- `"column"` wants **odd** `columns`, so the centre axis falls through a cell.
- `"gutter"` wants **even** `columns`, so the axis falls on a boundary.
- The parity correction is always **upward**, by at most one.

With `referenceWidth = 1000`, `cellSize = 100`, `"gutter"`: `ceil(10) = 10`, even, so 10 and
`bleed = 0`. That is the fresh document.

The inputs are trusted: the callers pass values that [fields.ts](/editor/fields/) has already
admitted (`> 0`). `deriveColumns` does not guard against zero or negative values itself.

### Invariants

- **Parity is corrected upward.** Rounding down would leave gaps at the grid edges. Rounding up
  gives symmetric bleed, *the intended look*.
- **The renderer never reads `horizontalAlignment`.** Centring the grid on the render box's centre
  axis produces the chosen alignment purely through the parity this function fixes. *That is the
  whole of the field's function.*
- **`referenceWidth != columns * cellSize` is the point.** A renderer that assumed a grid-width
  design would make the bleed vanish, *exactly the outcome the design marks as wrong*.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `document.ts:138` | `deriveColumns` in `newDocument()` |
| `document.ts:218` | `deriveColumns` in `withLayout`, behind `setCellSize`, `setReferenceWidth` and `setHorizontalAlignment` |
| `App.svelte:123` | `bleed(layout.referenceWidth, layout.cellSize, config.columns)` for display |

Callees: none.

### Tests: `derive.test.ts`

- No correction where the parity already matches. Upward correction, never downward. A
  reproduction of the spec's worked example. Ceil rather than round.
- **Properties over a sweep:** the grid always covers the design width (E1), always matches the
  requested parity, never has fewer than one column, and corrects by at most one, so the bleed
  stays under two cells. The two alignments differ by exactly one column.
- `bleed` is zero exactly when the grid meets the design width, and otherwise is the difference.

### Gotchas & rejected alternatives

- **`bleed` is display-only.** *Nothing reads it.* It is shown beside `columns` so the author can
  see what the derivation did.
- **`rows` is not derived.** The grid is top-anchored and has no vertical counterpart to
  `horizontalAlignment`.

### Review notes

None found.
