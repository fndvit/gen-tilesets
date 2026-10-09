---
title: download.ts
description: The browser half of export. Gather the original asset bytes, zip them with tileset.json, and trigger one download.
sidebar:
  order: 17
---

**Written from:** `apps/editor/src/download.ts`, and the call site in `App.svelte`. No test file.

## Overview

The download module turns an export into a file in the author's downloads folder. The export
module has already decided what goes in: the tileset document and every picture at its path. This
module fetches each picture's original bytes from the editor's memory, packs everything into a
single zip, and makes the browser save it.

A zip is used because a browser cannot save a folder on its own. The pictures are the exact files
the author dropped in, not re-encoded copies, so what ships is what the preview showed.

In the editor's pipeline, import → document → draft/history → preview → **export**, this is the
very last step: the part that touches the browser.

## In detail

### Purpose

`download.ts` is split from [export.ts](/editor/export/) for the reason every split in this app
takes. That one is a pure function of a `TilesetFile` and is unit-tested. This one reads `Blob`s,
zips, and clicks an anchor, and can only be tested by running the app. *"The rule is in the
testable half."*

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `zipOf(list)` | `(ExportEntry[]) → Uint8Array` | `fflate.zipSync` over a flat `{ path: bytes }` map at level 6. |
| `exportZip(file, name = "tileset")` | `(TilesetFile, string) → Promise<void>` | The whole export, as `<name>.zip`. |

Private: `bytesByKey(file)`, which returns a `Map<assetKey, Uint8Array>` of every stored asset's
original bytes.

### Inputs → outputs

1. **`bytesByKey`** walks `file.config.tiles`. For each asset it reads `stored(tile.id, asset.id)`
   from [assets.ts](/editor/assets/). If nothing is stored it skips, and `entries()` reports it. If
   something is, it reads `found.file.arrayBuffer()` into the map under
   [`assetKey`](/api/render/functions/assetkey/)`(tileId, assetId)`.
2. **`entries(file, (tileId, asset) => bytes.get(assetKey(tileId, asset.id)))`**. This throws on a
   missing `meta.src`, a duplicate path, or missing bytes, and the throw propagates out of
   `exportZip`.
3. **`zipOf`** flattens the entries. The slashes in each path are the zip's directories.
4. A `Blob` of type `application/zip` gets an object URL, a temporary `<a download="<name>.zip">`
   is clicked, and the URL is revoked in `finally`.

### Invariants

- **E14: the file and the folder together**, as one download.
- **Keyed on the pair.** Keying on `assetId` alone would resolve one Tile's asset to another's.
  The package's `assetKey` is reused.
- **The original bytes, not the object URL.** Re-encoding through a canvas would change the
  picture the preview approved. Optimisation belongs to a later pipeline.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `App.svelte:25` | imports `exportZip` |
| `App.svelte:315` | `await exportZip(file)` in `runExport()`. A throw is caught and shown as `exportError` beside the preview. |

`zipOf` is used only inside this module (`:72`). `import.test.ts` defines its own local helper of
the same name.

Callees: `entries` (`export.ts`), `stored` (`assets.ts`), `assetKey`
(`@fndvit/gen-tilesets/render`), `zipSync` (`fflate`), `Blob`, `URL.createObjectURL` /
`revokeObjectURL`, `document.createElement`.

### Tests

No test file. `export.test.ts`'s header states that zipping and download are not tested because
they read `Blob`s and click an anchor. `import.test.ts` round-trips through `fflate`'s
`zipSync`/`unzipSync` with its own helper, so `fflate` itself is exercised, but this module's
`zipOf` is not.

### Gotchas & rejected alternatives

- **Rejected: the File System Access API.** It is Chromium only, which would make a Chrome-only
  editor.
- **Rejected: N separate downloads.** The author would have to reassemble the folder by hand,
  which reopens exactly the hole that bundling closes.
- **Revoked synchronously.** The comment argues the click is synchronous and the browser has the
  URL by the time it returns. Revoking on a timer *"would be a guess about how long it needs"*.

### Review notes

- `zipOf` is pure (`ExportEntry[] → Uint8Array`) and could be unit-tested, but it is not.
  `import.test.ts:156` reimplements the same flattening locally instead of importing it. (missing
  test)
- The URL is revoked immediately after `anchor.click()`. The source asserts this is safe. Whether
  every target browser has started the download before the revoke is not verified anywhere in the
  code or tests, so treat it as a claim. (possible bug)
