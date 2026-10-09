---
title: export.ts
description: The pure half of export. Serialize the document, list every file the archive must contain, and flag a document that draws nothing.
sidebar:
  order: 16
---

**Written from:** `apps/editor/src/export.ts`, `export.test.ts`, `import.test.ts` (which uses
`entries` and `serialize` as its fixture), and the call sites in `download.ts`, `import.ts` and
`App.svelte`.

## Overview

The export module decides what goes into the file the author downloads. A finished tileset is a
document plus a folder of tile pictures, and the two always travel together. The document names
each picture by its path in that folder. Shipping them separately would let the paths and the
pictures drift apart, with nothing to catch it.

This module turns the document into text and lists every picture alongside it, each at the path
the document gives for it. If a picture is missing, or two pictures would land on the same path,
it stops with an error rather than shipping an incomplete folder. It also notices when a
document would draw nothing at all, and lets the editor say so without blocking the export.

In the editor's pipeline, import → document → draft/history → preview → **export**, this is the
last step. It holds the rules. The download module does the zipping and the browser download.

## In detail

### Purpose

`export.ts` is pure and unit-tested. It implements invariant **E14**: *export produces a
`TilesetFile` and an asset folder together. Every `meta.src` in the file is a path relative to
that folder's root.* The layout mirrors the `AssetRef` key:

```
tileset.json
tiles/<tileId>/<assetId>.<ext>
```

The structure is not a flat folder, because two Tiles both holding `a1` would otherwise overwrite
each other.

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `ExportEntry` | `{ path: string; bytes: Uint8Array }` | One file in the zip. |
| `BytesFor` | `(tileId: string, asset: TileAsset) → Uint8Array \| undefined` | Bytes looked up by the pair, never by `assetId` alone. |
| `FILE_NAME` | `"tileset.json"` | Also used by [import.ts](/editor/import/). |
| `serialize(file)` | `(TilesetFile) → string` | `JSON.stringify({ ...file, engineVersion: ENGINE_VERSION }, null, 2) + "\n"` |
| `entries(file, bytesFor)` | `(TilesetFile, BytesFor) → ExportEntry[]` | The JSON first, then one entry per asset. Throws on any gap. |
| `drawsNothing(file)` | `(TilesetFile) → boolean` | The *document draws nothing* advisory. |

Engine types: [`TilesetFile`](/api/index/interfaces/tilesetfile/),
[`TileAsset`](/api/index/interfaces/tileasset/).

### Inputs → outputs

**`serialize`** writes the in-memory file exactly, except that it stamps the current
`ENGINE_VERSION` over `engineVersion` (invariant E2). Everything else the export rules require is
already true of it, which is invariant E3 paying off: there is no projection that could disagree
with the preview. The stamp is spread over the existing key, so the key keeps its place, and the
in-memory document is left as imported. It uses two-space indentation and a trailing newline, because the result is a
text file a human may open, diff and commit.

**`entries(file, bytesFor)`**, for each tile and asset in document order:

1. If `meta.src` is not a non-empty string, it throws *t/a has no meta.src, so the file cannot
   point at its bytes…*.
2. If the `src` was already seen, it throws *two assets both export to "…". One would overwrite
   the other.*
3. If `bytesFor(tile.id, asset)` is `undefined`, it throws *no attached bytes for t/a. The editor's
   asset store is session-scoped…*.
4. Otherwise it pushes `{ path: src, bytes }`.

A document with no tiles yields only `[tileset.json]`.

**`drawsNothing(file)`** is true if there are no tiles, no operations, no Operation with
`target === "tileId"`, or every `tileId`-targeted palette has only `null` entries.

### Invariants

- **Paths come from `meta.src`, not a second construction.** Rebuilding
  `tiles/<tileId>/<assetId>.<ext>` here would be a second implementation of the layout, and the
  failure would be silent: the file points at one path and the folder holds another.
- **An asset with no bytes is an error, never an omission.** Shipping a quietly incomplete folder
  is the substitution problem moved into the artifact, where no `onAssetError` will ever fire.
- **File and folder are one action.** A file exported without its folder reopens the `meta.src`
  typo hole that bundling closes. `meta` is the one place in the file where a typo validates
  cleanly, and when the editor writes `src` itself beside a file it just copied, that hole closes
  without validating anything.
- **Every field explicitly, except `steps`.** The schema's defaults exist so hand-written fixtures
  stay short. `steps` is the exception because its *absence* means *continuous*.
- **E16: `drawsNothing` never blocks.** An empty document is legal and the author may want it.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `download.ts:23`, `:68` | `entries(file, …)` with a `BytesFor` backed by the asset store |
| `import.ts:35`, `:68` | `FILE_NAME` |
| `App.svelte:26`, `:329` | `drawsNothing(file)`, the advisory |

`serialize` is called only by `entries` (`:96`) and by tests.

Callees: `ENGINE_VERSION` from [document.ts](/editor/document/), `JSON.stringify`, `TextEncoder`.

### Tests

- **`export.test.ts`.** The header notes that zipping and download are `download.ts`'s and are
  untested. These tests cover what goes in.
  - *The file.* It carries `schemaVersion: 4` and a string `engineVersion`, writes `assetSalt`,
    `reseedAssetsOnLoad` and `yOffset` explicitly, omits `steps` and contains no `null`, and ends
    in `}\n`. An imported file stamped `0.6.0` is written with the current `ENGINE_VERSION`, the
    in-memory file keeps `0.6.0`, and the keys keep their order.
  - *The folder.* It holds the JSON plus one file per asset, keeps two Tiles' `a1` apart, takes
    the path from `meta.src`, and refuses a missing `meta.src`, two assets on one path, and
    missing bytes. A document with no tiles exports as just the JSON.
  - *`drawsNothing`.* True for an empty document, for tiles but no operations, for all-`null`
    palettes, and for no `tileId` Target. False once a palette names a Tile.
- **`import.test.ts`** builds its archives with `entries` and `serialize`, so the round-trip
  tests there also pin that export's output reads back.

### Gotchas & rejected alternatives

- **Why bundle at all.** The roadmap found no good way to validate `meta.src`. Writing it beside
  the bytes is *"a better answer than the one B3 was looking for"*.
- **Rejected: a flat folder.** It produces filename collisions between Tiles.

### Review notes

- `serialize`'s docstring (`export.ts:56`) says *"`schemaVersion: 2` — required"*. The document is
  `schemaVersion: 4` (`document.ts:128`, and `export.test.ts` asserts 4). (stale comment)
- User-facing error messages here (`export.ts:106-107`, `:122-123`), in `import.ts:71-72` and in
  `assets.ts:278-279` cite spec sections (`09 §11.1`, `E14`, `09 §15 Q8`). The spec is archived
  and not available to the author reading the message. (doc gap)
- **An imported document's `engineVersion` is never restamped.** The `engineVersion` bullet
  (`export.ts:57`) calls the stamp "truthful by construction", but only `newDocument()` writes it
  (`document.ts:131`). An imported file opens as it is (`session.svelte.ts:128`) and `serialize`
  writes it as it is (`:69`). A file from 0.6.0, edited and exported here, still says `"0.6.0"`.
  See [Versioning](/concepts/versioning/). (possible bug) **Fixed in 0.8.1:** `serialize` stamps
  the current `ENGINE_VERSION` at export.
