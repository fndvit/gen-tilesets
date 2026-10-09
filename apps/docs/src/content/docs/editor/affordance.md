---
title: affordance.ts
description: The total mapping from a parameter spec to a control kind, plus the default a fresh parameter starts at and the check a typed value must pass.
sidebar:
  order: 49
---

**Written from:** `apps/editor/src/controls/affordance.ts`, `controls/affordance.test.ts`, and the
call sites in `controls/ParamFields.svelte`, `controls/ParamControl.svelte` and `draft.svelte.ts`.

## Overview

`affordance.ts` decides what kind of control each setting of a Selection or Source gets in the
operation draft. It looks only at what a setting allows (a list of choices, a whole number, a
number with or without limits) and answers with one of four kinds: a row of buttons, a slider, a
number box, or "painted on the preview".

It also answers two smaller questions. What value should a setting start at when the author first
picks the type, if the type does not say? And is a value the author typed acceptable for that
setting? The answer to the second is yes or no; a bad value is never nudged into range.

In the editor's pipeline (import → document → **draft**/history → preview → export), it serves
the draft: it shapes the controls that edit it and supplies its starting values.

## In detail

### Purpose

The module is **E9**'s mapping: *the mapping from `ParamSpec` to affordance is total*. A registered
type that declares only a parameter schema gets a working control with no editor code. The
header comment quotes the cost of a gap: "a mapping with holes means every registered type also
requires an editor change, and the extension point is then two changes wearing one name." The rule
is stated in terms of bounds rather than as a table of widgets, so a type added later still maps.

### Public surface

Editor-internal; nothing here has an API page.

| Export | Signature | Meaning |
| --- | --- | --- |
| `Affordance` | union, below | Which control to draw. |
| `affordanceFor` | `(spec: ParamSpec) → Affordance` | Total; no fallthrough. |
| `defaultFor` | `(spec: ParamSpec) → string \| number` | A fresh parameter's value. |
| `admits` | `(spec: ParamSpec, value: unknown) → boolean` | Whether a value satisfies the spec. |

```ts
type Affordance =
  | { kind: "slider"; min: number; max: number; step: number; integer: boolean }
  | { kind: "number"; integer: boolean }
  | { kind: "segmented"; values: (string | number)[] }
  | { kind: "cellList" };
```

`ParamSpec` is the package's [`ParamSpec`](/api/index/type-aliases/paramspec/).

### Inputs → outputs

#### `affordanceFor`

| Spec | Result |
| --- | --- |
| `cellList` | `{ kind: "cellList" }` |
| `enum` | `{ kind: "segmented", values }` |
| `number` / `integer` missing either bound | `{ kind: "number", integer }` |
| `integer` with both bounds and `max − min + 1 ≤ 5` | `{ kind: "segmented", values: [min..max] }` |
| otherwise (both bounds) | `{ kind: "slider", min, max, step, integer }`; `step` is `1` for an integer, else `(max − min) / 100` |

For a `number`, the lower bound is `min ?? exclusiveMin` and the upper `max ?? exclusiveMax`. An
`integer` has only `min` and `max`.

#### `defaultFor`

1. `enum` → `spec.default ?? values[0]`.
2. `cellList` → `0` (unused; `defaultParams` in `draft.svelte.ts:124` substitutes `[]`).
3. `spec.default` if declared.
4. A lower bound: if it is **exclusive** (`number`, `exclusiveMin` set, no `min`), return
   `min + 1` when there is no upper bound, else the midpoint. Otherwise return the lower bound.
5. No lower bound: `max ?? 0`.

#### `admits`

- `cellList`: an array of `[int, int]` pairs.
- `enum`: `values.includes(value)`, strict, so `"0"` is not `0`.
- `number` / `integer`: a finite number; an integer for `integer`; within `min`/`max` inclusive and
  `exclusiveMin`/`exclusiveMax` exclusive.

### Invariants

- **Total.** Every spec the encoding admits returns an affordance.
- **`cellList` is the one non-generated case, and it is not a hole.** It is permitted "because the
  schema names it explicitly rather than because the mapping ran out".
- **Refuse, never coerce.** `admits` is a predicate. Clamping typed input would be coercion
  "performed in the one place the author is watching".
- **A default the schema does not declare is the editor's choice, not a spec default.** It exists
  because a draft has to hold something legal for the preview to keep drawing (**E5**), and it
  reaches a file only as a value the author saw and accepted.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `controls/ParamFields.svelte:12`, `:32` | `affordanceFor` |
| `controls/ParamControl.svelte:11` | `admits`, `Affordance` |
| `draft.svelte.ts:42`, `:124` | `defaultFor`, inside `defaultParams` |
| `controls/affordance.test.ts:4` | all three functions |

Callees: none at runtime. It imports only the `ParamSpec` type.

### Tests: `controls/affordance.test.ts`

- **§7.1's table:** `{0,1}` number → slider with step `0.01`; one bound or none → number field;
  integer with one or no bound → integer number field; `octaves`-like `1..3` → segmented
  `[1,2,3]`; `0..100` integer → slider with step `1`; enum → segmented; `cellList` → `cellList`.
- **`admits`:** exclusive vs inclusive bounds; non-finite refused; fractions refused for
  integers; enum strictness; `cellList` shape.
- **`defaultFor`:** prefers the schema's default; falls back to the first value the spec admits,
  and never to an excluded bound.
- **The sweep over the real registries:** pins the registered names (`all`, `cellList`,
  `checkerboard`, `everyNth`, `random`, `rect`; `constant`, `gradient`, `random`, `valueNoise`), so
  an empty registry cannot pass; for each type, every parameter gets a known kind and
  `defaultParams` produces values the schema admits; no schema declares a `type` parameter.

### Gotchas & rejected alternatives

- **The "narrow" threshold is 5.** The spec says "a stepper where narrow" without defining narrow.
  `NARROW` is recorded as a UI constant with no authority. `octaves` (1–3) is the only current
  parameter it decides. A narrow integer is rendered as the segmented row rather than a separate
  stepper widget.
- **100 slider positions** is a UI constant; typed entry is exact regardless.
- **`editor.control` hints are not implemented.** No registration declares one. The comment
  records the rule for when one does: an unrecognised hint falls back to this mapping rather than
  failing, the one place an unknown name is not an error, because it names a widget and cannot
  change the picture.

### Review notes

- `affordanceFor` treats an exclusive bound as a slider end (`min ?? exclusiveMin`), so a spec
  bounded exclusively at both ends would get a slider able to land on an excluded value. See
  [ParamControl](/editor/param-control/). No registered spec triggers it. (possible bug, latent)
- No test exercises `defaultFor` on a spec with both `exclusiveMin` and an upper bound (the
  midpoint branch). (missing test)
