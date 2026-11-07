---
title: paint.ts
description: The canvas substrate's tile loop, shared by the live renderer and renderImage so both draw with the same code.
sidebar:
  order: 15
---

**Written from:** `packages/tileset/src/render/paint.ts`, and its two callers,
`packages/tileset/src/render/renderer.ts` (`#paint`) and `packages/tileset/src/render/image.ts`.

## Overview

One function, `drawItems`, draws the tiles of a tileset onto a canvas. The live renderer uses it
to paint the canvas on the page, and `renderImage` uses it to paint the raster it turns into a
PNG. Keeping the loop in one place means an exported image cannot drift from what the page shows.

It was moved out of `TilesetRenderer.#paint` in 0.11.0 with no change in behaviour.

## In detail

### Public surface

Internal to the package. It is not exported from `render/index.ts`.

| Export | Type | Meaning |
| --- | --- | --- |
| `drawItems(ctx, items, ready, mask, onDraw?)` | `(PaintContext, UniformItem[], ReadonlyMap<string, HTMLImageElement>, OcclusionMask \| null, callback?) → void` | Draws every item whose picture is ready and that the mask does not hide. |
| `PaintContext` | type | The context methods it calls: `drawImage`, `save`, `restore`, `transform`, `globalAlpha`. |

### What it does per item

1. **Skips a masked cell.** It is hidden by `options.avoid`'s keep-out mask.
2. **Skips a cell with no ready picture** (R3). There is no placeholder, and no sibling asset is
   drawn instead.
3. **Calls `onDraw`**, which the renderer uses for the development `assetTooSmall` warning.
4. **Crops a non-square picture** to the square cell, as `object-fit: cover` would (R8, `coverRect`).
5. **Draws it.** An axis-aligned, opaque item is one `drawImage`. An item with alpha or a
   transform is drawn between `save` and `restore`, with the matrix built about the cell's centre
   (D11, R7).

### What stays with the callers

Each caller sizes and clears its own backing store, sets smoothing, and decides when to paint at
all. The renderer also keeps its paint memo, the `cellTooSmall` warning and `pending`.

### Gotchas & rejected alternatives

- **The warning is a callback, not a `WarnOnce` held here.** The renderer keeps one `WarnOnce`
  per instance, so a resize drag does not repeat a warning. An image export has nowhere to send
  one.
