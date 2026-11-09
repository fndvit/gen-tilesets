---
title: sections/TilesSection.svelte
description: The Tiles section. Opens the Tile gallery to add a group or variants, adds a tile group from N dropped files, renames, weights and deletes, explains every refusal in a popup, and pushes a failure notice for files that did not attach.
sidebar:
  order: 44
---

**Written from:** `apps/editor/src/lib/sections/TilesSection.svelte`, `assets.test.ts`,
`library.test.ts`, and its call site in `App.svelte`.

## Overview

The Tiles section of the sidebar, matching the Figma *Tiles* frame. It is where pictures enter the
editor. Each Tile is a [tile group](/editor/tile-group/), and each picture in it is a
[tile asset](/editor/tile-asset/) (a variant). Under the groups is a black "+" bar.

- **Add tile group** (the header "+" or the "+" bar) opens the [Tile gallery](/editor/tile-gallery/)
  (B-016 S3c). The pictures picked there, from the collection or from the author's uploads, make
  **one group** under the name typed there. **Dropping files** on the section outside any group
  also makes one group, with one variant per file, named after the first file.
- **Add variants:** the square "+" inside a group opens the gallery for that group; dropping files
  onto the group adds them at once.
- Rename a group by clicking its title, delete it with its trash icon, delete a variant with the
  badge on its thumbnail, and set a variant's weight with its slider. "Reset weights" puts every
  variant of a group back to the same weight in one step.

When something cannot be done, for example deleting a group an operation still uses, a popup
says why once the attempt is over. Nothing is printed in the section itself.

## In detail

### Public surface

No props. It reads `session.file.config.tiles` and writes through `session.apply`. It attaches
files through [assets.ts](/editor/assets/).

### Inputs → outputs

#### Attach

| Gesture | Function | Result |
| --- | --- | --- |
| A drop on the section, or the gallery in group mode | `addGroup(files, name?, earlier?)` | one id from `nextTileId(tiles + heldTileIds() + reserved)`; `attachAll(tileId, [], files)`; if anything attached, one `addTiles([{ id, name: uniqueTileName(name ?? tileNameOf(first attached file)), assets }])` |
| A drop on a group, or the gallery in variants mode | `addVariants(tile, files, earlier?)` | `attachAll(tile.id, tile's asset ids, files)`, then `addAssets(tile.id, assets)` |

`attachAll` allocates an asset id only for a file that attaches, so a new group is always
`a1…aN` with no gaps. Files that fail are pushed as one failure notice, `attachFailures` in
[advisories.ts](/editor/advisories/), listing each as `"<name>: <reason>"`, and the others are still
committed. It is a notice, not a popup, because part of the drop did attach (Pol, Stage 2 W5). A
second failed drop replaces the notice (same key).

`reserved` holds the Tile ids of attaches still in flight. `addGroup` allocates before it awaits
and commits after, so without it two quick drops could allocate the same id. `addTiles` does not
check for duplicates.

#### The Tile gallery

Every Add opens [TileGallery](/editor/tile-gallery/). `openGallery(tile)` records what it is for
(`galleryTile`, `null` for a new group) and opens it; the mode follows, `{ kind: "group" }` or
`{ kind: "variants", tileName }`. The gallery hands back `{ files, failures, name }` to
`addFromGallery`:

- **No files** (every pick failed): nothing is added, and the section's refusal Popup lists the
  failures, because nothing happened.
- **Some files:** `addGroup(files, name, failures)` or `addVariants(tile, files, failures)`. The
  fetch failures (`earlier`) are merged with `attachAll`'s into one `attachFailures` notice.
- **The group was deleted while the gallery was open:** the Popup says so, and nothing is added.

The typed name was checked in the gallery, but a group may have been made meanwhile, so
`addGroup` still runs it through `uniqueTileName`: "Mix" becomes "Mix 2" rather than a refusal
after the work is done.

There is no file input here any more: pictures from the computer come in through the gallery's
Upload… (into My tiles) or by a drop.

#### Edits and refusals

| Gesture | Transition | Refusal (popup) |
| --- | --- | --- |
| Title (click, Enter) | `renameTile(id, name)` | `tileNameTaken`: another group already has the name, ignoring case and spaces |
| Group trash | `deleteTile(id)` | `tileReferences` names the operations and palette entries that use it, and nothing is applied |
| Variant badge | `deleteAsset(tileId, assetId)` | the last variant (checked first), or the transition returned the same file (the last non-zero weight) |
| Reset weights | `resetAssetWeights(tileId)` | never refused; already all 1 is an identity, so no undo entry |
| Weight slider, each frame | `session.applyLive("weight:tile:asset", setAssetWeight(…))` | a refused frame leaves the file as it was |
| Weight slider release | the same, then `session.settle()` | the weight was `0` and the file did not take it. Told by the weight the file ended with, since the last frame may already be in it |

`refused(transition)` applies a transition and reports whether `session.file` is still the same
object, because a refused transition is an identity.

#### Names are unique

**The editor refuses a duplicate name** (Pol, Block D). This overrides `09` §10.1's "the editor
never blocks a rename". Names are compared trimmed and case-insensitively, because the UI
uppercases them, so `Grass` and `grass` would look identical. A new group whose file name is
taken is named by `uniqueTileName`: `grass 2`, `grass 3`, and so on.

The schema still allows duplicates (`06` §5.3, **C10**), so an imported file may hold some. Those
groups get `note="(t3)"` (their id) and an `advisory`, shown inline at the top of the group's
body: "Another tile group is also named X, so both show their id. Rename one to tell them
apart." This is §12.2's sixth advisory, and it is display only.

### Invariants

- **No two groups share a name** once the editor has touched them: renames and new groups are
  checked; only an imported file can bring duplicates in.
- **N files, one Tile** (redesign Block D). This replaces `DECISIONS.md` D13 (one Tile per file).
- **E13 / E4:** an attach writes `meta.src`, `width` and `height` and nothing else, or it fails
  (`attachAsset` in `assets.ts`). A failed file never reaches the document.
- **Refusals appear after the attempt, in a popup**, never in the layout (Block C rule). Nothing
  happened, so the popup blocks. Files that did not attach are a failure notice instead.
- **The drop targets are disjoint.** A group stops its drop from bubbling, so a drop on a group adds
  variants and never also makes a new group. The "+" bar is always part of the section's target, so
  a new group can always be dropped, however full the list is.

### Callers / callees

Called by `App.svelte` (`<TilesSection />` in `.scrollable`). Callees: `attachAll`,
`heldTileIds`, `tileNameOf` (`assets.ts`); `attachFailures` (`advisories.ts`); `notices.push`
(`notices.svelte.ts`); the library transitions from `document.ts`; `nextTileId` (`ids.ts`);
`Section` (with `addHaspopup="dialog"`), `tiles/TileGroup`, `tiles/TileGallery`, `ui/AddBar`,
`ui/Popup`.

### Tests

The component has no test (the vitest config cannot load `.svelte`). `assets.test.ts` covers
`attachAll`: three files give `a1, a2, a3` with all three meta keys, numbering continues after
the Tile's ids and the store's, and a failed file is named and leaves no gap. `library.test.ts`
covers every transition and refusal it calls.

### Gotchas & rejected alternatives

- **Equal weights on attach.** `weight: 1` expresses no opinion, and sits mid-track on the 0–2
  slider.
- **A dropped group is named after the first file that attached**, not the first chosen, so a
  group is never named after a picture it does not hold. A gallery group takes the typed name.
- **Rejected: an Add menu** (From gallery… / From your computer…), which S2 planned. Pol, at S3c:
  every Add opens the gallery, and the gallery's Upload… is the way in from the computer.
