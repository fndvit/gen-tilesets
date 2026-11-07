---
title: image.ts
description: renderImage draws a tileset to a PNG at a chosen width and density, with no element on the page; imageSize gives the PNG's size first.
sidebar:
  order: 16
---

**Written from:** `packages/tileset/src/render/image.ts`, `image.test.ts`.

## Overview

`renderImage(file, options)` turns a tileset into a PNG `Blob`. The caller chooses the width the
tileset is laid out at and a density (device px per CSS px). It does not use the screen's DPR, so
the same options give the same PNG on any machine. `imageSize(file, options)` returns the PNG's
pixel size without loading a picture, so a host can show the size before exporting. Both were
added in 0.11.0. The editor's Export image dialog uses them.

The image is the box. It is as wide as the width chosen and as tall as the grid, with any bleed
clipped as `overflow: hidden` clips the live box.

## In detail

### Public surface

Both functions are exported from `render/index.ts`, with their `ImageOptions` and `ImageSize`
types.

| Export | Type | Meaning |
| --- | --- | --- |
| `renderImage(file, options)` | `(TilesetFile, ImageOptions) → Promise<Blob>` | A PNG. Rejects if a picture fails, if the size is not a positive number, or if the browser cannot encode the canvas. |
| `imageSize(file, options)` | `(TilesetFile, ImageOptions) → ImageSize` | `{ width, height }` in px: exactly what `renderImage` produces. |

| `ImageOptions` field | Meaning |
| --- | --- |
| `width` | The box's width in CSS px. The PNG is `round(width × density)` px wide. |
| `density` | Device px per CSS px, which stands in for the DPR. |
| `background?` | A CSS colour to fill under the tiles. When it is left out, gaps are transparent. |
| `seed?`, `loadSalt?`, `provider?` | As in `TilesetOptions`. |
| `sizing?`, `align?`, `responsive?` | As in `TilesetOptions`. A responsive rule holds when it would at `width`. |

`substrate`, `overflow`, `avoid` and `onAssetError` are not accepted. An image is always the
canvas substrate, clipped to the box, with no page around it, and a failure is the rejection.

### How it renders

1. **A `TilesetModel` with known inputs.** The model reads four things from the page: width,
   height, keep-out rects and DPR. For an image they are the chosen width, the grid's own
   height, `null` and the density, so nothing is measured and nothing is put in the document.
   The model's uid is a fixed `"gts-image"`, because the stylesheet it names is never written.
2. **The height comes from a second pass.** A non-top `alignY` reads the box's height. The first
   pass gives the grid's height, which no height setting affects. It is pushed back, so the grid
   sits at the top, as it does in a live box that has no height of its own.
3. **Wait for every picture.** Every drawable is awaited (`settleDrawables`). Then a private
   `ImageBank` loads every `src` with `crossOrigin = "anonymous"` (`loadAll`). No failure ends
   the wait early.
4. **If anything failed, reject** with one error that names each `tileId/assetId`, and draw
   nothing. The causes are on the error's `cause`.
5. **Paint the raster** with `drawItems` (`paint.ts`), exactly as the live canvas is painted.
6. **Compose the box.** A `round(W·d) × round(H·d)` canvas. If `background` is given, it is
   filled first. Then the raster is drawn at the presentation's `leftCss·d`, `topCss·d` and
   `widthCss·d`, with its height from the raster's own ratio. Whatever falls outside the canvas
   is not drawn, and that is the clip.
7. **`toBlob("image/png")`.** A `null` blob rejects.

### Gotchas & rejected alternatives

- **No hidden renderer.** Mounting a `TilesetRenderer` off-screen would need a laid-out host, a
  DPR override and a public "settled" signal that the live renderer has no other use for.
- **The height is the presented canvas's,** not `width / naturalRatio` or `fixedHeight`. Those
  are the box's height before measurement, and they ignore how `yOffset` is rounded to a device
  pixel, so the image could gain a hairline under the last row or lose a sliver of it.
- **The raster is resampled once, as CSS presents it.** Drawing each tile straight into the
  image at its fractional position would bring back the seams that `SUBPIXEL-GEOMETRY.md`
  removes.
- **CORS is requested.** A canvas tainted by a cross-origin picture makes `toBlob` throw a
  `SecurityError` that names no picture. With CORS requested, a server that sends no header fails
  *that* picture's load, and the error names it. The live renderer does not request CORS (see
  `images.md`).
- **Fully hidden columns are culled** from the raster, as on the live canvas, so with a bleed of
  whole columns the raster starts at the box's edge.

### Tests

`image.test.ts` (happy-dom, with a stubbed 2D context) covers:
- `imageSize` under fluid and fixed sizing, under a responsive rule that holds at the width, with
  a fractional `yOffset` (the snapped raster height), and for invalid sizes.
- Composing: the tile count on the raster, the compose call, a half-column bleed off the left
  edge, bottom alignment staying at the top, the background fill only when one is given, CORS
  requested, and a failed encode.
- The failure message naming both a rejected drawable and a failed decode.
- `settleDrawables` with a late drawable and a rejected one, and `loadAll` resolving only after
  the last picture, reporting failures, and leaving `crossOrigin` off by default.

Real pixels are checked by the editor's browser probe.
