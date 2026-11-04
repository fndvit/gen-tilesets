---
title: sections/TilesSection.svelte
description: The Tiles section. Adds a tile group from N files, adds variants, renames, weights and deletes, and explains every refusal in a popup.
sidebar:
  order: 44
---

**Written from:** `apps/editor/src/lib/sections/TilesSection.svelte`, `assets.test.ts`,
`library.test.ts`, and its call site in `App.svelte`.

## Overview

The Tiles section of the sidebar, matching the Figma *Tiles* frame. It is where pictures enter the
editor. Each Tile is a [tile group](/editor/tile-group/), and each picture in it is a
[tile asset](/editor/tile-asset/) (a variant). Under the groups is a black "+" bar.

- **Add tile group** ("+" bar) opens the file picker. **However many files are chosen, they make
  one group**, with one variant per file, named after the first file. Dropping files on the
  section outside any group does the same.
- **Add variants:** the square "+" inside a group, or dropping files onto the group.
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
| "+" bar, or a drop on the section | `addGroup(files)` | one id from `nextTileId(tiles + heldTileIds() + reserved)`; `attachAll(tileId, [], files)`; if anything attached, one `addTiles([{ id, name: tileNameOf(first attached file), assets }])` |
| Square "+", or a drop on a group | `addVariants(tile, files)` | `attachAll(tile.id, tile's asset ids, files)`, then `addAssets(tile.id, assets)` |

`attachAll` allocates an asset id only for a file that attaches, so a new group is always
`a1…aN` with no gaps. Files that fail are listed in the popup as `"<name>: <reason>"`, and the
others are still committed.

`reserved` holds the Tile ids of attaches still in flight. `addGroup` allocates before it awaits
and commits after, so without it two quick drops could allocate the same id. `addTiles` does not
check for duplicates.

One hidden `<input type="file" multiple accept="image/*">` serves both gestures. `pick(tile)`
records what the chosen files are for (`null` means a new group) and clicks it.

#### Edits and refusals

| Gesture | Transition | Refusal (popup) |
| --- | --- | --- |
| Title (click, Enter) | `renameTile(id, name)` | `tileNameTaken`: another group already has the name, ignoring case and spaces |
| Group trash | `deleteTile(id)` | `tileReferences` names the operations and palette entries that use it, and nothing is applied |
| Variant badge | `deleteAsset(tileId, assetId)` | the last variant (checked first), or the transition returned the same file (the last non-zero weight) |
| Reset weights | `resetAssetWeights(tileId)` | never refused; already all 1 is an identity, so no undo entry |
| Weight slider release | `setAssetWeight(tileId, assetId, String(weight))` | the same file came back and the weight was `0` |

`refused(transition)` applies a transition and reports whether `session.file` is still the same
object, because a refused transition is an identity.

#### Names are unique

**The editor refuses a duplicate name** (Pol, Block D). This overrides `09` §10.1's "the editor
never blocks a rename". Names are compared trimmed and case-insensitively, because the UI
uppercases them, so `Grass` and `grass` would look identical. A new group whose file name is
taken is named by `uniqueTileName`: `grass 2`, `grass 3`, and so on.

The schema still allows duplicates (`06` §5.3, **C10**), so an imported file may hold some. Those
groups get `note="(t3)"` (their id) and a hint asking the author to rename one. This is §12.2's
sixth advisory, and it is display only.

### Invariants

- **No two groups share a name** once the editor has touched them: renames and new groups are
  checked; only an imported file can bring duplicates in.
- **N files, one Tile** (redesign Block D). This replaces `DECISIONS.md` D13 (one Tile per file).
- **E13 / E4:** an attach writes `meta.src`, `width` and `height` and nothing else, or it fails
  (`attachAsset` in `assets.ts`). A failed file never reaches the document.
- **Reports appear after the attempt, in a popup**, never in the layout (Block C rule).
- **The drop targets are disjoint.** A group stops its drop from bubbling, so a drop on a group adds
  variants and never also makes a new group. The "+" bar is always part of the section's target, so
  a new group can always be dropped, however full the list is.

### Callers / callees

Called by `App.svelte` (`<TilesSection />` in `.scrollable`). Callees: `attachAll`,
`heldTileIds`, `tileNameOf` (`assets.ts`); the library transitions from `document.ts`;
`nextTileId` (`ids.ts`); `Section`, `tiles/TileGroup`, `ui/AddBar`, `ui/Popup`.

### Tests

The component has no test (the vitest config cannot load `.svelte`). `assets.test.ts` covers
`attachAll`: three files give `a1, a2, a3` with all three meta keys, numbering continues after
the Tile's ids and the store's, and a failed file is named and leaves no gap. `library.test.ts`
covers every transition and refusal it calls.

### Gotchas & rejected alternatives

- **Equal weights on attach.** `weight: 1` expresses no opinion, and sits mid-track on the 0–2
  slider.
- **The group is named after the first file that attached**, not the first chosen, so a group is
  never named after a picture it does not hold.
