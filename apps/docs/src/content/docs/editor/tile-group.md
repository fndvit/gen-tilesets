---
title: tiles/TileGroup.svelte
description: One Tile in the Tiles section. A group bar with a chevron, an editable title, trash and thumbnails, over its variants and a square "+".
sidebar:
  order: 44
---

**Written from:** `apps/editor/src/lib/tiles/TileGroup.svelte`, and its call site in
`sections/TilesSection.svelte`.

## Overview

The Figma *Tile Group*. A black bar holds the fold chevron, the group's name (click it to
rename) and, at the right end, a trash icon. Open or closed, the bar also shows its first four pictures as small
thumbnails. Open, a white framed body lists the variants, one [tile asset](/editor/tile-asset/)
row each, and ends with a square "+" that adds more and a "Reset weights" button that sets
every variant back to the same weight (greyed out when they already are). Dropping image files anywhere on the group
adds them as variants, and the group is outlined while files are dragged over it.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `tile` | `Tile` | The Tile shown. |
| `note`, `hint` | `string \| undefined` | `(t3)` and its explanation, where an imported file has another Tile of the same name. |
| `onRename` | `(name) => void` | Trimmed, changed name from `InlineEdit`. |
| `onDelete` | `() => void` | Trash. |
| `onWeight` | `(assetId, weight) => void` | A slider was released. |
| `onDeleteAsset` | `(assetId) => void` | A variant's badge. |
| `onResetWeights` | `() => void` | "Reset weights". Disabled while every weight is already 1. |
| `onAdd` | `() => void` | The square "+". The section opens the picker. |
| `onFiles` | `(files) => void` | Files dropped on the group. |

### Inputs → outputs

- `Collapsible variant="group"` with `actions` (trash), `onRename`, `note`, `hint`, and `extras`
  (the thumbnails), open or closed (Pol, Block F review). Thumbnails are `--thumb-sm`, from `stored()`. A variant with
  no stored bytes shows an empty framed square.
- Variants are listed in `canonicalAssets(tile)` order.
- **Live shares.** While a slider is dragged, `live` holds `{ id, weight }`, and every row's %
  is computed from it, so the whole group's shares move together. `live` is cleared on commit.
- Body: paper, `--rule` frame without a top border, 4px padding (5px from the outer edge, as in
  Figma), `--asset-gap` (10px) between rows.
- Drop: `dragover` arms the outline (`--focus-w` ink), `drop` calls `onFiles`. Both stop
  propagation, so the section does not also take the drop as a new group.

- The last line of the body holds the square "+" on the left and a `ui/Button` "Reset weights" at
  the far right. The button is not in Figma (Pol, after the Block D review).

### Invariants

- **No drag affordance on variants** (**D3**, §10.1). Their order is the package's, so a drag
  could not change anything.
- **Duplicate names are refused by the section**, not here (Pol, Block D, overriding §10.1). An
  imported duplicate is shown with its `note` and `hint`.
- **Open state is transient** and is not written to the file. A new group starts open.

### Callers / callees

Caller: `sections/TilesSection.svelte`. Callees: `canonicalAssets`, `stored` (`assets.ts`),
`ui/Collapsible`, `ui/IconButton`, `ui/AddBar`, `ui/Button`, `tiles/TileAsset`.

### Tests

None (the vitest config cannot load `.svelte`). Checked in the browser for Block D.
