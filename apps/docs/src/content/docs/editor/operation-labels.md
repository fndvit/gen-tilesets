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
UI shows "Every Nth", "Handpick", "Scale X". Joined in step order by ` * `, the answers read as one
line:

```text
Checkered * Opacity [0.5 - 1] * Random * Set
All * Tile [sand, clear] * Random * Set
— * — * — * —
```

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `labelFor` | `(name: string) => string` | Figma's name for a registry name. |
| `SummaryParts` | interface | `selection`, `target`, `mapping`, `source`, `blend`, each `null` while unanswered. |
| `UNANSWERED` | `"—"` | Shown for a step with no answer. |
| `summaryCells` | `(parts, tiles: readonly Tile[]) => Record<Step, string>` | Each step's answer, for the header's cell above that step's tab. |
| `summarize` | `(parts, tiles: readonly Tile[]) => string` | The cells joined in step order, as one line. |
| `partsOf` | `(op: Operation) => SummaryParts` | The parts of a stored Operation. |
| `draftParts` | `(draft: Draft) => SummaryParts` | The parts of an open draft. |

### Inputs → outputs

- **`labelFor`.** Four names are fixed: `cellList` → "Handpick", `checkerboard` → "Checkered",
  `tileId` → "Tile", `valueNoise` → "Noise". Any other name is split before each capital that
  follows a lower-case letter or digit, and its first letter is capitalized: `everyNth` →
  "Every Nth", `scaleX` → "Scale X", `rect` → "Rect".
- **`summaryCells`.** `{ selection, attribute, source, blend }`, each through `labelFor` or
  `UNANSWERED`. The attribute is `UNANSWERED` with no Target, the bare label with a Target and
  no mapping, and otherwise the label followed by the mapping:
  - a tile mapping lists its palette by **tile name**, as `[sand, clear]`. A `null` entry is
    "clear", as `PaletteBar` names it. An id with no Tile is shown as the id;
  - a numeric mapping is `[min - max]`, with ` × steps` only when `steps` is present (absent
    means continuous).
- **`summarize`.** `STEPS.map((step) => cells[step]).join(" * ")` over `summaryCells`.
- **`partsOf(op)`** reads `op.selection.type`, `op.target`, `op.mapping`, `op.source.type` and
  `op.blend`.
- **`draftParts(draft)`** reads the draft's types, Target and Blend. The mapping is
  `mappingOf(draft)` once a Target is chosen, and `null` before.

### Invariants

- **A name with no entry still reads** (**E9**). A Selection or Source registered later gets a
  title-cased label with no change here.
- **Tile ids never reach the summary** while the Tile exists.
- **Pure.** No state, no Svelte runes. It imports only `isTileMapping` and types from the package,
  and `mappingOf`, `STEPS`, `Draft` and `Step` from `draft.svelte.ts`.

### Callers / callees

| Caller | Use |
| --- | --- |
| `sections/OperationsSection.svelte:29` | `draftParts`, `partsOf`, `summaryCells` for each header |
| `operations/OperationBody.svelte:72` | `labelFor` for every glyph cell and for Save's "Still open" hint |
| `controls/ParamControl.svelte:19` | `labelFor(name)` as the field label |
| `controls/NumericMapping.svelte:27` | `labelFor(target)` as the mapping's label |

Callees: `isTileMapping` (package), `mappingOf`, `STEPS` (`draft.svelte.ts`).

### Tests

`lib/operations/labels.test.ts`: Figma's names where they differ from the registry's; title case
for any other name; `summaryCells` giving each step its own answer, and `—` for every step of a
new draft; a numeric operation read in step order; `steps` shown only when present;
palette tiles named, never by id, with an empty entry called "clear"; and a fresh draft reading
`— * — * — * —`.

### Gotchas & rejected alternatives

- **`valueNoise` → "Noise" is not tested.** The other three fixed names are.
- **The separator is ` * `**, as Figma writes the strip, not a sentence. The header no longer
  shows the joined line (it shows `summaryCells`); `summarize` is kept for the tests and as
  `04` §3's sentence.

### Review notes

None found.
