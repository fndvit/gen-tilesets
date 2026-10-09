---
title: OperationDraft.svelte
description: The four-step panel that builds or edits one Operation, Selection, attribute, Source, Blend, and commits it as a single transition.
sidebar:
  order: 46
---

**Written from:** `apps/editor/src/lib/OperationDraft.svelte`, `controls/mapping.test.ts`,
`blend.test.ts`, `rules.test.ts`, and the call site in `App.svelte`. The draft's logic is in
[draft.svelte.ts](/editor/draft/).

## Overview

The operation draft is the panel that opens inside the Operations section when the author adds
an operation or clicks ✎ on an existing one. It walks through four steps, shown as a row of tabs:
**Selection** (which cells), **Attribute** (what to change, and by how much), **Source** (where
each cell's number comes from) and **Blend** (how to combine with what is already there).

Each tab shows the choice made so far, and the author can go back to any of them. Nothing is
written to the tileset until the author presses "Add operation" or "Save changes". Until then
the footer names whatever is still missing. While the draft is open, the preview outlines the
cells its Selection picks.

In the editor's pipeline (import → document → **draft**/history → preview → export), this is
the draft. It turns a half-built operation into one complete operation and commits it as one
undoable step.

## In detail

### Purpose

The panel renders the steps of a [`Draft`](/editor/draft/) and mutates it in place. Two steps
are generated from the registry with no per-type code (Selection and Source, through
[ParamFields](/editor/param-fields/)), and two are hand-written (attribute, built from
[`TARGETS`](/api/index/variables/targets/), and Blend, built from
[`acceptedBlends`](/api/index/functions/acceptedblends/)). `commit()` calls `toOperation(draft)`
and applies either `addOperation` or `replaceOperation` in a single `session.apply`.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `draft` | `Draft` | required | The open draft. Held in `drafting`, not owned here, so the brush can paint into it from the preview. Mutated in place. |
| `editing` | `boolean` | required | `true` replaces an existing Operation; `false` appends. |
| `nested` | `boolean` | `false` | Presentational: the panel is inside a stack row. |
| `onClose` | `() => void` | required | Called by × and after a successful commit. |

### Inputs → outputs

#### The step rail

`STEPS` is `["selection", "attribute", "source", "blend"]`. Each tab sets `draft.step` and shows
`chosen(step)`: the Selection type, Target, Source type or Blend, or nothing.

#### Selection

Lists every [`selections`](/api/index/variables/selections/)`.all()` registration as a button.
`chooseSelection(name)` sets `selectionType` and replaces `selectionParams` with
`defaultParams(schema)`. A **coordinate-bound** Selection is disabled, with a tooltip naming the
rules, while any breakpoint names `rows` or `columns` (`resizedBy`), because `document.ts` would
refuse the commit. Params render through `ParamFields`. For `cellList`, an extra note tells the
author to paint on the preview.

#### Attribute

One button per key of `TARGETS`, with its type. Clicking calls `retarget(draft, target)`. Then:

- a `"tile"` Target (`isTileTarget`) shows [PaletteBar](/editor/palette-bar/) with
  `session.file.config.tiles` and `draft.sourceType`;
- otherwise [NumericMapping](/editor/numeric-mapping/) with `collapsed` true when the Source is
  `constant`.

#### Source

Lists every [`sources`](/api/index/variables/sources/)`.all()` registration, marking stochastic
ones. `chooseSource(name)` sets `sourceType` and resets `sourceParams` to defaults. For
`constant`, a note says it emits `0` and a fixed value is the two handles collapsed.

#### Blend

If no Target or Blend is set yet, a note says to choose the attribute first. Otherwise
[BlendControl](/editor/blend-control/).

#### Footer

`unanswered` lists the steps whose `chosen()` is `null`. If all four are answered but
`isComplete(draft)` is false, it adds "the mapping" (an empty palette, or weights summing to
zero). The commit button is disabled while anything is listed. When nothing is listed it says
where the Operation will go: an edit "keeps its place in the stack, its id and its salt"; a new
one "appends to the end of the stack, where it runs last".

### Invariants

- **The draft reaches the file in one transition** (**E5**, cited as D7). A half-built Operation is
  not a legal one.
- **One `session.apply` either way**, so an edit is one undo entry (**E6**). Undo restores the
  Operation as it was, not the document without it.
- **`replaceOperation` keeps the index.** Moving an edited Operation to the end would change what
  it composes over.
- **`toOperation` re-checks** rather than trusting the disabled button, because the transition is
  the boundary.
- **Parameters are materialized at their defaults** when a type is chosen, so the controls show
  what the file will contain.
- **Steps stay navigable.** The attribute step depends on the Source that follows it (the
  collapse under `constant`, the palette advisory under `random`), so this is not a one-way
  wizard. `collapsed` is derived live for the same reason.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:60` | import |
| `App.svelte:644`–`649` | inside `OperationStack`'s `draftPanel` snippet: `draft`, `editing={drafting.editing}`, `nested={drafting.editing}`, `onClose={() => drafting.discard()}` |

Callees (`OperationDraft.svelte:23`–`39`): [`selections`](/api/index/variables/selections/),
[`sources`](/api/index/variables/sources/), [`TARGETS`](/api/index/variables/targets/);
[BlendControl](/editor/blend-control/), [NumericMapping](/editor/numeric-mapping/),
[PaletteBar](/editor/palette-bar/), [ParamFields](/editor/param-fields/); `isTileTarget` from
`controls/mapping.ts`; `addOperation`, `replaceOperation` from `document.ts`; `defaultParams`,
`isComplete`, `retarget`, `STEPS`, `toOperation` from `draft.svelte.ts`; `session`.

### Tests

No test file for the component. The logic it calls is pinned in three places:

- `controls/mapping.test.ts`: `retarget` picks the mapping shape by Target and keeps the
  palette across a retarget; a draft is incomplete until every step is answered; an empty or
  zero-sum palette is refused; a fresh `tileId` draft starts with a legal `null` palette entry;
  `toOperation` spreads params beside `type` and writes `salt` and `reseedOnLoad` explicitly.
- `blend.test.ts`: every Target arrives with its declared default Blend; retargeting keeps an
  accepted Blend and falls back on a veto or on the tile type; `isComplete` refuses a Blend
  outside the accepted set or unregistered.
- `rules.test.ts` ("edits elsewhere keep the rules legal"): `addOperation` refuses a
  coordinate-bound Operation while a rule resizes the grid, and allows it once no rule names
  `rows` or `columns`. This is the refusal the disabled Selection buttons pre-empt.

### Gotchas & rejected alternatives

- **No default Selection, Source or Target is invented.** Only the Blend has a spec default, and
  the Target supplies it.
- **`vignette` is not offered.** The comment says it is specified but not registered in the
  package, so four Sources appear; it is flagged as an engine gap and not worked around.
- **The preview is unchanged until commit.** The edit note says the preview "still shows the
  operation as it stands in the file". Only the selection overlay follows the draft.

### Review notes

- The comment above `targets` (line 100) says "`04` §7.2's five Targets … Four attributes plus the
  structural `tileId`". `TARGETS` in `registry/blends.ts:82` now holds `tileId`, `scale`,
  `scaleX`, `scaleY`, `rotation`, `opacity` and the two `translate` Targets. The count is stale.
  (stale comment)
- Under a `constant` Source the mapping control collapses to one handle, but nothing collapses
  the stored range. A range set before switching to `constant` keeps its second value, hidden, and
  it is committed as-is. Under `constant` only `range[0]` affects the picture, so the output is
  right, but the file carries a value the author cannot see. (inconsistency)
- The `draft` prop's comment refers to "Step 8's overlay". The overlay is `SelectionOverlay.svelte`.
  (stale comment)
