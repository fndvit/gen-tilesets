---
title: tiles/TileGallery.svelte
description: The Tile gallery Form popup. Every Add in Tiles opens it. Pick pictures from the collection or from My tiles (the author's uploads, kept across reloads) and add them as a new group or as variants.
sidebar:
  order: 90
---

**Written from:** `apps/editor/src/lib/tiles/TileGallery.svelte`, and its call site in
`lib/sections/TilesSection.svelte`. No test file; its logic is in [gallery.ts](/editor/gallery/)
and [my-tiles.ts](/editor/my-tiles/), both tested, and it was checked in the browser.

## Overview

**Every Add in Tiles opens this popup** (Pol, B-016 S3c): the section's header "+", the "Add tile
group" bar, and a group's square "+". It replaced the two-item Add menu S2 had planned. Dropping
files still adds at once, because a drop has already chosen.

It shows two grids of thumbnails:
- **My tiles**, the pictures the author uploaded with **Upload…**, kept across reloads;
- **Collection**, the editor's own pictures from `starters.json`.

The author picks any number from either and presses Add. From Add tile group, the picks become
**one new group** under the name typed at the top. From a group's "+", they become **variants**
of that group. The order they were picked in is the variant order.

`DESIGN_SYSTEM.md` *Tile gallery* is the visual spec.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `open` | `boolean` (bindable) | The section's `galleryOpen`. |
| `mode` | `GalleryMode` | `{ kind: "group" }`, or `{ kind: "variants", tileName }` for "Add to Blue". |
| `onAdd` | `({ files, failures, name }) => Promise<void> \| void` | The section's `addFromGallery`. `files` may be empty when every pick failed. |

### Behaviour

- **Opening** fetches the manifest through [starters-client.ts](/editor/starters-client/) (shared
  with New tileset), and opens My tiles' shelf once per session (`once(() => openShelf())` in the
  `<script module>`). My tiles' thumbnails are object URLs made on opening and revoked on closing.
  A failed manifest shows "Couldn't load the gallery: <reason>" and is retried at the next opening.
- **Name** (group mode only) starts empty and has focus. It is checked **on Add**
  (`checkName`). An empty or taken name shows a **Field error** under the field (`aria-invalid`,
  `aria-describedby`), focus goes back to it, and nothing is fetched. Typing clears the error.
  In variants mode focus starts on the first cell.
- **Cells** are toggle buttons (`aria-pressed`, `aria-label`, no visible label). Picked shows a
  2px ink ring and a check badge. Each grid is one Tab stop: a roving `tabindex` follows focus
  (`focusin`), and the arrow keys, Home and End move within the grid, reading the column count
  from the layout as the Tile picker does.
- **Upload…** opens a hidden `<input type="file" multiple accept="image/*">`. The files go
  through `upload(shelf, files, check)`, where `check` is `measure` from
  [assets.ts](/editor/assets/) on an object URL. Accepted files join My tiles **picked**
  (`pickAll`); refused ones are listed in a status line under the grids.
- **Remove picked…** (at My tiles' heading, enabled when a My tiles cell is picked) asks a
  [Dialog](/editor/ui-dialog/), then removes those pictures from the shelf and unpicks them.
- **When the shelf is in memory** (`persistent: false`), a muted line says uploads will be gone on
  reload.
- **Add**: the verb reads "Adding…" and is disabled. `filesOf(picked, load)` turns every pick into
  a file, in pick order: a collection pick is fetched in full with `loadGalleryFiles`, and a My
  tiles pick is read from the shelf (`fileOf`). Then the popup closes and `onAdd` attaches them.
- **Closing during Add abandons it**, as New tileset's template load does: `closed()` bumps a
  `generation` counter that `add` compares after the fetch.
- **Closing** clears the picks, the name, the error and the upload failures. My tiles itself
  stays.

### Look

- The grids share one scroller with its own `max-height`, so the name and the footer stay put.
- The footer is Popup's `actions` with `divided` (a hairline). Upload… and the count ("None
  picked", in muted mono, a `role="status"` region) sit on the left; Cancel and the verb on the
  right. It wraps when it doesn't fit, with the verbs on their own line at the right.
- Tokens: `--gallery-cell` 64px, `--gallery-thumb` 52px, `--gallery-badge` 18px.

### Callers / callees

| Caller | Use |
| --- | --- |
| `lib/sections/TilesSection.svelte` | `<TileGallery bind:open={galleryOpen} mode={…} onAdd={addFromGallery} />` |

Callees: [gallery.ts](/editor/gallery/); `openShelf`, `upload`, `fileOf`
([my-tiles.ts](/editor/my-tiles/)); `BASE`, `manifest` ([starters-client.ts](/editor/starters-client/));
`loadGalleryFiles`, `once` ([starters.ts](/editor/starters/)); `measure`, `tileNameOf`
([assets.ts](/editor/assets/)); `session.file`; `ui/Popup`, `ui/Dialog`, `ui/Button`, `ui/Icon`.

### Gotchas & rejected alternatives

- **Rejected: the Add menu** (From gallery… / From your computer…). Pol, at S3c: every Add opens
  the gallery, and uploading lives inside it.
- **Rejected: handing uploads straight to the section** (skipping My tiles). Pol wanted uploads
  to join the gallery, so they can be mixed with collection pictures in one Add and reused later.
- **Variants mode shows every picture**, including ones the group may already hold. A duplicate is
  legal, and the gallery can't know what a group's pictures were made from.
- **The section re-checks the name** after the fetch (`uniqueTileName`), because a group may have
  been made meanwhile. It becomes "Mix 2" rather than being refused after the work is done.
- **Rejected: tabs in the Collection** (Images and Shapes, batch 03 D-04). They were built and
  then removed by Pol: every picture, Collage's then the shapes, is in the one Collection grid,
  in manifest order.
- `svelte-ignore a11y_no_noninteractive_element_interactions` on the grid: the keys are handled
  on the group because they move between its cells, and every cell is itself a button.
