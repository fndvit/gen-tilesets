---
title: blends.ts
description: The three registered Blends, the closed Target table, and acceptedBlends, which derives which Blend may go with which Target.
sidebar:
  order: 25
---

**Written from:** `packages/tileset/src/registry/blends.ts`, `mapping.test.ts` (the block that
covers it), `apps/editor/src/blend.test.ts`, and the call sites in `generate.ts`, `validate.ts`
and the editor.

## Overview

A Blend says how an operation's new value combines with what the cell already has. Operations run
in order, and several can write to the same property of the same cell, such as its rotation. A
Blend decides whether the new value replaces the old one (`set`), adds to it (`add`), or multiplies
it (`multiply`).

The file also lists the Targets: the properties an operation can write. These are the tile itself
and seven numeric properties (scale, rotation, opacity, translation and so on). Each Target
declares which kind of value it holds, its default Blend, and any Blend that makes no sense for it.
From that, the file works out which Blends each Target accepts.

In the pipeline it sits at the end of each operation's work on a cell: select, take the Source
value, map it, then blend it into the cell. The validator uses the same table to reject a file
that pairs a Target with a Blend it does not accept, and the editor uses it to offer only valid
choices.

## In detail

### Purpose

`blends.ts` creates the `blends` registry, registers the V1 Blends, defines `TARGETS`, and derives
each Target's accepted set. The direction is deliberate: **a Blend declares the Target types it
accepts; a Target declares its type, its default Blend and its vetoes** (cites **O7**, ADR-001).
The header explains the inversion: Targets are closed, so if Targets listed their Blends, a Blend
registered later would be accepted by nothing. With the inversion, a new `numeric` Blend is
available on every numeric Target at once, and the veto list is where it is withheld.

### Public surface

All exported from `index.ts:93–101`.

| Symbol | Kind | Meaning |
| --- | --- | --- |
| [`blends`](/api/index/variables/blends/) | `Registry<BlendRegistration>` | The table. |
| [`BlendRegistration`](/api/index/interfaces/blendregistration/) | interface | `{ name, params: Record<string, never>, accepts: TargetType[], impl(v, previous) }` |
| [`BlendValue`](/api/index/type-aliases/blendvalue/) | `number \| string \| null` | A mapped or accumulated value. |
| [`TARGETS`](/api/index/variables/targets/) | `Readonly<Record<TargetName, TargetSpec>>` | The closed Target table. |
| [`TargetSpec`](/api/index/interfaces/targetspec/) | interface | `{ type: TargetType, default: BlendName, vetoes: BlendName[] }` |
| [`acceptedBlends`](/api/index/functions/acceptedblends/) | `(target) → BlendName[]` | Every Blend whose `accepts` includes the Target's type, minus its vetoes, in registration order. |
| [`isAccepted`](/api/index/functions/isaccepted/) | `(target, blend) → boolean` | `acceptedBlends(target).includes(blend)`. |

### The registered Blends

Blends take no parameters (`params: {}`).

| Name | Params | Accepts | Computes `impl(v, previous)` |
| --- | --- | --- | --- |
| `set` | none | `numeric`, `tile` | `v` |
| `add` | none | `numeric` | `previous + v` |
| `multiply` | none | `numeric` | `previous × v` |

Deliberately absent: `subtract` and `divide` (a signed or reciprocal range already expresses them:
`add` with `range: [-5, -5]` subtracts five), and `min`/`max`, left as an extension point. The
source works the case for them in advance: if they arrive, `rotation` must veto both, because
`min(350°, 10°)` is `10°` although `350°` is ten degrees anticlockwise of `10°`.

### The Targets

| Target | Type | Default | Vetoes | Accepted (derived) |
| --- | --- | --- | --- | --- |
| `tileId` | `tile` | `set` | none | `set` |
| `scale` | `numeric` | `set` | none | `set`, `add`, `multiply` |
| `scaleX` | `numeric` | `set` | none | `set`, `add`, `multiply` |
| `scaleY` | `numeric` | `set` | none | `set`, `add`, `multiply` |
| `rotation` | `numeric` | `set` | `multiply` | `set`, `add` |
| `opacity` | `numeric` | `set` | none | `set`, `add`, `multiply` |
| `translateX` | `numeric` | `set` | none | `set`, `add`, `multiply` |
| `translateY` | `numeric` | `set` | none | `set`, `add`, `multiply` |

Why the vetoes are what they are, per the comments:

- **`rotation` vetoes `multiply`**: arithmetically defined but meaningless under a wrapping domain,
  so vetoed "rather than left as a trap".
- **`scale` has no veto**: two Operations each scaling by 0.9 should compose to 0.81, which is what
  `multiply` means.
- **`translateX`/`translateY` have no veto**: `add` is the natural Blend (jitter). `multiply` is a
  no-op on a fresh cell, because the default is `0`, but it damps or amplifies a translation an
  earlier Operation wrote. The editor surfaces the no-op by drawing the track.

### Inputs → outputs

`acceptedBlends(target)` reads `TARGETS[target]`, filters `blends.all()` by `accepts` and
`vetoes`, and returns names in registration order. It calls `TARGETS[target]` unguarded, so an
unknown target throws on `.type` of `undefined`; callers pass a known `TargetName`.

The `impl` functions cast blindly: `add` and `multiply` assume both values are numbers. That is
safe because only `set` accepts the `tile` type and `validate()` enforces the pair.

### Invariants

- **O7:** an Operation pairing a Target with a Blend outside its accepted set is invalid.
- **Derived, not asserted.** The accepted set is computed from the registry, which is why
  `validate()` checks the pair "against the table, not against prose".
- **X2:** adding a Blend obliges a review of every Target's veto list. Forgetting does not error;
  it ships a control that produces nonsense. The `scale` and translate comments record that review
  being done.
- **Targets are closed**: they follow the attributes.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `generate.ts:78` | `blends.get(op.blend)` once per Operation |
| `generate.ts:134`, `generate.ts:140` | `blend.impl(v, previous)` for `tileId` and for numeric attributes |
| `validate.ts:397` | `TARGETS[target].type` chooses the mapping shape |
| `validate.ts:642` | `acceptedBlends(target)` for `INVALID_TARGET_BLEND` |
| `apps/editor/src/draft.svelte.ts:178–179, 205` | `isAccepted` and `TARGETS[target].default` when retargeting; `isAccepted` in the completeness gate |
| `apps/editor/src/controls/BlendControl.svelte:34–35, 48` | `acceptedBlends`, `TARGETS[target].default`, `.type` |
| `apps/editor/src/controls/mapping.ts:145` | `TARGETS[target].type === "tile"` |
| `apps/editor/src/lib/OperationStack.svelte:98` | `TARGETS[op.target].type` to decide whether to show the Blend |
| `apps/editor/src/lib/OperationDraft.svelte:307` | `TARGETS[target].type` as a label |
| `index.ts:93–101` | re-export |

Callees: `Registry` (`registry.ts`); types `BlendName`, `TargetName`, `TargetType` (`types.ts`).

### Tests

There is no `blends.test.ts`. The file is covered by `mapping.test.ts`, block "Blends and Targets —
04 §7.2, ADR-001":

- Exactly `add`, `multiply`, `set` registered, with the `accepts` lists above.
- The full accepted-set table, row by row, for all eight Targets.
- `rotation` rejects `multiply` and accepts `add`; `tileId` accepts only `set`.
- Every Target's default is `set`.
- Registering a test numeric Blend (`__test_min`) adds it to `opacity` and leaves `tileId` at
  `["set"]`. This writes into the shared registry (see Review notes).
- `set`, `add` and `multiply` compute correctly, and `add` with a negative value subtracts.

`apps/editor/src/blend.test.ts` covers the editor's use: retargeting keeps or replaces a Blend,
the completeness gate refuses a Blend outside the set or unregistered, and a later Blend appears
on every numeric Target. `validate.test.ts` covers the pairs through `INVALID_TARGET_BLEND`.

### Gotchas & rejected alternatives

- **Targets enumerating their Blends** was the original reading. It gave the same table but left
  any later Blend accepted by nothing.
- **A Blend is a bare string in a file**, not a tagged object: no Blend takes parameters.

### Review notes

- `blends.ts:29`, the doc comment on `BlendValue`, says *"Numeric for four Targets, a tileId for
  one"*. `TARGETS` now holds seven numeric Targets and one tile Target. Stale.
- `mapping.test.ts:291` says the `__test_min` registration test is *"deliberately last"* because
  it writes into the shared registry. It is not last: "computes the V1 Blends correctly"
  (`mapping.test.ts:304`) runs after it. That test only calls `blends.get` on the three V1 names,
  so it still passes, but the comment's guarantee does not hold, and any test that enumerated
  `blends` after that point would see a fourth Blend.
