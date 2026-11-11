---
title: operations/OperationBody.svelte
description: The open operation's body under its header. Each step's question, a glyph grid of the options, the chosen option's fields in a framed block, and Discard / Save.
sidebar:
  order: 46
---

**Written from:** `apps/editor/src/lib/operations/OperationBody.svelte`,
`apps/editor/src/lib/operations/pattern-art.ts`, `pattern-art.test.ts`, `draft.test.ts`,
`controls/mapping.test.ts`, `blend.test.ts`, `rules.test.ts`, and its call sites in
`sections/OperationsSection.svelte`. The draft's logic is in [draft.svelte.ts](/editor/draft/).

## Overview

The body that opens under an [operation header](/editor/operation-header/) when the author clicks
one of its step tabs, or adds an operation. It shows the step the active tab names: the step's
question, in the field labels' style, then the options:

| Step | Question | Options | Then |
| --- | --- | --- | --- |
| Selection | "Which cells does this operation affect?" | the registered Selections, with Figma's artwork | [ParamFields](/editor/param-fields/) |
| Pattern | "How should the tiles spread?" (Tile, or no attribute yet), else "How should the values spread?" | the registered Sources, with hand-drawn artwork | ParamFields, and "Reseed on load" for a stochastic Source |
| Attribute | "What does this operation write?" | the eight Targets, label only | [PaletteList](/editor/palette-list/) or [NumericMapping](/editor/numeric-mapping/) |
| Blend | "How does this combine with what is already there?" | the Blends the Target accepts, label only | nothing |

Each option list is a [glyph grid](/editor/ui-glyph-grid/). The chosen option's fields sit in a
framed block under a small black bar that names the choice ("TILE", "NOISE"), so it is plain that
they belong to that choice and where they end. An option with no fields gets no block, so Blend
never has one. Blocks are 12px apart, and rows inside a block 8px. The steps can be visited in any
order. Nothing is written to the tileset until the author presses **Add** (a new operation) or
**Save** (an edit). **Discard** closes the body and drops the draft. While a step is unanswered,
a **Next: Pattern** (or another step) button goes to the first unanswered step after the
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

A `<p class="question t-label">` with `QUESTIONS[draft.step]`. Inside the body `.t-label` is
14px Regular in sentence case, so the question matches the field labels rather than `.t-body`'s
Light (Pol, Block F review). It is wrapped in a [Hint](/editor/ui-hint/) that shows, on the
Selection step only, why an option is disabled (below).

#### The options block

The `options(choice, fields, action?)` snippet: a `<section aria-label="{labelFor(choice)} settings">`
holding a bar with `labelFor(choice)` in muted `.t-xs` and, at its right, the optional `action`
snippet (Noise's "How noise works"), over a body framed by `--rule`
without a top border, `--space-3` padding and `--space-4` between rows. Each step renders it only
when there is something to put in it: `hasFields(schema)` is a non-null schema with at least one
key. The body's own gap is `--space-6` (12px).

#### Selection

`selectionItems` is every `selections.all()` registration, labelled by `labelFor`, sorted into
Figma's order (`all`, `checkerboard`, `everyNth`, `rowColumn`, `random`, `rect`, `cellList`), with
its `.svg` glyph as `src`. A name with no artwork gets a label-only cell after these.
`every-nth.svg` counts cells row after row with n = 3, which is the v5 `everyNth` (B-009);
`row-column.svg`, every 2nd column, is hand-written because Figma has no node for it. A
**coordinate-bound** Selection is disabled while any breakpoint names `rows` or `columns`
(`resizedBy`), because `document.ts` would refuse the commit (`COORDINATE_BOUND_RESIZE`). The hint
then reads "Handpick holds literal cells, and breakpoint N changes rows or columns."

`chooseSelection(name)` sets `selectionType` and replaces `selectionParams` with
`defaultParams(schema)`. The Selection's [ParamFields](/editor/param-fields/) go in the options
block, shown only when the chosen Selection has parameters. They get
`hints={selectionParamHints(draft.selectionType)}` ([param-hints.ts](/editor/param-hints/)), so
Every Nth's N says that the picture depends on the column count (B-009).

#### Attribute

One label-only cell per key of `TARGETS`. Choosing one calls `retarget(draft, target)`. Then a
`"tile"` Target (`isTileTarget`) shows `PaletteList` with `session.file.config.tiles`,
`draft.sourceType` and `coverage={measured}` (below); any other shows `NumericMapping` with `collapsed` true when the Source is
`constant`. Either goes in the options block, named after the Target ("TILE", "OPACITY").

#### Pattern

The Source step, labelled "Pattern" (`STEP_LABELS`). One cell per `sources.all()` registration,
drawn ones first in `PATTERN_ORDER`. Random, Noise, Gradient and Constant have a 4×4 tint grid
from [pattern-art.ts](#pattern-artts), handed to [GlyphGrid](/editor/ui-glyph-grid/) as an
`artwork` snippet (`createRawSnippet` over the SVG string). A Source with no art keeps a
label-only cell (**E9**). `chooseSource(name)` sets `sourceType` and
resets `sourceParams` to defaults. When the registry marks the Source `stochastic`, a
[Checkbox](/editor/ui-checkbox/) "Reseed on load" (batch 03 T-07, B-029: the closed card's
control too, so one setting has one control) is bound to `draft.reseedOnLoad`, with the hint
`RESEED_ON_LOAD_HINT` from [reseed.ts](/editor/reseed/) (B-024), shared with the closed card. It sits at the
fields' left edge, its hover wash hanging out by its padding (`.reseed`). It replaced an Off / On
[Toggle](/editor/ui-toggle/) in a [FieldRow](/editor/ui-field-row/). The parameters and the
checkbox share one options block, shown
when the Source has parameters, is stochastic, or has a field preview.

The well opens with the [field preview](/editor/field-preview/) (`previewed`: every Pattern but
Constant) from `field` (below). The Source's [ParamFields](/editor/param-fields/) get
`hints={sourceParamHints(draft.sourceType)}` ([param-hints.ts](/editor/param-hints/)), so Noise's
labels say what Cells per feature and Octaves do. Under Noise, the options bar's action is a
tertiary [Button](/editor/ui-button/) "How noise works" with the `info` icon and `aria-expanded`,
which opens the [Explainer](/editor/ui-explainer/) with `NOISE_EXPLAINER`. `explaining` holds the
trigger while it is open; an effect closes it when the step or the Pattern changes, and Esc or ✕
returns focus to the trigger.

#### The field and the measured coverage

`field` is `{ rows, columns, cells }`: `cells` is `fieldCells(...)`
([palette.ts](/editor/palette-list/#the-rules-palettets)) over
`shadowConfig(session.file.config, draft)`, the same shadow config the Selection overlay draws,
with its rows and columns replaced by the active breakpoint's at `preview.width` (`activeRules`,
`ruleOverride`), and `config.defaultSeed` and `preview.loadSalt`. It has two readers, so it is
computed on the Pattern step (for the field preview, before an Attribute is chosen) and on the
Attribute step under a Tile Target (for the palette), and is `null` elsewhere and before a
Selection and a Pattern. `measured` is `coverageOf` of the cells' values and `draft.palette`
under a Tile Target, or `null` when there is no field or no cell is selected, which the list
shows as "—". The shadow carries no palette, so a weight drag recounts `field` and does not
re-evaluate the Pattern.

#### Blend

With no Target yet: "Choose an attribute first." Otherwise a label-only grid of
[`acceptedBlends`](/api/index/functions/acceptedblends/)`(draft.target)`. The Target's default
is already chosen, because `retarget` sets it, and every accepted Blend is shown. A vetoed Blend
is absent, not disabled. For `tileId` that leaves a single `set` cell.

#### Discard / Save

`chosen(step)` is the step's answer (`selectionType`, `target`, `sourceType`, `blend`).
`unanswered` lists `STEP_LABELS[step]` for each step with no answer. When all four are answered but
`isComplete(draft)` is false (an empty palette, or weights summing to zero), it adds "the
mapping". The button reads "Save" when editing, "Add" otherwise, is disabled while `unanswered`
is not empty, and has the hint "Still open: …". The `.actions` row sets `--hint-top: auto`,
`--hint-bottom`, `--hint-left: auto` and `--hint-right: 0`, so this hint opens upward and
right-aligned, inside the sidebar.

`commit()` calls `toOperation(draft)`, returns on `null`, then applies `replaceOperation` (editing)
or `addOperation` in one `session.apply`, and calls `onClose`.

### pattern-art.ts

`patternSvg(name)` returns the glyph for a registry name as an SVG string, or `null` with no art.
Each is 16 cells, 10px at an 11px pitch in a 44px viewBox drawn at 43px, matching the Selection
glyphs. Tints are tokens, never hex: `--color-panel` with a 1px ink outline, `--grey-300`,
`--grey-500`, `--color-ink`. Random scatters, Noise clumps, Gradient runs corner to corner,
Constant is one tint. `PATTERN_ORDER` is the drawn names in grid order. `pattern-art.test.ts`
checks that every drawn name is registered and has 16 cells, that no hex colour appears, and that
an unregistered name gives `null`.

### Invariants

- **The draft reaches the file at Save and nowhere else** (**E5**), as one
  `TilesetFile -> TilesetFile` transition (**D7**), so an edit is one undo entry (**E6**).
- **`replaceOperation` keeps the index**, so an edited operation keeps its place in the stack.
- **`toOperation` re-checks** rather than trusting the disabled button.
- **Parameters are materialized at their defaults** when a type is chosen, so the fields show
  what the file will contain.
- **Pattern before Attribute** (T0). The Pattern decides what the attribute's mapping means (the
  collapse under `constant`; a palette weight is a chance only under `random`), so it is asked
  first. **Steps stay navigable** in any order (**D8**), and `collapsed` is derived live.
- **`reseedOnLoad` is offered from the registry's `stochastic` flag**, never from a list of
  Source names (`05` **X5**).
- **A Selection or Source registered later appears with no change here** (**E9**), as a
  label-only cell.

### Callers / callees

| Caller | Use |
| --- | --- |
| `sections/OperationsSection.svelte:34` | import |
| `sections/OperationsSection.svelte:127` | under the open stored operation: `{draft}`, `editing`, `id={bodyId}`, `onClose={() => drafting.discard()}` |
| `sections/OperationsSection.svelte:147` | under the new operation's header: `editing={false}` |

Callees: [`acceptedBlends`](/api/index/functions/acceptedblends/),
[`selections`](/api/index/variables/selections/), [`sources`](/api/index/variables/sources/),
[`TARGETS`](/api/index/variables/targets/); the six Selection glyphs in
`assets/glyphs/selection/`; `isTileTarget` (`controls/mapping.ts`);
[NumericMapping](/editor/numeric-mapping/), [PaletteList](/editor/palette-list/),
[ParamFields](/editor/param-fields/); `addOperation`, `replaceOperation` (`document.ts`);
`defaultParams`, `isComplete`, `retarget`, `STEPS`, `toOperation` (`draft.svelte.ts`); `session`;
[Button](/editor/ui-button/), [Checkbox](/editor/ui-checkbox/),
[GlyphGrid](/editor/ui-glyph-grid/), [Hint](/editor/ui-hint/);
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
- **The Target and Blend cells are label only** until Figma has artwork for them. The Pattern
  glyphs are written by hand (`pattern-art.ts`), as there is no Figma frame for them.
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
