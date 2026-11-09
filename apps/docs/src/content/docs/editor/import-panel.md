---
title: ImportPanel.svelte
description: Opens an exported tileset.zip or its unzipped folder. Migrates, validates, re-attaches the pictures and swaps the document, or refuses and changes nothing.
sidebar:
  order: 43
---

**Written from:** `apps/editor/src/lib/ImportPanel.svelte`, and the call site in
`lib/sections/SidebarFooter.svelte`. The
pure half it calls is [import.ts](/editor/import/)'s `prepareArchive`, and the swap is
[adopt.ts](/editor/adopt/).

## Overview

Import is the Import button in the sidebar footer. It opens a file picker for the `tileset.zip`
the editor exported earlier. The author can also drop that zip, or the folder it unpacks to, on
the footer.

The panel reads the archive, upgrades an older tileset file to the current format, and checks
it. If anything is wrong it changes nothing and lists the problems in a popup once the attempt
ends. The report never takes space in the footer. The document on screen stays
as it was. If the file was written by a newer build, it says so and tells the author to update
the editor. If the file is good, the panel re-attaches the pictures and opens the document.
Anything worth knowing, such as an upgrade that happened or pictures that could not be read, is a
notice in the preview's stack, not the popup. A picture the archive did not carry is reported once,
by the preview, as an asset failure ("no file attached").

In the editor's pipeline (**import** → document → draft/history → preview → export), this is the
entry point. It is the inverse of the download button.

## In detail

### Purpose

The component turns a dropped zip, a picked zip, or a dropped folder into an `Archive` (a map
of path to bytes), then runs the sequence read → parse → **migrate** → **validate** → attach →
swap. Everything up to the swap is `prepareArchive` ([import.ts](/editor/import/)), which is pure;
the swap is `adopt` ([adopt.ts](/editor/adopt/)). So every refusal leaves the author exactly where
they were. The New tileset popup's templates (B-016) go through the same pair. `prepareArchive`
calls [`migrate`](/api/index/functions/migrate/) and [`validate`](/api/index/functions/validate/)
itself rather than the package's `loadTilesetFile`, because the panel needs the migration steps
for its advisory and the structured [`ValidationError`](/api/index/interfaces/validationerror/)
list to show each error at its path.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `target` | `HTMLElement \| null` | `null` | The element that takes drops (the footer). Listeners are attached in an `$effect`. |
| `over` | `boolean` (bindable) | `false` | Whether a drag is over `target`, for the caller to style. |

It changes editor state only through [`adopt`](/editor/adopt/), which writes
[`session`](/editor/session/), [`drafting`](/editor/drafting/), the notices and the asset store in
[assets.ts](/editor/assets/).

### Inputs → outputs

#### Getting to an `Archive`

| Gesture | Path |
| --- | --- |
| Drop with any directory entry | `fromFolder(entries)` |
| Drop of files only | `fromZip(files[0])`; other files are ignored |
| Import button (`accept=".zip,application/zip"`) | `fromZip(file)`, then the input is cleared so the same file can be chosen again |

- `fromZip` uses `unzipSync` from `fflate` and drops directory entries (paths ending `/`).
- `fromFolder`: if exactly one directory was dropped, its **contents** are the root, so the
  folder's own name is not in the paths. Otherwise each entry is walked with an empty prefix.
- `entriesOf` calls `webkitGetAsEntry()` on every item **before the first `await`**, because a
  `DataTransferItem` is invalidated once the handler yields.
- `walk` calls `readEntries` until it returns an empty batch. A single call returns at most one
  batch, and stopping there would silently drop files from a large directory.

#### `open(archive)`

1. `prepareArchive(archive)` ([import.ts](/editor/import/)) reads, migrates and validates, and
   returns one of three outcomes:
   - `"newer"`: set `newer = prepared.declared` and stop.
   - `"invalid"`: set `errors = prepared.errors` and stop.
   - `"ready"`: the validated file, its pictures as `File`s, and the migration steps.
2. If the current tileset `isBlank` ([document.ts](/editor/document/): no Tiles, no Operations, no
   responsive rules), `await adopt(prepared)` at once. Otherwise the prepared file waits in
   `pending` and a `wide` [Dialog](/editor/ui-dialog/) asks "Replace the current tileset?" with
   the verb **Import** and the shared `LossWarning` line ("Everything in the current tileset is
   lost, and it can't be undone. Export it first to keep it."). Import calls `confirmImport()`;
   Cancel drops `pending`.
3. `adopt(prepared)` ([adopt.ts](/editor/adopt/)): `replaceAll`, `session.open` (a fresh history),
   `drafting.discard()`, then the notices from `importNotices({ upgrades, failed })`. A new
   document starts with no notices, then gets its own.

`run()` resets all three outputs, sets `busy` (the button reads "Importing…"), and catches any
throw (a bad zip, a missing `tileset.json`) into `failure`. When it ends with anything to report,
it opens the [`Popup`](/editor/ui-popup/). An import that opened never opens it. Closing the
popup calls `reset()`.

#### What it shows

Refusals are in the popup, titled "Import refused". It is
[ImportRefused.svelte](/editor/import-refused/), which the New tileset popup also uses for a
template that fails to open.

| State | Shown |
| --- | --- |
| `failure` | "Not opened. Nothing in the current document has changed." and the message |
| `newer` | "written by a newer build (schemaVersion N). Update the editor, not the file." |
| `errors` | "Not opened. …" and the first 12 errors as `path CODE message`, then "…and N more" |

### Invariants

- **No partial import** (cited as **C6**, §12.4). On any `ValidationError`, the file is not opened,
  nothing is repaired, and `<Tileset>` is never mounted on it (**S3**).
- **Migrate before validate.** Rewriting `schemaVersion` is a coercion, and validation never
  coerces.
- **"Update the editor" only for a newer file.** It is held in its own state rather than read
  out of `SCHEMA_VERSION_UNKNOWN`, which also fires for absent or fractional versions. The
  comment records that reading it from the code once told an author with an *old* file that
  their editor was at fault.
- **Missing pictures are not a refusal.** A document whose pictures are absent is still legal,
  and refusing "would throw away the operations, the seed and the layout over a picture". They
  surface as §12.3 asset failures in the preview, so each picture is reported once.
- **The draft is discarded on open**, because it names ids the incoming document may not have.

### Callers / callees

| Caller | Use |
| --- | --- |
| `lib/sections/SidebarFooter.svelte` | `<ImportPanel target={root} bind:over />` in the actions row |

Callees: `prepareArchive` (`import.ts`); `adopt` (`adopt.ts`); `unzipSync` (`fflate`);
`isBlank` (`document.ts`); `session.file`; `ui/Button`, `ui/Dialog`, `ImportRefused`,
`LossWarning`.

### Tests

No test file for the component. `import.test.ts` covers the panel's whole non-DOM path: its
`describe("prepareArchive")` block pins each outcome (ready, migrated, newer, invalid, a missing
picture, a throw), and `describe("the import path, end to end through a zip")` runs unzip →
`readArchive` → `migrate` → `validate` through a real `fflate` zip. The folder walk and `adopt`
are not tested.

### Gotchas & rejected alternatives

- **Refusals only after an attempt, in a popup** (Pol, 2026-11-04). They never take footer space.
- **An import that opened has nothing to answer**, so its notes are notices beside the picture
  (Stage 2 W3), not a popup. The "Imported, with notes" popup was removed.
- **Same gesture as the tile library.** A drop target plus a hidden picker, on purpose: the two
  surfaces that take files from the author should take them the same way.
- **A refused file costs nothing.** Every early `return` in `open()` is before `adopt`.
- **It asks only after the file validated.** A question before a refusal would guard nothing.
  It skips the question for a blank tileset (Pol, 2026-11-09).

### Review notes

- Undo after an import used to restore the previous document without its pictures, because
  `replaceAll` had already swapped the asset store. **Fixed (2026-11-09):** an import is no longer
  undoable, and the panel asks first unless the current tileset is blank.
- The header comment's opening says the editor "takes the exported `.zip` or the unzipped folder".
  The picker only accepts `.zip`; a folder can only be dropped. Not wrong, but the button does not
  offer the folder path.
