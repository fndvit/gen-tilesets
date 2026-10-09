---
title: import.ts
description: The pure half of opening an exported archive. Splits a path-to-bytes map into an unvalidated document and the asset bytes it names.
sidebar:
  order: 1
---

**Written from:** `apps/editor/src/import.ts`, `import.test.ts`, and the call sites in
`lib/ImportPanel.svelte`.

## Overview

The import module reads an exported tileset back in. An export is a zip, or a folder, holding one
tileset file and a folder of tile pictures. Something else unpacks it into a list of files. This
module receives that list and works out two things: which part is the tileset document, and
which picture belongs to which tile.

It does not check whether the document is valid, and it never touches the editor's open
document. It only hands back what it found, including any pictures the document mentions but the
archive does not carry. The import panel then upgrades, validates and opens the document.

It is the first step of the editor's own pipeline:
**import** → document → draft/history → preview → export. It is also the mirror image of
[export.ts](/editor/export/). Whatever export writes, this reads.

## In detail

### Purpose

`import.ts` is the inverse of `export.ts`'s `entries()`. It takes an `Archive`, a
`ReadonlyMap<string, Uint8Array>` keyed by path, and knows nothing about zips, drag events or the
DOM. `ImportPanel.svelte` builds the map from either an unzipped archive or a dropped folder, so
only the reader differs. The module parses `tileset.json` and walks the document's tiles. It pairs
each asset's `meta.src` with the bytes at that path, and returns the document **unvalidated**.

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `Archive` | type | `ReadonlyMap<string, Uint8Array>`, every file found, keyed by path. |
| `AssetBytes` | interface | `{ tileId, assetId, path, bytes }`, one asset's bytes already paired with its ids. `path` is kept for failure messages. |
| `ArchiveContents` | interface | `{ file: unknown, assets: AssetBytes[], missing: string[] }`. `file` is parsed, not validated. |
| `readArchive(archive)` | function | `Archive → ArchiveContents`. Throws only when there is no document or it is not JSON. |
| `nameOf(path)` | function | The basename of a path, used as the `File` name of an incoming asset. |
| `mimeOf(path)` | function | A MIME type guessed from the extension, or `""`. |

Engine types used: [`TilesetFile`](/api/index/interfaces/tilesetfile/),
[`TileAsset`](/api/index/interfaces/tileasset/). It imports `FILE_NAME` (`"tileset.json"`) from
[export.ts](/editor/export/).

### Inputs → outputs

`readArchive(archive)`:

1. **Document.** It looks up `tileset.json`. If the file is absent it throws *no tileset.json in
   the archive…*. If `JSON.parse` fails it throws *tileset.json is not valid JSON: …*. Both are
   plain `Error`s and never `ValidationError`s. The comment explains why: a syntax problem would
   otherwise land in a list the UI renders against fields.
2. **Walk.** If `config.tiles` is not an array, it returns the file with no assets and no missing
   paths. Tiles whose `id` is not a string, or whose `assets` is not an array, are skipped. So
   are assets whose `id` is not a string.
3. **Pairing.** For each asset, `srcOf` reads `meta.src`. If `src` is not a non-empty string, the
   asset is **skipped silently**: neither an asset nor a missing path. Otherwise, if the archive
   has bytes at that path, the asset joins `assets`. If it does not, the path joins `missing`.

Archive entries that no `meta.src` names are never read.

`nameOf` returns the text after the last `/`, or the whole string if there is none.

`mimeOf` lowercases the extension and maps `png`, `jpg`/`jpeg`, `gif`, `webp`, `avif` and `svg`.
Anything else returns `""` rather than a guess.

### Invariants

- **The document drives the walk, not the folder.** Walking `config.tiles` gives each entry its
  `(tileId, assetId)` pair by construction. A stray image in a hand-assembled folder is never
  attached to a tile that does not claim it.
- **`meta.src` is believed, and the path is never re-parsed.** Parsing `tiles/leaf/a1.png` back
  into a pair would be a third implementation of the export layout, and wrong for a
  hand-edited `src`.
- **A missing asset is an advisory, not a refusal.** A document with absent bytes is still a
  legal file. The cell draws nothing, which the source calls the *honest hole*, and the author
  can repair it by dropping the picture back in.
- **Validation is not done here.** The walk is defensive about shape *because* it runs before
  `validate()`.

### Callers / callees

| Caller | Uses | Why |
| --- | --- | --- |
| `lib/ImportPanel.svelte:39` | import of `mimeOf`, `nameOf`, `readArchive`, `Archive` | |
| `lib/ImportPanel.svelte:181` | `readArchive(archive)` | First step of `open()`. Its output then goes through [`migrate`](/api/index/functions/migrate/) (`:183`) and [`validate`](/api/index/functions/validate/) (`:195`). |
| `lib/ImportPanel.svelte:204` | `nameOf`, `mimeOf` | Wraps each `AssetBytes` in a `File` for `replaceAll` ([assets.ts](/editor/assets/)). |

The panel's order is read → parse → migrate → validate → attach → swap. A `"newer"` migration
outcome stops before validation (`:186`). A non-empty error list stops before anything is
attached (`:196`). Only then do `replaceAll` (`:207`), `session.open` (`:210`) and
`drafting.discard()` (`:213`) run.

Callees: `FILE_NAME` from `export.ts`, `TextDecoder`, `JSON.parse`.

### Tests: `import.test.ts`

- **Round-trip.** `readArchive` reads back exactly what `entries()` wrote, keeps two tiles' `a1`
  assets apart by pair, produces a document that validates, and reads an empty document with no
  assets.
- **Refuses and tolerates.** It throws with no `tileset.json`, and throws on unparseable JSON
  rather than producing a `ValidationError`. It reports a missing asset without refusing, ignores
  an archive entry the document does not name, survives a malformed document (`tiles: "nope"`,
  `[{ id: 7 }, null]`) without throwing, and skips an asset with no `meta.src`.
- **End to end through a real zip** (`fflate` `zipSync`/`unzipSync`). A current export comes back
  as `migrate()` → `"current"` and validates. A v1 archive migrates, validates, and equals the
  original with all three assets present. A v5 archive yields `"newer"`. A v1 archive with an
  unknown key migrates and then reports `UNKNOWN_KEY` at `/colour`, not at `/schemaVersion`.
- `nameOf` and `mimeOf` on representative paths.

### Gotchas & rejected alternatives

- **Rejected: iterating `tiles/`.** It would attach unreferenced files, or drop them with no way to
  say which.
- **Rejected: refusing an import over missing pictures.** That would discard the operations, the
  seed and the layout over one image.
- **An asset with no `meta.src` is invisible here.** `validate()` does not flag it either, since
  `meta` is opaque. It only surfaces at export, which refuses such a file.
- **`mimeOf` is advisory.** Decoding sniffs content. The type is set only because some browsers
  refuse an SVG object URL with an empty type.

### Review notes

- The user-facing error at `import.ts:71-72` cites `09 §11.1`. The same habit appears in
  `export.ts` and `assets.ts` (see [export.ts](/editor/export/)).
