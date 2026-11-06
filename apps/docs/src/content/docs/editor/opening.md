---
title: opening.svelte.ts
description: Opens an operation from anywhere, through the unsaved-changes guard. Shared by the Operations section and the orphan notice's "Open op-2".
sidebar:
  order: 11
---

**Written from:** `apps/editor/src/opening.svelte.ts`, and the call sites in `App.svelte` and
`lib/sections/OperationsSection.svelte`. No test file.

## Overview

Only one operation can be open at a time. If the open one has changes that are not saved,
opening another one first asks "Discard your changes?". This module is that rule, in one place.

Two parts of the editor open operations. The Operations section does, when the author clicks a
card's step or adds an operation. The orphan notice in the preview does too, with its "Open op-2"
button. Both go through this module, so neither can lose a draft's changes without asking. The
Operations section still draws the question.

In the editor's pipeline (import → document → **draft**/history → preview → export), it sits in
front of [drafting](/editor/drafting/): it decides when the open draft may be replaced.

## In detail

### Public surface

`opening`, an object:

| Member | What |
| --- | --- |
| `guard(action)` | Runs `action` now, or holds it and sets `asking` when the open draft differs from the file (`draftDiffers`, [draft.svelte.ts](/editor/draft/)). |
| `asking` | Get and set. Whether "Discard your changes?" shows. `OperationsSection` binds its `Dialog` to it. |
| `confirm()` | Discard: `drafting.discard()`, then the held action. |
| `cancel()` | Keep editing, or Esc: drops the held action. |
| `open(id, step)` | Opens operation `id` at `step`, through `guard`, and bumps `revealed`. An id no longer in the stack does nothing. On the operation already open, it only sets the step. |
| `revealed` | A counter `open` bumps. `OperationsSection` passes it to `Section`'s `reveal` (unfold) and scrolls the open card into view. |

### Invariants

- **A draft's changes are never dropped without asking.** Every way of opening an operation goes
  through `guard`.
- **With nothing changed, it switches at once.** Discarding costs nothing, because the draft was
  never in the file (Q7).
- **Members don't use `this`,** so `guard`, `confirm` and `cancel` can be passed as callbacks.

### Callers / callees

| Caller | What |
| --- | --- |
| `App.svelte` | `openOperation(id)` → `opening.open(id, "selection")`, handed to `documentNotices` for the orphan notice |
| `lib/sections/OperationsSection.svelte` | `guard` for step chips, Add operation and Close; the `Dialog` on `asking`, `confirm`, `cancel`; `revealed` |

Callees: `draftDiffers` and the `Step` type (`draft.svelte.ts`), `drafting`, `session`.

### Tests

None: the module holds runes, which `vitest.config.ts` cannot load (the reason
[drafting](/editor/drafting/) gives). The rule it applies, `draftDiffers`, is tested in
`draft.test.ts`, and the action list in `advisories.test.ts`.

### Gotchas & rejected alternatives

- **Moved out of `OperationsSection` in Stage 2 W4.** The orphan notice lives in the preview, and
  could not reach a guard held inside a sidebar component.
- **The orphan action opens the Selection step,** because a resize changed which cells the
  selection reaches.
