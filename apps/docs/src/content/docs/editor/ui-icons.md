---
title: ui/icons.ts
description: The editor's icon set as path data copied from Figma, with no colour baked in.
sidebar:
  order: 60
---

**Written from:** `apps/editor/src/lib/ui/icons.ts` and `lib/ui/icons.test.ts`.

## Overview

`icons.ts` is the list of icons the editor can draw. `Icon.svelte` draws them. Since "Ink on
paper" (2026-11-06) they are one outline family, Lucide's paths (ISC licence), on a 24-unit grid,
drawn at 16px with a 1.5px stroke and round caps and joins.

There are nineteen: `fold`, `up`, `down`, `plus`, `close`, `trash`, `reseed`, `undo`, `import`,
`export`, `new`, `more`, `grip`, `swap`, `archive`, `image`, `check`, `info`, `alert`, `eye` and
`eye-off`.

## In detail

### Public surface

| Export | Type | Meaning |
| --- | --- | --- |
| `IconDef` | interface | `w`, `h` (px), `box` (the path's square frame, in units), `d` (path), `strokeWidth` (in `box` units). |
| `ICONS` | `Record<IconName, IconDef>` (`as const satisfies`) | The set. |
| `IconName` | type | `keyof typeof ICONS`. |

| Name | Meaning |
| --- | --- |
| `fold` | Disclosure, pointing down. `Collapsible` turns it up when open; a Split button's chevron |
| `up` / `down` | Move an item earlier or later |
| `plus` | Add |
| `close` | Close a panel, dismiss a notice, remove a tile asset |
| `trash` | Delete |
| `reseed` | Draw the randomness again. The shape, not a colour, says it |
| `undo`, `import`, `export`, `new` | The sidebar top bar's document actions |
| `more` | More actions, in a menu |
| `grip` | Drag to reorder: a palette entry's grip |
| `swap` | Change a palette entry's tile, in its menu |
| `archive` | The tileset as a zip: Export's Tileset (.zip) |
| `image` | The tileset as a PNG: Export's Image (.png)… |
| `check` | Done |
| `info` | An advisory: a `Notice` of kind `advisory`, and an inline advisory |
| `alert` | A failure: a `Notice` of kind `failure`, drawn in `--color-danger` |
| `eye` / `eye-off` | An operation drawn in the preview / hidden from it: the operation card's hide toggle (batch 02 T-02) |

### Invariants

- **One size, grid and stroke.** Every entry is 16×16 on a 24-unit box with a 2.25-unit
  stroke. Tested.
- **No colour.** Entries hold geometry only, and `Icon` draws them in `currentColor`. The test
  checks that `d` is path syntax only.

### Callers / callees

Callers: `lib/ui/Icon.svelte`, and `IconName` in `lib/ui/IconButton.svelte` and
`lib/ui/Button.svelte`. No callees.

### Tests

`lib/ui/icons.test.ts`: every icon is 16px on a 24-unit grid with a 2.25-unit stroke, and every
`d` is path data with no colour.

### Gotchas & rejected alternatives

- **The Handpick cursor is not here.** It is part of the Handpick glyph's SVG artwork
  (`assets/glyphs/selection/handpick.svg`), not an icon.
- **No filled icons.** Iteration 2 replaced Figma's mix of filled and outline icons with one
  outline family, so every icon reads as one voice.
