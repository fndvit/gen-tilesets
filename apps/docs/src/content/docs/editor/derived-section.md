---
title: sections/DerivedSection.svelte
description: The Derived section. Read-only values the file implies, such as the column count, grid size and bleed.
sidebar:
  order: 44
---

**Written from:** `apps/editor/src/lib/sections/DerivedSection.svelte`.

## Overview

A closed-by-default section listing what the file implies but the author does not type: the
column count, the grid's width and height, the visible height, the bleed, how many tiles and
operations there are, and the engine and schema versions (these used to be in the header). Labels
are on the left, values on the right in the console face. Nothing here is editable.

## In detail

### Public surface

No props. It reads `session.file`.

### Inputs → outputs

| Row | Value |
| --- | --- |
| Columns | `config.columns` |
| Grid width / height | `columns * cellSize`, `rows * cellSize` px |
| Visible height | [`naturalHeight`](/api/render/functions/naturalheight/) at `Wpx = referenceWidth` (so `s = 1`), plus "(N clipped)" when `yOffset * cellSize > 0` |
| Bleed | `bleed(referenceWidth, cellSize, columns)` from [derive.ts](/editor/derive/), plus "(N each side)" |
| Tiles, Operations | counts |
| Engine, Schema | `ENGINE_VERSION`, `file.schemaVersion` |

Values are rounded to three decimals where they can be fractional.

### Invariants

- **`columns` is displayed, never edited** (§9.1, **E1**). Editing it could break
  `columns * cellSize >= referenceWidth`.
- **Visible height comes from the package**, not multiplied out here (**R1**, **S10**).

### Callers / callees

Caller: `App.svelte`. Callees: `Section`, `naturalHeight`, `bleed`, `ENGINE_VERSION`.

### Tests

None for the component. `derive.test.ts` covers `bleed`.
