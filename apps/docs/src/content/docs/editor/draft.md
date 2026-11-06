---
title: draft.svelte.ts
description: The logic of the operation draft. A half-built Operation held outside the file, its completeness gate, and its conversions to and from an Operation.
sidebar:
  order: 10
---

**Written from:** `apps/editor/src/draft.svelte.ts`, `draft.test.ts`, `blend.test.ts`,
`controls/mapping.test.ts` (the parts that import this module), and the call sites in
`drafting.svelte.ts`, `lib/operations/OperationBody.svelte`, `lib/operations/OperationHeader.svelte`,
`lib/sections/OperationsSection.svelte` and `App.svelte`.

## Overview

The draft module describes an operation while the author is still building it. Creating an
operation takes four choices:

- which cells it affects;
- how its values spread over them (the Pattern);
- which property it changes;
- how they combine with what is already there.

Until all four are made, the operation is not a legal part of a tileset. So the half-built
operation cannot live in the file. It lives in a draft beside it, and joins the file in one step
once it is complete.

Editing an existing operation uses the same draft. The operation is copied out, changed, and
written back in one step, keeping its identity, so the picture moves only as much as the edit
implies.

This module is the logic only: the draft's shape, when it counts as complete, and how it converts
to and from a finished operation. In the editor's pipeline,
import → document → **draft**/history → preview → export, the draft is where an operation is
assembled before it reaches the document. The preview can draw a partial draft's cells as an
overlay.

## In detail

### Purpose

`draft.svelte.ts` holds no rune despite its name. It is the testable half of the draft. The
`$state` lives in [drafting.svelte.ts](/editor/drafting/). The `Draft` is mutated in place by the
panel's controls and the brush. It commits as **one** `TilesetFile → TilesetFile` transition
(`addOperation` or `replaceOperation` in [document.ts](/editor/document/)) when `toOperation`
returns non-`null`.

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `Step` | `"selection" \| "source" \| "attribute" \| "blend"` | The four steps. `source` is labelled "Pattern" (`STEP_LABELS`, [labels.ts](/editor/operation-labels/)). |
| `STEPS` | `Step[]` | In walking order: Selection → Pattern → Attribute → Blend. |
| `Draft` | interface | See the table below. |
| `defaultParams(schema)` | `(ParamSchema) → Record<string, unknown>` | Every declared parameter at its default; `cellList` → `[]`. |
| `newDraft(id)` | `(string) → Draft` | A fresh create-draft. |
| `retarget(draft, target)` | `(Draft, TargetName) → void` | Sets the Target; rebuilds the numeric mapping; settles the Blend. Mutates. |
| `isComplete(draft)` | `(Draft) → boolean` | The gate. |
| `mappingOf(draft)` | `(Draft) → Operation["mapping"]` | `{ palette }` for a tile Target, else `numeric`. Under `constant`, a one-entry palette. |
| `toShadowOperation(draft)` | `(Draft) → Operation \| null` | An Operation that `selection()` can resolve, for the overlay, carrying the draft's Pattern for the palette's coverage. |
| `shadowConfig(config, draft)` | `(TilesetConfig, Draft) → { operationId, config } \| null` | The config with the shadow Operation in it, replaced by id or appended. Shared by the overlay and the coverage. |
| `draftFile(file, draft)` | `(TilesetFile, Draft) → TilesetFile \| null` | The file with `toOperation(draft)` in it, replaced by id or appended; `null` while incomplete. What the preview draws while a draft is open (item 12). |
| `fromOperation(op)` | `(Operation) → Draft` | Reopens an Operation as an edit-draft. |
| `toOperation(draft)` | `(Draft) → Operation \| null` | The committed Operation, or `null` if incomplete. |
| `draftDiffers(draft, op)` | `(Draft, Operation \| null) → boolean` | Whether discarding the draft would lose anything. `op` is the stored Operation for an edit-draft, `null` for a create-draft. |

`Draft` fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Allocated when the draft opens; never reassigned. |
| `step` | `Step` | The step being shown. |
| `salt`, `reseedOnLoad` | `number`, `boolean` | Carried, not authored. `0`/`false` for a create-draft; the Operation's own values for an edit-draft. |
| `selectionType`, `sourceType` | `string \| null` | `null` until chosen. No default is invented. |
| `selectionParams`, `sourceParams` | `Record<string, unknown>` | Spread siblings of `type` on commit. |
| `target` | `TargetName \| null` | |
| `blend` | `BlendName \| null` | `null` only until a Target is chosen. |
| `numeric` | `NumericMapping` | Held alongside `palette`; `target` picks which commits. |
| `palette` | `PaletteEntry[]` | Starts `[{ tileId: null, weight: 1 }]`. |

Engine: [`isAccepted`](/api/index/functions/isaccepted/),
[`isTileMapping`](/api/index/functions/istilemapping/),
[`paletteTotal`](/api/index/functions/palettetotal/),
[`TARGETS`](/api/index/variables/targets/), [`Operation`](/api/index/interfaces/operation/).
Editor: `defaultFor` (`controls/affordance.js`), `defaultNumericMapping` and `isTileTarget`
(`controls/mapping.js`).

### Inputs → outputs

- **`newDraft(id)`.** `step: "selection"`, every choice `null`, empty params, `numeric:
  { range: [0, 0] }` (a placeholder until a numeric Target is chosen) and
  `palette: [{ tileId: null, weight: 1 }]`. A `null` palette entry is legal and means *clear this
  cell*, so the draft is legal even with an empty tile library.
- **`retarget(draft, target)`.** It sets `target`. For a non-tile Target it replaces `numeric` with
  `defaultNumericMapping(target)`, so a freshly targeted Operation is a no-op rather than an
  immediate flip or fade. If the current `blend` is `null` or not `isAccepted(target, blend)`, it
  becomes `TARGETS[target].default`. A Blend the new Target still accepts is kept.
- **`isComplete`.** False if any of `selectionType`, `target`, `sourceType` or `blend` is `null`,
  or the pair is not accepted. For a tile Target the palette must be non-empty with
  `paletteTotal > 0`. Otherwise both ends of `numeric.range` must be finite.
- **`mappingOf`.** A numeric Target gives `numeric`. A tile Target gives `{ palette }`, except
  under a `constant` Source, where it gives `{ palette: [{ tileId, weight: 1 }] }` for the entry
  `t = 0` lands on (`constantEntry`, the first non-zero weight). The draft keeps its whole palette,
  so switching the Pattern back before Save restores the list (T0).
- **`toShadowOperation`.** `null` until `selectionType` is set. Otherwise it returns the real `id`,
  `salt`, `reseedOnLoad` and `selection`, the draft's `source` once one is chosen (a
  `{ type: "constant" }` placeholder before), and the placeholders `target: "opacity"`,
  `mapping: { range: [1, 1] }` and `blend: "set"`.
- **`shadowConfig(config, draft)`.** `null` when `toShadowOperation` is. Otherwise the config with
  the shadow Operation replacing the one with its id (an edit-draft) or appended (a create-draft).
  Replacing matters: `selection()` resolves by id and would find the unedited Operation first.
  The replace-or-append rule is one private function, `withOperation`, shared with `draftFile`.
- **`draftFile(file, draft)`.** `null` unless `isComplete(draft)`; otherwise a new file whose
  config has `toOperation(draft)` in it by the same rule. Built from `toOperation`, not from the
  shadow, so the live picture is exactly what Save commits (Constant's one entry included). It
  never writes to `file` (**E3**).
- **`fromOperation(op)`.** It un-spreads `type` from `selection` and `source`. It copies
  `salt ?? 0` and `reseedOnLoad === true`. For a tile mapping it deep-copies each palette entry and
  seeds `numeric` from `newDraft`. For a numeric mapping it copies `range` and seeds `palette` from
  `newDraft`.
- **`toOperation`.** `null` unless complete. Otherwise it returns
  `{ id, salt, reseedOnLoad, selection: { type, ...params }, source: { type, ...params }, target,
  mapping: mappingOf(draft), blend }`.
- **`draftDiffers(draft, op)`.** For a create-draft (`op` is `null`), true once any of
  `selectionType`, `target` or `sourceType` is set. For an edit-draft, true if `toOperation(draft)`
  is `null` (an edit made incomplete, such as an emptied palette, can be discarded but not saved).
  Otherwise it compares `toOperation(draft)` with `toOperation(fromOperation(op))` as JSON with
  object keys sorted (`stableJson`), so key order, the open step and the unused mapping slot never
  count as a change.

### Invariants

- **The draft is never in the file, and never in `meta` (E4).** A half-built Operation is not
  legal, so E5 keeps it out until it commits whole.
- **No invented defaults** for the Selection type, Source type or Target. The Blend is different:
  the Target carries a declared default, and the UI is required to *show* it.
- **O7: `(target, blend)` is always an accepted pair.** `retarget` maintains it, and `isComplete`
  re-checks it as *"the gate, not a second opinion"*. The accepted set is asked of `isAccepted`
  rather than held in a table, so a Blend registered later joins every numeric Target at once.
- **C8: a Mapping's kind is determined by its `target`.** Both shapes are held only as a UI
  convenience, and exactly one reaches a file.
- **`type` is reserved in the parameter namespace**, which makes spreading parameters beside
  `type`, and un-spreading them, unambiguous.
- **Nothing aliases the file.** `fromOperation` copies every container one level deep. Sharing one
  would let a control edit `session.file` with no transition, defeating E3 and E6. A `cellList`
  array is not cloned, because the brush replaces it wholesale (`App.svelte`'s `paintCells`).
- **The shadow's placeholders are never read.** `selection()` reads only the selection, id, salt
  and `reseedOnLoad`, through a closure the source says invariant O4 fixes. `salt` is real
  because an edit-draft's overlay would otherwise disagree with the picture. The `source` is real
  because `fieldOf` (`controls/palette.ts`) evaluates it; nothing reads the target, mapping or
  blend. The shadow carries no palette, so a weight drag does not re-evaluate the Pattern.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `drafting.svelte.ts:27`, `:56`, `:69` | `newDraft`, `fromOperation`, `Draft` |
| `lib/operations/OperationBody.svelte:281`, `:286` | `defaultParams(...)` when a Selection or Source type is chosen |
| `lib/operations/OperationBody.svelte:310`, `:313` | `STEPS` and `isComplete` for Save's "Still open" hint |
| `lib/operations/OperationBody.svelte:335` | `toOperation` on commit, then `replaceOperation`/`addOperation` (`:337`) |
| `lib/operations/OperationBody.svelte:459` | `retarget(draft, target)` |
| `lib/operations/OperationBody.svelte` | `shadowConfig(file.config, draft)` for the palette's measured coverage |
| `opening.svelte.ts:40` | `draftDiffers` before switching away from an open draft |
| `lib/operations/labels.ts:176` | `mappingOf(draft)` for the header's summary |
| `App.svelte` | `shadowConfig(config, draft)` for the overlay; `draftFile(file, draft)` for the live preview |

`mappingOf` is also used internally (`:350`) and by `controls/mapping.test.ts`.

### Tests

- **`draft.test.ts`.** `fromOperation` → `toOperation` round-trips a numeric and a tile-targeted
  Operation `toEqual`. It keeps the id, carries `salt`/`reseedOnLoad`, reads them as 0/false when
  absent, un-spreads parameters, and seeds the unused mapping slot from a fresh draft. It copies
  containers rather than aliasing (it mutates the draft's palette and `numeric.range` and checks
  the source Operation). A reopened draft is complete immediately. `toShadowOperation` carries the
  real salt (7) and is `null` before a Selection type. `STEPS` walks Selection, Pattern, Attribute,
  Blend from Selection. Constant with Tile saves only the first non-zero entry, at weight 1;
  switching to Noise before Save restores the list; a saved Constant operation reopens unchanged;
  a file's multi-entry palette under `constant` saves its first non-zero entry; a numeric mapping
  is left alone. `shadowConfig` appends a create-draft, replaces an edit-draft by id, carries the
  draft's Pattern, and is `null` before a Selection type. `draftFile` appends a create-draft,
  replaces an edit-draft in place (index kept), is `null` while incomplete, saves one entry under
  Constant, and leaves the file it is given unchanged.
  `draftDiffers`: a fresh create-draft is unchanged until a step is answered; a reopened
  Operation is unchanged whatever step is open; an edited parameter, a new Blend and a new salt
  are changes; retargeting there and back is not, since the unused mapping never commits; an edit
  made incomplete is a change.
- **`blend.test.ts`.** A new draft's `blend` is `null`. For every Target, `retarget` yields
  `TARGETS[target].default`, and the other three steps stay `null`. Retargeting keeps an accepted
  Blend and falls back when the new Target vetoes it, or accepts nothing else. `isComplete`
  refuses a Blend outside the accepted set and an unregistered Blend, and `toOperation` carries
  the Blend. **Deliberately last:** it registers `__test_screen` and shows it accepted on `scaleX`
  at once, while `tileId` still accepts only `["set"]`. There is no `unregister`, so this block
  must run last.
- **`controls/mapping.test.ts`** also imports `isComplete`, `mappingOf`, `newDraft`, `retarget`
  and `toOperation` to check that `mappingOf` returns exactly one shape, chosen by the Target.

### Gotchas & rejected alternatives

- **Pattern before Attribute (T0).** The Pattern decides what the mapping means: a numeric mapping
  collapses to one handle under `constant`, and a palette weight is a chance only under `random`.
  Asked the other way round, the weights read as chances before the author had said which.
- **Not a one-way wizard.** The steps can be visited in any order once opened, and the mapping
  control re-reads the Source whenever it changes.
- **Rejected: committing step by step.** No default Selection, Source or Target exists, so the
  intermediate states are not legal files.
- **Rejected: editing in the file directly.** Retargeting `tileId` → `opacity` passes through a
  moment where the mapping is a palette but the Target wants a range, which C8 cannot express.
- **Why not `toOperation` for the overlay?** It returns `null` on the Selection step, which is
  exactly when the overlay is most needed.
- **`salt`/`reseedOnLoad` are carried, not reset.** Writing `0`/`false` on an edit would silently
  undo a reroll done from the operation header.

### Review notes

- `isComplete`'s docstring (`draft.svelte.ts:186-188`) says *"The mapping is not listed … Step 6b
  adds it to this check."* The body already checks the mapping (palette total, finite range), so
  the sentence describes a past step. (stale comment)
- The file is named `.svelte.ts` but contains no rune. `drafting.svelte.ts` and `draft.test.ts`
  both state that the logic lives here *because* it must stay importable by a test. The suffix
  works only because the test runner tolerates it, and it invites a future `$state` that would
  break `draft.test.ts`, `blend.test.ts` and `controls/mapping.test.ts`. (inconsistency)
