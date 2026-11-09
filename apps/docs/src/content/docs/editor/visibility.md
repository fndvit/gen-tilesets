---
title: preview/visibility.ts
description: Hidden operations. The filter the preview and Export image draw through, the exception for the operation open for editing, and pruning ids the file no longer has.
sidebar:
  order: 53
---

**Written from:** `apps/editor/src/lib/preview/visibility.ts`, `visibility.test.ts`, and the call
sites in `App.svelte`, `lib/sections/OperationsSection.svelte` and `lib/sections/ExportImage.svelte`.
Added in batch 02 (T-02, B-012).

## Overview

The author can hide an operation to see the tileset without it, then show it again, with the eye
on its card. Hiding lasts **only while the editor is open** (Pol's batch 02 decision D-02 A):
nothing in the file changes, so exporting, undoing and reloading all show every operation.

This module is the arithmetic. The set of hidden ids lives in the preview's view state
([view.svelte.ts](/editor/preview-width/), `preview.hidden`). The preview draws the file minus
those operations, and so does Export image (D-03 A). An operation open for editing is drawn even
when hidden, because you cannot edit what you cannot see; it hides again when its card closes.

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `withoutHidden(file, hidden, exceptId?)` | `(TilesetFile, ReadonlySet<string>, string \| null) → TilesetFile` | The file without the hidden operations, except `exceptId`. |
| `toggled(hidden, id)` | `(ReadonlySet<string>, string) → ReadonlySet<string>` | A new set with `id` flipped. |
| `pruned(hidden, operations)` | `(ReadonlySet<string>, readonly { id }[]) → ReadonlySet<string>` | The set without ids that are not in `operations`. |

### Inputs → outputs

- **`withoutHidden`** filters `config.operations`, keeping stack order. It returns **`file`
  itself** when the set is empty or nothing matched, because `<Tileset>` and `shapedAt` key on
  object identity and a fresh object would redraw on every unrelated change. Otherwise it returns a
  new file and config sharing everything else (`layout`, `tiles`) with the original.
- **`toggled`** copies the set, then deletes or adds.
- **`pruned`** returns **`hidden` itself** when every id is still in the file, so the `$effect`
  in `App.svelte` that writes it back does not retrigger.

### Invariants

- **The file is never touched.** Only the picture and the image read the filtered file;
  advisories, `shapedAt`, the `.json` export and undo read the saved one.
- **A new operation starts visible**, even with a deleted operation's id: `nextOperationId` hands
  out the next number after the ones in use, so deleting the newest operation frees its id, and
  pruning forgets it first. An operation brought back by undo starts visible for the same reason.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte` | `shown = withoutHidden(drawn ?? file, preview.hidden, openId)`; an `$effect` writes `pruned(preview.hidden, file.config.operations)` back |
| `lib/sections/OperationsSection.svelte` | the card's eye writes `toggled(preview.hidden, op.id)` |
| `lib/sections/ExportImage.svelte` | the PNG draws `withoutHidden(session.file, preview.hidden, openId)` |

Callees: none; types from `@vit-foundation/gen-tilesets`.

### Tests: `visibility.test.ts`

The filter (stack order kept; the same object back when nothing is hidden or the ids are unknown;
the input untouched and shared parts shared), the open-operation exception (drawn while open,
hidden again once closed), `toggled`, and `pruned` (drops missing ids, returns the same set when
nothing went, and a reused id after deleting the newest operation starts visible).

### Gotchas & rejected alternatives

- **Saving "hidden" in the file** (D-02 B) was rejected: a new `Operation` field is a schema bump,
  and it would hide the operation on every website using the tileset.
- **Hiding is not an edit**, so it is not an undo entry. It is view state, like the preview's width.
