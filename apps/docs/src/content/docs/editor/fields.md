---
title: fields.ts
description: One parser per editable numeric field. Text in, a legal number or null out, shared by the input control and the transition.
sidebar:
  order: 4
---

**Written from:** `apps/editor/src/fields.ts`, `document.test.ts` (the *fields* block and the
refusal tables), `rules.test.ts`, and the call sites in `document.ts`, `App.svelte`,
`lib/TileLibrary.svelte` and `lib/NumericInput.svelte`.

## Overview

The fields module decides what the author may type into each number box. For every editable
number (rows, cell size, design width, vertical offset, an asset's weight, the values of a
breakpoint) it has one small function that reads the typed text. The function returns either a
number the file is allowed to hold, or nothing.

When it returns nothing, the editor keeps the typed text in the box and leaves the file alone. It
never rounds or clamps a value into range. A value that is out of range is refused, not
rewritten.

In the editor's pipeline, import → document → draft/history → preview → export, this sits just
in front of the document. Both the input box and the document's edit functions ask the same
parser, so they cannot disagree about what is legal.

## In detail

### Purpose

`fields.ts` holds the domain of each numeric field in one place and has two callers. A
`NumericInput` asks `parse()` whether its text may commit. The transition in
[document.ts](/editor/document/) asks the same function whether the value may land. If the two
held separate copies of a range, they would drift, and E15 would call that drift *a defect in the
editor's edit vocabulary rather than an author error*.

### Public surface

| Export | Admits | Notes |
| --- | --- | --- |
| `ParseResult` | `number \| null` | `null` means *do not commit*. |
| `parseRows(text)` | integer `>= 1` | Also used for rule `columns`. |
| `parseCellSize(text)` | `> 0` | |
| `parseReferenceWidth(text)` | `> 0` | No upper bound, no relation to `columns * cellSize`. |
| `parseYOffset(text)` | `[0, 1)` | Half-open: `1` is refused. |
| `parseWeight(text)` | `>= 0` | Zero is legal. The non-zero-sum rule lives in the transition. |
| `parseWidth(text)` | `>= 0` | A breakpoint width in CSS px of the render box. |
| `parseBleed(text)` | any finite | Its bound (`columns - bleed > 0`) is relative, so it is checked by `validate()` in the transition. |
| `format(value)` | n/a | `String(value)`, what a control shows when it reverts. |
| `RULE_FIELDS` | n/a | `["minWidth", "maxWidth", "rows", "columns", "cellSize", "bleed", "yOffset"]`, in display order. |
| `RuleField` | n/a | Union of `RULE_FIELDS`. |
| `RULE_PARSERS` | n/a | `Record<RuleField, parser>`. |

### Inputs → outputs

Every parser goes through the private `toFiniteNumber(text)`:

1. It trims, and returns `null` for an empty string. That covers `""` and whitespace, which
   `Number` would turn into `0`.
2. `Number(trimmed)`, accepted only if `Number.isFinite`. That rejects `NaN`, `Infinity` and
   `-Infinity`.

`"1."` parses as `1`, which is correct to commit. The comment uses this as E5's own example: the
control may still show `"1."` while the file holds a legal number.

Each field parser then applies its range and returns `null` outside it. The two kinds of failure,
*not a number yet* and *a number outside the range*, are deliberately not distinguished. E5
treats them identically.

### Invariants

- **Refusal, never coercion.** `1.4` in `yOffset` is refused, not clamped to `0.999…`. The source
  quotes the reason: a loader that silently rewrites a value *produces a picture the file does
  not describe, and the author's next save writes the rewritten value back over their own.*
  Clamping typed input would be the same coercion *performed in the one place the author is
  watching*.
- **`yOffset` is half-open** because an offset of exactly one cell would be indistinguishable
  from deleting row 0.
- **`format` does not round.** The file holds what was typed. A fixed precision would make the
  control disagree with the document panel.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `document.ts:50-58` | `parseCellSize`, `parseReferenceWidth`, `parseRows`, `parseWeight`, `parseYOffset`, `RULE_PARSERS`, `RuleField` |
| `App.svelte:433`, `:441`, `:452`, `:458` | `parseRows`, `parseYOffset`, `parseReferenceWidth`, `parseCellSize` as a `NumericInput`'s `parse` prop |
| `App.svelte:527`, `:532`, `:543`, `:549` | `RULE_FIELDS`, `RULE_PARSERS` for the Breakpoints rows |
| `lib/TileLibrary.svelte:191`, `:291` | `parseWeight`, to explain a refused zero and as a `parse` prop |
| `lib/NumericInput.svelte:61` | `format(value)` for the reverted text |

`parseWidth` and `parseBleed` are reached only through `RULE_PARSERS` (`fields.ts:140-145`).

### Tests

There is no `fields.test.ts`.

- `document.test.ts` (block *fields — the shared constraint*) checks that for each of `parseRows`,
  `parseCellSize`, `parseReferenceWidth` and `parseYOffset`, and each sample text in `["0", "1",
  "0.5", "-1", "", "abc", "1e3", "Infinity", "0.999"]`, the transition changes the file exactly
  when the parser returns non-`null`.
- `document.test.ts` also tables bad inputs per field, checks that `yOffset` is never coerced,
  checks the boundary values, and asserts `parseCellSize("1.") === 1`.
- `rules.test.ts` reaches `RULE_PARSERS` through `setRuleField` (*sets a field from text, and
  refuses text that does not parse*).

`parseWeight` is exercised by `library.test.ts` through `setAssetWeight`. `parseWidth`,
`parseBleed` and `format` have no direct tests.

### Gotchas & rejected alternatives

- **The non-zero weight sum is not here.** It depends on sibling assets, so it lives in
  `setAssetWeight`.
- **A rule's `bleed` bound is not here.** `columns` may come from another rule, so the whole
  cascade has to be checked, which `withRules` does with `validate()`.
- **`referenceWidth` has no cross-field rule.** The schema validates the four Layout fields
  independently. The difference from `columns * cellSize` is the intentional bleed.

### Review notes

- `toFiniteNumber`'s docstring says it *"Rejects … JS's more generous coercions"*, but it only
  special-cases empty and whitespace. `Number()` still accepts hex (`"0x10"` → 16), binary
  (`"0b11"`), octal (`"0o7"`) and exponent (`"1e3"`) forms, so `parseRows("0x10")` returns `16`.
  The test treats `"1e3"` as legal, so exponent input looks intended. Hex/binary/octal acceptance
  is undocumented. (doc gap)
- `parseWidth`, `parseBleed` and `format` have no direct tests. (missing test)
