---
title: ParamControl.svelte
description: One generated control for one parameter. A segmented row, a slider with an exact field, or a number field, chosen by its affordance.
sidebar:
  order: 48
---

**Written from:** `apps/editor/src/controls/ParamControl.svelte`, `controls/affordance.test.ts`,
and the call site in `controls/ParamFields.svelte`.

## Overview

`ParamControl` is a single setting row inside the Selection or Source step of the operation draft:
a label, the range of values it accepts, and an input. The input takes one of three forms. A
choice between a few values is a row of buttons. A number with both ends bounded is a slider
with an exact-value box beside it. Anything else is a plain number box.

Typing is forgiving. The box keeps whatever the author has typed, and passes a value on only when
it is a legal number for that setting. Leaving the box shows the current value again.

In the editor's pipeline (import → document → **draft**/history → preview → export), it writes one
parameter of the draft.

## In detail

### Purpose

The component renders an [`Affordance`](/editor/affordance/) for one
[`ParamSpec`](/api/index/type-aliases/paramspec/). It applies the same in-flight text model as
[NumericInput](/editor/numeric-input/): half-typed text never reaches the draft, and a value the
spec refuses is not clamped into range.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | required | The parameter name, shown as the label and used for `aria-label`. |
| `spec` | `ParamSpec` | required | The parameter's spec, for `admits` and the range readout. |
| `affordance` | `Affordance` | required | Which control to draw, from `affordanceFor(spec)`. |
| `value` | `unknown` | required | The draft's current value. |
| `onChange` | `(value: unknown) => void` | required | Called with a new value. |

### Inputs → outputs

| `affordance.kind` | Renders | Commits |
| --- | --- | --- |
| `"segmented"` | one button per `affordance.values`, `on` when `value === option` | `onChange(option)` on click |
| `"slider"` | `<input type="range">` over `[min, max]` at `step`, plus an exact `<input type="number">` | the slider calls `onChange(n)` only when `admits(spec, n)`; the exact field goes through `commit()` |
| `"number"` | `<input type="number">`, `step` `1` for integers else `"any"` | `commit()` |
| `"cellList"` | nothing (handled by `ParamFields`) | — |

`commit(text)` sets `draft = text` and calls `onChange(n)` only when the trimmed text is
non-empty, `Number.isFinite(n)`, and `admits(spec, n)`. Blur sets `draft = null`.

The label shows a range readout, `rangeLabel(spec)` from [affordance.ts](/editor/affordance/):

- `""` for `enum` and `cellList`;
- `"integer"` for an unbounded integer, `""` for an unbounded number;
- otherwise `"[lo, hi]"`, each end bracketed on its own: `[` / `]` for an inclusive bound, `(` /
  `)` for an exclusive or missing one, with `−∞` / `∞` for a missing end.

`pending` (`class:pending`) is true while `draft !== null && !admits(spec, Number(draft))`.

### Invariants

- **Refuse, never coerce** (`admits`). A typed out-of-range value is held as text, not clamped.
- **A slider is checked with `admits`, like typed input.** Its ends are the affordance's `min`
  and `max`, and for an exclusive bound that end is a value the spec refuses.

### Callers / callees

| Caller | Use |
| --- | --- |
| `controls/ParamFields.svelte:13` | import |
| `controls/ParamFields.svelte:47` | one per non-`cellList` parameter |

Callees: `admits`, `rangeLabel` and the `Affordance` type from `affordance.ts` (line 11).

### Tests

No test file for the component. `controls/affordance.test.ts` pins `admits`: inclusive and
exclusive bounds are honoured separately; `NaN` and `Infinity` are refused for every numeric spec;
a fraction is refused where the spec says integer; an enum accepts only its own values (`"0"`
is not `0`). It also pins `rangeLabel`: each end's bracket, including `{ min: 0, exclusiveMax: 1 }`
as `[0, 1)`, a bare integer as `"integer"`, and `""` for an unbounded number or an enum.

### Gotchas & rejected alternatives

- **Narrowed on `kind === "number"`, not a bare `{:else}`.** `cellList` is in the union and
  `ParamFields` handles it first; the explicit branch keeps that routing checkable.

### Review notes

- **The slider's "cannot produce a value its own bounds exclude" holds only for inclusive
  bounds.** `affordanceFor` uses `min ?? exclusiveMin` and `max ?? exclusiveMax` as the slider's
  ends, so a `number` spec with an exclusive bound at both ends would get a slider that can land
  exactly on an excluded end, and `slide()` commits without calling `admits`. No registered
  parameter has two exclusive bounds today (`cellsPerFeature` is `exclusiveMin` only and gets a
  number field). (possible bug, latent) **Fixed in 0.8.1:** `slide()` checks `admits` before
  committing.
- **The readout marks only `exclusiveMin` as open.** An `exclusiveMax` is shown with `]`. (possible
  bug, latent; no registered spec uses `exclusiveMax`) **Fixed in 0.8.1:** `rangeLabel` brackets
  each end on its own.
- **`pending` and `commit` disagree on blank text.** `commit` refuses `""` explicitly, but
  `pending` evaluates `Number("")`, which is `0`; for a spec that admits `0`, an emptied box is not
  marked pending. (inconsistency)
- The exact field keeps its `draft` text until blur. Dragging the slider without leaving the exact
  field first leaves the field showing the old typed text. (inconsistency, minor)
