---
title: FieldPreview.svelte
description: The Pattern well's small greyscale map of the pattern's value at every selected cell.
sidebar:
  order: 47
---

**Written from:** `apps/editor/src/controls/FieldPreview.svelte`,
`apps/editor/src/controls/field-preview.ts` and `controls/field-preview.test.ts`.

## Overview

The field preview is the first thing in the Pattern step's well (item 12). It is a small picture of
the whole grid the preview shows: each selected cell is a grey from paper (the pattern gives 0) to
ink (it gives 1), and each cell the Selection leaves alone is `--grey-200`. Under it is a 0–1 scale.
It changes at once as the Pattern's fields change, so the author sees what Cells per feature or
Octaves does before any tile is chosen.

It is shown for Random, Noise and Gradient. Constant has none, because its value is the same
everywhere. It is hidden from assistive tech, because the fields next to it carry the values.

## In detail

### Public surface

`FieldPreview.svelte`:

| Prop | Type | Meaning |
| --- | --- | --- |
| `columns`, `rows` | `number` | The grid's size, at the active breakpoint. |
| `cells` | `readonly FieldCell[]` | The selected cells and the value at each ([`fieldCells`](/editor/palette-list/#the-rules-palettets)). |

`field-preview.ts`:

| Export | Signature | Meaning |
| --- | --- | --- |
| `FIELD_COLOURS` | `{ paper, ink, unselected }` | The three tokens as RGB numbers (white, black, `--grey-200`). |
| `fieldPixels` | `(columns, rows, cells, colours?) => Uint8ClampedArray` | RGBA bytes, row by row, one pixel per cell. |

### Inputs → outputs

- **Pixels:** every cell starts as `unselected`; each selected cell is mixed from paper to ink by
  its `t`, clamped to 0–1. A cell outside the grid is skipped.
- **Drawing:** one `putImageData` on a canvas `columns` × `rows` pixels big, scaled up with
  `image-rendering: pixelated`. One call draws a 61×120 grid; `fillRect` would need one per cell.
- **Size:** the well's full width, keeping the grid's ratio. A grid so tall it would push the
  fields out of view is capped at `--field-preview-max-h` (240px) and drawn narrower, centred.
- **Colours:** a canvas cannot read a CSS variable, so the tokens are copied as numbers. The editor
  has one theme; a dark one would pass its own `colours`.

### Callers

`lib/operations/OperationBody.svelte`, at the top of the Pattern well, from its `field` (computed
on the Pattern step, before an Attribute is chosen).

### Tests

`controls/field-preview.test.ts`: one pixel per cell, `t = 0` is paper and `t = 1` ink, unselected
cells are `--grey-200`, placement by row then column, clamping and skipping.
