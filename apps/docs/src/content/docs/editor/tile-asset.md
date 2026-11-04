---
title: tiles/TileAsset.svelte
description: One variant of a tile group. A thumbnail with a hover delete badge and a details hint, the weight slider and its share as a percentage.
sidebar:
  order: 44
---

**Written from:** `apps/editor/src/lib/tiles/TileAsset.svelte`, and its call site in
`tiles/TileGroup.svelte`.

## Overview

The Figma *Tile asset*: a 32px thumbnail, a weight slider and the variant's share of the group as
a percentage. Hovering the thumbnail shows the picture's measured size and, for a picture that is
not square, that it will be centre-cropped. The variant's internal id (`a1`, `a2`) is never shown,
because it tells the author nothing (Pol, Block D review).

Hovering the row shows a small black circle with a cross at the thumbnail's top-right corner. It
deletes the variant. It is not in Figma; Pol chose it in the Block D planning. When the group has
only one variant left it is greyed out, because a group cannot be empty.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `tileId` | `string` | For `stored(tileId, asset.id)`. |
| `asset` | `TileAsset` | The variant. |
| `position` | `number` | 1-based place in the group, for the accessible names "Delete variant 2" and "Weight of variant 2". |
| `percent` | `number` | Its share, 0–100, rounded, computed by the group. |
| `canDelete` | `boolean` | False when it is the last variant. |
| `onInput` | `(weight) => void` | Every slider movement. |
| `onCommit` | `(weight) => void` | Slider release, or a key press. |
| `onDelete` | `() => void` | The badge. |

### Inputs → outputs

- Thumbnail: `<img>` with `object-fit: cover` from the stored object URL, or an empty framed
  square when nothing is stored. It is wrapped in [`Hint`](/editor/ui-hint/) with
  `"32×16 · not square, so it is centre-cropped"` (or `"No attached file in this session."`).
- Badge: a `--badge` circle (`--radius-round`) in `--color-bar` with the `close` icon, offset 4px
  out from the thumbnail's top-right. `opacity: 0` and `pointer-events: none` at rest, and shown
  on `.asset:hover` or `.asset:focus-within`. It stays focusable while hidden, so Tab reaches
  it and its own focus shows it. Disabled: `--color-inactive`.
- [`Slider`](/editor/ui-slider/): min 0, max 2, step 0.01, `value={asset.weight}`.
- Share: `.t-label`, `--share-w` wide, right-aligned.

### Invariants

- **The badge is the one round shape**, and the one control hidden at rest. Both are deliberate
  exceptions to the design system (Pol, Block D).
- **The file is the source of truth.** The slider returns to `asset.weight` after a refused
  commit.

### Callers / callees

Caller: `tiles/TileGroup.svelte`. Callees: `stored` (`assets.ts`), `ui/Hint`, `ui/Icon`,
`ui/Slider`.

### Tests

None (the vitest config cannot load `.svelte`). Checked in the browser for Block D.
