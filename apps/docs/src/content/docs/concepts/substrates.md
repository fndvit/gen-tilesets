---
title: The two substrates
description: Canvas and DOM, the two ways <Tileset> can paint, what each guarantees, and why there used to be three.
sidebar:
  order: 5
---

**Written from:** `packages/tileset/src/render/Tileset.svelte`,
`packages/tileset/src/render/uniform.ts`, `packages/tileset/src/render/options.ts`,
`packages/tileset/src/render/images.ts`, `packages/tileset/src/render/edges.ts`, and the module
pages linked below. Concept page: it names no module of its own.

## Overview

The drawing component can paint a tileset in two ways, called substrates. Everything before the
painting is shared: the same grid, the same placement, the same mask. Only the last step differs.

The default, **canvas**, paints the whole grid into one bitmap. It is seamless, since the bitmap
has no internal edges for gaps to appear in, and it is cheap for large grids. But a bitmap can only
be painted in the browser, so the server-rendered page has an empty, correctly sized box until
scripts run.

The alternative, **DOM**, makes one HTML element per visible cell, each holding an image. The
server-rendered HTML already contains the whole picture, every tile is a real element that can be
clicked or styled, and tiles can be allowed to spill outside the box. The price is many elements,
and pixel rounding has to be handled with more care.

## In detail

### Choosing

`options.substrate`, `"canvas"` (default) or `"dom"`. See [options.ts](/renderer/options/). Both
branches live in [Tileset.svelte](/renderer/tileset/), under *Substrate: canvas* and
*Substrate: DOM*.

### Side by side

| | Canvas | DOM |
| --- | --- | --- |
| Server-rendered HTML | an empty box with its height reserved | every cell, placed with affine percentage CSS |
| Cell size in device px | `round(s × cellSize × dpr)` (`uniformGeometry`) | `ceil(…)` (`domGeometry`) |
| Where the rounding residual goes | the bitmap is **presented** at the exact fractional width: one isotropic resample, no internal edges | the grid **overshoots** the box and is clipped, on purpose |
| Image decoding | `ImageBank` ([images.ts](/renderer/images/)), `drawImage` with a computed cover crop ([edges.ts](/renderer/edges/) `coverRect`) | `<img loading="lazy">`, `object-fit` |
| Per-cell transform | a canvas `transform(matrix)` | CSS `transform`, omitted when identity |
| `overflow: "visible"` | an error: a canvas cannot paint outside its own bitmap | supported: the box clips nothing and the host decides the clip |
| Keep-out mask | masked cells are skipped in the paint loop | `data-masked`, `visibility: hidden` |
| Hit testing | none (one element) | each `.cell` with `data-x`/`data-y` |
| Softness warnings (`cellTooSmall`, `assetTooSmall`) | yes | no (a [review finding](/review-findings/)) |
| A failed image | the bank reports it and retries when `src` changes | `loadFailed` records the key's failed `src` and reports it; a new `src` is retried (since 0.8.1) |
| A picture with no natural size (a viewBox-only SVG) | refused after decode and reported | refused on `load` and reported, through the same check (since 0.8.1) |

### Why the rounding differs

From [uniform.ts](/renderer/uniform/): the rounding residual has to go somewhere, and each of the
three obvious places is a reported defect. It can go into the cells (a flat chord cut off any
curved tile), off the edges (a clipped column), or into a gutter (a strip of page showing). Canvas
avoids all three by separating *rasterising* from *fitting the box*. DOM has no presentation step,
so it takes the clipped edge deliberately: `ceil` guarantees coverage.

### There used to be three

`Tileset.svelte` records that until 0.6.0 there was an `"svg"` substrate. It measured nothing, but
showed a backdrop hairline at every shared edge (the comment cites "+52% leak, the worst
measured"), and every new feature would have had to be built a third time. It was removed rather
than kept at a lower feature level.

### Try it

The story on [Tileset.svelte](/renderer/tileset/) has a substrate switch. Compare the two at a
fractional width, and with your browser zoomed.
