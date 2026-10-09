---
title: angle.ts
description: sincos(), sine and cosine in degrees that are exact on the axes, shared by the gradient Source and the renderer's transform.
sidebar:
  order: 13
---

**Written from:** `packages/tileset/src/angle.ts`, the `sincos` block of `render/edges.test.ts`,
and the call sites in `registry/sources.ts`, `render/transform.ts` and `render/uniform.ts`.

## Overview

The angle module provides one small piece of arithmetic: the sine and cosine of an angle given in
degrees. The difference from the standard library is that quarter turns (0°, 90°, 180°, 270° and
their multiples) come out as exact 0, 1 and −1, instead of values a hair away from them.

That matters in two places. The renderer needs a tile turned by 90° to land exactly on its cell,
and the gradient source needs a vertical sweep to reach exactly 0 and 1 at its ends. Both need the
same exact answer, so the function lives here, in engine code, where both can reach it.

It is used inside generate (by the gradient source) and inside draw (by the tile transform).

## In detail

### Purpose

`angle.ts` exports `sincos(degrees)`. Multiples of 90 are read from a quadrant table; every other
angle goes through `Math.sin`/`Math.cos` unchanged, so no non-axis angle moves by an ulp.

### Public surface

| Function | Signature | Exported from |
| --- | --- | --- |
| [`sincos`](/api/index/functions/sincos/) | `(degrees: number) → { sin: number; cos: number }` | `index.ts:71`, and from `/render` via `render/transform.ts:101` → `render/index.ts:101` |

### Inputs → outputs

| Input | Result |
| --- | --- |
| finite, `degrees % 90 === 0` | Quadrant `((degrees / 90) % 4 + 4) % 4` → `{0, 1}`, `{1, 0}`, `{0, -1}`, `{-1, 0}` |
| anything else (including `NaN`, `±Infinity`) | `{ sin: Math.sin(t), cos: Math.cos(t) }` with `t = degrees * π / 180` |

Negative and wrapped multiples work: `-90` → quadrant 3, `450` → quadrant 1.

### Invariants

- **Exact zero on the axes.** `Math.cos(90 * Math.PI / 180)` is `6.12e-17`. The renderer's
  quarter-turn cells must land exactly on their cell boxes, and the identities `edges.ts` relies
  on need the zero to be a real zero.
- **Legal engine code.** It touches no DOM, measurement or asset.
- **Dependency direction is render → engine, never the reverse.** That is why the function moved
  here instead of `registry/sources.ts` importing it from `render/transform.ts`.

### Callers / callees

| Caller | Line |
| --- | --- |
| `registry/sources.ts` | `:29` import, `:247` in `gradient`: `const { sin: dy, cos: dx } = sincos(p.angle)` |
| `render/transform.ts` | `:19` import, `:101` re-export, `:119` and `:213` with `attrs.rotation` |
| `render/uniform.ts` | `:73` import (via `transform.js`), `:561` with `attrs.rotation` |
| `render/index.ts` | `:101` re-export |

No caller in `apps/editor/src` or `apps/demo/src`. No callees beyond `Math`.

### Tests

No `angle.test.ts`. `render/edges.test.ts` (*"sincos — exact on the axes, Math elsewhere"*)
imports it through `render/transform.ts` and asserts:

- exact results at 0, 90, 180, 270, 360, −90, −270 and 450;
- `Math` results to the ulp at 45, 1, −12.5, 359.9 and 89.999.

It is also used, not asserted, in `render/occlusion.test.ts`, and referenced by comments in
`render/uniform.test.ts`, `render/sizing.test.ts` and `registry/registry.test.ts`.

### Gotchas & rejected alternatives

- **Why `gradient` needs it as much as the renderer.** With `cos(90°) = 6.12e-17`, a vertical
  sweep's extremes come out `2.47e-17` and `0.9999999999999994`, so a `range: [0, 1]` gradient
  would not quite reach either end. A single-row extent is worse: the stray column term gives it a
  non-zero span, so it returns a gradient across a band with nothing to sweep.
- **Rejected: copying the quadrant table** into the Source. Two copies would drift.
- **Rejected: importing it from `render/`** into the engine, which would invert the package's
  dependency direction for one helper.
- **`%` keeps the dividend's sign**, so a negative angle lands in −3..0; adding 4 before the second
  `%` folds it into the table.

### Review notes

None found.
