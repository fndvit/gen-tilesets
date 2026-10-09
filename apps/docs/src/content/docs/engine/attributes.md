---
title: attributes.ts
description: The closed attribute table. Each attribute's default and bounding, the fresh cell, and the one write path that bounds per write.
sidebar:
  order: 8
---

**Written from:** `packages/tileset/src/attributes.ts`, `attributes.test.ts`, and the call sites in
`generate.ts` and `apps/editor/src/controls/mapping.ts`.

## Overview

The attributes module lists the numbers each cell carries besides its tile: uniform scale, scale on
each axis, rotation, opacity, and horizontal and vertical offset. For each one it says what value a
fresh cell starts at and what happens when an operation pushes it out of range. Opacity is held
between 0 and 1, rotation wraps around at 360, and the rest are left open.

It also provides the one function the generator uses to write such a number into a cell. That
function throws away results that are not real numbers and applies the range rule immediately, at
every step, so a cell's value is always legal partway through the stack.

It is used inside generate, at the start of each cell and at every operation step that writes an
attribute.

## In detail

### Purpose

The header explains why attributes are not normalized: a normalized `scale` needs a maximum, and
any maximum is a design constant the engine may not know. Instead each attribute declares a
default and a bounding behaviour (**D4**). The domain is **capacity, not range**: the window an
Operation actually uses is a property of the Operation's mapping, which is what lets `scaleX` stay
open while one Operation varies it between 0.9 and 1.1.

### Public surface

| Symbol | Kind | Notes |
| --- | --- | --- |
| [`Bounding`](/api/index/type-aliases/bounding/) | type | `"clamp" \| "wrap" \| "none"` |
| [`AttributeSpec`](/api/index/interfaces/attributespec/) | interface | `{ default, bounding, min?, max? }`; `min`/`max` present for `clamp` and `wrap` |
| [`ATTRIBUTES`](/api/index/variables/attributes/) | `Readonly<Record<AttributeName, AttributeSpec>>` | The table below |
| [`ATTRIBUTE_NAMES`](/api/index/variables/attribute_names/) | `AttributeName[]` | `Object.keys(ATTRIBUTES)` |
| [`initialTileState`](/api/index/functions/initialtilestate/) | `() → TileState` | `tileId`/`assetId` null, every attribute at its default |
| [`bound`](/api/index/functions/bound/) | `(spec, value) → number` | Applies the bounding |
| [`writeAttribute`](/api/index/functions/writeattribute/) | `(state, attr, value) → void` | Mutates `state[attr]` |

| Attribute | Default | Bounding | Domain |
| --- | --- | --- | --- |
| `scale` | 1 | none | open |
| `scaleX` | 1 | none | open |
| `scaleY` | 1 | none | open |
| `rotation` | 0 | wrap | `[0, 360)` |
| `opacity` | 1 | clamp | `[0, 1]` |
| `translateX` | 0 | none | open |
| `translateY` | 0 | none | open |

### Inputs → outputs

- `bound` with `"none"` returns the value; `"clamp"` returns `min(max(v, min), max)`; `"wrap"`
  uses a true modulo, `((v - min) % span + span) % span + min`, so `-10` → `350` and `360` → `0`.
- `writeAttribute` returns early on a non-finite value, leaving the previous value in place;
  otherwise it stores `bound(ATTRIBUTES[attr], value)`.

### Invariants

- **The set is closed (D7).** Attributes cannot be registered at runtime; an addition is a schema
  change.
- **D6: a non-finite Blend result is discarded.** `scaleX`/`scaleY` are unbounded, so a
  multiplying Blend can overflow, and JSON cannot encode `NaN` or `Infinity`. The grid must stay
  serializable.
- **D5: bound on every write, never once at emit.** The worked example in the comment:
  `opacity 1, add 0.5, multiply 0.5` gives `0.5` per-write (`1 → clamp(1.5) = 1 → 0.5`) but `0.75`
  if bounded at emit.
- **Defaults belong to the attribute, never to the Tile**, which keeps step 1 of generation
  well-defined before any `tileId` exists (comment in `generate.ts`).
- **Translate's default is the identity**, so every file without a translate Operation draws as
  before.

### Callers / callees

| Symbol | Caller |
| --- | --- |
| `initialTileState` | `generate.ts:115` |
| `writeAttribute` | `generate.ts:143` |
| `bound` | `attributes.ts:129` (inside `writeAttribute`) |
| `ATTRIBUTES` | `attributes.ts` itself; `apps/editor/src/controls/mapping.ts:115` reads `ATTRIBUTES[target].default` |
| `ATTRIBUTE_NAMES` | No caller found, tests included. |

### Tests: `attributes.test.ts`

- Every attribute declares a domain, a default and a bounding; opacity defaults to 1; a fresh cell
  has `tileId: null`.
- `scale` is unbounded; opacity clamps to `[0, 1]`; rotation wraps with a true modulo, and `360`
  wraps to `0`.
- `writeAttribute` discards a non-finite result, emits only finite values, bounds after every write
  (the D5 worked example), and keeps the value in-domain at every point in the stack.

### Gotchas & rejected alternatives

- **`%` is a remainder, not a modulo.** `-10 % 360` is `-10`. `rotation` legitimately goes negative
  (`add` over `[-5, 5]`), so `wrap` uses the double-modulo form.
- **`scaleX` and `scaleY` are separate** so that a flip is a negative value, with no boolean that
  would make every Blend declare which types it accepts.
- **`scale` composes with the axes rather than replacing them.** Two Operations on `scaleX` and
  `scaleY` hash on different channels and disagree cell by cell under a random Source; one
  attribute is the only way one number reaches both.
- **Per-write clamping is lossy, and that is accepted.** The `1.5` is gone and no later Blend can
  recover it.
- **No maximum for translate.** A tile moved far off its cell is clipped by the renderer, not
  refused here.

### Review notes

- `ATTRIBUTE_NAMES` is public surface (re-exported at `index.ts:20`) with no caller in the three
  source trees, tests included, and no test pins its contents. It may exist for external
  consumers; nothing in the source says so.
