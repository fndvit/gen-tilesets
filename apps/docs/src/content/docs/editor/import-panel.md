---
title: ImportPanel.svelte
description: Opens an exported tileset.zip or its unzipped folder. Migrates, validates, re-attaches the pictures and swaps the document, or refuses and changes nothing.
sidebar:
  order: 43
---

**Written from:** `apps/editor/src/lib/ImportPanel.svelte`, and the call site in `App.svelte`. The
pure half it calls is [import.ts](/editor/import/).

## Overview

The import panel is the last panel in the sidebar, labelled "Import" and drawn as destructive
because it replaces the whole document. It is a drop zone with a "Choose file…" button. The
author drops in the `tileset.zip` the editor exported earlier, or the folder that zip unpacks to.

The panel reads the archive, upgrades an older tileset file to the current format, and checks
it. If anything is wrong it lists the problems and changes nothing. The document on screen stays
as it was. If the file was written by a newer build, it says so and tells the author to update
the editor. If the file is good, the panel re-attaches the pictures, opens the document and lists
anything worth knowing, such as an upgrade that happened or a picture the archive did not carry.

In the editor's pipeline (**import** → document → draft/history → preview → export), this is the
entry point. It is the inverse of the download button.

## In detail

### Purpose

The component turns a dropped zip, a picked zip, or a dropped folder into an `Archive` (a map
of path to bytes), then runs the sequence read → parse → **migrate** → **validate** → attach →
swap. Nothing before the last two steps touches editor state, so every refusal leaves the author
exactly where they were. It calls [`migrate`](/api/index/functions/migrate/) and
[`validate`](/api/index/functions/validate/) itself rather than the package's
`loadTilesetFile`, because it needs the migration steps for its advisory and the structured
[`ValidationError`](/api/index/interfaces/validationerror/) list to show each error at its path.

### Public surface

No props, no events, no bindings. It reads and writes module state directly:
[`session`](/editor/session/), [`drafting`](/editor/drafting/) and the asset store in
[assets.ts](/editor/assets/).

### Inputs → outputs

#### Getting to an `Archive`

| Gesture | Path |
| --- | --- |
| Drop with any directory entry | `fromFolder(entries)` |
| Drop of files only | `fromZip(files[0])`; other files are ignored |
| "Choose file…" (`accept=".zip,application/zip"`) | `fromZip(file)`, then the input is cleared so the same file can be chosen again |

- `fromZip` uses `unzipSync` from `fflate` and drops directory entries (paths ending `/`).
- `fromFolder`: if exactly one directory was dropped, its **contents** are the root, so the
  folder's own name is not in the paths. Otherwise each entry is walked with an empty prefix.
- `entriesOf` calls `webkitGetAsEntry()` on every item **before the first `await`**, because a
  `DataTransferItem` is invalidated once the handler yields.
- `walk` calls `readEntries` until it returns an empty batch. A single call returns at most one
  batch, and stopping there would silently drop files from a large directory.

#### `open(archive)`

1. `readArchive(archive)` → `{ file, assets, missing }`.
2. `migrate(file)`. On `"newer"`, set `newer = outcome.declared` and stop.
3. Take `outcome.file` if `"migrated"`, else the raw file. `"unrecognized"` has no branch and
   falls through to `validate()`, which reports it at `/schemaVersion`.
4. `validate(file)`. Any error: set `errors` and stop.
5. Wrap each asset's bytes in a `File` (`nameOf`, `mimeOf`) and `await replaceAll(incoming)`.
6. `session.open(file as TilesetFile)` and `drafting.discard()`.
7. Set `advisories`: one per migration step ("Upgraded from schemaVersion N — …"), one per
   `missing` path, one per failed attach.

`run()` resets all four outputs, sets `busy`, and catches any throw (a bad zip, a missing
`tileset.json`) into `failure`.

#### What it shows

| State | Shown |
| --- | --- |
| `failure` | one red line |
| `newer` | "written by a newer build … Update the editor, not the file." |
| `errors` | "Not opened. Nothing in the current document has changed." and the first 12 errors as `path [CODE] message`, then "…and N more" |
| `advisories` | a list with a "clear" button |

### Invariants

- **No partial import** (cited as **C6**, §12.4). On any `ValidationError`, the file is not opened,
  nothing is repaired, and `<Tileset>` is never mounted on it (**S3**).
- **Migrate before validate.** Rewriting `schemaVersion` is a coercion, and validation never
  coerces.
- **"Update the editor" only for a newer file.** It is held in its own state rather than read
  out of `SCHEMA_VERSION_UNKNOWN`, which also fires for absent or fractional versions. The
  comment records that reading it from the code once told an author with an *old* file that
  their editor was at fault.
- **Missing pictures are an advisory, not a refusal.** A document whose pictures are absent is
  still legal, and refusing "would throw away the operations, the seed and the layout over a
  picture".
- **The draft is discarded on open**, because it names ids the incoming document may not have.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:58` | import |
| `App.svelte:751` | `<ImportPanel />` inside `<Section title="Import" open={false} destructive>` |

Callees: [`migrate`](/api/index/functions/migrate/), [`validate`](/api/index/functions/validate/)
(`ImportPanel.svelte:35`); `unzipSync` (`fflate`, line 36); `replaceAll` (`assets.ts`, line 37);
`readArchive`, `nameOf`, `mimeOf` (`import.ts`, line 39); `session.open`, `drafting.discard`.

### Tests

No test file for the component. `import.test.ts` covers the panel's whole non-DOM path: its
`describe("the import path, end to end through a zip")` block (line 155) runs unzip →
`readArchive` → `migrate` → `validate` through a real `fflate` zip, which its comment calls
"everything `ImportPanel.svelte` does before it touches the asset store or the session". Other
blocks pin `readArchive`, `nameOf` and `mimeOf`. The folder walk, `replaceAll` and the swap are
not tested.

### Gotchas & rejected alternatives

- **Same gesture as the tile library.** A drop zone plus a hidden picker, on purpose: the two
  surfaces that take files from the author should take them the same way.
- **A refused file costs nothing.** Every early `return` in `open()` is before `replaceAll` and
  `session.open`.

### Review notes

- The prose under the panel says the import is "undoable, like everything else (E6)". Undo does
  restore the previous document, but `replaceAll` has already cleared the asset store and revoked
  the old object URLs, so the restored document's pictures are gone. `session.svelte.ts` documents
  this gap in its `open()` comment; the panel's own text does not, so an author is not told.
  (doc gap)
- The header comment's opening says the editor "takes the exported `.zip` or the unzipped folder".
  The picker only accepts `.zip`; a folder can only be dropped. Not wrong, but the button does not
  offer the folder path.
