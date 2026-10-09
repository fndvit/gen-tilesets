---
title: PreviewFrame.svelte
description: The preview's width control. Sets the render box width with drag handles, presets and breakpoint buttons, zooms it to fit, and writes no field.
sidebar:
  order: 54
---

**Written from:** `apps/editor/src/lib/PreviewFrame.svelte`, `reference.test.ts`, and the call site
in `App.svelte`. The reference helpers it calls are in [reference.ts](/editor/reference/).

## Overview

The preview frame is the box at the top of the right-hand column that holds the live picture. It
lets the author try the tileset at any page width: drag either edge, press a preset (375, 768,
1024, 1440, or "fill" for the whole column), or press one of the file's own breakpoint widths. The
frame stays centred and both edges move together.

When the chosen width is wider than the screen has room for, the frame shrinks the whole picture
to fit and says by how much, without changing the width the tileset is drawn at. A readout shows
the width and which breakpoint rules apply there. Next to the presets is a backdrop colour picker,
and beneath them the reference-image controls.

None of this changes the document. In the editor's pipeline (import → document → draft/history →
**preview** → export), it is the viewport the preview is drawn in.

## In detail

### Purpose

The component sets `Wpx`, the render box's width, and hands it to its `children` snippet. It is
the editor's implementation of **E11**: *the preview width control sets `Wpx` and writes no
field; it is not destructive and requires no confirmation*. The header comment explains the
correction it embodies: a draggable page edge was once treated as the design width, which made
resizing the preview destructive. The destructive rule now belongs to the numeric design-width
field, and the drag handle is a pure viewport change.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ratio` | `(Wpx: number) => number` | required | The render box's natural aspect ratio at a width. A function since breakpoints can change `rows`. |
| `rules` | `readonly ResponsiveRule[]` | `[]` | The file's breakpoints, for the readout and bound buttons. See [`ResponsiveRule`](/api/index/interfaces/responsiverule/). |
| `children` | `Snippet<[number]>` | required | Rendered with the current `Wpx`. |
| `painting` | `boolean` | `false` | While true, the reference image's drag surface is not rendered, so the brush is never shadowed. |

### Inputs → outputs

#### Width

| Name | Value |
| --- | --- |
| `available` | `bind:clientWidth` of the track |
| `room` | `max(floor(available) − 2 × 9, 160)` |
| `requested` | `null` (fill) or a number |
| `width` (`Wpx`) | `room` when `requested` is `null`, else `max(requested, 160)` |
| `zoom` | `min(1, room / width)`, or `1` before measurement |
| `frameHeight` | `width / ratio(width)`, or `0` if the ratio is not positive |

- **Drag:** a handle captures the pointer; `requested = startWidth + 2 × delta / zoom`, where
  `delta` is signed by the handle's direction. Both edges move, so the centre stays put.
- **Keyboard:** ← / → on a handle change the width by `2 × 10` (`2 × 100` with Shift).
- **Buttons:** each distinct `minWidth` / `maxWidth` across the rules (sorted), the four presets,
  and "fill".
- **Readout:** `render box <width>px`, "Wpx · writes no field", "shown at N%" when zoomed, and
  `base` or `rule i + j` from [`activeRules`](/api/index/functions/activerules/)`(rules, width)`.

#### Backdrop and reference

- `background` starts `#ffffff`; an `<input type="color">` changes it; a ⟲ button returns to
  white and appears only off white.
- `reference`, `referenceError`, `yOffset`, `opacity`, `inFront`: local state passed to
  [ReferenceControls](/editor/reference-controls/) and [ReferenceLayer](/editor/reference-layer/).
- `pickReference(file)` awaits `loadReference(file)`. On failure it sets `referenceError` and keeps
  the previous reference.
- A file dropped on the track is picked; `dragover` is prevented so the browser does not
  navigate to it.
- An `$effect` revokes the reference's object URL when it is replaced and on unmount.
- `extent = frameExtent(frameHeight, imageHeight, yOffset)`; the viewport reserves
  `(extent.bottom − extent.top) × zoom` px of height, and the frame is translated by
  `−extent.top` so an image placed above the render box is not cut off.

#### Layout

`.track` (measures room) → `.viewport` (reserves zoomed height) → `.frame` (true `Wpx` width,
`transform: scale(zoom)`, the backdrop) → reference layer, left handle, `children(width)`, right
handle.

### Invariants

- **Writes no field** (**E11**). Width, backdrop and reference are all transient UI state; they
  belong beside the file, never in it and never in `meta` (**E4**).
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
| `App.svelte:63` | import |
| `App.svelte:810`–`863` | `ratio` from `naturalRatio` on `shapedAt(Wpx)`, `{rules}`, `painting={painting !== null}`, and a `children(Wpx)` snippet holding `<Tileset>`, `SelectionOverlay` and `PaintLayer` |

Callees (`PreviewFrame.svelte:40`–`43`): [`activeRules`](/api/index/functions/activerules/);
[ReferenceControls](/editor/reference-controls/), [ReferenceLayer](/editor/reference-layer/);
`frameExtent`, `layerHeight`, `loadReference` from [reference.ts](/editor/reference/).

### Tests

No test file for the component. `reference.test.ts` pins the two helpers it uses for layout:
`layerHeight` (intrinsic height at the image's own width, aspect kept at other widths, zero for a
zero-width reference) and `frameExtent` (the render box alone without an image; reaches past it
for a taller image; keeps the box's bottom for a shorter one; follows positive offsets down;
opens room above for negative ones; never reports a top below the box's own).

### Gotchas & rejected alternatives

- **Presets are not "breakpoints".** That word is reserved for the file's `responsive` rules.
  Presets "carry no spec content".
- **Handles sit outside the render box.** The component's element has no padding or border so `Wpx`
  is unambiguously its width; a handle inside would hide 9px of the picture. They are
  counter-scaled by `1 / zoom` so they stay hittable at wide presets.
- **`room` is floored** to a whole pixel, so the same file at the same preset draws the same
  picture from run to run.
- **White by default.** The output is decorative and drawn over whatever the host page supplies;
  the colour picker exists because a tileset for a dark page cannot be judged on white either. The
  editor offers the choice and decides nothing.
- **A native `<button>` for each handle**, not a `role="separator"` div, because a focusable
  separator reads as non-interactive to the linter.

### Review notes

- `onPointerMove`'s comment (line 321) says "Step 7's brush will need it". The brush exists
  (`PaintLayer.svelte`, via `metricsOf`/`toRenderSpace`). (stale comment)
- `clearReference()` resets `yOffset` but not `opacity` or `inFront`, so the next reference opens
  with the previous one's opacity and side. Possibly intended; not stated. (inconsistency, minor)
- The `9px` handle width is written as a literal in three CSS rules and as `HANDLE = 9` in the
  script; changing one does not change the other. (inconsistency, minor)
