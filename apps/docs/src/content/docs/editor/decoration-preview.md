---
title: preview/DecorationPreview, decorations.ts
description: The preview's Decorations mode. Draws the file being edited as a decoration style, through the package's own TileDecoration, at a gallery of fixed shapes or one custom shape. Writes no field.
sidebar:
  order: 56
---

**Written from:** `apps/editor/src/lib/preview/DecorationPreview.svelte`,
`apps/editor/src/lib/preview/decorations.ts`, `decorations.test.ts`, and their call sites in
`App.svelte` and `PreviewTopBar.svelte`.

## Overview

A file meant only as a decoration style used to be authored blind: Page mode draws it as a page
tileset at a width, never at the 1 × 1, 2 × 3 or 4 × 1 a host places it at. Decorations mode
draws the same file the Page mode would (`shown`: the open draft in, hidden operations out)
through [`<TileDecoration>`](/renderer/tile-decoration/), the component a host page mounts.

- **Gallery**: seven fixed shapes side by side, each with its own seed.
- **Custom**: one shape whose columns and rows the author types (1–12 each).

Cell size (**Fit**, the default, or 24 / 44 / 64 / 96 px) and **Reroll spots** apply to both.
Fit picks the largest cell, up to 160 px, at which every spot fits the preview area without a
scroll. The bar's readout says the cell actually drawn. Everything is preview state
([view.svelte.ts](/editor/preview-width/)): never in the file, gone on a reload.

## In detail

### `decorations.ts`

| Export | Value or rule |
| --- | --- |
| `Span` | `{ rows, columns }`. |
| `GALLERY` | 1×1, 2×2, 3×2, 2×3, 3×3, 1×4, 4×1 (rows × columns): a tile, squares, portrait and landscape blocks, the two strips. Fixed, so it stays a reference to judge edits by. |
| `CELL_SIZES` | `24, 44, 64, 96`, the fixed sizes beside Fit. 44 is the demo's and the docs' size. |
| `FIT`, `CellSetting`, `DEFAULT_CELL` | `"fit"`; a cell setting is a px number or `"fit"`; the default is Fit. |
| `MAX_FIT_CELL`, `MIN_FIT_CELL` | `160`, `8`. Uncapped, a 1×1 Custom spot would fill the area like a poster. Under the floor the area scrolls. |
| `packRows(spans, cell, width, gap)` | The spans split into rows, greedy and in order. The component draws these rows as computed, not left to `flex-wrap`, so the rows drawn are the rows Fit counted. |
| `galleryHeight(spans, rows, cell, metrics)` | The gallery's height, captions and gaps included. |
| `fitGallery(spans, area, metrics)` | Fit: the largest whole-px cell that fits `area`, and its rows. A downward scan, because rows change with the cell, so "fits" is not monotone in it. |
| `DEFAULT_CUSTOM` | 3 rows × 2 columns. |
| `MAX_SPAN` | `12`. Past that a decoration is a page tileset, which Page mode previews. |
| `parseSpan(text)` | A whole number in `[1, MAX_SPAN]`, else `null`: refused, never clamped (**E5**). |
| `spotSeed(index, reroll)` | `"decoration-<index>-<reroll>"`. Fixed by position and reroll count, so an edit redraws each spot with the same seed and before/after can be compared. |
| `decorationErrors(file, span, cellSize)` | `reshapeErrors` with the decoration preset's shape (`bleed: 0, yOffset: 0`): the check `reshapeDecoration` throws on in development, asked first. |
| `boundOperations(file, numbered?)` | The coordinate-bound operations, as `{ id, index, labels }`: the card's number (counted in `numbered`, the saved stack, so hidden operations do not shift it) and the pinning layers' labels ("Drag", "Handpick"). |
| `spanLabel(span)` | `"columns × rows"`, as the package's decoration errors read. |

### `DecorationPreview`

| Prop | Meaning |
| --- | --- |
| `style` | App's `shown`. |
| `options` | `TilesetOptions` less `seed`: `loadSalt`, `provider`, `onAssetError`. Each spot adds its own seed. |
| `operations` | The saved stack, for numbering in the note. |

- **Checked once before anything mounts.** If `decorationErrors` is non-empty nothing draws and
  one note names the operations ("Operation 3 · Drag") and says hiding them previews the rest.
  Once, not per spot: no shape the view offers can fail on its own, and seven copies of one
  message (seen on Collage) said nothing more. Each `<TileDecoration>` still checks itself as it
  mounts.
- **Fit measures, the spots follow.** The area is measured with `bind:clientWidth`/`clientHeight`.
  The gaps and the caption height are read from the CSS, so a token change cannot desync them.
  Under Fit the spots are placed absolutely over the area, so their height cannot grow the area
  they were fitted to. At a fixed cell they stay in the flow and the preview scrolls. The cell
  drawn goes to `preview.drawnDecorationCell` for the readout.
- **Grid on** draws each spot's edge and cell lattice over it, in fractions of the frame, so the
  lines stay on cell edges when the spot is scaled.
- **Spots keep `tileset.css`'s `max-width: 100%`**: a spot wider than the column scales down as
  it would in a narrow page.
- **No overlays.** Selection overlay, brush and rectangle are Page-only.

### Tests

`decorations.test.ts`: the gallery's shapes are distinct and parse; the default cell is Fit;
`packRows` keeps the order and gives an over-wide spot its own row; `fitGallery`'s cell fits its
area and one px more does not, it wraps more in a tall area, and it holds to `MAX_FIT_CELL` and
`MIN_FIT_CELL`;
`parseSpan` takes 1–12 and refuses empty, zero, negatives, fractions, exponents and 13; seeds
differ per spot and per reroll and are stable; `decorationErrors` is empty for a procedural file
at every shape and names a `rect`; `boundOperations` numbers by the saved stack and labels Drag
and Handpick.
