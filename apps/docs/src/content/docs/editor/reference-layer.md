---
title: ReferenceLayer.svelte
description: Draws the reference image at the render box's width, under or over the tiles, with a transparent surface for dragging it up and down.
sidebar:
  order: 56
---

**Written from:** `apps/editor/src/lib/ReferenceLayer.svelte` and the call site in
`lib/PreviewFrame.svelte`.

## Overview

The reference layer is the picture of the destination page drawn inside the preview, at the same
width as the tileset. By default it sits behind the tiles, so the author sees the tileset as it
would look on that page. Switched to "in front", it is drawn over the tiles instead, faded by the
opacity setting.

The author can drag the picture up or down, or use the arrow keys, to line up the right part of
the page with the tileset. While the brush for painting cells is active, the drag surface is
removed so it cannot get in the way.

In the editor's pipeline (import → document → draft/history → **preview** → export), it is a
viewing aid inside the preview. It writes nothing to the document.

## In detail

### Purpose

The component draws an `<img>` absolutely positioned at `top: yOffset; height: height` across the
frame's full width, and a separate transparent `<button>` over the same rect for the vertical drag.
The header comment states that **S2** is untouched: the preview is still `<Tileset>` on the file,
and this draws over or under that output, never instead of it.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `reference` | `Reference` | required | `{ url, name, width, height }`. |
| `height` | `number` | required | Layer height in frame px, `layerHeight(width, reference)`, computed by the frame. |
| `yOffset` | `number` | required | Frame px from the render box's top to the image's. May be negative. |
| `onOffset` | `(next: number) => void` | required | Called during a drag or key press. |
| `opacity` | `number` | required | Applied to the image layer. |
| `inFront` | `boolean` | required | Over the tiles rather than under them. |
| `zoom` | `number` | required | The frame's display zoom, for screen px → frame px. |
| `draggable` | `boolean` | required | `false` removes the grab surface. |

### Inputs → outputs

- **Image layer:** `.layer` with `z-index: -1` (behind) or `3` (in front), `pointer-events: none`,
  `aria-hidden`. The `<img>` has `draggable="false"` so the browser's native image drag does not
  start a file drag on top of the offset gesture.
- **Grab surface** (only when `draggable`): `z-index: 2`, same rect.
  - `pointerdown` captures and records `{ startY, startOffset }`.
  - `pointermove` calls `onOffset(Math.round(startOffset + (clientY − startY) / (zoom || 1)))`.
  - `pointerup` / `pointercancel` release.
  - ↓ / ↑ move by 10 (100 with Shift).

### Invariants

- **Writes no field** (**E11**).
- **Width is the render box's, height follows the image's ratio**, so one image pixel is one
  design pixel when `Wpx` equals the image width.
- **Screen px are divided by `zoom`**, the same conversion the frame's handles and the brush make.

### Callers / callees

| Caller | Use |
| --- | --- |
| `lib/PreviewFrame.svelte:42` | import |
| `lib/PreviewFrame.svelte:443`–`452` | inside `.frame`, before the handles and the children; `draggable={!painting}` |

Callees: the `Reference` type from `reference.ts` only.

### Tests

No test file. The height it is given comes from `layerHeight`, tested in `reference.test.ts`.

### Gotchas & rejected alternatives

- **Why this layer uses `z-index`.** Everything else in the preview layers by DOM order, because
  every other overlay belongs above the picture and a positioned element paints above the static
  canvas anyway. This is the one layer that wants to go underneath, which DOM order cannot
  express. `.frame` has a `transform` and is therefore a stacking context, so `−1` stays inside it
  and still paints above the frame's backdrop colour: backdrop, then page picture, then tiles.
- **A separate grab surface, not pointer events on the image.** When the image is behind, the
  canvas paints over it and hit-testing follows paint order, so the image itself could never be
  grabbed. One surface at the image's rect behaves the same on either side.
- **The grab surface sits under an in-front image** (2 vs 3) so the picture is never dimmed by a
  control.

### Review notes

- The header says this layer "names a `z-index` when nothing else in the preview does". The grab
  surface in this same file has `z-index: 2`, and `PreviewFrame.svelte:638` gives the width handles
  `z-index: 4`. The reasoning about the image layer still holds; the "nothing else" is stale.
  (stale comment)
