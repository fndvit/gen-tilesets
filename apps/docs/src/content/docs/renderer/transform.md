---
title: transform.ts
description: A cell's scale, rotation and translation as a matrix, a CSS list, a device-pixel offset, and a bounding box.
sidebar:
  order: 11
---

**Written from:** `packages/tileset/src/render/transform.ts`, the transform blocks of
`geometry.test.ts`, `sizing.test.ts`, `uniform.test.ts`, `occlusion.test.ts` and `edges.test.ts`,
and the call sites in `render/Tileset.svelte`, `render/uniform.ts` and `render/occlusion.ts`.

## Overview

Each generated cell can be scaled, flipped, rotated, faded and, since 0.8.0, moved some distance
from its home square. This module turns those per-cell numbers into the forms the rest of the
renderer needs: a 2D matrix for the canvas, a CSS `transform` string for the DOM, a whole-pixel
offset for a moved cell, and the size of the box the drawn tile actually covers.

That last one matters because a cell is not a clipping boundary. A tile scaled up or turned 45°
paints into its neighbours, and a moved tile can land several cells away. Culling (deciding which
columns to draw) and the keep-out mask (deciding which tiles to hide behind text) both need to know
how far a tile reaches. The module sits in the draw stage, file → load → generate → **draw**.

## In detail

### Purpose

Pin the transform's order and direction, so two conformant renderers cannot disagree, and keep
**translation** separate from the transform so that a translated cell still lands on whole device
pixels. Two invariants open the file:

- **D11:** scale is applied **before** rotation, both about the drawable's centre. Non-uniform scale
  does not commute with rotation.
- **R7:** at `scaleX = 1, scaleY = 1, rotation = 0` a drawable occupies exactly its cell box.

### Public surface

All re-exported from `render/index.ts:95-107`.

| Export | Signature | Meaning |
| --- | --- | --- |
| [`Matrix`](/api/render/type-aliases/matrix/) | `[a, b, c, d, e, f]` | `x' = a·x + c·y + e`, `y' = b·x + d·y + f` |
| [`TransformAttributes`](/api/render/interfaces/transformattributes/) | `{ scale, scaleX, scaleY, rotation }` | Rotation in degrees, **positive is clockwise**. |
| [`Translation`](/api/render/interfaces/translation/) | `{ translateX, translateY }` | In **cells**. Deliberately not part of `TransformAttributes`. |
| [`translationDev`](/api/render/functions/translationdev/) | `(attrs, cellDev) → { tx, ty }` | Translation in whole device px. |
| [`transformMatrix`](/api/render/functions/transformmatrix/) | `(attrs, box: CellBox) → Matrix` | `T(c)·R·S·T(−c)` about the box centre. |
| [`applyMatrix`](/api/render/functions/applymatrix/) | `(m, x, y) → { x, y }` | For tests and extent reasoning. |
| [`cssTransform`](/api/render/functions/csstransform/) | `(attrs, translate?) → string` | `[translate(…) ]rotate(Rdeg) scale(sx, sy)` |
| [`isIdentityTransform`](/api/render/functions/isidentitytransform/) | `(attrs) → boolean` | No rotation and unit scale on every factor. Ignores translation. |
| [`drawnHalfExtents`](/api/render/functions/drawnhalfextents/) | `(attrs) → { halfW, halfH }` | Half the axis-aligned size of the drawn tile, in cells. |
| [`maxSpill`](/api/render/functions/maxspill/) | `(grid) → number` | Whole cells the furthest-reaching tile paints past its own cell. |
| [`sincos`](/api/index/functions/sincos/) | re-export from `../angle.ts` | Exact on the axes, `Math` elsewhere. |

### Inputs → outputs

- **Scale.** `sx = scaleX · scale`, `sy = scaleY · scale`. The uniform `scale` (ADR-005) is
  folded into both axes; it shares the axis factors' ordinal because a uniform factor commutes with
  them.
- **`transformMatrix`:** `a = sx·cos`, `b = sx·sin`, `c = −sy·sin`, `d = sy·cos`,
  `e = cx − (a·cx + c·cy)`, `f = cy − (b·cx + d·cy)`, with `(cx, cy)` from `cellCentre(box)`.
- **`cssTransform`:** the list is `rotate(…) scale(…)`, which applies **right to left**, so scale
  happens first as D11 requires. If `translate` is given, it is put first.
- **`translationDev`:** `Math.round(t · cellDev) + 0`. The `+ 0` folds `−0` into `0`, so a
  placement string never reads `-0px`.
- **`drawnHalfExtents`:** `0.5` each way for an identity transform; otherwise
  `halfW = (|sx|·|cos| + |sy|·|sin|) / 2` and `halfH = (|sx|·|sin| + |sy|·|cos|) / 2`.
- **`maxSpill`:** for every cell that is translated or not an identity, the larger of
  `halfW − 0.5 + |tx|` and `halfH − 0.5 + |ty|`, maxed over the grid and rounded **up**. A cell
  missing `translateX`/`translateY` is treated as `0`.

### Invariants

- **Positive rotation is clockwise** in the y-down render space. The comment warns that reversing
  the sign "would flip every asymmetric tile in every existing config with no version number
  moving".
- **Translation is placement, not transform.** Composition is `transform(pos) + t`: the tile turns
  and scales about its own centre, then moves in grid axes. As a leading `translate()` in the
  matrix or CSS list, every translated cell would stop being an identity transform, be rasterised
  at sub-pixel precision, and reopen seams. Added to the placement and rounded to a device pixel, a
  translated cell keeps its snapped box and two neighbours moved by the same amount keep their
  shared edge (cited as **R6**). Moving the box moves the centre too, so a rotated cell pivots about
  where it landed.
- **At `t = 0` nothing moves.** An untranslated cell's placement is byte-identical to pre-0.8.0.
- **`maxSpill` is a function of the grid alone,** so it is computed once per generation, not per
  resize.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:65, 482` | `isIdentityTransform` to omit `transform` entirely, and `cssTransform(cell)` (no translate) otherwise. |
| `render/Tileset.svelte:371` | `maxSpill(grid)` widens culling. |
| `render/Tileset.svelte:537` | `translationDev(cell, u.cellDev)` adds the translation to the DOM margins after measurement. |
| `render/uniform.ts:73, 524, 538, 561` | `translationDev`, `isIdentityTransform` and `sincos` in `uniformDrawList` and its private `cellMatrix`. |
| `render/occlusion.ts:63-70, 110, 115, 120, 196` | `maxSpill`, `drawnHalfExtents`, `isIdentityTransform`, `translationDev` for the keep-out mask. |

`transformMatrix` and `applyMatrix` have **no caller outside tests**. The canvas builds its matrix
in `uniform.ts`'s private `cellMatrix` instead (see Review notes). Callees: `cellCentre`
(`geometry.ts`), `sincos` (`../angle.ts`).

### Tests

There is no `transform.test.ts`. The module is covered from five files:

- **`geometry.test.ts`** (`transforms — 07 §6, D11`): reproduces a worked case exactly; checks that
  rotate-then-scale is *not* what is computed; clockwise for positive rotation; identity at scale 1;
  rotation about the centre; negative `scaleX` mirrors; a 45° drawable spans `cellSize·√2`; the CSS
  list stays in D11 order; uniform `scale` multiplies into both axes, commutes, is the identity at
  1, and reaches CSS as one folded pair. Also `isIdentityTransform` and `cssTransform`'s optional
  translate.
- **`sizing.test.ts`** (`maxSpill`, `translationDev`): `0` for an untransformed grid and for quarter
  turns; `0` for a shrunk tile and `1` for anything reaching a neighbour; translation counted in
  either direction on top of scale and rotation; agreement with `drawnHalfExtents`;
  `translationDev` is `round(t · cellDev)` and is `0`, never `−0`.
- **`uniform.test.ts`** uses `applyMatrix` to check that a quarter turn maps a cell onto itself.
- **`occlusion.test.ts`** uses `sincos` and `translationDev` to build expected masks.
- **`edges.test.ts`** tests `sincos` directly (exact at multiples of 90°).

### Gotchas & rejected alternatives

- **`isIdentityTransform` ignores translation on purpose.** Anything asking "does this cell reach
  past its home square?" must ask `drawnHalfExtents` *and* the translation, as `maxSpill` does.
- **One spill for the whole grid.** A single tile translated 40 cells makes culling build 40 extra
  hidden columns each side. The comment says this costs work, never size or layout, and that a
  per-tile check is the optimisation "if it ever shows".
- **Translation moves in device-pixel steps.** Invisible at rest; it would show only if translation
  were animated, "which is not what this attribute is for".
- **`sincos` moved to `../angle.ts`** because the `gradient` Source needs the same exactness and the
  engine cannot import from `render/`. It is re-exported here so existing imports are unchanged.

### Review notes

- `transformMatrix` is exported and tested, but the canvas does not use it. `uniform.ts`'s private
  `cellMatrix` restates the same six-term arithmetic against the device-px rect. The comment there
  says the arithmetic is "restated … rather than duplicated", but it is the same formula written a
  second time, which is the kind of second copy the cited **R1** warns about.
- The `cssTransform` docstring describes `translate` as optional and "the shipping renderer omits
  it". That is accurate; the parameter has no production caller.
