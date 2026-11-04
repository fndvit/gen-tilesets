---
title: operations/OperationBody.svelte
description: The open operation's body under its header. One question per step, a glyph grid of the options, that option's fields, and Discard / Save.
sidebar:
  order: 46
---

**Written from:** `apps/editor/src/lib/operations/OperationBody.svelte`, `draft.test.ts`,
`controls/mapping.test.ts`, `blend.test.ts`, `rules.test.ts`, and its call sites in
`sections/OperationsSection.svelte`. The draft's logic is in [draft.svelte.ts](/editor/draft/).

## Overview

The body that opens under an [operation header](/editor/operation-header/) when the author clicks
one of its step tabs, or adds an operation. It shows the step the active tab names:

| Step | Question | Options | Then |
| --- | --- | --- | --- |
| Selection | "Which cells does this operation affect?" | the registered Selections, with Figma's artwork | [ParamFields](/editor/param-fields/) |
| attribute | "What does this operation write?" | the eight Targets, label only | [PaletteBar](/editor/palette-bar/) or [NumericMapping](/editor/numeric-mapping/) |
| Source | "Where does each cell's number come from?" | the registered Sources, label only | ParamFields, and "Reseed on load" for a stochastic Source |
| Blend | "How does this combine with what is already there?" | the Blends the Target accepts, label only | nothing |

Each option list is a [glyph grid](/editor/ui-glyph-grid/). The steps can be visited in any
order. Nothing is written to the tileset until the author presses **Add** (a new operation) or
**Save** (an edit). **Discard** closes the body and drops the draft. While a step is unanswered,
a **Next: Attribute** (or another step) button goes to the first unanswered step after the
current one, and Add or Save is greyed out; hovering it names the steps still open.

Fields inside the body are compact: labels are 14px in sentence case, in a 128px column, and each
control sits right after its label instead of at the far end of the row. The body does this by
setting CSS variables that `.t-label` and [FieldRow](/editor/ui-field-row/) read.

## In detail

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `draft` | `Draft` | required | The open draft. Held in `drafting`, not owned here, so the brush can paint into it from the preview. Mutated in place. |
| `editing` | `boolean` | required | `true`: Save replaces an Operation. `false`: Add appends one. |
| `onClose` | `() => void` | required | Discard, and after a successful commit. |
| `id` | `string` | none | The body's id, which the active tab's `aria-controls` names. |

The root is `role="tabpanel"`.

### Inputs → outputs

#### The question

`QUESTIONS[draft.step]`, wrapped in a [Hint](/editor/ui-hint/). On the Selection step the hint
explains a disabled option (below); on the other steps it has no text.

#### Selection

`selectionItems` is every `selections.all()` registration, labelled by `labelFor`, sorted into
Figma's order (`all`, `checkerboard`, `everyNth`, `random`, `rect`, `cellList`), with its `.svg`
glyph as `src`. A name with no artwork gets a label-only cell after these. A
**coordinate-bound** Selection is disabled while any breakpoint names `rows` or `columns`
(`resizedBy`), because `document.ts` would refuse the commit (`COORDINATE_BOUND_RESIZE`). The hint
then reads "Handpick holds literal cells, and breakpoint N changes rows or columns."

`chooseSelection(name)` sets `selectionType` and replaces `selectionParams` with
`defaultParams(schema)`.

#### Attribute

One label-only cell per key of `TARGETS`. Choosing one calls `retarget(draft, target)`. Then a
`"tile"` Target (`isTileTarget`) shows `PaletteBar` with `session.file.config.tiles` and
`draft.sourceType`; any other shows `NumericMapping` with `collapsed` true when the Source is
`constant`.

#### Source

One label-only cell per `sources.all()` registration. `chooseSource(name)` sets `sourceType` and
resets `sourceParams` to defaults. When the registry marks the Source `stochastic`, a
[FieldRow](/editor/ui-field-row/) "Reseed on load" holds an Off / On [Toggle](/editor/ui-toggle/)
bound to `draft.reseedOnLoad`, with the hint "Each page load draws this operation with a new
seed. Saved with the operation."

#### Blend

With no Target yet: "Choose an attribute first." Otherwise a label-only grid of
[`acceptedBlends`](/api/index/functions/acceptedblends/)`(draft.target)`. The Target's default
is already chosen, because `retarget` sets it, and every accepted Blend is shown. A vetoed Blend
is absent, not disabled. For `tileId` that leaves a single `set` cell.

#### Discard / Save

`chosen(step)` is the step's answer (`selectionType`, `target`, `sourceType`, `blend`).
`unanswered` lists `labelFor(step)` for each step with no answer. When all four are answered but
`isComplete(draft)` is false (an empty palette, or weights summing to zero), it adds "the
mapping". The button reads "Save" when editing, "Add" otherwise, is disabled while `unanswered`
is not empty, and has the hint "Still open: …". The `.actions` row sets `--hint-top: auto`,
`--hint-bottom`, `--hint-left: auto` and `--hint-right: 0`, so this hint opens upward and
right-aligned, inside the sidebar.

`commit()` calls `toOperation(draft)`, returns on `null`, then applies `replaceOperation` (editing)
or `addOperation` in one `session.apply`, and calls `onClose`.

### Invariants

- **The draft reaches the file at Save and nowhere else** (**E5**), as one
  `TilesetFile -> TilesetFile` transition (**D7**), so an edit is one undo entry (**E6**).
- **`replaceOperation` keeps the index**, so an edited operation keeps its place in the stack.
- **`toOperation` re-checks** rather than trusting the disabled button.
- **Parameters are materialized at their defaults** when a type is chosen, so the fields show
  what the file will contain.
- **Steps stay navigable.** The attribute step depends on the Source after it (the collapse under
  `constant`, the palette hint under `random`), so this is not a one-way wizard (**D8**).
  `collapsed` is derived live for the same reason.
- **`reseedOnLoad` is offered from the registry's `stochastic` flag**, never from a list of
  Source names (`05` **X5**).
- **A Selection or Source registered later appears with no change here** (**E9**), as a
  label-only cell.

### Callers / callees

| Caller | Use |
| --- | --- |
| `sections/OperationsSection.svelte:27` | import |
| `sections/OperationsSection.svelte:119` | under the open stored operation: `{draft}`, `editing`, `id={bodyId}`, `onClose={() => drafting.discard()}` |
| `sections/OperationsSection.svelte:138` | under the new operation's header: `editing={false}` |

Callees: [`acceptedBlends`](/api/index/functions/acceptedblends/),
[`selections`](/api/index/variables/selections/), [`sources`](/api/index/variables/sources/),
[`TARGETS`](/api/index/variables/targets/); the six Selection glyphs in
`assets/glyphs/selection/`; `isTileTarget` (`controls/mapping.ts`);
[NumericMapping](/editor/numeric-mapping/), [PaletteBar](/editor/palette-bar/),
[ParamFields](/editor/param-fields/); `addOperation`, `replaceOperation` (`document.ts`);
`defaultParams`, `isComplete`, `retarget`, `STEPS`, `toOperation` (`draft.svelte.ts`); `session`;
[Button](/editor/ui-button/), [FieldRow](/editor/ui-field-row/),
[GlyphGrid](/editor/ui-glyph-grid/), [Hint](/editor/ui-hint/), [Toggle](/editor/ui-toggle/);
`labelFor` ([labels.ts](/editor/operation-labels/)).

### Tests

No test file for the component. The logic it calls is pinned elsewhere:

- `controls/mapping.test.ts`: `retarget` picks the mapping shape by Target and keeps the palette
  across a retarget; a draft is incomplete until every step is answered; an empty or zero-sum
  palette is refused; `toOperation` spreads params beside `type` and writes `salt` and
  `reseedOnLoad` explicitly.
- `blend.test.ts`: every Target arrives with its default Blend; retargeting keeps an accepted
  Blend and falls back on a veto or on the tile type; `isComplete` refuses a Blend outside the
  accepted set.
- `rules.test.ts`: `addOperation` refuses a coordinate-bound Operation while a rule resizes the
  grid. This is the refusal the disabled Selection cell pre-empts.

### Gotchas & rejected alternatives

- **Every accepted Blend is shown at once**, with the default chosen. §7.7 says to reveal the
  accepted set only on request; Pol chose the full grid in Block E. This replaces the old
  `BlendControl.svelte`.
- **The Target, Source and Blend cells are label only** until Figma has artwork for them.
- **`vignette` is not offered.** It is specified in `04` §5.2 but not registered in the package,
  an engine gap that is flagged and not worked around.
- **The preview is unchanged until Save.** Only the selection overlay follows the draft.

### Review notes

- Under a `constant` Source the mapping control collapses to one handle, but nothing collapses
  the stored range. A range set before switching to `constant` keeps its second value, hidden, and
  it is committed as-is. Only `range[0]` affects the picture, so the output is right, but the file
  carries a value the author cannot see. (inconsistency, carried over from `OperationDraft.svelte`)
- The comment above `selectionItems` (lines 111–116, about a disabled coordinate-bound Selection)
  sits above `glyphOrder` and `rank`, not above the code it describes. (stale comment, minor)
- The disabled-Selection hint names "Handpick" by hand, though it is driven by
  `r.coordinateBound`. A second coordinate-bound Selection would be disabled under the same
  sentence. (inconsistency, latent)
