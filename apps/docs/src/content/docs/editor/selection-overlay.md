---
title: SelectionOverlay.svelte
description: The editor's one overlay. A tinted box over each cell the edited Operation's Selection picks, resolved by the package, never re-implemented.
sidebar:
  order: 57
---

**Written from:** `apps/editor/src/lib/SelectionOverlay.svelte` and the call site in `App.svelte`.

## Overview

While an operation is being created or edited, the preview shows which cells its Selection
picks: each of those cells gets a faint tinted rectangle on top of the picture, and a readout says
"N of M cells selected". It updates as the author changes the Selection's settings, before
anything is committed.

The overlay shows what the operation **acts on**, not what it changes. An operation can pick a
cell and write the value already there, and that cell is still outlined. The overlay is purely
visual; it never takes the pointer.

In the editor's pipeline (import → document → **draft**/history → **preview** → export), it is
where the draft becomes visible in the preview.

## In detail

### Purpose

The component asks the package's [`selection`](/api/index/functions/selection/) for a predicate,
walks every in-grid cell, and draws a percentage-positioned `div` for each match. It is **E7**'s
"exactly one kind of overlay". The header comment states two invariants that are "neither
optional": the editor evaluates no Selection itself (**E8**), and the geometry is never
recomputed by hand (**R1**).

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `g` | [`GridGeometry`](/api/render/interfaces/gridgeometry/) | required | `{ layout, rows, columns, Wpx }` of the picture as drawn at this width. |
| `config` | [`TilesetConfig`](/api/index/interfaces/tilesetconfig/) | required | The **shadow** config, with the draft spliced into `operations`. |
| `operationId` | `string` | required | The id to resolve. Must be in `config.operations`. |
| `seed` | `string` | required | The seed the preview draws with. |
| `loadSalt` | `number` | `0` | The session's load salt, so a flagged Operation's overlay matches the picture. |

### Inputs → outputs

- `cells`: `selection(config, operationId, seed, loadSalt)` once per change, then the predicate for
  every `(x, y)` with `0 ≤ y < g.rows`, `0 ≤ x < g.columns`.
- Each cell's style: [`cellPlacementPercent`](/api/render/functions/cellplacementpercent/)`(g.layout,
  g.columns, x, y)` for `left` and `width`; `top` and `height` are the same percentages multiplied
  by `vScale = g.Wpx / naturalHeight(g)` (or `0` before the box has a size).
- Output: `<div class="overlay" aria-hidden="true">` (`position: absolute; inset: 0;
  pointer-events: none`) with one `.cell` per match, keyed `"x,y"`; and a readout
  `"<n> of <rows × columns> cell(s) selected"`.

### Invariants

- **The editor implements no Selection's test** (**E8**). A second implementation "drifts silently
  in the one place the author is looking directly at it".
- **Bounded at the draw site.** `selection()` is total and unbounded because a `rect` may extend
  past the grid. Only in-grid cells have a box worth drawing, so the loop's own extent is the bound.
- **An unresolvable id throws.** The comment: the alternative, a predicate answering `false`
  everywhere, would draw an empty overlay "indistinguishable from a Selection that legitimately
  matches nothing — on the one screen where the author is judging exactly that".
- **Percentages, not pixels**, so the overlay is right at every `Wpx` with nothing to recompute.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:65` | import |
| `App.svelte:838`–`844` | only when `shadow !== null`; `g` and `rows`/`columns` from `shapedAt(Wpx)`; `config={{ ...shadow.config, rows, columns }}`; `seed={config.defaultSeed}`; `{loadSalt}` |

Callees: [`selection`](/api/index/functions/selection/) (`SelectionOverlay.svelte:35`);
[`cellPlacementPercent`](/api/render/functions/cellplacementpercent/) and
[`naturalHeight`](/api/render/functions/naturalheight/) (lines 36–40).

### Tests

No test file for the component. The comment says the geometric identity it relies on is asserted
in `packages/tileset/src/render/uniform.test.ts`; that file's "presents at exactly the ideal grid
width" test (line 177) is the one it means.

### Gotchas & rejected alternatives

- **Not a diff of two grids.** A diff shows *effect*, not *selection*: cells where the Operation
  writes the value already there (`multiply` by one, a matching palette entry, a `set` of the
  default) would vanish. It would also cost two generations per frame.
- **Ideal geometry, not snapped.** An earlier version read the snapped edges, because the canvas
  presented its raster at the snapped width and boxes drawn from the ideal grid were a few pixels
  off. The canvas now presents at the ideal width, which cancels the quantisation exactly (the
  comment derives `originX + k × s × cellSize`), so the ideal geometry is again where cells land.
- **It holds only for `substrate: "canvas"`.** The `"dom"` substrate quantises with `ceil` and has
  nothing to undo it. `App.svelte` mounts `<Tileset>` without a `substrate`, so it gets the default,
  which is `"canvas"` (`render/options.ts:207`). The comment warns: "if the preview ever stops
  being a canvas, this is the line that breaks."
- **`vScale`** converts a width-relative percentage to a height-relative one, because the overlay
  is `inset: 0` on a box whose height is the render box's.

### Review notes

- The header states **E7** as "Its geometry comes from `cellBox`". The code uses
  `cellPlacementPercent`, and the long comment above `styleOf` explains why. The header was not
  updated. (stale comment)
- `styleOf`, `height`, `vScale` and their 45-line comment are duplicated verbatim in
  `PaintLayer.svelte` (lines 98–152). The comment itself argues for one mapping rather than two
  that agree. (inconsistency)
