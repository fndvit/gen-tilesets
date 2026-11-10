---
title: tiles/gallery.ts
description: The Tile gallery's logic, kept out of the component so it can be tested. Pick keys from two sources in one pick order, the verb and count, the name check, and picks to files.
sidebar:
  order: 89
---

**Written from:** `apps/editor/src/lib/tiles/gallery.ts`, `gallery.test.ts`, and its call site in
`lib/tiles/TileGallery.svelte`.

## Overview

The [Tile gallery](/editor/tile-gallery/) is a `.svelte` file, which the tests can't load. What it
decides lives here instead.

A pick can come from two places: the editor's collection, or the author's uploads
([My tiles](/editor/my-tiles/)). Both live in **one list in pick order**, because that order
becomes the variant order of what is added (`a1, a2…`).

## In detail

### Public surface

| Export | Type | Meaning |
| --- | --- | --- |
| `byTab(gallery)` | function | The collection split by its `tab` (batch 03, D-04): `{ images, shapes }`, every tab present even when empty, keys in `GALLERY_TABS` order, each list in manifest order. |
| `PickKey` | type | `` `gallery:${id}` `` or `` `mine:${id}` ``. |
| `galleryKey(id)`, `mineKey(id)` | functions | Make a key. |
| `sourceOf(key)` | function | `{ source: "gallery" \| "mine", id }`; splits at the first `:`. |
| `togglePick(picked, key)` | function | Picks at the end, or unpicks. Picking again puts it last. |
| `pickAll(picked, keys)` | function | Appends the keys not yet picked, once each, in order: a fresh upload arrives picked. |
| `GalleryMode` | type | `{ kind: "group" }` or `{ kind: "variants", tileName }`. |
| `verbOf(mode, n)` | function | "Add 3 tiles", "Add 1 variant"; "Add tiles" / "Add variants" at 0. |
| `countOf(n)` | function | "None picked", "1 picked", "N picked". |
| `checkName(file, name)` | function | `null`, "Give the new group a name.", or `Another group is already called "<name>". Choose a different name.` Through `tileNameTaken`, so it ignores case and outer spaces as a rename does. |
| `PickedFiles` | interface | `{ files: File[], failures: string[] }`. |
| `filesOf(picked, load)` | async function | Runs `load` for every pick at once and lays the results back **in pick order**. A failed pick is left out and named. |

### Callers / callees

Called by `lib/tiles/TileGallery.svelte`. Callees: `tileNameTaken` ([document.ts](/editor/document/));
`GALLERY_TABS` ([starters.ts](/editor/starters/)).

### Tests

`gallery.test.ts`: `byTab` splits by tab in manifest order, and has every tab in order even when
one is empty; keys split back, including an id with a `:`; pick order through toggles; a
re-pick goes last; `pickAll` adds once each; verbs and counts at 0, 1 and many in both modes;
empty, blank, taken (case and spaces) and free names; `filesOf` keeps pick order across both
sources when the first pick finishes last, and gathers failures.

### Gotchas & rejected alternatives

- **Rejected: one list per source.** It would lose the order between them, and the order is the
  variant order.
- **The prefix is needed.** Nothing stops an uploaded picture's hash from having a collection id's
  shape, in principle; the prefix makes the two impossible to confuse.
