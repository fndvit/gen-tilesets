---
title: keep.ts
description: Keeping the open tileset and its pictures across reloads. The save plan, the archive a kept tileset reopens as, the notices, and the IndexedDB store.
sidebar:
  order: 91
---

**Written from:** `apps/editor/src/keep.ts`, `keep.test.ts`, and its caller
[keeping.svelte.ts](/editor/keeping/).

## Overview

Since B-016 S4a (Pol, 2026-11-09) the open tileset survives a reload. What is kept is what an
Export holds: the `TilesetFile` and the bytes of every picture it names. The undo history, a
half-built operation, open sections and the load preview are **not** kept, so Undo starts empty
after a reload.

A kept tileset **reopens the way an import does**. `archiveOf` turns it into the same `Archive` an
exported zip reads as, and the caller runs it through `prepareArchive` ([import.ts](/editor/import/)).
A tileset kept by an older editor is migrated; one kept by a newer editor, or one that no longer
validates, is refused with a notice and the editor starts empty.

## In detail

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `Snapshot` | interface | `{ file, pictures }`: the document and each picture's `Blob` by `meta.src`. |
| `SavePlan` | interface | `{ file, put: { src, blob }[], remove: string[] }`. |
| `DocumentStore` | interface | `persistent`, `read()` (`Snapshot` or `null`), `write(plan)` (all or nothing). |
| `BlobFor` | type | `(tileId, asset) => Blob \| undefined`, the asset store's bytes. |
| `picturesOf(file, blobFor)` | function | Every `meta.src` the document names, with its bytes or `undefined`. |
| `savePlan(file, blobFor, saved)` | function | What a save writes, given the `Blob` last written under each `src`. |
| `afterSave(saved, plan)` | function | What the store holds once `plan` is written. |
| `isNoop(plan, savedFile)` | function | True when the plan would change nothing. |
| `archiveOf(snapshot)` | async function | `tileset.json` plus each picture at its `src`, for `prepareArchive`. |
| `Refusal` | type | `prepareArchive`'s `newer` or `invalid`, or `{ kind: "unreadable", reason }`. |
| `refusedNotice(refusal)` | function | The failure notice "Your last tileset couldn't be reopened", saying why. |
| `notKeptNotice(reason)` | function | The failure condition "Changes won't be kept across reloads": storage blocked (`null`) or a save refused. |
| `memoryStore()` | function | A store in memory: the fallback, and what the tests run on. |
| `openStore(factory?)` | async function | IndexedDB ([browser-db.ts](/editor/browser-db/), stores `document` and `pictures`), else `memoryStore()`. Never rejects. |

### Behaviour

- **A save writes only what changed.** Pictures whose `Blob` the store already holds under that
  `src` are skipped, by object identity. Pictures the document no longer names are removed. The
  document is always written.
- **Identity is enough.** Within one asset store a `src` always holds the same `File`, and
  `replaceAll` (New, Import) makes every `File` a new object, so a reused path is rewritten.
- **A picture with no bytes keeps what was kept.** A document can name a picture the asset store
  lacks (a failed decode). The plan neither puts nor removes it, so the next reload tries again.
- **One transaction.** The IndexedDB `write` puts the pictures and the document together and
  commits at once, so a reload never finds a document without its pictures, and a reload right
  after an edit does not lose it.
- **`JSON.stringify`, not `serialize`.** A reload is not an export, so it does not stamp the
  running `engineVersion`.
- **Two tabs:** each saves its own document; the last change wins (Pol).

### Tests

`keep.test.ts`: the first save puts every picture; a second is a no-op; a replaced `Blob` is
rewritten; a dropped picture is removed; a picture with no bytes is left alone; an asset with no
`src` is skipped; a kept tileset round-trips through `prepareArchive` with its bytes; its own
`engineVersion` is kept; an older one migrates; newer and invalid ones are refused; the notices'
text and signatures; the fallbacks to memory. The IndexedDB adapter is checked in the browser.

### Gotchas & rejected alternatives

- **Rejected: keeping the undo history.** Up to 100 whole files, plus the bytes of every deleted
  picture, for an undo past a reload nobody asked for.
- **Rejected: hashing pictures to find what changed.** It reads every picture on every edit to
  learn what object identity already says.
- **Rejected: a second reader for a kept tileset.** Going through `prepareArchive` means migration
  and validation cannot drift from Import's.
- **A refused tileset is not deleted.** The record stays until the author's next change
  overwrites it.
