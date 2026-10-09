---
title: occlusion.ts
description: The keep-out mask. Which cells to hide so page content stays readable, computed in render space and never written back to the config.
sidebar:
  order: 12
---

**Written from:** `packages/tileset/src/render/occlusion.ts`, `occlusion.test.ts`, and the call
sites in `render/Tileset.svelte`.

## Overview

A tileset is often a background behind a heading or a paragraph. When the page reflows, the text
moves, and a tile that sat in empty space can end up under a word. The keep-out mask hides every
tile that would sit on top of the elements the host asks it to avoid. The tile is hidden
whole, never cut in half, and the cell simply draws nothing.

This module computes the mask. Given the measured rectangles of the elements to avoid, the lattice
the substrate actually painted, and each tile's drawn size and offset, it marks one byte per cell:
hide or show. The mask is a separate per-cell list that the painter reads. The generated grid is
never touched, so the picture underneath stays the same at every width. It sits at the draw end of
the pipeline: file → load → generate → place → **mask** → draw.

## In detail

### Purpose

Hide whole tiles whose drawn tile at rest meets a keep-out rect, in render space, without
regenerating. The header records two rejected designs:

- **Appending clearing Operations to the config and regenerating.** Rejected for what it costs: a
  full `generate()` on every resize, a file that is no longer the whole story, and the one function
  in the package flowing from render back into the engine.
- **A CSS `clip-path` / `mask-image` with holes.** It cuts tiles in half at the rect edge, where the
  brief is whole tiles hidden. Snapping the holes to the lattice would rebuild this mask "less
  inspectably", and it leaves no per-cell hook for a later fade.

### Public surface

`occlusionMask`, `sameMask`, `stableMask` and `OcclusionMask` are re-exported from
`render/index.ts:85`. `drawnTiles` and `DrawnTiles` are **not** re-exported.

| Export | Signature | Meaning |
| --- | --- | --- |
| [`OcclusionMask`](/api/render/type-aliases/occlusionmask/) | `Uint8Array` | One byte per cell, row-major; `1` hides. |
| `DrawnTiles` | `{ halfW, halfH, translateX, translateY: Float64Array; spill; transformed }` | Each cell's drawn tile at rest, in cells. |
| `drawnTiles` | `(grid) → DrawnTiles` | Computed once per generation. |
| [`occlusionMask`](/api/render/functions/occlusionmask/) | `(lattice, columns, rows, rects, padding, drawn?) → OcclusionMask` | The mask. |
| [`sameMask`](/api/render/functions/samemask/) | `(a, b) → boolean` | Same cells hidden. |
| [`stableMask`](/api/render/functions/stablemask/) | `(prev, next) → OcclusionMask` | `prev` by identity if unchanged, else `next`. |

### Inputs → outputs

**`drawnTiles(grid)`** fills per-cell `drawnHalfExtents` and exact translations, takes
`spill = maxSpill(grid)`, and sets `transformed` if any cell is translated or not an identity
transform.

**`occlusionMask`**, for each rect:

1. A rect with zero or negative area is skipped, **before** padding.
2. The rect is grown by `padding` CSS px on every side.
3. **Fast path** (no `drawn`, or `drawn.tiles.transformed` is false): `latticeRange` gives the cells
   met with positive area, and each row's span is filled with `1`.
4. **Transformed path:** the rect is grown further by `spill · pitch` to find candidate home cells.
   For each candidate not already hidden, the drawn box is
   `ox + (x + 0.5 ∓ halfW + tx/cellDev) · pitch` horizontally (and likewise vertically), with
   `(tx, ty)` from `translationDev` at the painter's `cellDev`. The cell is hidden when that box
   overlaps the grown rect with positive area.

Rects are OR'd. `sameMask` compares length and bytes. `stableMask` returns `prev` when
`sameMask(prev, next)`.

### Invariants

- **The config is never touched.** `generate()`'s output for an unchanged `(config, seed,
  loadSalt)` is byte-identical with or without a mask, "a resize is a pure rescale" still holds
  (cited as **R12**), and a cell uncovered at another width comes back as the same tile "because
  nothing was re-evaluated at all".
- **The drawn tile, not the lattice square** (since 0.8.0): a tile moved, scaled or turned onto a
  heading is hidden wherever its home cell is, and one moved clear of the heading stays.
- **The rest pose only.** The mask reads the generated transform, which is fixed per grid. "An
  animation never reaches it", so a hover effect that grows a tile over text does not hide it.
- **To the pixel.** The bounds use the translation the painter used, on the substrate's own
  lattice, so a tile is hidden exactly when its pixels would have met the rect.
- **Untransformed grids are byte-for-byte the pre-0.8.0 lattice rule.** The comment writes the
  bound as `x + (0.5 − halfW) + t` so an untransformed tile's left edge is `ox + x·p` "to the bit".

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:786` | `drawn = drawnTiles(grid)`, per grid. |
| `render/Tileset.svelte:794-801` | `mask`: `stableMask(lastMask, occlusionMask(lattice, columns, rows, keepout, padding, { tiles: drawn, cellDev: paintedCellDev }))`, or `null` without `avoid`, a lattice or a painted cell size. |
| `render/Tileset.svelte:820-822, 926, 1202` | Read as `mask[i] === 1`: the DOM sets `data-masked`, the canvas skips the item. |

No caller in `apps/editor/src` or `apps/demo/src`. Callees: `latticeRange` (`geometry.ts`);
`drawnHalfExtents`, `isIdentityTransform`, `maxSpill`, `translationDev` (`transform.ts`).

### Tests: `occlusion.test.ts`

- **Lattice rule:** equals a brute-force definition on random inputs; a rect that only touches an
  edge hides nothing; a zero-area rect is ignored even with padding (the `display: none` case);
  overlapping rects union; a rect past the grid is clipped and one wholly outside is ignored; more
  padding only ever hides more.
- **Drawn tile (0.8.0):** equals brute force on random transformed grids; is byte-for-byte the
  lattice rule for an untransformed grid; hides a tile moved onto the rect from three cells away and
  not its vacated home; hides a neighbour scaled over the rect; hides a 45° tile whose bounding box
  (not its diamond) meets the rect; does not hide a shrunk tile whose square meets the rect but whose
  drawing does not; rounds translation the way the painter does.
- **`stableMask`:** keeps the previous identity when nothing changed; takes the new mask when a
  cell flipped.
- The file also tests `space.ts` (see [space.ts](/renderer/space/)).

### Gotchas & rejected alternatives

- **The bounding box, not the exact quad.** Exact for translation and scale; conservative for a
  rotation off the quarter turns (a 45° tile is hidden when a rect touches the empty corner of its
  box). It "errs on the side of the text", costs four comparisons, and matches what `maxSpill`
  culls by. An exact rotated-square test is the named upgrade "if over-hiding is ever reported".
- **Until 0.8.0 the test was the lattice square,** kept for its simplicity and because it did not
  change with an attribute. Translation broke the first reason: a tile three cells off its home
  "sat visibly on the text while its empty home square was hidden".
- **`padding` is now only clearance.** Before 0.8.0 it was also the knob for a design whose tiles
  spilled.
- **Why zero area is tested before padding.** A `display: none` or detached element reports a
  `0 x 0` rect at the viewport origin; padded first, it would hide a block of cells in the corner.
- **Why `stableMask`.** Rects move on every frame of a resize, but the mask changes only when one
  crosses a cell edge. Returning the previous object means the DOM writes no attribute and the canvas
  does not repaint.
- **Cost.** Untransformed: O(rects + cells claimed). Transformed: each rect is grown by the grid's
  spill, so one far-translated tile widens the search border for every rect.

### Review notes

None found.
