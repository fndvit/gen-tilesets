---
title: TilePicker.svelte
description: A popover of tile thumbnails, clear first, for choosing a palette entry's tile.
sidebar:
  order: 50
---

**Written from:** `apps/editor/src/controls/TilePicker.svelte` and its caller,
`controls/PaletteList.svelte`.

## Overview

The tile picker is a small floating panel of thumbnails, used to choose a palette entry's tile. It
opens from a [palette](/editor/palette-list/) entry's thumbnail, from its menu's "Change tile…",
and from "Add entry". **Clear is always the first cell**, because clear is an ordinary palette
entry and not a Tile in the library. The entry's current tile has an ink ring, the glyph grid's
selected look.

It does not block the page. A click outside, Esc or Tab closes it.

## In detail

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `anchor` | `HTMLElement` | required | What it opens under (or above, near the window's bottom). |
| `tiles` | [`Tile`](/api/index/interfaces/tile/)`[]` | required | The cells after clear, in library order. |
| `current` | `string \| null \| undefined` | `undefined` | The entry's tile, ringed; `undefined` when adding. |
| `onPick` | `(tileId: string \| null) => void` | required | A cell was chosen (`null` is clear). |
| `onClose` | `(refocus: boolean) => void` | required | `true` after Esc: return focus to the anchor. |

### Inputs → outputs

- **Placement:** `position: fixed` against the anchor's box, like [Menu](/editor/ui-menu/), so the
  sidebar's scroll area cannot clip it. It opens upward when there is less than 200px below the
  anchor. A window resize closes it.
- **Cells:** a `role="dialog"` panel, "Choose a tile", holding one button per cell: a
  `--picker-thumb` thumbnail ([`thumbOf`](/editor/palette-list/#the-rules-palettets)) over a mono
  name. The current one has `aria-current="true"`.
- **Keys:** arrows move between cells; Up and Down move by the number of cells on a row, read from
  the layout. Home and End go to the ends, Enter or Space picks, Esc closes and refocuses the
  anchor, and Tab closes without refocusing.
- **Focus:** on open, the current cell (or the first, when adding) takes focus on the next frame,
  after Menu has returned focus to its own button.

### Callers

`controls/PaletteList.svelte`, for an entry's tile and for "Add entry".
