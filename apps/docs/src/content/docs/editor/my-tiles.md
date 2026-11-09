---
title: my-tiles.ts
description: My tiles, the pictures the author uploaded into the Tile gallery, kept across reloads in IndexedDB, or in memory when the browser won't allow it.
sidebar:
  order: 88
---

**Written from:** `apps/editor/src/my-tiles.ts`, `my-tiles.test.ts`, and its call site in
`lib/tiles/TileGallery.svelte`.

## Overview

The [Tile gallery](/editor/tile-gallery/) has an **Upload…** button. What it uploads joins the
gallery under **My tiles**, and is **kept across reloads** (Pol, B-016 S3c), so a picture uploaded
once can be added to any later tileset.

This is the editor's first browser storage; until S3c nothing outlived the tab. My tiles belongs
to the browser, not to a tileset: it survives New and Import, and it is never exported.

## In detail

### Public surface

| Export | Type | Meaning |
| --- | --- | --- |
| `MyTile` | interface | `{ id, name, type, blob, added }`. `id` is the SHA-256 of the bytes (hex); `added` is ms since the epoch. |
| `TileShelf` | interface | `persistent`, `list()` (newest first), `put(tile)`, `remove(ids)`. |
| `newestFirst(tiles)` | function | Sorted by `added`, newest first, then by `id` so equal times are stable. |
| `idOf(bytes)` | async function | SHA-256, lower-case hex (`crypto.subtle`). |
| `memoryShelf()` | function | A shelf kept in a `Map`: the fallback, and what the tests run on. `persistent: false`. |
| `openShelf(factory?)` | async function | IndexedDB (database `gen-tilesets-editor`, store `my-tiles`, keyed by `id`) when it opens and can be read; otherwise `memoryShelf()`. Never rejects. |
| `upload(shelf, files, check, now?)` | async function | Puts files on the shelf one by one. Returns `{ ids, failures }`. |
| `Uploaded` | interface | `{ ids: string[], failures: string[] }`. |
| `fileOf(tile)` | function | A record as the `File` the attach path takes: same name, type and bytes. |

### Behaviour

- **One copy per picture.** The id is the hash of the bytes, so uploading the same file twice
  stores it once; the second upload still returns its id, so the gallery picks it. The name kept
  is the first upload's.
- **Checked before it is stored.** `upload` calls `check(file)` first; the gallery passes the same
  measurement an attach makes (`measure` in [assets.ts](/editor/assets/)), so a file that would
  fail on Add never reaches My tiles. A file already on the shelf is not checked again.
- **A refused file is a line, not a stop.** A failed check or a refused write (a full quota) is
  `"<name>: <reason>"` in `failures`, and the rest still go on.
- **Order.** One batch shares a time, stepped down a millisecond per file, so newest first still
  shows the batch in the order it was chosen, ahead of earlier batches.
- **When it can't be kept.** `openShelf` falls back to memory when `indexedDB` is missing, when
  reading it throws (blocked site data), when opening fails, or when the first read fails (some
  browsers open a database they then refuse to use). The gallery shows a line saying uploads will
  be gone on reload. Uploading still works for the tab.

### Callers / callees

| Caller | Use |
| --- | --- |
| `lib/tiles/TileGallery.svelte` | `once(() => openShelf())` in its `<script module>`; `upload`, `list`, `remove`, `fileOf` |

### Tests

`my-tiles.test.ts`: the hash is SHA-256; newest-first order and its tie-break; a batch keeps its
order and a later batch comes first; a repeat upload keeps one copy, its first name, and returns
its id; a refused check is named and the rest stored; a stored picture is not checked again; a
refused write is a failure; removal; the three fallbacks to memory; `fileOf` rebuilds the file.
The IndexedDB adapter itself is checked in the browser (the repo has no IndexedDB fake), including
that My tiles survives a reload.

### Gotchas & rejected alternatives

- **Rejected: `localStorage`.** It holds strings only (a picture would be base64, a third larger)
  and has a quota of a few MB.
- **Rejected: keeping uploads in the document.** They belong to the browser; a tileset only gets
  the pictures actually added to it.
- **Rejected: refusing to upload when storage is blocked.** That takes away the add for the sake
  of the keeping.
- **Removing from My tiles can't be undone**, so the gallery asks first. It never touches a
  tileset: pictures already added stay.
