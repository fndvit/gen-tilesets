---
title: sections/grid-details.ts
description: The read-only rows of Grid & Size's folded Details. Columns, grid size, visible height, bleed, counts and versions.
sidebar:
  order: 43
---

**Written from:** `apps/editor/src/lib/sections/grid-details.ts`, `grid-details.test.ts`, and its
call site in `GridSection.svelte`.

## Overview

What the file implies but the author does not type, as label / value pairs for the Details group
at the bottom of [Grid & Size](/editor/grid-section/). These were the Derived section's rows until
batch 01 (T-03, D-02 A) moved them under the fields that change them; the logic moved out of the
component into this file so a test can check it.

Nothing here is editable. `columns` in particular is **displayed, never edited** (**E1**, `09`
§9.1): a `rect` is authored in column indices, so the author needs to see it, and editing it would
break `columns * cellSize >= referenceWidth`.

## In detail

### Public surface

| Export | What |
| --- | --- |
| `gridDetails(file: TilesetFile): DetailRow[]` | The rows, in display order. |
| `DetailRow` | `readonly [term: string, value: string]`. |

### Rows

| Row | Value |
| --- | --- |
| Columns | `config.columns` |
| Grid width / height | `columns * cellSize`, `rows * cellSize` px |
| Visible height | [`naturalHeight`](/api/render/functions/naturalheight/) at `Wpx = referenceWidth` (so `s = 1`), plus "(N clipped)" when `yOffset * cellSize > 0` |
| Bleed | `bleed(referenceWidth, cellSize, columns)` from [derive.ts](/editor/derive/), plus "(N each side)" when positive |
| Tiles, Operations | `config.tiles.length`, `config.operations.length` |
| Engine | `ENGINE_VERSION` from [document.ts](/editor/document/) (**E2**: read from the package, never written) |
| Schema | `file.schemaVersion` |

Visible height is taken from the package rather than multiplied out, because `07` **R1** asks for
one implementation of the coordinate mapping.

### Callers / callees

Caller: `GridSection.svelte`. Callees: `naturalHeight` (package, `render`), `bleed` (`derive.ts`),
`ENGINE_VERSION` (`document.ts`).

### Tests

`grid-details.test.ts`: the rows and their order, that they follow cell size and rows, the clipped
note appearing only when y offset clips, and the counts and version stamps.
