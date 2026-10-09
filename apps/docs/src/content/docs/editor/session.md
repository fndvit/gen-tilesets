---
title: session.svelte.ts
description: The live document. A read-only file held in a rune, changed only through apply(), with undo, reset and open.
sidebar:
  order: 14
---

**Written from:** `apps/editor/src/session.svelte.ts`, and the call sites in `App.svelte`,
`lib/ImportPanel.svelte`, `lib/TileLibrary.svelte`, `lib/OperationStack.svelte` and
`lib/OperationDraft.svelte`. No test file of its own. Its rule is tested in `history.test.ts`.

## Overview

The session module holds the document the author is working on, right now. Every panel reads the
current tileset file from here. Every change goes through one door: a panel hands over an edit,
the session applies it, and it remembers the previous file so the change can be undone.

Nothing outside can overwrite the file directly. That guarantees the editor never holds an
invalid file. The session also supports starting a new document and opening an imported one. Both
replace the file outright, and both can still be undone.

In the editor's pipeline, import → document → draft/**history** → preview → export, this is the
live state at the centre. Import opens files into it, the document's edits are applied to it,
the preview draws from it, and export reads from it.

## In detail

### Purpose

`session.svelte.ts` puts a `History<TilesetFile>` ([history.ts](/editor/history/)) in `$state`,
initialised with `historyOf(newDocument())`. It exposes the current file read-only. Invariant
**E5** is enforced structurally: `apply()` is the only mutator, so every caller has to hand over a
`TilesetFile → TilesetFile`. E6 becomes structural for the same reason. An action that escaped
the undo stack would have to escape the document too.

### Public surface

`export const session`:

| Member | Kind | Meaning |
| --- | --- | --- |
| `file` | getter, [`TilesetFile`](/api/index/interfaces/tilesetfile/) | `history.current`. There is no setter. |
| `canUndo` | getter, `boolean` | `history.past.length > 0`. Drives the Undo button. |
| `apply(transition)` | method | `history = applied(history, transition)` |
| `undo()` | method | `history = undone(history)` |
| `reset()` | method | `history = replaced(history, newDocument())` |
| `open(file)` | method | `history = replaced(history, file)` |

### Inputs → outputs

- **`apply`** takes a `Transition` from [document.ts](/editor/document/). If it returns its input
  by identity, nothing is pushed.
- **`undo`** restores the previous whole file. At the bottom of the stack it does nothing.
- **`reset`** replaces the document with a fresh valid skeleton, and is undoable.
- **`open(file)`** takes an already-validated `TilesetFile` and replaces the document. It is
  undoable.

### Invariants

- **E3: the file itself is the state.** There is no second document model.
- **S3: the host holds a valid file at every instant.** `file` is not assignable, because an
  assignable field would be a way to hold an invalid one.
- **`open` takes a validated file.** The caller has already proved it. Import refuses a file with
  any validation error before it gets here.
- **The draft is not undone with the file.** Undo restores a `TilesetFile`, and a draft is not in
  one. Rewinding a half-built Operation would restore something the author never committed.
- **Undo is the repair for a destructive edit.** Migrating an orphaned `rect` or `cellList`
  would have to guess. Undo *"returns the author's authored values rather than the editor's
  guess at them"*.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `App.svelte:71` | `session.file` → `file`, `config`, `layout` |
| `App.svelte:214`, `:219` | `session.apply` direct, and from `confirmPending` after E12 confirmation |
| `App.svelte:354` | Undo button: `disabled={!session.canUndo}`, `session.undo()` |
| `App.svelte:439-703` | `session.apply(...)` for layout, rule, seed and asset-salt transitions |
| `App.svelte:620` | `session.reset()`, the *New document* button |
| `lib/ImportPanel.svelte:210` | `session.open(file as TilesetFile)` after validate and `replaceAll` |
| `lib/TileLibrary.svelte:47`, `:168`, `:195-198` | `session.file` reads, and the before/after identity check that detects a refused weight |
| `lib/TileLibrary.svelte:108`, `:128`, `:178`, `:187`, `:196`, `:251` | `session.apply` for library transitions |
| `lib/OperationStack.svelte:88` | `session.file.config.operations` |
| `lib/OperationStack.svelte:153-226` | `session.apply` for move, reroll, remove, and the reseed flag |
| `lib/OperationDraft.svelte:71`, `:316` | `session.file` reads (rules, tiles) |
| `lib/OperationDraft.svelte:171` | `session.apply(editing ? replaceOperation(op) : addOperation(op))` |

Callees: `newDocument`, `Transition` from `document.ts`; `applied`, `historyOf`, `replaced`,
`undone`, `History` from `history.ts`.

### Tests

None of its own. A module holding `$state` cannot be imported by the editor's Vitest
configuration, which deliberately runs without the Svelte plugin. Its behaviour is the composition
of `history.ts` (tested in `history.test.ts`) and `document.ts`.

### Gotchas & rejected alternatives

- **`open` is a replacement, not a transition.** There is no function from the outgoing file to
  the incoming one. Pretending otherwise would put a `() => file` on the stack that ignores its
  argument. `reset()` is the precedent.
- **Undo after import does not restore asset bytes.** The bytes live in the session-scoped store
  ([assets.ts](/editor/assets/)) and were swapped with the document. The source calls this the
  same gap a reload has always had, not a defect in the undo stack.
- **Refusals are detected by identity.** `TileLibrary.svelte:195-198` compares `session.file`
  before and after `apply` to learn that a weight change was refused.

### Review notes

- The `apply` docstring (`session.svelte.ts:69-78`) repeats `history.ts`'s claim that *"an
  unchanged file *is* the same object"*. Some no-change transitions return a new object and so
  push an entry. See [history.ts](/editor/history/). (inconsistency)
