---
title: preview/PreviewGrid.svelte
description: The dashed grid behind the picture, at the tileset's cell pitch, drawn in the frame's own coordinates so its lines meet the cells' edges.
sidebar:
  order: 56
---

**Written from:** `apps/editor/src/lib/preview/PreviewGrid.svelte` and its call site in `App.svelte`.

## Overview

The grid behind the preview (Figma *Grid*): dashed lines, 2px on and 2px off, in black at 10%,
one per cell edge, running across the whole picture area and lined up with the tileset's cells.
The **Grid** button in the [top bar](/editor/preview-bars/) shows and hides it. It is on by
default and is not saved.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `g` | `GridGeometry` | The shaped grid at the current `Wpx`, the same object the overlays get. |
| `zoom` | `number` | The display zoom, so the dashes keep their screen size when the frame is scaled. |

### How it lines up

- It is a child of the frame (inside `PreviewFrame`'s `children(Wpx)` snippet), so it works in
  frame px and scrolls and zooms with the picture.
- Pitch `scaleFactor(g) × cellSize`; an SVG `<pattern>` at `x = originX(g)`, `y = originY(g)`, so
  each line falls on a cell edge exactly as `cellBox` computes it (**R1**, **R6**). A `yOffset`
  moves the rows with the cells.
- The SVG reaches `4000 / zoom` px past the frame on every side, with a `viewBox` that maps 1:1 to
  frame px. `.preview-body`'s `overflow: clip` cuts it at the picture area's edges and keeps it out
  of the scroll length.
- Stroke width and dashes are divided by `zoom`, so they look the same at every width.
- `z-index: -1` in the frame's stacking context (the frame is transformed), so it sits under the
  tiles and the overlays. `aria-hidden`, `pointer-events: none`.
- Nothing is drawn when the pitch is not positive.

### Tests

No unit test: it draws from the package's tested geometry. In Chrome, the grid lines fall within
0.01px of the selection overlay's cell edges, and the toggle removes and restores the layer.
