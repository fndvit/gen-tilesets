---
title: browser-db.ts
description: The editor's one IndexedDB database, its version and its stores, shared by My tiles and the kept tileset.
sidebar:
  order: 93
---

**Written from:** `apps/editor/src/browser-db.ts`, and its callers `my-tiles.ts` and `keep.ts`.

## Overview

Everything the editor keeps across reloads lives in one IndexedDB database,
`gen-tilesets-editor`. This module holds its name, its version and its upgrade, once.

## In detail

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `DB_NAME`, `DB_VERSION` | constants | `"gen-tilesets-editor"`, `2`. |
| `MY_TILES`, `DOCUMENT`, `PICTURES` | constants | The store names, keyed by `id`, `key` and `src`. |
| `openDatabase(factory)` | async function | Opens and upgrades the database. Rejects when there is no IndexedDB or the browser refuses it. |
| `done(request)` | function | A request as a promise. |
| `committed(transaction)` | function | Resolves on commit, rejects on error or abort. |

### Versions

- **1** (B-016 S3c): `my-tiles`.
- **2** (S4a): adds `document` and `pictures`.

The upgrade creates each missing store rather than branching on `oldVersion`, so any earlier
version ends up with all of them and nothing kept is touched.

### Behaviour

- **Fallback is the caller's.** `openShelf` and `openStore` catch a rejection and fall back to
  memory.
- **`onversionchange` closes the connection**, so a later build in another tab can upgrade. This
  tab's next write then fails and says so.

### Callers / callees

| Caller | Use |
| --- | --- |
| [my-tiles.ts](/editor/my-tiles/) | `openDatabase`, `done`, `committed`, `MY_TILES` |
| [keep.ts](/editor/keep/) | `openDatabase`, `done`, `committed`, `DOCUMENT`, `PICTURES` |

### Tests

Through its callers' fallback tests (`my-tiles.test.ts`, `keep.test.ts`). The upgrade is checked in
the browser.

### Gotchas & rejected alternatives

- **Rejected: a database per module.** It would repeat the name, the open and the fallback.
