---
title: drafting.svelte.ts
description: The single open operation draft, held in a rune, with an explicit create/edit mode. Shared by the panel that builds it and the preview that paints into it.
sidebar:
  order: 11
---

**Written from:** `apps/editor/src/drafting.svelte.ts`, and the call sites in `App.svelte` and
`lib/ImportPanel.svelte`. No test file.

## Overview

The drafting module holds the one operation the author is currently building or editing. The
rules for a draft are in the draft module. This is just the place where the open draft lives
while the editor is running, so that more than one part of the screen can reach it.

Two parts need it. The side panel fills in the operation's choices. The preview lets the author
paint cells straight onto the picture, and shows which cells the operation will touch. Keeping the
draft here, rather than inside the panel, lets both reach it.

The module also remembers whether the draft is a new operation or an edit of an existing one.
The draft is never part of the file and is lost on reload.

In the editor's pipeline, import → document → **draft**/history → preview → export, this is the
live draft that the panel and preview share before it is committed to the document.

## In detail

### Purpose

`drafting.svelte.ts` is two `$state` variables and an accessor object. It holds no logic, so
that the logic in [draft.svelte.ts](/editor/draft/) stays importable by a test. Vitest runs
without the Svelte plugin, so a module containing a rune cannot be imported by a test.

### Public surface

`export const drafting`:

| Member | Kind | Meaning |
| --- | --- | --- |
| `draft` | getter, `Draft \| null` | The open draft, or `null`. |
| `editing` | getter, `boolean` | `open !== null && mode === "edit"`. |
| `start(id)` | method | `open = newDraft(id)`, `mode = "create"`. |
| `edit(op)` | method | `open = fromOperation(op)`, `mode = "edit"`. |
| `discard()` | method | `open = null`. |

### Inputs → outputs

`start` takes an already-allocated id; the id is allocated once, here, and never reassigned.
`edit` takes an [`Operation`](/api/index/interfaces/operation/) and reopens it with its id,
hash channels, stack index and salt intact. `discard` does not reset `mode`. That is harmless,
because `editing` is false while `open` is `null` and the next `start` or `edit` sets the mode.

The returned `draft` is the live `$state` object. Callers mutate it in place:
`App.svelte`'s `paintCells` writes `draft.selectionParams[name]`, and `OperationDraft.svelte`'s
controls write the other fields.

### Invariants

- **Transient UI state, beside the file.** Never in the file, never in `meta` (E4),
  session-scoped, gone on reload.
- **The mode is recorded, not reconstructed.** Checking *"is this id in the stack?"* would answer
  correctly until the edited Operation is removed underneath the panel. At that point it would
  turn an edit into a silent creation that re-adds what the author just deleted. `App.svelte`
  handles the stale case instead.
- **Discarding costs nothing**, because the draft was never in the file.
- **Not undone with the file.** Undo restores a `TilesetFile` and a draft is not in one
  (stated in [session.svelte.ts](/editor/session/)).

### Callers / callees

| Caller | Uses |
| --- | --- |
| `App.svelte:642` | `drafting.start(nextOperationId(...))` from the stack's *create* |
| `App.svelte:643` | `drafting.edit(op)` from a stack row |
| `App.svelte:644`, `:651`, `:652` | `drafting.editing` passed to `OperationStack` and `OperationDraft` |
| `App.svelte:647-653` | `drafting.draft` mounts the panel; `onClose={() => drafting.discard()}` |
| `App.svelte:241`, `:272`, `:337` | `drafting.draft` for the brush's `painting`, the overlay's `shadow`, and `paintCells` |
| `App.svelte:300-302` | `$effect`: if an edit-draft's id has left `config.operations`, `drafting.discard()` |
| `lib/ImportPanel.svelte:213` | `drafting.discard()` after `session.open`, since the draft names ids the new document lacks |

Callees: `newDraft`, `fromOperation` from [draft.svelte.ts](/editor/draft/).

### Tests

No test file, by design: a module holding `$state` cannot be imported by the Vitest config. Its
logic is tested through [draft.svelte.ts](/editor/draft/).

### Gotchas & rejected alternatives

- **Rejected: the draft owned by the sidebar panel.** The preview's brush paints into the draft,
  and the overlay reads its Selection. A panel-owned draft is unreachable from the picture, and
  threading it through the preview would put a create-operation concern into the component whose
  only job is drawing the file.
- **Stale edit-drafts are discarded, not converted.** Falling back to `addOperation` would
  resurrect a deleted Operation (`App.svelte:284-297`).

### Review notes

None found.
