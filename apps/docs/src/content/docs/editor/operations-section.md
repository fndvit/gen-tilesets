---
title: sections/OperationsSection.svelte
description: The Operations section. Lists the stack as operation headers, opens one draft at a time under its header, and asks before dropping unsaved changes.
sidebar:
  order: 46
---

**Written from:** `apps/editor/src/lib/sections/OperationsSection.svelte`, `draft.test.ts`, and its
call site in `App.svelte`.

## Overview

The Operations section of the sidebar. Each operation in the file is an
[operation header](/editor/operation-header/): a 56px black bar with its number, four step tabs,
and above each tab what that step is set to. Clicking a tab opens that operation for editing at that step, with
the [operation body](/editor/operation-body/) right under its header. A black "Add operation" bar
ends the list. It starts a new operation, shown as one more header (with the next number) and its
body, between the list and the bar, until it is added.

Only one operation is open at a time. If the open one has changes that are not saved, opening
another one (or pressing "Add operation") first asks, in an "Unsaved changes" popup: "Keep
editing" or "Discard". With nothing changed it switches at once.

The trash, re-seed and arrow icons on a header act on the file straight away. Each is one undo
step.

## In detail

### Public surface

No props. It reads `session.file.config.operations` and `.tiles`, and `drafting.draft` and
`drafting.editing`.

### Inputs → outputs

- **The list.** `config.operations` in array order, keyed by `op.id`. That order is the stack
  order and is never sorted. Each row is an `OperationHeader` with `index + 1`, and the header of
  the open operation shows the draft's answers (`draftParts`) instead of the file's (`partsOf`),
  through `summaryCells` into the header's `cells`.
- **Which one is open.** `editingId` is the draft's id only while `drafting.editing` is true.
  `creating` is an open draft that is not an edit. An edit-draft's body renders under its row; a
  create-draft gets its own header and body after the list.
- **Header actions** on a stored operation:

  | Header callback | Effect |
  | --- | --- |
  | `onSelect(step)` | `selectStep`: on the open operation, only sets `draft.step`; otherwise `guard`, then `drafting.edit(op)` at that step. |
  | `onDelete` | `session.apply(removeOperation(op.id))`. |
  | `onReseed` | `reseed(op)`: `rerollOperation(op.id)`, and an open draft of the same operation copies the new `salt`, so its Save does not undo the reroll. |
  | `onMoveUp` / `onMoveDown` | `moveOperation(op.id, index ∓ 1)`, disabled at the ends. |

- **The new operation's header** passes no `onReseed` (re-seed is disabled), no-op arrows (both
  disabled), and `onDelete` = `drafting.discard()`.
- **Add operation** calls `create()`: `guard`, then `drafting.start(nextOperationId(...))`.
- **`guard(action)`.** With a draft open, it compares it with what is in the file, using
  `draftDiffers(draft, committed)` from [draft.svelte.ts](/editor/draft/), where `committed` is
  the stored operation for an edit and `null` for a new one. If they differ, it keeps `action`
  in `pending` and opens the popup. Otherwise it runs `action` at once.
- **The popup** is `ui/Popup` titled "Unsaved changes", with the text "Discard the changes to
  operation N?" (or "the new operation"). It uses Popup's `actions` snippet: "Keep editing" just
  closes; "Discard" calls `drafting.discard()`, closes, then runs the pending action. Closing in
  any way clears `pending`.
- `bodyId` (`$props.id()`) is shared by the open body's `id` and the header's `panelId`, so the
  active tab's `aria-controls` names the body.

### Invariants

- **One draft at most is open**, held in `drafting`, not here.
- **Discarding costs nothing** because a draft was never in the file (Q7). So a switch with no
  changes does not ask.
- **The list order is the stack order** and is never canonicalized (`06` §7). Reordering is
  arrows, not a drag (**D44**): one gesture is one transition and one undo entry (**D32**).
- **No `disabled` toggle per operation** (§4.1). The file has no field for one.
- **Edit mode comes from `drafting.editing`**, never from looking the draft's id up in the stack.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:34` | import |
| `App.svelte:289` | `<OperationsSection />`, after `TilesSection` |

Callees: `moveOperation`, `removeOperation`, `rerollOperation` (`document.ts`); `draftDiffers`,
`Step` (`draft.svelte.ts`); `drafting`; `nextOperationId` (`ids.ts`); `session`;
[Section](/editor/section/); [OperationHeader](/editor/operation-header/),
[OperationBody](/editor/operation-body/); `draftParts`, `partsOf`, `summaryCells`
([labels.ts](/editor/operation-labels/)); [AddBar](/editor/ui-add-bar/),
[Button](/editor/ui-button/), [Popup](/editor/ui-popup/).

### Tests

No test file for the component (the vitest config cannot load `.svelte`). `draft.test.ts`'s
`draftDiffers` block pins the popup's rule: a fresh new operation has nothing to lose until a
step is answered; a reopened operation shows no change whatever step is open; an edited
parameter, Blend or salt is a change; retargeting there and back is not; an edit made incomplete
is.

### Gotchas & rejected alternatives

- **The draft lives inside this section**, under the header it edits, rather than in a section of
  its own. Collapsing Operations hides it, and nothing is lost, since `drafting` keeps it.
- **Switching steps on the open operation never asks.** It changes only `draft.step`, which
  `draftDiffers` ignores.

### Review notes

None found. Deleting the operation that is open does not strand its draft: an `$effect` in
`App.svelte` discards an edit-draft whose Operation is no longer in the stack.
