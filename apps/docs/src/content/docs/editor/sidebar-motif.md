---
title: sections/SidebarMotif.svelte, motif.ts
description: The quiet checkered tile field in the sidebar's free space, below the last section. Drawn with the package's own TileDecoration.
sidebar:
  order: 46
---

**Written from:** `apps/editor/src/lib/sections/SidebarMotif.svelte`,
`apps/editor/src/lib/sections/motif.ts`, `motif.test.ts`, and the call site in `App.svelte`.

## Overview

When the sections are short, the space between the last one and the Randomness footer shows a
subtle checkered field of flat squares (batch 01, T-06, B-004). It grows as sections close and
shrinks as they open, and it is gone once the sections fill the sidebar. It is drawn with the
package's own [`<TileDecoration>`](/renderer/tile-decoration/), so the editor decorates itself with
the thing it makes.

It is decoration only: `aria-hidden`, never focusable, and the pointer goes through it.

## In detail

### `motif.ts`

| Export | What |
| --- | --- |
| `MOTIF_COLOUR` | `#e2e2e2`, the value of `--grey-200`: one step off the sidebar's `--grey-100` ground. A value, not `var(--…)`, because the tile is a picture and a picture cannot read the page's custom properties. |
| `MOTIF_CELL` | 24: CSS px per tile. |
| `MOTIF_MIN_ROWS` | 2: under this many whole rows of free space, nothing is drawn. |
| `squareSrc(colour?)` | A flat square as an SVG data URL. It states `width`/`height` (64), because an SVG with only a `viewBox` has no intrinsic size and the canvas substrate could not decode it. |
| `motifStyle(colour?, cell?)` | The decoration style: one tile, one `checkerboard` operation (procedural, so any size is legal). Nothing in it is random. Its `schemaVersion` is the package's `SCHEMA_VERSION`. |
| `motifShape(width, height, cell?)` | Whole tiles that fit, `{ rows, columns }`, or `null` under `MOTIF_MIN_ROWS` rows or with no column. |

The three constants are the whole look, at the top of the file, so Pol can tweak it.

### `SidebarMotif.svelte`

No props. A `flex: 1 1 0` box, the remainder of the sidebar's `ScrollArea fill` column: the height
left under `.sections`, or none. It measures itself (`bind:clientWidth`/`clientHeight`), and draws
`motifShape`'s tiles absolutely placed inside, centred and on the bottom edge. Absolutely placed,
so drawing it never adds to the height it measured: it cannot grow the column, and cannot add a
scrollbar.

### Callers / callees

Caller: `App.svelte`, after `.sections` inside the sidebar's `ScrollArea`, which is in `fill` mode
for it. Callees: `TileDecoration.svelte` (package); `motif.ts`.

### Tests

`motif.test.ts`: the style validates and reshapes to any size; it is one square in the motif
colour on a checkerboard; `motifShape` counts whole tiles and returns `null` under two rows or
with no width. The component has none (`.svelte` files cannot be unit-tested here).
