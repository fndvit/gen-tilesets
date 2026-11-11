---
title: operations/labels.ts
description: The words the operation UI shows for registry names, and the summary an operation header shows, one cell per step.
sidebar:
  order: 46
---

**Written from:** `apps/editor/src/lib/operations/labels.ts` and `lib/operations/labels.test.ts`.

## Overview

`labels.ts` turns the registry's names into words for the author, and builds the summary on
each [operation header](/editor/operation-header/): one answer per step, each shown above that
step's tab. The file and the code keep the registry names (`everyNth`, `cellList`, `scaleX`). The
UI shows "Every nth", "Handpick", "Scale x". Joined in step order by ` * `, the answers read as one
line:

```text
Checkered * Random * Opacity [0.5 - 1] * Set
All * Random * Tile [sand, clear] * Set
— * — * — * —
```

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `labelFor` | `(name: string) => string` | Figma's name for a registry name. |
| `STEP_LABELS` | `Record<Step, string>` | What each step is called: `source` → "Pattern"; the others are the step's name with a capital. |
| `SummaryParts` | interface | `selection`, `target`, `mapping`, `source`, `blend`, each `null` while unanswered. |
| `UNANSWERED` | `"—"` | Shown for a step with no answer. |
| `summaryCells` | `(parts, tiles: readonly Tile[]) => Record<Step, string>` | Each step's answer, for the header's cell above that step's tab. |
| `summarize` | `(parts, tiles: readonly Tile[]) => string` | The cells joined in step order, as one line. |
| `writesOf` | `(parts, tiles: readonly Tile[]) => Writes \| null` | What the operation writes, for the card's title: the Target, the palette's names or the range, and the tile ids for thumbnails. `null` before a Target. |
| `writesText` | `(writes: Writes \| null) => string` | The same as one line, `"Tile · Pink, Blue"`; `—` for `null`. |
| `partsOf` | `(op: Operation) => SummaryParts` | The parts of a stored Operation. |
| `draftParts` | `(draft: Draft) => SummaryParts` | The parts of an open draft. |

### Inputs → outputs

- **`labelFor`.** Six names are fixed: `cellList` → "Handpick", `checkerboard` → "Checkered",
  `rect` → "Drag" (it names the gesture that sets it), `rowColumn` → "Row/Column" (sentence case
  would read "Row column", one thing; the slash says it is one or the other, which its `axis`
  picks), `tileId` → "Tile", `valueNoise` → "Noise".
  Any other name is split before each capital that follows a lower-case letter or digit and put in
  sentence case, with no exceptions (Pol, N3):
  `cellsPerFeature` → "Cells per feature", `everyNth` → "Every nth", `scaleX` → "Scale x".
- **`STEP_LABELS`.** Kept apart from `labelFor`'s fixed names on purpose: those map registry
  names, and a Source registered under the name `source` would otherwise read "Pattern".
- **`summaryCells`.** `{ selection, source, attribute, blend }`, each through `labelFor` or
  `UNANSWERED`. The attribute is `UNANSWERED` with no Target, the bare label with a Target and
  no mapping, and otherwise the label followed by the mapping:
  - a tile mapping lists its palette by **tile name**, as `[sand, clear]`. A `null` entry is
    "clear", as the palette list names it. An id with no Tile is shown as the id;
  - a numeric mapping is `[min - max]`, with ` × steps` only when `steps` is present (absent
    means continuous).
- **`summarize`.** `STEPS.map((step) => cells[step]).join(" * ")` over `summaryCells`.
- **`partsOf(op)`** reads `op.selection.type`, `op.target`, `op.mapping`, `op.source.type` and
  `op.blend`.
- **`draftParts(draft)`** reads the draft's types, Target and Blend. The mapping is
  `mappingOf(draft)` once a Target is chosen, and `null` before.
- **Under Constant, one tile.** `writesOf` and `summaryCells` name only the entry that paints
  (`constantEntry`, the first non-zero weight), as the stepper does and as Save writes. A file
  saved before T3 can still hold the others, and the card names what the operation *does*, so
  they are dropped here too (Pol, T4). A palette with no weight is shown as written.

### Invariants

- **A name with no entry still reads** (**E9**). A Selection, Source or param registered later
  gets a sentence-case label with no change here.
- **Tile ids never reach the summary** while the Tile exists.
- **Pure.** No state, no Svelte runes. It imports only `isTileMapping` and types from the package,
  `mappingOf`, `STEPS`, `Draft` and `Step` from `draft.svelte.ts`, and `constantEntry` from
  `controls/palette.ts`.

### Callers / callees

| Caller | Use |
| --- | --- |
| `sections/OperationsSection.svelte:36`, `operations/OperationCard.svelte:36` | `draftParts` and `partsOf` for each card; the card's `summaryCells` and `writesOf` |
| `operations/OperationBody.svelte` | `labelFor` for every glyph cell; `STEP_LABELS` for the step rows, "Next: …" and Save's "Still open" hint |
| `operations/OperationCard.svelte` | `STEP_LABELS` for the chips' step names |
| `controls/ParamControl.svelte:32` | `labelFor(name)` as the field label |
| `controls/NumericMapping.svelte:98` | `labelFor(target)` as the mapping's label |

Callees: `isTileMapping` (package), `mappingOf`, `STEPS` (`draft.svelte.ts`), `constantEntry`
(`controls/palette.ts`).

### Tests

`lib/operations/labels.test.ts`: Figma's names where they differ from the registry's; sentence case
for any other name; `STEP_LABELS.source` is "Pattern" while `labelFor("source")` stays "Source"; `summaryCells` giving each step its own answer, and `—` for every step of a
new draft; a numeric operation read in step order; `steps` shown only when present;
palette tiles named, never by id, with an empty entry called "clear"; under Constant, only the
entry that paints, skipping a zero first weight, while other Patterns list every entry; and a fresh draft reading
`— * — * — * —`.

### Gotchas & rejected alternatives

- **The separator is ` * `**, as Figma writes the strip, not a sentence. The header no longer
  shows the joined line (it shows `summaryCells`); `summarize` is kept for the tests and as
  `04` §3's sentence.

### Review notes

None found.
