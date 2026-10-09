---
title: warn.ts
description: The two asset-quality rules, an asset-to-cell pixel ratio and an absolute cell size, as development-build warnings said once each.
sidebar:
  order: 15
---

**Written from:** `packages/tileset/src/render/warn.ts`, and the call sites in
`render/Tileset.svelte`. There is no test file.

## Overview

The warnings module tells a developer when a tileset will look soft. There are two separate
reasons a tile can look blurry. The image file may be smaller than the cell it is drawn into, or
the cells may be so small on screen that every curved edge is mostly antialiasing. Neither one is
an error, and the picture is still drawn. But both are worth hearing about while the page is being
built.

The module turns each reason into a check that returns a message or nothing, plus a small helper
that makes sure each message is printed once rather than on every resize. It sits at the very end
of the pipeline, file → load → generate → **draw**: the canvas painter in `<Tileset>` runs the
checks while it paints, and only in a development build.

## In detail

### Purpose

The header states two **independent** rules and says that treating them as one "cost it several
blind alleys":

1. **A ratio.** An asset must carry at least as many pixels as the largest cell it is drawn into.
   Missing pixels are missing information, and no renderer recovers them.
2. **An absolute.** An antialiased edge costs about one device pixel whatever the cell size, so
   it is `1 / cellDev` of the shape. The header calls this one that has "no renderer fix, because
   there is no renderer defect".

They are usability thresholds, not correctness ones. That is why they are warnings in a
development build, silent in production, and **not** routed through `onAssetError`, which reports
resolution and load failures.

### Public surface

All four are re-exported from the renderer entry point (`render/index.ts:147`).

| Export | Signature | Returns |
| --- | --- | --- |
| [`SOFT_CELL_DEV`](/api/render/variables/soft_cell_dev/) | `20` | The device-pixel threshold below which a curve is "knowingly soft". |
| [`assetTooSmall`](/api/render/functions/assettoosmall/) | `(tileId, assetId, naturalWidth, naturalHeight, cellDev) → string \| null` | Rule 1's message, or `null`. |
| [`cellTooSmall`](/api/render/functions/celltoosmall/) | `(cellDev) → string \| null` | Rule 2's message, or `null`. |
| [`WarnOnce`](/api/render/classes/warnonce/) | `class { say(key, message, sink = console.warn) }` | Prints each `key` at most once per instance. |

### Inputs → outputs

- `assetTooSmall` compares the **smaller** intrinsic dimension against `cellDev`. `coverRect`
  crops the long axis, so the short one has to cover the cell. It returns `null` when either
  number is `<= 0` (an SVG with no intrinsic size "is not evidence of anything") or when the asset
  is at least `cellDev` pixels. Otherwise the message names the tile, the asset, both sizes, and
  says *Export it at N px or larger*.
- `cellTooSmall` returns `null` for `cellDev <= 0` or `>= SOFT_CELL_DEV`. Otherwise it suggests
  fewer columns or a wider box.
- `WarnOnce.say` does nothing for a `null` message, so a caller can pass a check's result straight
  through. A key already said is skipped. The `sink` defaults to `console.warn`.

### Invariants

- **Nothing here changes what is drawn.** *Failure is loud* is untouched: these are not failures,
  and nothing is substituted.
- **Keyed rather than counted.** A *second* asset, or a genuinely new cell size, still reports.
- **An instance, not module state**, so a test could assert deduplication without depending on
  what an earlier test warned about.
- `SOFT_CELL_DEV` is **bracketed, not measured.** The comment says the comfortable threshold is
  "somewhere above 20 and at most 40", and the warning fires at the bottom of that bracket so it
  reports only the cases "nobody would defend".

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:860` | `const warnings = new WarnOnce()`, one per component instance. |
| `render/Tileset.svelte:916` | `warnings.say(`cell:${u.cellDev}`, cellTooSmall(u.cellDev))` in the canvas paint effect, `DEV` only. |
| `render/Tileset.svelte:941-944` | `assetTooSmall(…, img.naturalWidth, img.naturalHeight, u.cellDev)`, keyed on the asset key alone, `DEV` only. |
| `render/Tileset.svelte:331` | The same `warnings` instance also dedupes the *inert `cellSize` rule* warning from `breakpoints.ts`. |

No caller in `apps/editor/src` or `apps/demo/src`, although the entry point's comment invites a
host to call the checks directly. Callees: none.

### Tests

No test file. `WarnOnce` was made an instance precisely so that a test could pin its deduplication,
but no such test exists.

### Gotchas & rejected alternatives

- **The asset warning is keyed on the asset, not on `(asset, cellDev)`.** `Tileset.svelte:935`
  says keying on the pair "emitted the same five lines on every step of a resize drag, which is
  exactly how a real warning gets tuned out". The cost is that an asset that becomes *more*
  undersized as the box grows is reported only once, at the first size that tripped it.
- **Canvas only.** Both checks run inside the canvas paint effect. The DOM substrate never calls
  them, so a `substrate: "dom"` tileset gets no softness warnings at all.
- The header's example (a 76-column footer preset looking worse than a coarse 8x4) is the case
  that motivated rule 2.

### Review notes

- No test pins `assetTooSmall`, `cellTooSmall` or `WarnOnce`, although the comment on `WarnOnce`
  gives testability as the reason it is a class.
- The DOM substrate runs neither check (see Gotchas). Nothing in the source says whether that is
  deliberate.
