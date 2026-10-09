---
title: uniform.ts
description: The ideal cell quantised to one whole number of device pixels, square on both axes, once per substrate, and the canvas draw list.
sidebar:
  order: 9
---

**Written from:** `packages/tileset/src/render/uniform.ts`, `uniform.test.ts`, `sizing.test.ts`,
and the call sites in `render/Tileset.svelte` and `apps/demo/src/Square2x2.svelte`.

## Overview

The ideal geometry in `geometry.ts` puts cells at fractional pixel positions: a cell might be
82.7 pixels wide. A screen can only light whole device pixels, so before anything is drawn the
fractional cell has to be rounded. How that rounding is done decides whether the picture shows
hairline gaps between tiles, crops the edge of a round tile flat, or leaves a strip of page showing
down the side of a full-bleed band.

This module does that rounding. It rounds the cell **once**, to one whole number of device pixels
used for both width and height, so every cell is exactly square and every shared edge is one
number. It does this in two ways, one for each drawing substrate, because they want different
guarantees: the canvas rounds to the nearest pixel and then stretches the finished bitmap very
slightly to the exact ideal width; the DOM rounds up, so the grid always covers its box. The
module also builds the canvas's list of draw operations. It sits between placement and painting:
file → load → generate → place → **quantise** → draw.

## In detail

### Purpose

The header records why the cell is quantised once rather than per edge. Per-edge snapping (the
rejected attempt in `edges.ts`) made every shared edge one array element, which was good, but a
cell then paired an `x` edge with a `y` edge from two independently snapped sequences and came out
133 x 132. The centre-crop then cut a flat chord off any curve tangent to its box: for a half-pixel
shave on a 190 px cell, a 19.5 px chord, "a 39x amplification". The fix:

```
cellDev = round(s * cellSize * dpr)      // ONE integer, both axes
```

**Where the residual goes.** The remainder of rounding has to be put somewhere. The header lists
three places that are each a reported defect: into the cells (the chord), off the edges (`ceil`,
clipped), or into a gutter (`round` presented at the snapped width). The canvas avoids all three by
splitting *rasterising* from *fitting the box*: it rasterises at the integer cell and is
**presented** at the ideal fractional width, one isotropic resample of one bitmap with no internal
edges to seam. The DOM substrate has no presentation step, so it takes the second option on purpose
(see `domGeometry`).

### Public surface

All re-exported from `render/index.ts:130-140`.

| Export | Signature | Meaning |
| --- | --- | --- |
| [`UniformGeometry`](/api/render/interfaces/uniformgeometry/) / [`uniformGeometry`](/api/render/functions/uniformgeometry/) | `(g, dpr) → UniformGeometry` | The canvas quantisation (`round`) and its presentation. |
| [`CanvasPresentation`](/api/render/interfaces/canvaspresentation/) / [`canvasPresentation`](/api/render/functions/canvaspresentation/) | `(g, u, dpr, { x0, x1 }) → CanvasPresentation` | How a canvas of only the visible columns is presented. |
| [`DomGeometry`](/api/render/interfaces/domgeometry/) / [`domGeometry`](/api/render/functions/domgeometry/) | `(g, dpr) → DomGeometry` | The DOM quantisation (`ceil`). Four integer fields. |
| [`domLattice`](/api/render/functions/domlattice/) | `(d, dpr) → Lattice` | The DOM's lattice in CSS px. |
| [`UniformItem`](/api/render/interfaces/uniformitem/) / [`uniformDrawList`](/api/render/functions/uniformdrawlist/) | `(g, grid, dpr, originXDev, keyOf, range?) → UniformItem[]` | The canvas draw list, row-major. |

### Inputs → outputs

**`uniformGeometry(g, dpr)`** (device px unless marked Css):

| Field | Value |
| --- | --- |
| `idealCell` | `s · cellSize · dpr` |
| `cellDev` | `max(1, round(idealCell))` |
| `gridWidthDev` | `columns · cellDev` |
| `originYDev` | `−round(yOffset · cellDev)` |
| `rasterHeightDev` | `rows · cellDev + originYDev`, the last y edge |
| `presentScale` | `idealCell / cellDev`, bounded by `1 ± 1/(2·cellDev)` |
| `presentedWidthCss` | `s · columns · cellSize`, the **ideal** width, not `gridWidthDev / dpr` |
| `originXCss` | `originX(g)` |
| `originXDev` | the grid's left edge at an integer device pixel (`pinnedOriginXDev`) |

**`pinnedOriginXDev`** (private): fluid always centres,
`round((Wpx·dpr − columns·cellDev) / 2)`, whatever `alignX` says. Fixed pins the design box
(`referenceWidth / cellSize` cells) by `alignFraction(alignX, 0.5)` and places the grid inside it.

**`canvasPresentation`** for columns `[x0, x1)`: `rasterWidthDev = max(1, n·cellDev)`,
`widthCss = s·n·cellSize`, `leftCss = originX + x0·pitch`, `topCss` the `alignY` shift against the
presented height `rasterHeightDev · presentScale / dpr` (0 when top-aligned or no `Hpx`), and the
`lattice` the keep-out mask reads.

**`domGeometry(g, dpr)`**: `cellDev = max(1, ceil(idealCell))`; `originXDev` pinned the same way;
`originYDev = −round(yOffset·cellDev)`, then shifted by `alignY` against the grid height
(private `alignedOriginYDev`); `gridHeightDev = rows·cellDev + unshifted originYDev`.

**`uniformDrawList`**: for each non-empty cell in `range`, in `grid.cells` order:
`dx = originXDev + (x − x0)·cellDev + tx`, `dy = originYDev + y·cellDev + ty` (translation from
`translationDev`), `side = cellDev`, the centre, `matrix` (`null` for an identity transform, else
the private `cellMatrix` about the cell's own centre), `alpha = opacity`, the asset `key` and the
cell's flat `index`.

### Invariants

- **Every cell is square,** `cellDev` on both axes, so `coverRect` and `object-fit: cover` crop a
  square asset by nothing.
- **R6 (cited), the short form.** Edge `k` is `originXDev + k·cellDev`, one number for both
  neighbours, and widths are now equal as well as adjacent.
- **Heights come off the edge arithmetic.** `rows·cellDev + originYDev`, never
  `(rows − yOffset)·cellDev`: `originYDev` is rounded, so the two differ by up to half a device
  pixel, which shows as a hairline under the bottom row or a shaved bottom row.
- **The presented width is the ideal width.** If it ever disagreed with `s·columns·cellSize`, "the
  raster and the presentation had drifted apart".
- **R1 (cited) is untouched.** Both functions quantise the one ideal mapping; they differ only in
  "which way the remainder is allowed to fall".
- **The DOM cell tracks the design's scale:** `ceil(idealCell)`, never `ceil(Wpx·dpr / columns)`,
  which would make the designed bleed vanish.
- **Row-major order is paint order** (cited as **R10**), for free from `grid.cells`. Empty cells
  are omitted, not emitted with a null key. **No asset is consulted** (cited as **R5**).

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:677-679` | `uniformGeometry(geometry, dpr)` as `uniform`, canvas and measured only. |
| `render/Tileset.svelte:725-729` | `canvasPresentation(geometry, uniform, dpr, canvasColumns)`. |
| `render/Tileset.svelte:700-702` | `domGeometry(geometry, dpr)` as `domCell`, DOM and measured only. |
| `render/Tileset.svelte:743, 771` | `domLattice` for DOM culling and for the mask. |
| `render/Tileset.svelte:851-855` | `uniformDrawList(geometry, grid, dpr, 0, assetKey, presentation)`, passing the presentation as the range. |
| `apps/demo/src/Square2x2.svelte:37, 41, 164-165` | `uniformGeometry` and `domGeometry` in a diagnostic readout. |

Callees: `alignFraction`, `originX`, `scaleFactor` (`geometry.ts`); `isIdentityTransform`, `sincos`,
`translationDev` (`transform.ts`).

### Tests

**`uniform.test.ts`**, against a reported case (`cellSize 100`, `referenceWidth 1000`, 827 px box)
and a fractional-`yOffset` layout, over many widths and DPRs:

- **Square:** one integer side on both axes; a square destination for every item; never below one
  device pixel.
- **Shared edge:** cell `k`'s right is cell `k+1`'s left; no gap or overlap between draw items;
  every coordinate integral.
- **Presentation:** `presentScale` within its bound, reaching the extreme at the footer preset's
  worst width; presented at exactly the ideal width; exactly 1 where nothing rounds; a presented
  edge *is* `cellBox`'s.
- **Height:** the raster height equals the last horizontal edge and differs from the naive product
  exactly where that is wrong; the presented canvas is not the declared ratio's height at a
  fractional `yOffset`, and is sometimes shorter.
- **Draw list:** row-major, omits empty cells, reads no asset, carries opacity verbatim, nulls the
  matrix only for identity, takes the transform about the cell's own centre; the DOM origin centres
  and the canvas one does not.
- **Translation:** `t = 0` moves nothing; a shift is `round(t·cellDev)` with a null matrix; shared
  edges survive equal translation; a rotated tile pivots about where it landed.
- **Quarter turn:** maps the cell rect onto itself exactly; `sincos` keeps it axis-aligned; a free
  angle still spills.
- **`domGeometry`:** never gutters at any width or DPR (and the same assertion *fails* for
  `uniformGeometry`, so it constrains something); covers the box; the box height is the grid's
  extent, short only by the y-origin rounding; `originYDev` stays on `round`; square, integral, at
  least one device pixel; shared edges; overshoot under one device pixel per column plus the bleed;
  agrees with `uniformGeometry` where nothing rounds.

**`sizing.test.ts`** adds: the DOM origin is unchanged by `alignX` under fluid; the canvas presents
as 0.5.0 did when every column is visible; fixed sizing gives an exact integer cell at integer DPR
where `ceil` and `round` agree; the DOM grid pins the same way to within a device pixel; the DOM box
height ignores alignment; and the culled draw list is the full list filtered to the range, indexed by
cell, and presented where those columns sit.

### Gotchas & rejected alternatives

- **Why `ceil` for DOM, `round` for canvas.** The canvas's presentation undoes the quantisation, so
  only the residual's magnitude matters and `round` halves it. The DOM has no presentation and can
  feel only the residual's *sign*. Swept over 3,000 widths of a 76-column zero-bleed preset, `round`
  guttered at about half of them (1470, 1450 and 1446 at DPR 1, 2, 3), by up to 19 device px per
  side; `ceil` guttered at 0 at every DPR.
- **The cost of `ceil` is real.** The side clip goes from a signed `[−19, +19]` to `[0, 38]` device
  px per side, about 2.5 columns at DPR 1 on that preset. "What goes away is the half of it that
  showed backdrop." The comment stresses that this is *not* the rejected attempt 3, which applied
  `ceil` to a substrate that had to fit its box.
- **The vertical axis is answered differently.** Vertically the box height is the component's own,
  so the answer is not a rounding but `gridHeightDev`, which the box takes its height *from*.
- **`UniformGeometry.originXDev` is kept but unused by either substrate.** Under canvas the draw
  list is passed 0, because the canvas *is* the grid. Its sign alternates with width, which is why
  the DOM uses `domGeometry` instead.
- **`canvasPresentation` exists for size.** Under fixed sizing a 76-column grid on a phone shows
  about eight columns; rasterising all of them would put a 10k-device-px canvas behind a 375 px box,
  "past iOS's canvas area budget at DPR 3".
- **No `bw`/`bh`, no `blitRect`.** A quarter-turned square is the same square.
- **`originXDev` is a parameter of `uniformDrawList`,** not read off `u`, so the call site shows
  which substrate's answer it wants.

### Review notes

- `cellMatrix` duplicates `transformMatrix`'s six-term formula. Its comment says the arithmetic is
  "restated … rather than duplicated", but it is a second copy, which the cited **R1** warns against
  for the coordinate mapping. The reason for not reusing `transformMatrix` (it takes a fractional
  `CellBox`, and a centre half a device pixel off would shear the drawable) is sound; a shared helper
  taking a centre would remove the copy.
- `DomGeometry.originYDev`'s comment says it is "`0` when `yOffset` is 0, negative otherwise". After
  `alignedOriginYDev` it can be shifted by a non-top `alignY`, so with a host-set height it can be
  positive or non-zero at `yOffset` 0.
- `domGeometry`'s docstring says it is "everything `domPlacement` needs". `domPlacement` is a
  private function inside `Tileset.svelte`, so the name means nothing to a reader of this file alone.
