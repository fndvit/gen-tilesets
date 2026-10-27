---
title: TileLibrary.svelte
description: The Tiles panel. Drop images to create Tiles or add assets, rename, weight and delete them, with every refusal explained.
sidebar:
  order: 44
---

**Written from:** `apps/editor/src/lib/TileLibrary.svelte`, `library.test.ts`, and the call site in
`App.svelte`.

## Overview

The tile library is the "Tiles" panel in the sidebar. It is where pictures enter the editor.
Dropping image files on the zone at the bottom, or using "Add files…", makes one new Tile per
file. Dropping files onto an existing Tile's card adds them to that Tile as further assets (alternative drawings).

Each Tile is a card with an editable name, its id and a delete button. Under it is the list of
its pictures. Each picture has a thumbnail, its measured size, a weight field, its share of the
Tile as a percentage, and a delete button. When an action is refused, for example deleting a Tile
that an operation still uses, the panel says why in a list underneath.

In the editor's pipeline (import → **document** → draft/history → preview → export), this is
where Tiles and their assets are written into the document. Operations then refer to these Tiles
from their palettes.

## In detail

### Purpose

The component turns files into [`Tile`](/api/index/interfaces/tile/) and
[`TileAsset`](/api/index/interfaces/tileasset/) values and commits them through
`session.apply`. It also enforces three display rules from its header comment:

1. **A Tile's asset list is ordered by id and has no drag affordance.** The order comes from
   the package's [`canonicalAssets`](/api/index/functions/canonicalassets/), never a local sort.
   A drag there would be a gesture with no effect.
2. **The opposite rule applies to a palette**, which is why the palette is a bar
   ([PaletteBar](/editor/palette-bar/)) and not a list.
3. **A rename is never blocked.** Where two Tiles share a name, the id is appended to both and
   an advisory is shown.

### Public surface

No props, no events, no bindings. It reads `session.file.config.tiles` and writes through
`session.apply`, and it reads and writes the asset store in [assets.ts](/editor/assets/).

### Inputs → outputs

#### Attach

`buildAsset(tileId, assetId, file)` awaits `attach()`, which measures the image, then returns
`{ id, weight: 1, meta: { src: exportPath(tileId, assetId, ext), width, height } }`.

| Gesture | Function | Result |
| --- | --- | --- |
| Drop on the zone, or "Add files…" | `dropAsTiles(files)` | ids from `nextIds(n, existing + heldTileIds(), nextTileId)`; each Tile named `tileNameOf(file.name)` with one asset `a1`; then one `addTiles(built)` |
| Drop on a Tile card | `dropAsAssets(tile, files)` | ids from `nextIds(n, tile's asset ids + heldAssetIds(tile.id), nextAssetId)`; then one `addAssets(tile.id, built)` |

A file that fails to decode is reported as `"<name> — <message>"` and skipped. The others are
still committed.

The held ids come from [assets.ts](/editor/assets/). A deleted Tile's or asset's bytes stay in
the store for undo, so a new id must not land on them: the new attach would overwrite the bytes,
and undoing past the add would restore the old Tile showing the new picture.

#### Edits

| Control | Transition | Pre-check |
| --- | --- | --- |
| Name input (`oninput`) | `renameTile(id, value)` | none; commits on every keystroke |
| Tile × | `deleteTile(id)` | `tileReferences(file, id)`; if any, reports "used by operation …, palette entry …" and stops. The bytes are not released. |
| Asset × | `deleteAsset(tileId, assetId)` | if it is the only asset, reports and stops. After applying, if the file is unchanged, reports "must keep one non-zero weight". The bytes are not released. |
| Weight ([NumericInput](/editor/numeric-input/), `parseWeight`) | `setAssetWeight(tileId, assetId, text)` | after applying, if the file is unchanged and the text parsed to `0`, reports "must keep one non-zero weight" |

The percentage beside each asset is `weight / total` over the canonical list. A zero weight
shows "never" instead.

#### Display

- A missing session file for an asset shows `?` instead of a thumbnail ("No attached file in
  this session"), which is what an imported asset with no bytes looks like.
- A non-square image shows a "centre-cropped" marker.
- `problems` is a session-only list with a "clear" button.

### Invariants

- **An attach writes `meta.src`, `width` and `height`, or it fails** (**E13**). The measurement
  happens before any transition, so a file that will not decode never reaches the document.
- **Those three `meta` keys and nothing else** (**E4**). The comment explains that `meta` is
  tempting because it is exempt from strictness, and that a key parked there "is never removed and
  never retyped, and travels to every consumer".
- **A refused transition is an identity**, and the panel detects one by comparing `session.file`
  before and after.
- **The library list is not a drop target.** Tile cards and the new-Tile zone are disjoint. An
  earlier version made the list container take new-tile drops, and once it filled with cards
  there was no background left, so adding a second Tile became unreachable.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:66` | import |
| `App.svelte:624` | `<TileLibrary />` inside `<Section title="Tiles">` |

Callees (`TileLibrary.svelte:23`–`45`): [`canonicalAssets`](/api/index/functions/canonicalassets/);
`attach`, `exportPath`, `extensionOf`, `heldAssetIds`, `heldTileIds`, `stored`, `tileNameOf` from
`assets.ts`;
`addAssets`, `addTiles`, `deleteAsset`, `deleteTile`, `renameTile`, `setAssetWeight`,
`tileReferences` from `document.ts`; `parseWeight` from `fields.ts`; `nextAssetId`, `nextIds`,
`nextTileId` from `ids.ts`; `session`; [NumericInput](/editor/numeric-input/).

### Tests: `library.test.ts`

The component has no test, but `library.test.ts` pins everything it calls:

- **Ids:** generated ids match the identifier charset and exclude the colon, do not collide with
  taken ids, ignore taken ids that do not fit the pattern, allocate a batch without duplicates,
  and are never reused after a deletion, except the highest, which is handed back once it is
  deleted (pinned as accepted, see [ids.ts](/editor/ids/)).
- **Attach paths:** `exportPath` mirrors the asset key so two Tiles holding `a1` cannot collide;
  the extension comes from the dropped file; `tileNameOf` names a Tile from its file.
- **Library transitions:** `addTiles` and `addAssets` append; `renameTile` accepts a duplicate,
  the empty string and `"a:b/c"`.
- **Refusals:** `tileReferences` finds every palette entry naming a Tile and ignores numeric
  mappings; `deleteTile` refuses a referenced Tile; `deleteAsset` refuses a Tile's last asset, and the last
  weighted asset of `[1, 0]` while allowing the zero-weight one;
  `setAssetWeight` refuses to zero the last non-zero weight, allows zeroing while another is
  non-zero, and refuses `"-1"`, `""`, `"abc"`, `"Infinity"`; every refusal is an exact identity.

### Gotchas & rejected alternatives

- **Equal weights on attach.** `weight: 1` is a UI constant; equal weights "are the only starting
  point that expresses no opinion".
- **Rename commits per keystroke.** `Tile.name` has no illegal value (not unique, any charset,
  possibly empty), so there is nothing for the parse gate to gate.
- **Drop and button share one path.** Neither gesture is specified; only what an attach writes
  is.

### Review notes

- **Delete releases bytes before the transition, and undo cannot bring them back.** `removeTile`
  and `removeAsset` call `release()` (revoke the object URL and drop the stored bytes) before
  `session.apply(delete…)`. Undo restores the Tile or asset in the document, but its picture is
  gone, so the preview reports an asset error and `exportZip` will throw for missing bytes.
  (possible bug) **Fixed in 0.8.1:** delete no longer releases; the bytes stay for undo, and new
  ids are kept clear of them.
- **Deleting an asset can leave a Tile whose weights sum to zero.** `removeAsset` only checks
  `assets.length <= 1`, and `deleteAsset` (`document.ts:518`) refuses only when one asset would
  remain zero. Deleting the only non-zero asset of a Tile weighted `[1, 0]` is allowed, which
  produces the state `setAssetWeight` refuses to create. `library.test.ts` does not test it.
  (possible bug) **Fixed in 0.8.1:** `deleteAsset` also refuses when the remaining weights sum to
  `<= 0`, and `removeAsset` reports it.
- **Overlapping drops can allocate the same Tile id.** `dropAsTiles` reads `tiles` before its
  `await`s and commits after them. Two drops in flight at once both allocate from the same list,
  and `addTiles` (`document.ts:460`) appends without checking ids. (possible bug, not reproduced)
- The header comment says the palette bar "is Step 6b". It exists as
  `controls/PaletteBar.svelte`. (stale comment)
