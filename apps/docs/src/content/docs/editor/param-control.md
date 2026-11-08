---
title: ParamControl.svelte
description: One generated control for one parameter. A field row holding a toggle, a slider with a readout, or a number field, chosen by its affordance.
sidebar:
  order: 48
---

**Written from:** `apps/editor/src/controls/ParamControl.svelte`, `controls/affordance.test.ts`,
and the call site in `controls/ParamFields.svelte`.

## Overview

`ParamControl` is a single setting row inside the Selection or Source step of an open operation:
a label on the left, an input on the right. The label is the parameter's name in words ("Cells
Per Feature" for `cellsPerFeature`), and hovering it shows the range of values it accepts. The
input takes one of three forms. A choice between a few values is a [toggle](/editor/ui-toggle/).
A number with both ends bounded is a [slider](/editor/ui-slider/) with the current value printed
beside it. Anything else is a [number field](/editor/numeric-input/).

Typing is forgiving. The field keeps whatever the author has typed, and passes a value on only
when it is a legal number for that setting. Leaving the field shows the current value again.

In the editor's pipeline (import → document → **draft**/history → preview → export), it writes one
parameter of the draft.

## In detail

### Purpose

The component renders an [`Affordance`](/editor/affordance/) for one
[`ParamSpec`](/api/index/type-aliases/paramspec/). A half-typed number never reaches the draft,
and a value the spec refuses is not clamped into range. Since Block E it is built from the
editor's primitives: [FieldRow](/editor/ui-field-row/), [NumericInput](/editor/numeric-input/),
[Toggle](/editor/ui-toggle/) and [Slider](/editor/ui-slider/).

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | required | The parameter name. Shown through `labelFor`, which also labels the input. |
| `spec` | `ParamSpec` | required | The parameter's spec, for `admits` and the range hint. |
| `affordance` | `Affordance` | required | Which control to draw, from `affordanceFor(spec)`. |
| `value` | `unknown` | required | The draft's current value. |
| `onChange` | `(value: unknown) => void` | required | Called with a new value. |
| `about` | `string \| undefined` | `undefined` | What the param does. The label's hint is `about`, then "Accepts *range*." when there is a range (item 12). |

### Inputs → outputs

`label` is `labelFor(name)` from [labels.ts](/editor/operation-labels/). `hint` is
`"Accepts " + rangeLabel(spec) + "."`, or none when `rangeLabel` is `""`.

| `affordance.kind` | Renders | Commits |
| --- | --- | --- |
| `"segmented"` | `FieldRow` with a `Toggle`, one option per `affordance.values` | `onChange(v)` on a choice |
| `"slider"` | `FieldRow` with a `Slider` over `[min, max]` at `step`, and a `.t-label` readout of the value | `slide(n)` on input and on commit: `onChange(n)` only when `admits(spec, n)` |
| `"number"` | `NumericInput`, `step` `"1"` for integers else `"any"` | `onCommit(text)` → `onChange(Number(text.trim()))`, after `parse` accepted it |
| `"cellList"` | nothing (handled by `ParamFields`) | — |

`parse(text)` returns the number when the trimmed text is non-empty, `Number.isFinite(n)`, and
`admits(spec, n)`; otherwise `null`, which `NumericInput` takes as "do not commit".

The range text is `rangeLabel(spec)` from [affordance.ts](/editor/affordance/):

- `""` for `enum` and `cellList`;
- `"integer"` for an unbounded integer, `""` for an unbounded number;
- otherwise `"[lo, hi]"`, each end bracketed on its own: `[` / `]` for an inclusive bound, `(` /
  `)` for an exclusive or missing one, with `−∞` / `∞` for a missing end.

### Invariants

- **Refuse, never coerce** (`admits`). A typed out-of-range value is held as text, not clamped.
- **A slider is checked with `admits`, like typed input.** `affordanceFor` already insets an
  exclusive end by one step, so no slider position should be refused; the check in `slide()` is
  the guard for a float step that lands a hair past the bound.
- **The range is a hint on the label**, never text in the row.

### Callers / callees

| Caller | Use |
| --- | --- |
| `controls/ParamFields.svelte:14` | import |
| `controls/ParamFields.svelte:49` | one per non-`cellList` parameter |

Callees: `admits`, `rangeLabel` and the `Affordance` type from `affordance.ts` (line 20);
`labelFor` from `lib/operations/labels.ts` (line 19); `NumericInput`, `FieldRow`, `Slider`,
`Toggle` (lines 15–18).

### Tests

No test file for the component. `controls/affordance.test.ts` pins `admits`: inclusive and
exclusive bounds are honoured separately; `NaN` and `Infinity` are refused for every numeric spec;
a fraction is refused where the spec says integer; an enum accepts only its own values (`"0"`
is not `0`). It also pins `rangeLabel`: each end's bracket, including `{ min: 0, exclusiveMax: 1 }`
as `[0, 1)`, a bare integer as `"integer"`, and `""` for an unbounded number or an enum. And it
pins the slider's ends: an exclusive end is inset by one step and both ends are admitted, while
inclusive ends are left alone.

### Gotchas & rejected alternatives

- **Narrowed on `kind === "number"`, not a bare `{:else}`.** `cellList` is in the union and
  `ParamFields` handles it first; the explicit branch keeps that routing checkable.
- **The slider follows the thumb live.** The draft is transient, so each `onInput` costs no undo
  entry.

### Review notes

- **The slider's "cannot produce a value its own bounds exclude" holds only for inclusive
  bounds.** `affordanceFor` uses `min ?? exclusiveMin` and `max ?? exclusiveMax` as the slider's
  ends, so a `number` spec with an exclusive bound at both ends would get a slider that can land
  exactly on an excluded end, and `slide()` commits without calling `admits`. No registered
  parameter has two exclusive bounds today (`cellsPerFeature` is `exclusiveMin` only and gets a
  number field). (possible bug, latent) **Fixed in 0.8.1:** `slide()` checks `admits` before
  committing. Since then `affordanceFor` insets an exclusive end by one step, so the thumb can no
  longer rest on a refused value at all, and the `admits` check in `slide()` is only a guard.
- **The readout marks only `exclusiveMin` as open.** An `exclusiveMax` is shown with `]`. (possible
  bug, latent; no registered spec uses `exclusiveMax`) **Fixed in 0.8.1:** `rangeLabel` brackets
  each end on its own.
- **`pending` and `commit` disagree on blank text.** `commit` refuses `""` explicitly, but
  `pending` evaluates `Number("")`, which is `0`; for a spec that admits `0`, an emptied box is not
  marked pending. (inconsistency) **Fixed in Block E:** the number branch is a `NumericInput`, and
  its `parse` refuses blank text; there is no separate `pending` flag.
- The exact field keeps its `draft` text until blur. Dragging the slider without leaving the exact
  field first leaves the field showing the old typed text. (inconsistency, minor) **Fixed in
  Block E:** the slider has no exact field any more, only a readout of the value.
