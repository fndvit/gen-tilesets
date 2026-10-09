---
title: OperationStack.svelte
description: The Operations panel's list. Shows the stack in run order, one row per Operation, with move, edit, reroll and remove, and places the open draft panel.
sidebar:
  order: 45
---

**Written from:** `apps/editor/src/lib/OperationStack.svelte`, `library.test.ts`, and the call site
in `App.svelte`.

## Overview

The operation stack is the list inside the "Operations" panel of the sidebar. Each row is one
operation of the tileset, in the order they run, and later rows paint over earlier ones. A row
reads as a one-line sentence, such as `random · valueNoise → rotation (add)` followed by the
range or palette, and its id.

From a row the author can move the operation earlier or later, open it for editing, reroll its
randomness, toggle "reseed on load" where that means something, or remove it. Under the list is
the button that starts a new operation. When an operation is being created or edited, the editing
panel opens here: under the row being edited, or under the button for a new one.

In the editor's pipeline (import → **document** → draft/history → preview → export), this is a
view of the document's operation list, plus the entry point into the draft.

## In detail

### Purpose

The list **is** `config.operations`, in array order, because that order is the stack order and
is never sorted. Rendering it in any other order "would be showing the author a different
program from the one that runs". The component edits the stack directly through `session.apply`
for moves, rerolls, flag changes and removals. It does not know what a draft is; it receives
the draft panel as a snippet and decides only where it goes.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `onCreate` | `() => void` | required | Starts a new draft. |
| `onEdit` | `(op: Operation) => void` | required | Reopens an existing [`Operation`](/api/index/interfaces/operation/). Passed the whole value, because `fromOperation` needs it. |
| `draftPanel` | `Snippet` | `undefined` | The open draft panel, supplied by the caller. |
| `editingId` | `string \| null` | `null` | The id an open **edit**-draft names. `null` for a create-draft or no draft. |

### Inputs → outputs

- **Empty stack:** a note that a fresh document draws nothing. The button reads "Create the
  first operation".
- **Each row:** 1-based index, `summarize(op)`, `mappingOf(op)`, the id, then five buttons and
  a flags line.
  - `summarize` is `"<selection.type> · <source.type> → <target>"`, plus `" (<blend>)"` unless the
    Target's type is `"tile"` (read from [`TARGETS`](/api/index/variables/targets/)).
  - `mappingOf` lists palette tile ids joined by ` · ` (with `∅` for `null`) for `tileId`, or
    `"[min, max]"` plus `" × steps"` when stepped.
- **Buttons:**

  | Button | Action |
  | --- | --- |
  | ▲ / ▼ | `moveOperation(op.id, index ∓ 1)`, disabled at the ends |
  | ✎ | `onEdit(op)` |
  | ⟳ | `rerollOperation(op.id)` |
  | × | `removeOperation(op.id)` |

- **Flags line:** `salt <n>` (shown as `0` when absent), and a "reseed on load" checkbox writing
  `setReseedOnLoad(op.id, checked)`, only when `offersReseedOnLoad(op)` is true.
- **Draft placement:** the snippet renders inside the row whose `op.id === editingId`, or under
  the create button when `editingId === null`.

### Invariants

- **Display order is stack order.** Keyed by `op.id`, iterated in array order.
- **No `disabled` toggle.** There is no field for one and adding one is a `schemaVersion` bump.
- **Reroll is offered on every Operation**, not only stochastic ones, because the Operation's
  `random` Selection consumes the salt even where the Source does not.
- **"Reseed on load" is offered only where the Source is stochastic**, read from the registry's
  `stochastic` declaration through `offersReseedOnLoad`, never from a list of names. An imported
  flag over a non-stochastic Source is left alone and reported in the Seed panel.
- **The index is not the identity.** Randomness is attached to `id` and `salt`, never to position
  (cited as **G3**), so moving a row changes the picture only by composition.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:61` | import |
| `App.svelte:641`–`657` | `onCreate` → `drafting.start(nextOperationId(...))`; `onEdit` → `drafting.edit(op)`; `editingId` from `drafting.editing`; `draftPanel` renders [OperationDraft](/editor/operation-draft/) |

Callees (`OperationStack.svelte:39`–`48`): [`TARGETS`](/api/index/variables/targets/);
`moveOperation`, `removeOperation`, `rerollOperation`, `setReseedOnLoad` from `document.ts`;
`offersReseedOnLoad` from [reseed.ts](/editor/reseed/); `session`.

### Tests

No test file for the component. `library.test.ts`'s "the operation stack" block pins the
transitions: append runs last; stack order is preserved; remove by id closes the gap; an
unmatched id returns the file unchanged; `replaceOperation` keeps index, id and salt; there is
no `disabled` key; and `moveOperation` moves later and earlier, reaches both ends, is its own
inverse, changes no Operation, and is an identity when the id matches nothing, the Operation is
already there, or the destination is out of range. `reseed.test.ts` imports `rerollOperation`,
`setReseedOnLoad` and `offersReseedOnLoad`.

### Gotchas & rejected alternatives

- **Arrows, not drag** (cited as D44). A palette bar is a row of fixed-height segments where the
  drop index is arithmetic on one rect. A stack row varies in height and may contain a whole
  draft panel, and it is dense with controls a pointer capture would swallow. Arrows also make
  one gesture one transition and one undo entry, where a drag would push one per boundary
  crossed.
- **Disabled at the ends, not hidden.** A button that vanished would move its neighbours under
  the pointer, and an author clicking ▼ down the stack would hit ✎ on the last row.
- **The edit draft opens inside its row.** A panel a scroll away from its subject makes the
  author hold the pairing in their head.
- **The panel is placed here but not imported here.** "Where a draft belongs is a fact about the
  list … what a draft is remains a fact about `drafting`."

### Review notes

- The `onCreate` prop's comment says "Step 6 supplies it". `App.svelte` supplies it. The build
  step reference is stale. (stale comment)
- The × button's `aria-label` is "Remove operation", without the id, while the other four buttons
  in the row include `{op.id}`. (inconsistency)
