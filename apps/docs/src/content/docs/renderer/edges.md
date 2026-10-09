---
title: edges.ts
description: What survives of per-edge snapping. One device-pixel snap, and the canvas's centre-crop computed by hand.
sidebar:
  order: 10
---

**Written from:** `packages/tileset/src/render/edges.ts`, `edges.test.ts`, and the call sites in
`render/Tileset.svelte`.

## Overview

This is a small module of two helpers left over from an earlier way of drawing the grid. One
rounds a coordinate to a whole device pixel. The other works out how to crop an image so that it
fills a box without being stretched, which is what `object-fit: cover` does for an `<img>`
element. A canvas has no such property, so the canvas painter has to compute the crop itself.

The module once held the whole grid geometry: every grid line snapped separately to device pixels.
That approach produced cells that were one pixel wider than tall and is now gone; the uniform
square cell in `uniform.ts` replaced it. The module sits at the draw end of the pipeline,
file → load → generate → **draw**.

## In detail

### Purpose

The header says plainly that "the component no longer draws from this module's geometry". What is
left is "the part that was never in question":

- `snap`, because a coordinate must land on a whole device pixel. An asset whose outer edge sits on
  its viewBox boundary antialiases that edge into transparency in a box that is not a whole number
  of device pixels.
- `coverRect`, because a canvas has no `object-fit` and the centre-crop (cited as **R8**) still has
  to be computed there.

### Public surface

Both are re-exported from `render/index.ts:109`.

| Function | Signature | Returns |
| --- | --- | --- |
| [`snap`](/api/render/functions/snap/) | `(value: number, dpr: number) → number` | `Math.round(value * dpr)`, an **integer in device px**. |
| [`coverRect`](/api/render/functions/coverrect/) | `(naturalWidth, naturalHeight, dw, dh) → { sx, sy, sw, sh }` | The largest centred source rect with the destination's aspect ratio. |

### Inputs → outputs

`coverRect`:

| Case | Result |
| --- | --- |
| any of the four inputs `<= 0` | `{ 0, 0, max(nw,0), max(nh,0) }`, the whole (possibly empty) source. No `NaN`. |
| source wider than the destination ratio | crops the sides equally: `sw = nh * (dw/dh)`, `sx = (nw − sw) / 2` |
| source taller or equal | crops top and bottom equally: `sh = nw / (dw/dh)`, `sy = (nh − sh) / 2` |

Against a **square** destination and a **square** source neither branch crops anything. The header
calls that "the entire subpixel fix": the crop was never wrong, the rect it was being handed was.

### Invariants

- **`snap` uses `Math.round`**, the only choice that keeps a snapped edge within half a device
  pixel of the ideal one, so the grid never drifts from `cellBox`.
- **Integers, not `Math.round(v * dpr) / dpr`.** At DPR 3 that quotient is not exactly
  representable, so `left + (right − left) === right` fails by an ulp and *identical* degrades to
  *very close*. A substrate that wants CSS px divides at the very end.
- **The crop never depends on geometry.** The destination rect is fixed by `uniformDrawList`
  before `coverRect` is called, so the purpose of "the renderer never learns an aspect ratio" holds
  even though its letter is broken on canvas.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:66, 956` | `coverRect(img.naturalWidth, img.naturalHeight, item.side, item.side)` in the canvas paint loop. A zero-size result skips the cell. |
| `render/warn.ts` (comment) | Rule 1 compares the smaller intrinsic dimension *because* `coverRect` crops the long axis. |

`snap` has **no caller** in `packages/tileset/src`, `apps/editor/src` or `apps/demo/src` outside
its test. Callees: none.

### Tests: `edges.test.ts`

- `snap` returns an integer at DPR 1, 1.5, 2 and 3, and never moves a coordinate by more than half
  a device pixel.
- `coverRect` returns the whole source when the ratios match, crops the sides (centred) of a wide
  source and the top and bottom (centred) of a tall one, never letterboxes, and returns zeros rather
  than `NaN` for a `0 x 0` source. That case is a last guard: a picture with no natural size is
  refused before anything is drawn ([images.ts](/renderer/images/)).
- The file also tests `sincos` from `transform.ts` (exact at every multiple of 90°, including
  negative and wrapped angles; identical to `Math` elsewhere). See [transform.ts](/renderer/transform/).

### Gotchas & rejected alternatives

- **Gone, and deliberately:** the edge arrays, the draw list and `blitRect`'s quarter-turn
  transpose. Per-edge snapping paired an `x` edge with a `y` edge from two independently snapped
  sequences, so a cell came out 133 x 132, and the centre-crop shaved a flat chord off any asset
  tangent to its box. The header asks a reader to consult the investigation record before
  reintroducing any of them; "they are a measured dead end, not an omission".
- The test file header notes that the assertion which once found a cell non-square by one device
  pixel is gone too. `uniform.test.ts` asserts that no non-square cell exists.

### Review notes

- `snap` is exported and tested but has no production caller. The header still justifies it as
  "a coordinate still has to land on a whole device pixel", but that rounding now happens inside
  `uniform.ts` (`Math.round` / `Math.ceil` of the cell) without calling `snap`. Dead code in the
  shipping path.
- **`edges.test.ts:83`'s premise does not hold in Chrome.** It says "an SVG with no intrinsic
  dimensions reports 0". Verified in headless Chrome while building these docs: an SVG with only a
  `viewBox` reports `naturalWidth`/`naturalHeight` 150 × 150, but `drawImage` with that source rect
  paints the artwork into the top-left third of the destination. A 48 px cell showed a 16 px tile.
  The canvas substrate (`Tileset.svelte:956`) therefore draws viewBox-only SVGs shrunk; the DOM
  substrate's `<img>` with `object-fit` is unaffected. Every SVG in `apps/demo` declares
  `width`/`height`, which is why no app shows it; the docs fixture did not, until it was given
  them. (possible bug) **Fixed in 0.8.1:** `images.ts` `requireNaturalSize` refuses an SVG with
  no natural size on both substrates and reports it through `onAssetError`; the test comment
  (now lines 83-86) says Chrome reports 150 and calls `coverRect`'s zero case a last guard.
