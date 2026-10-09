---
title: assets.ts
description: The editor's session-scoped asset store, the measurement every attach requires, and the AssetProvider the preview draws through.
sidebar:
  order: 2
---

**Written from:** `apps/editor/src/assets.ts`, `assets.test.ts`, `library.test.ts` (the
attach-path block), and the
call sites in `lib/TileLibrary.svelte`, `lib/ImportPanel.svelte`, `App.svelte`, `download.ts` and
`reference.ts`.

## Overview

The assets module is where the editor keeps the actual pictures. A tileset file names its images
by path, but while the author is still working nothing has been exported. Those paths do not
exist anywhere a browser can fetch them. So the editor holds every dropped image in memory and
answers the preview's requests for a picture from that memory.

It also measures each picture when it arrives, and refuses one it cannot measure. That way the
file never records an image without its size. The store lasts only for the browser session, so
a reload empties it.

In the editor's pipeline, import → document → draft/history → preview → export, this module
serves three stages. Import and the tile library put pictures in. The preview draws them. Export
reads the original bytes back out.

## In detail

### Purpose

`assets.ts` owns a module-level `Map<string, StoredAsset>` keyed by
[`assetKey`](/api/render/functions/assetkey/)`(tileId, assetId)`. It provides:

- the attach path, which measures and stores, or throws;
- `replaceAll`, the whole-store swap an import needs;
- `heldTileIds` and `heldAssetIds`, the ids the store still holds bytes for, so id allocation can
  stay clear of them;
- `editorProvider`, an [`AssetProvider`](/api/render/type-aliases/assetprovider/) that resolves
  from the store and ignores `meta.src`;
- small helpers that build the `tiles/<tileId>/<assetId>.<ext>` path written into `meta.src`.

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `StoredAsset` | interface | `{ url, file, width, height }`: object URL, original `File`, intrinsic size measured once. |
| `extensionOf(fileName)` | function | Lowercased extension stripped to `[a-z0-9]`, or `"bin"`. |
| `tileNameOf(fileName)` | function | The filename without its extension. Used as a new Tile's name. |
| `exportPath(tileId, assetId, ext)` | function | `` `tiles/${tileId}/${assetId}.${ext}` `` |
| `measure(url)` | function | `Promise<{ width, height }>`. Rejects on decode failure or a zero dimension. |
| `attach(tileId, assetId, file)` | async function | Measures, stores, returns the `StoredAsset`. Throws if measurement fails. |
| `Incoming` | interface | `{ tileId, assetId, file }`, one asset an import wants attached. |
| `AttachFailure` | interface | `{ tileId, assetId, reason }`. |
| `replaceAll(incoming)` | async function | Builds a new store to the side, swaps it in, returns the failures. |
| `heldTileIds()` | function | Tile ids the store holds bytes for, deleted Tiles' included. |
| `heldAssetIds(tileId)` | function | Asset ids the store holds bytes for under `tileId`. |
| `stored(tileId, assetId)` | function | Lookup, or `undefined`. |
| `editorProvider` | const | `AssetProvider`: `(ref) → { src: url }`, or throws. |

Engine types: [`AssetProvider`](/api/render/type-aliases/assetprovider/),
[`AssetRef`](/api/render/interfaces/assetref/), [`Drawable`](/api/render/interfaces/drawable/).

### Inputs → outputs

- **`extensionOf`.** If there is no dot, or the dot is at index 0 (`.png`, a dotfile), it returns
  `"bin"`. Otherwise it lowercases the extension and removes any non-`[a-z0-9]` character. An
  empty result also returns `"bin"`.
- **`tileNameOf`.** It strips the last extension, with the same dot-at-0 rule. So `.png` stays
  `.png`.
- **`measure(url)`.** It loads an `Image`. `onload` resolves with `naturalWidth`/`naturalHeight`
  only if both are `> 0`. Otherwise it rejects, saying an SVG needs `width` and `height`, not only
  a `viewBox`. `onerror` rejects with *could not be decoded as an image*.
- **`attach`.** It creates an object URL and awaits `measure`. On success it stores and returns. On
  failure it **revokes the URL** and rethrows, so the caller commits no transition.
- **`replaceAll`.** For each incoming file it creates a URL and measures it into a `staged` map.
  A failure revokes that URL and records an `AttachFailure`; the loop continues. Then it
  snapshots the outgoing values, clears the store, copies the staged entries in, and only then
  revokes every outgoing URL.
- **`heldTileIds()` / `heldAssetIds(tileId)`.** They read the store's keys back with
  [`parseAssetKey`](/api/render/functions/parseassetkey/). `heldTileIds` returns each Tile id
  once.
- **`editorProvider(ref)`.** It looks up `assetKey(ref.tileId, ref.assetId)`. If nothing is there it
  throws *no attached file for t/a…*. It never reads `ref.meta`.

### Invariants

- **Keyed on the pair, never on `assetId`.** `TileAsset.id` is unique only within its Tile, so a
  key on `assetId` alone would resolve one Tile's asset to another's, silently. The package's
  `assetKey` is reused rather than rewritten.
- **E13: measure or fail.** An attach writes all three `meta` keys (`src`, `width`, `height`) or
  fails. A zero dimension counts as a failure, because writing `0` would satisfy the letter of the
  rule and defeat its point.
- **R2: same ref → same drawable.** There is one object URL per attach, returned on every lookup,
  so the provider is a lookup rather than a source of variation.
- **The provider throws, never substitutes.** No `null`, no placeholder. `<Tileset>` turns the
  throw into one `onAssetError` call and an empty cell.
- **A delete keeps the bytes.** There is deliberately no `release()`. Deleting a Tile or asset is
  undoable, so its bytes stay in the store and undo finds them. The cost is a leak bounded by the
  session: every picture dropped since the last import or new document stays until `replaceAll`
  swaps the store out.
- **A kept id is not reallocated.** [ids.ts](/editor/ids/) allocates from what the document
  holds, so after a delete it could hand out the deleted Tile's id, and the new attach would
  overwrite bytes undo still needs. `heldTileIds` and `heldAssetIds` are passed to allocation
  alongside the document's ids.
- **Session-scoped.** The bytes are in memory only. The comment records that the storage choice
  is still open (IndexedDB, file system, server).

### Callers / callees

| Caller | Uses |
| --- | --- |
| `lib/TileLibrary.svelte:69` | `attach` inside `buildAsset`, then `exportPath(tileId, assetId, extensionOf(file.name))` at `:78` into `meta.src`. |
| `lib/TileLibrary.svelte:102` | `tileNameOf(file.name)` for a new Tile's name. |
| `lib/TileLibrary.svelte:91`, `:115` | `heldTileIds()` and `heldAssetIds(tile.id)`, passed to `nextIds` beside the document's ids. |
| `lib/TileLibrary.svelte:275` | `stored(tile.id, asset.id)` to show a thumbnail. |
| `lib/ImportPanel.svelte:207` | `replaceAll(incoming)` after validation, before `session.open`. |
| `App.svelte:827` | `editorProvider` passed as `options.provider` to `<Tileset>`. |
| `download.ts:43` | `stored` to read original bytes for export. |
| `reference.ts:56` | `measure`, reused for the reference image. |

Callees: `assetKey` and `parseAssetKey` from `@fndvit/gen-tilesets/render`, `URL.createObjectURL` /
`revokeObjectURL`, `Image`.

### Tests

`library.test.ts` (block *attach paths*, lines 82–102) pins:

- `exportPath` mirrors the `AssetRef` key, so two Tiles holding `a1` cannot collide;
- `extensionOf` takes the extension from the dropped file;
- `tileNameOf` names a new Tile from the file.

`assets.test.ts` stubs a minimal `Image` that "decodes" any URL at 10 × 10, and tests the
store's lifetime:

- an asset the document no longer holds still resolves through `editorProvider`;
- a new Tile's id, allocated with `heldTileIds()`, stays clear of a deleted Tile's bytes, and the
  old bytes still resolve;
- a new asset's id, allocated with `heldAssetIds`, stays clear of a deleted asset's bytes;
- `replaceAll([])` empties the store, after which `editorProvider` throws *no attached file*.

`measure`'s real decode and `replaceAll`'s URL-revocation ordering are still untested.

### Gotchas & rejected alternatives

- **Why the editor has its own provider.** The default provider reads `meta.src` verbatim. That
  is right for a host serving an exported folder and wrong here, where `meta.src` is the
  *future* export path.
- **`replaceAll` is one call, not clear-then-attach.** Ids collide across sessions almost by
  construction (`t1`, `t2`, … every time). Clearing after attaching would revoke the new URLs.
  Clearing before would blank a mounted preview and lose everything if the incoming decode
  failed. Building to the side keeps the outgoing document intact until the swap.
- **One undecodable picture is skipped, not fatal.** It is reported as an `AttachFailure` and the
  cell draws nothing.
- **Undo does not restore bytes across an import.** `session.open` is undoable, but the store
  was swapped with it. `session.svelte.ts` documents this as a known gap. Undoing a delete is
  fine, because a delete keeps the bytes.
- **Rejected: releasing only the bytes no undo or redo state references.** It needs this module
  to read `session`'s history, and to re-run on every transition that drops a state off the end
  of it. That is a second owner for the store's lifetime, for memory `replaceAll` already
  reclaims.

### Review notes

- `StoredAsset.width`/`height` are documented as *"Intrinsic, design px"*, but `measure` returns
  `naturalWidth`/`naturalHeight`, which are image pixels. The comment's unit is questionable.
  (inconsistency)
- `lib/TileLibrary.svelte:174` and `:183` call `release` **before** the delete transition. The
  delete is undoable, but the bytes are not. An undo restores the Tile or asset with no stored
  bytes, so the preview draws an empty cell and export throws *no attached bytes*. `assets.ts`
  documents the same gap for import only. (possible bug) **Fixed in 0.8.1:** `release()` is
  removed and a delete keeps the bytes for undo.
- `measure`, `attach`, `replaceAll` and `editorProvider` have no tests. The URL-revocation
  ordering in `replaceAll` is the subtle part. (missing test) **Partly fixed in 0.8.1:**
  `assets.test.ts` covers `attach`, `editorProvider`, `replaceAll` emptying the store, and the
  held ids; `measure`'s real decode and the revocation ordering are still untested.
