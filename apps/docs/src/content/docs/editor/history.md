---
title: history.ts
description: The undo stack as a pure generic. A bounded list of whole previous values, with refusals pushing nothing.
sidebar:
  order: 13
---

**Written from:** `apps/editor/src/history.ts`, `history.test.ts`, and the call sites in
`session.svelte.ts`.

## Overview

The history module is the editor's undo. Each change produces a whole new copy of the tileset
file, and the editor keeps the previous copies. So undo simply goes back to the last one. There
is nothing to reverse and nothing else to reset, because the picture is drawn entirely from the
file.

Every action is undoable, including the destructive ones such as changing the design width and
starting a new document. That matters, because undo is the only repair the editor offers when a
change strands work the author placed by hand. An edit that the editor refused, which left the
file exactly as it was, adds nothing to the history, so undo never appears to do nothing.

In the editor's pipeline, import → document → draft/**history** → preview → export, this is the
record of every file the document has been. The session holds it and applies edits through it.

## In detail

### Purpose

`history.ts` is generic in `T` and pure, so it can be tested. The live instance, typed
`History<TilesetFile>`, is held in a rune by [session.svelte.ts](/editor/session/), which no test
can import. Keeping the rule here and the reactivity there is the same split as
`draft.svelte.ts` / `drafting.svelte.ts`.

It is a stack of whole values rather than a log of inverse operations. Invariant **E6** is quoted:
*undo restores a previous `TilesetFile` in full. No editor action is outside the undo stack,
including the design-width change.*

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `UNDO_LIMIT` | `100` | How many past values to keep. |
| `History<T>` | `{ past: T[]; current: T }` | `past` is oldest first; its last element is what one undo returns to. |
| `historyOf(current)` | `(T) → History<T>` | `{ past: [], current }` |
| `applied(history, f, limit?)` | `(History<T>, (T) → T, number) → History<T>` | Apply `f`; push the replaced value unless `f` returned its input. |
| `replaced(history, value, limit?)` | `(History<T>, T, number) → History<T>` | Replace outright, still pushing. |
| `undone(history)` | `(History<T>) → History<T>` | Pop one. A no-op at the bottom. |

### Inputs → outputs

- **`applied`.** `next = f(current)`. If `next === current` it returns `history` itself, by
  identity. Otherwise it returns `{ past: [...past, current].slice(-limit), current: next }`.
- **`replaced`.** It always pushes, with the same slice.
- **`undone`.** If `past` is empty it returns `history` unchanged. Otherwise it returns
  `{ past: past.slice(0, -1), current: past.at(-1) }`.
- Every result is a fresh object. Nothing is mutated.

### Invariants

- **A refusal pushes nothing.** A refused transition returns its input, for example a refused
  deletion, a refused zero weight, or a field that did not parse. Pushing it would create *"an
  undo that visibly does nothing, in the one control whose whole value is being trusted"*.
- **Reference comparison.** The comment calls it exact rather than approximate: *"every
  transition is whole-value, so an unchanged file **is** the same object and a changed one never
  is."* See the review note below.
- **Bounded.** `UNDO_LIMIT` is a *UI constant with no authority anywhere*. It exists because a
  slider dragged across frames changes the file every frame, so an unbounded stack would hold
  every intermediate value of every drag.
- **`replaced` exists for actions that are not transitions of the current file.** The comment
  names *New document* as the only one. Import (`session.open`) now uses it too.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `session.svelte.ts:39` | imports `applied`, `historyOf`, `replaced`, `undone`, `History` |
| `session.svelte.ts:49` | `historyOf(newDocument())` |
| `session.svelte.ts:81` | `applied(history, transition)` in `apply` |
| `session.svelte.ts:94` | `undone(history)` in `undo` |
| `session.svelte.ts:104`, `:128` | `replaced(history, …)` in `reset` and `open` |

Callees: none.

### Tests: `history.test.ts`

- **Whole values.** It starts with nothing to undo. It restores the previous value in full (two
  edits, one undo restores `yOffset` and keeps `rows`, a second undo is `toEqual` the start). It
  undoes a design-width change (`columns` 20 → 10). It restores a coordinate-bound `cellList`
  Selection with the file. *New document* (`replaced`) is undoable.
- **Refusals.** `setRows("0")`, `setRows("abc")` and `setYOffset("1.4")` leave the history `toBe`
  identical. `setRows("5")` on a file already at 5 rows **does** push an entry.
- **Bounded.** It keeps the most recent entries and drops the oldest. `UNDO_LIMIT` is 100.
- **Purity.** Earlier entries are untouched as new ones arrive.

### Gotchas & rejected alternatives

- **Rejected: a log of inverse operations.** The file is plain data and the engine is pure, so
  there is no inverse to write and nothing beside the file to roll back.
- **There is no redo.** The module has no future stack, and `undone` discards the popped value.

### Review notes

- The docstring of `applied` says *"an unchanged file **is** the same object"*. That holds for the
  transitions that refuse, but not for several that succeed without changing anything. `setRows`
  to the current value is one, and `history.test.ts:89-94` pins it as pushing an entry. Others
  include `setHorizontalAlignment` to the current alignment and `setDefaultSeed` with the same
  trimmed text. These push undo entries identical to the current file. See
  [document.ts](/editor/document/). (inconsistency)
- `replaced`'s docstring says *"'New document' is the only one"*. `session.open` (import) also
  uses `replaced`. (stale comment)
