---
title: controls/mapping.ts
description: Authoring tracks for each numeric attribute, the typed-entry rule, the no-op default mapping, and the rotation wrap check.
sidebar:
  order: 52
---

**Written from:** `apps/editor/src/controls/mapping.ts`, `controls/mapping.test.ts`, and the call
sites in `controls/NumericMapping.svelte`, `lib/OperationDraft.svelte` and `draft.svelte.ts`.

## Overview

This module holds the numbers behind the range control in the operation draft. For each
attribute an operation can change (scale, the two scale axes, rotation, opacity and the two
translations) it says how long the slider track is, whether the track may grow to fit a typed
value, and whether typed values are limited at all.

It also decides where a brand-new numeric operation starts. Both ends begin at the attribute's
own default, so a new operation changes nothing until the author widens the range. And it spots
one known trap: a stepped rotation whose two ends are a full turn apart, which makes one angle
come up twice as often as the others.

In the editor's pipeline (import → document → **draft**/history → preview → export), it
supplies the draft's starting mapping and the rules its controls follow.

## In detail

### Purpose

`scaleX` and `scaleY` have open domains (any finite number), yet a slider needs a finite track.
The module treats the track as "a *drawing* decision, not a domain": a **soft** track that
"extends to contain any value typed, and never clamps one". It also tells the draft which Targets
take a palette rather than a range.

### Public surface

Editor-internal; nothing here has an API page.

| Export | Signature | Meaning |
| --- | --- | --- |
| `Track` | `{ min, max, soft, typed?, wraps }` | One attribute's track. `typed` bounds typed entry; absent means any finite number. |
| `TRACKS` | `Readonly<Record<AttributeName, Track>>` | The table below. |
| `trackFor` | `(target: AttributeName, values: number[]) → Track` | A soft track widened to contain `values`. |
| `admitsTyped` | `(target: AttributeName, value: number) → boolean` | Whether a typed value may be committed. |
| `defaultNumericMapping` | `(target: AttributeName) → NumericMapping` | `{ range: [d, d] }` with `d` the attribute's default. |
| `MIN_STEPS` | `2` | The smallest legal `steps`. |
| `endpointsCoincide` | `(target: TargetName, mapping: NumericMapping) → boolean` | The rotation advisory. |
| `isTileTarget` | `(target: TargetName) → boolean` | `TARGETS[target].type === "tile"`. |

Types are the package's [`AttributeName`](/api/index/type-aliases/attributename/),
[`TargetName`](/api/index/type-aliases/targetname/) and
[`NumericMapping`](/api/index/interfaces/numericmapping/).

#### `TRACKS`

| Target | Track | Soft | Typed entry | Wraps |
| --- | --- | --- | --- | --- |
| `scale` | `[0, 4]` | yes | any finite | no |
| `scaleX` | `[−2, 2]` | yes | any finite | no |
| `scaleY` | `[−2, 2]` | yes | any finite | no |
| `rotation` | `[0, 360]` | no | any finite | yes |
| `opacity` | `[0, 1]` | no | `[0, 1]` | no |
| `translateX` | `[−1, 1]` (cells) | yes | any finite | no |
| `translateY` | `[−1, 1]` (cells) | yes | any finite | no |

### Inputs → outputs

- `trackFor`: a hard track is returned as is. A soft one gets `min = Math.min(base.min,
  ...finite)` and `max = Math.max(base.max, ...finite)`; non-finite values are ignored.
- `admitsTyped`: `false` for non-finite; `true` unless the Target has `typed` bounds, then
  inclusive.
- `defaultNumericMapping`: reads [`ATTRIBUTES`](/api/index/variables/attributes/)`[target].default`
  and **omits** `steps`.
- `endpointsCoincide`: `true` only for `rotation`, only when `steps` is set, and only when
  `|max − min|` is a non-zero multiple of 360.
- `isTileTarget`: reads [`TARGETS`](/api/index/variables/targets/).

### Invariants

- **Never clamp typed input.** "A typed `4` widens the track; it is not rewritten to `2`."
- **A new numeric Operation is a no-op.** No spec section supplies a starting range, so both ends
  are the attribute's declared default. "Filling the whole track instead would mean a new `scaleX`
  Operation flipping and doubling tiles the instant it was created."
- **`steps` absent means continuous** and is exempt from writing everything explicitly.
- **`steps >= 2`,** because the stepped formula divides by `steps − 1`.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `controls/NumericMapping.svelte:26` | `admitsTyped`, `endpointsCoincide`, `MIN_STEPS`, `trackFor` |
| `lib/OperationDraft.svelte:25`, `:313` | `isTileTarget` |
| `draft.svelte.ts:43`, `:177`, `:209`, `:217` | `defaultNumericMapping`, `isTileTarget` |
| `controls/mapping.test.ts:4`–`12` | everything |

Callees: [`ATTRIBUTES`](/api/index/variables/attributes/), [`TARGETS`](/api/index/variables/targets/).

### Tests: `controls/mapping.test.ts`

- **Tracks:** matches the table for `scale`, `scaleX`, `scaleY`, `rotation`, `opacity`; the scale
  axes reach below zero; `scale` starts at 0 but widens to a typed `−1`; soft tracks widen to
  `[−3, 4]` and admit `−50`; hard tracks do not widen; typed entry is bounded only on `opacity`;
  `NaN` and `Infinity` are refused.
- **Default mapping:** both ends equal `ATTRIBUTES[attr].default`; `steps` is absent; applying it
  at any `t` returns the default.
- **Rotation advisory:** `[0, 360] × 4` and `[90, 450] × 3` are flagged; `[0, 270] × 4` is not;
  continuous and non-rotation mappings are not; the arithmetic `0, 120, 240, 360` is confirmed.
- **Draft integration:** `isTileTarget`, `retarget`, `isComplete`, `toOperation` (see
  [OperationDraft](/editor/operation-draft/)).
- **Steps:** `MIN_STEPS === 2`; stepped `[−1, 1] × 2` reaches both ends.

### Gotchas & rejected alternatives

- **The negative half of `scaleX` / `scaleY` is load-bearing.** A flip is a negative value, not a
  boolean, so the track must reach there or flip is unreachable by dragging.
- **`scale` starts at 0.** A negative uniform scale flips both axes, which is a 180° rotation and
  `rotation`'s job. The track is soft, so a typed negative still widens it.
- **`[−2, 2]` and `[−1, 1]` are UI constants with no authority.** The comment says so for both.
- **`opacity`'s typed entry is bounded** because its domain is, and an out-of-range value would be
  clamped on the first write anyway.

### Review notes

- `mapping.test.ts:14` defines `ATTRS` as the five original attributes. `translateX` and
  `translateY` (added in 0.8.0) are absent from the track-table test, the non-finite test, the
  no-op default test and the "not a tile Target" check. (missing test)
