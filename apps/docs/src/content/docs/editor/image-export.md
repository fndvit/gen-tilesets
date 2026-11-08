---
title: image-export.ts
description: Export image's choices — the size rows, the file name, the pixel size — as pure functions of the saved file.
sidebar:
  order: 81
---

**Written from:** `apps/editor/src/image-export.ts` and `image-export.test.ts`.

## Overview

The Export image form (item 1) offers sizes, names a file and shows its pixel size before
anything is drawn. Those choices live here, free of runes, so they are tested. The drawing is the
package's [`renderImage`](/renderer/image/). The image is of the **saved** file, never the draft
(Pol, X0), so everything here reads a `TilesetFile` and nothing reads the preview's state.

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `SizeKey` | `"design" \| \`bound:${number}\`` | A size row's identity. |
| `SizeRow` | `{ key, width, label, detail }` | One Radio list row. `width` is the image's width in CSS px. |
| `sizeRows` | `(rules, designWidth) => SizeRow[]` | Design width first, then one row per breakpoint bound, ascending. |
| `rememberedSize` | `(rows, lastKey) => SizeKey` | The size used last if it is still a row, else `"design"`. |
| `fileName` | `(width, density) => string` | `tileset-1000px@2x.png`. |
| `pixelSize` | `(file, width, density) => ImageSize` | The package's `imageSize` with only width and density. |

### Rules

- **Design width is `layout.referenceWidth`**, not the preview's width (Pol, X3b), so dragging the
  handles never changes the image. It is always the first row.
- A bound is named by every rule that sets it, with the sidebar's "Rule N" numbers:
  "Breakpoint 2 + 3". A rule with both a min and a max width names two bounds, and both rows carry
  its number. The bounds come from `boundsOf` ([preview width](/editor/preview-width/)).
- Rows are not de-duplicated: a bound equal to the design width keeps its own row, so the rows are
  told apart by `key`, not by width.
- `fileName` writes the width as it is. `referenceWidth` may be fractional, and a rounded name would
  claim a layout width the image was not drawn at.
- `pixelSize` restates no arithmetic: `imageSize` reads the same model `renderImage` draws from.
  The session memory of the size used last is the form's, not this module's.

### Callers

`lib/sections/ExportImage.svelte`.

### Tests

`image-export.test.ts`: no rules gives one row; a min+max rule gives two rows with the same
number; a shared bound lists both rules; a bound equal to the design width keeps its own row;
bounds are ascending whatever the rule order; the remembered size and its fallback; a fractional
file name; and the pixel size of a 600px design of 4 rows of 60 at 2× (1200 × 480).
