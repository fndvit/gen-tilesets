---
title: Design space and render space
description: The three coordinate systems a cell passes through (grid, design px, render px) plus device pixels, and the one scale factor that links them.
sidebar:
  order: 4
---

**Written from:** `packages/tileset/src/render/geometry.ts`, `packages/tileset/src/render/space.ts`,
`packages/tileset/src/render/uniform.ts`, `packages/tileset/src/types.ts`,
`packages/tileset/src/shape.ts`, and the module pages linked below. Concept page: it names no
module of its own.

## Overview

A tileset is designed at one size and shown at many. The designer works in **design pixels**: a
cell is, say, 60 design pixels wide and the design is 1440 design pixels across. A website then
shows that design in a box of whatever width the page gives it. Every design measurement is
multiplied by one number, the **scale**, to get the pixels actually drawn. That scale is the
box's width divided by the design's width.

The pixels inside the box are **render space**: measured from the box's top-left corner, in the
page's own CSS pixels. The editor's brush, the hover readout and the keep-out mask all work in
render space. A pointer event arrives in *client* coordinates, relative to the browser window,
and must be converted first. The conversion has to undo any zoom the page has applied, which is
easy to get wrong.

Finally, a screen lights whole **device pixels**. On a high-density display there are two or
three per CSS pixel. The last step of placement rounds each cell to a whole number of device
pixels, so neighbouring tiles share an edge exactly.

## In detail

### The coordinate systems

| Space | Unit | Origin | Where it lives |
| --- | --- | --- | --- |
| Grid | cells, integer `(x, y)`, `y` down | the top-left cell | `Grid<TileState>`, `TileState.translateX/Y` (in cells) |
| Design | design px | top-left of the grid | `Layout.cellSize`, `Layout.referenceWidth`, `Layout.yOffset` (in cells) |
| Render | CSS px | top-left of the **render box** | `cellBox`, `cellAt`, `toRenderSpace`, keep-out rects |
| Device | device px (`× dpr`) | the render box | `uniformGeometry`, `domGeometry`: `cellDev`, `originYDev` |
| Client | CSS px on screen, post-transform | the viewport | `getBoundingClientRect()`, pointer events |

The engine never sees anything but grid space. `TileState.translateX` is in **cells** precisely
so that the engine never reads a pixel (`types.ts`).

### Design → render: one factor

From [geometry.ts](/renderer/geometry/):

```
s       = Wpx / referenceWidth          // fluid (default); fixed sizing is s = 1
originX = (Wpx - s * columns * cellSize) / 2     // fluid: centred, negative when there is bleed
originY = -s * yOffset * cellSize                // top-anchored; yOffset shifts the grid up
cell (x, y) = [originX + s*x*cellSize, originX + s*(x+1)*cellSize) × [originY + s*y*cellSize, …)
```

- **`s` comes from width alone.** Height never affects scale.
- **`referenceWidth` is not `columns × cellSize`.** The difference is the designed *bleed*,
  columns that hang off the box's sides. Dividing by the full grid width "would make the bleed
  vanish", the outcome the design marks as wrong. [shape.ts](/engine/shape/) expresses this as
  `bleed = columns − referenceWidth / cellSize`, so that changing `columns` never means redoing the
  sum by hand.
- **Edges, not sizes.** Cell `(x, y)`'s right edge and cell `(x+1, y)`'s left edge are the same
  expression, so they cannot disagree (cited as **R6**).
- **Fixed sizing** sets `s = 1`, so a design px is a CSS px, and the box crops the grid instead of
  scaling it. `align.x`/`align.y` choose which side is cropped.

### Client → render: the zoom is not `s`

From [space.ts](/renderer/space/): `toRenderSpace` divides by the ratio of the box's on-screen
width (`getBoundingClientRect`) to its laid-out width. That ratio *is* any ancestor's CSS scale,
recovered from the element itself. The editor's `PreviewFrame` scales the whole preview this way.
The comment warns that confusing this zoom with `s` "is how a click lands on the wrong cell at every
width but one".

### Render → device: quantising once

From [uniform.ts](/renderer/uniform/): the cell is rounded **once**, to one integer used for both
axes, so every cell is square and every shared edge is one number. The canvas rounds to nearest and
then presents the bitmap at the exact fractional width. The DOM rounds *up*, so the grid always
covers its box. See [The two substrates](/concepts/substrates/).

### Try it

The hover story on [geometry.ts](/renderer/geometry/) runs the whole client → render → cell chain
under your pointer.
