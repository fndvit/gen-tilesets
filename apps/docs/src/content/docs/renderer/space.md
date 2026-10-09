---
title: space.ts
description: Client coordinates to render space, done once, undoing any ancestor's CSS zoom.
sidebar:
  order: 7
---

**Written from:** `packages/tileset/src/render/space.ts`, the `client space to render space`
block of `occlusion.test.ts`, `apps/editor/src/paint.test.ts`, and the call sites in `render/measure.ts` and `apps/editor/src/paint.ts`.

## Overview

This module converts screen coordinates into the tileset's own coordinates. A mouse click or an
element's position arrives in *client* coordinates: pixels relative to the browser window. To ask
"which cell is under this point?" or "which cells does this heading cover?", the point first has
to be expressed relative to the tileset's box, in the box's own unscaled pixels. That is *render
space*.

The conversion has one trap. If a page scales the tileset down with a CSS transform, as the
editor's preview frame does, then screen pixels and layout pixels differ by that zoom. This module
recovers the zoom from the element itself, so a caller cannot pass the wrong number. It is used
by the editor's paint brush and by the keep-out tracker, both of which work *after* drawing, on the
picture as it sits on the page.

## In detail

### Purpose

Render space is "rendered pixels, relative to the render box's top-left corner. Not design px, not
client or page coordinates". The conversion used to live in the editor's `paint.ts`. When the
keep-out mask became a second caller, it moved here, because two copies of the same mapping would
drift (cited as **R1**).

### Public surface

All re-exported from `render/index.ts:73-79`.

| Export | Signature | Meaning |
| --- | --- | --- |
| [`RenderRect`](/api/render/type-aliases/renderrect/) | `= CellBox` | A rect in render space. The same four edges `cellBox` returns. |
| [`BoxMetrics`](/api/render/interfaces/boxmetrics/) | `{ clientLeft, clientTop, clientWidth, layoutWidth }` | What the conversion needs from the box, and nothing more. |
| [`metricsOf`](/api/render/functions/metricsof/) | `(box: HTMLElement) → BoxMetrics` | The only function here that touches the DOM. |
| [`toRenderSpace`](/api/render/functions/torenderspace/) | `(box, clientX, clientY) → { px, py }` | A point. |
| [`rectToRenderSpace`](/api/render/functions/recttorenderspace/) | `(box, { left, top, right, bottom }) → RenderRect` | A rect, such as any element's `getBoundingClientRect()`. |

### Inputs → outputs

`zoom = clientWidth / layoutWidth`, or `1` if either is `<= 0`. Then every coordinate is
`(client − box client origin) / zoom`. The vertical uses the same ratio.

`metricsOf` reads `getBoundingClientRect()` for the three client fields and `offsetWidth` for
`layoutWidth`.

### Invariants

- **The ratio is the display zoom, not `s`.** `s = Wpx / referenceWidth` is a different scaling
  that lives in `geometry.ts`. "Conflating the two is how a click lands on the wrong cell at every
  width but one."
- **One ratio for both axes.** The zoom is uniform, so a vertical ratio would be the same number
  computed twice, and it would divide by zero on a zero-height box, "the state a box is in for one
  frame at startup".
- **Scroll cancels out.** Both rects are in the same client coordinates, so nothing reads a scroll
  offset.
- **`offsetWidth` is `Wpx`** because the component styles the box with no padding and no border
  (cited as **S9**).

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/measure.ts:55, 287` | `rectToRenderSpace`, once per keep-out element per flush, with metrics built inline from the box rect and the ResizeObserver's un-rounded width. |
| `apps/editor/src/paint.ts:35, 70` | `toRenderSpace` in the brush's `cellUnder`. |
| `apps/editor/src/paint.ts:50` | Re-exports `metricsOf`, `toRenderSpace`, `BoxMetrics` so its own callers are unchanged. |
| `apps/editor/src/lib/PaintLayer.svelte:31, 65` | `metricsOf(box)` (via `paint.ts`). |
| `render/occlusion.ts:62` | Imports the `RenderRect` type. |

Callees: none beyond the DOM reads in `metricsOf`.

### Tests

There is no `space.test.ts`. Two cases in `occlusion.test.ts` (`client space to render space`)
cover it:

- A box displayed at half its layout width (`clientWidth 200`, `layoutWidth 400`) maps client
  `(150, 75)` to `(100, 50)`, and a client rect back to the box's own coordinates.
- A box with no size yet is treated as unzoomed, so `(3, 4)` maps to `(3, 4)` rather than dividing
  by zero.

`apps/editor/src/paint.test.ts:46-69` tests `toRenderSpace` through the editor's re-export: the
box's position is subtracted, the display zoom is undone, the same ratio is applied vertically,
and a zero-sized box survives. Its `cellUnder` block also checks that the zoom is undone *before*
the cell is bounded.

### Gotchas & rejected alternatives

- **`offsetWidth` is rounded to an integer.** The `BoxMetrics.layoutWidth` comment says that makes
  the zoom off by up to half a pixel in the width, which is why `measure.ts` passes the
  ResizeObserver's un-rounded `borderBoxSize` instead. `metricsOf` itself still uses
  `offsetWidth`, so the editor's brush gets the rounded value.

### Review notes

- `metricsOf` uses the rounded `offsetWidth`, which this file's own comment on `layoutWidth` names
  as the less accurate source. The brush therefore carries up to half a pixel of zoom error that
  the keep-out tracker does not. Probably harmless at brush precision, but it is an inconsistency
  between the two callers.
- The module has no test file of its own. Its tests live in `occlusion.test.ts` and in the
  editor's `paint.test.ts`, and `rectToRenderSpace` is covered only by the first.
