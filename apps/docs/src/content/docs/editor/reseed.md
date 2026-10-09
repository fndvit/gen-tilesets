---
title: reseed.ts
description: Salt arithmetic, whether the reseed-on-load checkbox is offered, the inert-flag advisory, and drawing a load salt for the load preview.
sidebar:
  order: 8
---

**Written from:** `apps/editor/src/reseed.ts`, `reseed.test.ts`, and the call sites in
`document.ts`, `App.svelte` and `lib/OperationStack.svelte`.

## Overview

The reseed module holds the rules behind the editor's *try again* buttons. The author has four
ways to get a different picture without changing the design.

- A new **seed** changes everything.
- Rerolling **one operation** changes only that operation's randomness.
- Rerolling **assets** changes which asset (picture) each cell shows.
- **Load preview** shows what a visitor might see on a fresh page load.

The first three are saved in the file. The last one is not: it only changes what the preview
shows.

This module supplies the arithmetic for the rerolls and decides when controls should be offered
at all. A button that can provably change nothing is disabled or hidden, because a control that
appears to do nothing reads as a broken engine. It also spots operations imported with a setting
the editor would never have let the author choose. It reports them without changing them.

In the editor's pipeline, import → document → draft/history → preview → export, the document uses
it for the reroll edits, and the panels use it to decide what to show beside the preview.

## In detail

### Purpose

The header tabulates the four affordances:

| Control | Writes | Scope | Persisted |
| --- | --- | --- | --- |
| Seed | `config.defaultSeed` | everything | yes |
| Operation reroll | `Operation.salt` | that Operation's Source and Selection | yes |
| Asset reroll | `config.assetSalt` | which asset each cell shows | yes |
| Load preview | nothing (a prop) | Operations with `reseedOnLoad: true` | no |

The fourth writes no field, so it lives in editor state and reaches `<Tileset>` through
`options.loadSalt`.

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `SALT_MODULUS` | `2 ** 32` | Salts are integers in `[0, 2³²)`. |
| `nextSalt(salt)` | `(number \| undefined) → number` | `((salt ?? 0) + 1) % 2³²` |
| `isStochastic(sourceType)` | `(string) → boolean` | [`sources`](/api/index/variables/sources/)`.get(type).stochastic` |
| `offersReseedOnLoad(op)` | `(Operation) → boolean` | Whether to show the per-Operation checkbox. |
| `inertFlags(config)` | `(TilesetConfig) → Operation[]` | Operations flagged `reseedOnLoad` over a non-stochastic Source. |
| `loadVaries(config)` | `(TilesetConfig) → boolean` | Whether a fresh `loadSalt` could change anything. |
| `drawLoadSalt()` | `() → number` | `Math.floor(Math.random() * 2³²)` |

### Inputs → outputs

- **`nextSalt`** treats an absent salt as `0` and **wraps** at `2³² - 1 → 0`.
- **`isStochastic`** reads the registry declaration. An unregistered type therefore throws from
  `sources.get`, which is the registry's behaviour, not this module's.
- **`offersReseedOnLoad(op)`** is `isStochastic(op.source.type)`.
- **`inertFlags`** filters `reseedOnLoad === true && !isStochastic(source.type)`.
- **`loadVaries`** is `reseedAssetsOnLoad === true || some(op.reseedOnLoad === true)`. It asks the
  *flags*, not the Sources: a flag over a non-stochastic Source still moves that Operation's
  `random` Selection, so it counts.
- **`drawLoadSalt`** is a non-negative integer below `2³²`.

### Invariants

- **Wrap, never saturate.** A salt that saturated at `2³² - 1` would produce the failure the
  narrowing prevents on the second click: *the config visibly changes; the picture does not.*
  One that exceeded the range would do it wherever a consumer truncated.
- **Read from the registry, never a list of names.** A Source registered later declares its own
  answer. The same argument is made for Blends.
- **The correction the editor must not make.** A flag over a non-stochastic Source is not fully
  inert, because it moves the `random` Selection. So the control is hidden, but a flag already set
  (reachable only by import) is **left alone and reported**. Under **E16** that advisory never
  blocks, never modifies the file, and is never an error.
- **Load preview is disabled when nothing is flagged.** A config with every flag false is
  byte-identical on every load regardless of `loadSalt`.
- **No `| 0`.** `Math.random() * 2**32 | 0` coerces to int32 and is negative half the time. Nothing
  would catch it, because this value is never stored.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `document.ts:59`, `:366`, `:382` | `nextSalt` in `rerollOperation` and `rerollAssets` |
| `App.svelte:181` | `loadVaries(config)`, which enables the load-preview button (`:717`) |
| `App.svelte:182` | `inertFlags(config)` for the advisory |
| `App.svelte:717` | `loadSalt = drawLoadSalt()` |
| `lib/OperationStack.svelte:221` | `offersReseedOnLoad(op)` gates the checkbox |

`isStochastic` is used only inside this module (`:68`, `:84`). `SALT_MODULUS` is used inside this
module and in `reseed.test.ts`.

Callees: [`sources`](/api/index/variables/sources/) from the engine; `Math.random`.

### Tests: `reseed.test.ts`

- **Salt wrap.** Increments by one, absent → 1, `SALT_MODULUS - 1` → 0, and stays in range for edge
  values.
- **Reroll transitions** (from `document.ts`). One Operation's salt moves and others do not.
  `rerollAssets` disturbs no Operation. Neither touches the seed or layout.
- **Offered from the registry.** Offered for `random` and `valueNoise`, withheld for `constant`
  and `gradient`, and a boolean for every registered Source.
- **Reported, not cleared.** `inertFlags` names the flagged non-stochastic Operation, and
  `setReseedOnLoad` still writes the flag.
- **`loadVaries`.** False with no flags, true with any Operation flag, true with only the asset
  flag, and true for a flag over a non-stochastic Source (while `inertFlags` also reports it).
- **`drawLoadSalt`.** Over many draws it is an integer in `[0, 2³²)`, and it draws more than one
  value.

### Gotchas & rejected alternatives

- **Every Operation is offered a reroll**, not only stochastic ones (see `rerollOperation` in
  [document.ts](/editor/document/)). A `random` Selection consumes the salt even under a
  `constant` Source.
- **The asset reroll does not move any `tileId`.** The asset channel is separate, so only the
  asset within each Tile changes.

### Review notes

None found.
