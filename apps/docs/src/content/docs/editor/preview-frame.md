---
title: preview/PreviewFrame.svelte
description: The preview's render box. Measures the column, drags the width with two handles, zooms the box to fit, and writes no field.
sidebar:
  order: 54
---

**Written from:** `apps/editor/src/lib/preview/PreviewFrame.svelte` and the call site in `App.svelte`.

## Overview

The preview frame is the render box in the middle of the right-hand column, under the
[top bar](/editor/preview-bars/). The author can drag either edge to try the tileset
at any page width; the frame stays centred and both edges move together. The bars' presets and
breakpoint buttons set the same width.

When the chosen width is wider than the screen has room for, the frame shrinks the whole picture
to fit without changing the width the tileset is drawn at.

None of this changes the document. In the editor's pipeline (import → document → draft/history →
**preview** → export), it is the viewport the preview is drawn in.

## In detail

### Purpose

The component draws at `Wpx`, the render box's width, and hands it to its `children` snippet. It
is the editor's implementation of **E11**: *the preview width control sets `Wpx` and writes no
field; it is not destructive and requires no confirmation*. The header comment explains the
correction it embodies: a draggable page edge was once treated as the design width, which made
resizing the preview destructive. The destructive rule now belongs to the numeric design-width
field, and the drag handle is a pure viewport change.

Since Stage 2 the width state lives in [view.svelte.ts](/editor/preview-width/), shared with the
bars. This component writes `preview.available` (its track's width) and `preview.requested`
(drags and arrow keys), and reads `preview.width` and `preview.zoom`.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ratio` | `(Wpx: number) => number` | required | The render box's natural aspect ratio at a width. A function since breakpoints can change `rows`. |
| `children` | `Snippet<[number]>` | required | Rendered with the current `Wpx`. |

### Inputs → outputs

| Name | Value |
| --- | --- |
| `width`, `zoom` | `preview.width`, `preview.zoom` ([width.ts](/editor/preview-width/)) |
| `frameHeight` | `width / ratio(width)`, or `0` if the ratio is not positive |

- **Drag:** a handle captures the pointer; `preview.requested = startWidth + 2 × delta / zoom`,
  where `delta` is signed by the handle's direction. Both edges move, so the centre stays put.
- **Keyboard:** ← / → on a handle change the width by `2 × 10` (`2 × 100` with Shift).
- The viewport reserves `frameHeight × zoom` px of height, because a transform does not affect
  layout, plus `--handle-hit-reach` above and below for the handles.
- **Not clipped.** The track lets the [grid](/editor/preview-grid/) reach past the frame; the
  picture area (`.preview-body`, `overflow: clip`) clips it, and a frame wider than the column.
- **Centred vertically** by its parent `.stage` in `App.svelte`, a flex column that takes the
  height left in the picture area; a taller frame overflows downward and scrolls.
- **No background and no outline of its own.** The backdrop is the picture area's (`App.svelte`'s
  `.canvas`), so the picture is judged against one colour everywhere. The handles mark the sides
  and the grid shows the cells; nothing marks top and bottom, as in Figma (Pol, Stage 2 P3b).

#### Handles (Figma *Handle* 2063:804 / 2063:805)

| Part | Size (screen px, each divided by `zoom` inside the frame) |
| --- | --- |
| Hit area (the `<button>`) | `--handle-w` 32 wide, **centred on** the box edge; reaches `--handle-hit-reach` 32 past top and bottom, so the squares sit inside it with 13px to spare |
| Square, at each end | `--handle-square` 6, centred on the edge, 13–19 past the box |
| Cap, square to box edge | `--handle-cap` 16 long, `--handle-cap-w` 2 wide |
| Line along the edge | `--handle-dot` 1 wide, dotted 1 on / `--handle-dot-gap` 2 off |

- The drawing is a `.mark` span with `pointer-events: none`, centred in the hit area and painted
  with `linear-gradient`s in `--color-ink`, so it stretches with the box height.
- **Hover and focus:** the dotted line turns solid, 2px. **Pressed:** `--color-pressed`.
  `cursor: ew-resize`. The focus ring goes round the 24px hit area.

#### Layout

`.track` (measures room) → `.viewport` (reserves zoomed height) → `.frame` (true `Wpx` width,
`transform: scale(zoom)`) → left handle, `children(width)`, right handle.

### Invariants

- **Writes no field** (**E11**). The width is transient UI state; it belongs beside the file,
  never in it and never in `meta` (**E4**).
- **No regeneration on resize** (cited as **R12**). Every quantity is a fixed fraction of `Wpx`, so
  dragging shows the file's true behaviour at that width.
- **Height is computed, not measured** (cited as **S8**). Measuring the frame would risk a
  measurement cycle.
- **`Wpx` is never clamped to what the editor can display.** An earlier version did, and asking for
  1024 in an 866px column silently produced an 866px preview: the author judging a composition at a
  width the file was never asked about.
- **Zoom only shrinks**, and it is not `s`. `s = Wpx / referenceWidth` is the component's; zoom is
  the editor fitting the finished box on the monitor.
- **One `Wpx`, handed down.** The overlays get the same number the component drew with, rather
  than a second measurement (cited as **R1**).

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:30` | import |
| `App.svelte:390`–`441` | `ratio` from `naturalRatio` on `shapedAt(Wpx)`, and a `children(Wpx)` snippet holding `<Tileset>`, `SelectionOverlay` and `PaintLayer` |

Callees: `preview` from [view.svelte.ts](/editor/preview-width/).

### Tests

No test file for the component.

### Gotchas & rejected alternatives

- **Hit areas are centred on the edge and include the squares** (Pol, P3b review: the first
  version sat wholly outside the box, which read as off-centre and left half of each square out).
  The cost: the inner 16px of each hit area lies over the box and takes those pixels from the
  Handpick brush, which has to start a stroke on an edge cell further in. Everything is
  counter-scaled by `1 / zoom` so the handle is the same size on screen at every preset.
- **Drawn, not downloaded.** Figma's export is one fixed 579px picture; the handle must stretch with
  the box.
- **`room` is floored** to a whole pixel, so the same file at the same preset draws the same
  picture from run to run.
- **A native `<button>` for each handle**, not a `role="separator"` div, because a focusable
  separator reads as non-interactive to the linter.

### Review notes

- `onPointerMove`'s comment (line 119) says "Step 7's brush will need it". The brush exists
  (`PaintLayer.svelte`, via `metricsOf`/`toRenderSpace`). (stale comment)
- The handle width is `--handle-w` in CSS and `HANDLE = 16` (half of it) in `width.ts`; changing one does not
  change the other. (inconsistency, minor)
