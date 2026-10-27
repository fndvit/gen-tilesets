---
title: breakpoints.ts
description: What the Tileset component does with responsive rules. A per-shape grid cache, the height reserved before measurement, and two development warnings.
sidebar:
  order: 5
---

**Written from:** `packages/tileset/src/render/breakpoints.ts`, `breakpoints.test.ts`, and the call
sites in `render/Tileset.svelte`.

## Overview

A tileset file can carry responsive rules: "below 500 px wide, use 9 columns and 14 rows", and so
on. A host can also pass its own rules. This module holds the parts of rule handling that the
component needs and that can be tested without a component.

There are four of them. A small cache keeps one generated grid per grid size, so dragging a window
back and forth across a breakpoint does not regenerate every time. A function writes the CSS that
reserves the right height for each width band before anything has been measured, so the page does
not jump on a phone. A detector notices when a breakpoint keeps flipping on its own (usually because
adding rows adds a scrollbar, which narrows the page back across the breakpoint). A last check finds
rules that change nothing visible. All of this sits between the file and drawing:
file → load → **choose a shape** → generate → draw.

## In detail

### Purpose

The header states the whole cost model as a table:

| The resolved shape changes… | Work |
| --- | --- |
| nothing (the width moved inside a band) | none: `activeKey` is unchanged |
| `cellSize`, `bleed`, `yOffset`, sizing, align | geometry and paint; `config` is the same object |
| `rows` or `columns` | one `generate()` per shape never seen before (`GridCache`) |

### Public surface

Only `reservationCss` is re-exported from `render/index.ts:67`. The others are used by
`<Tileset>` and the tests.

| Export | Signature | Meaning |
| --- | --- | --- |
| `GridCache` | class: `get(base, config, seed, loadSalt) → Grid<TileState>`, `generations` | One grid per `(rows, columns)`. |
| [`reservationCss`](/api/render/functions/reservationcss/) | `(id, file, rules: HostRule[], base) → string` | The pre-measurement height, per band, as CSS. |
| `FlipFlop` | class: `constructor(limit = 4, windowMs = 1000)`, `record(key, now) → boolean` | True once, the first time the key alternates like a loop. |
| `inertCellSizeRules` | `(rules, base) → number[]` | Indices of rules that change only `cellSize` and hold only where fluid. |

`base` is `{ sizing, alignX, alignY }`, the host's options before any rule.

### Inputs → outputs

**`GridCache.get`** clears everything when `base` (by identity), `seed` or `loadSalt` changes. It
then looks up `` `${rows}x${columns}` `` and calls `generate(config, seed, loadSalt)` on a miss,
counting `generations`.

**`reservationCss`** builds, for a selector
`[data-tileset-wrapper="ID"]>[data-tileset-box]:not([data-measured])`:

1. The base value, unconditionally and first.
2. Every distinct `minWidth`/`maxWidth` as a sorted bound list. For each bound `b` (with previous
   bound `prev`): an open band below it, `width < b` for the first (skipped when `b` is 0), or
   `prev < width < b` sampled at the midpoint; then the inclusive point `width: b`.
3. `width > last`, sampled at `last + 1`.

Each band's value runs the same cascade the component runs: `reshape(file, ruleOverride(active))`
and `renderOverride(base, active)`. It is `height: naturalHeight px` where the band is fixed, else
`aspect-ratio: naturalRatio`.

**`FlipFlop.record(key, now)`** ignores a repeat of the last key, keeps the changes within
`windowMs`, and returns true once if the last `limit` changes alternate between exactly two keys.

**`inertCellSizeRules`** flags a rule that sets `cellSize` and none of `rows`, `columns`, `bleed`,
`yOffset`, if every band (from `bandWidths`) where it is active resolves to `"fluid"`.

### Invariants

- **`(rows, columns)` is a sufficient key** under one `(base, seed, loadSalt)`: a config `reshape`
  derives differs from its base only in `rows` and `columns`, and `generate()` is pure (cited as
  **G1**), so two derived configs of the same size give equal grids.
- **One query per band, not per rule.** A band's value is a property of the whole cascade.
- **The reservation retires at the first measurement** (`:not([data-measured])`). After that the box
  takes its height from its content; a ratio left standing would override that height because the
  box clips.
- **Nothing a page author types reaches the stylesheet.** Every value is a number from a validated
  rule, and `id` is `$props.id()`'s.
- **The detector does not hold the picture.** Hysteresis would make the picture depend on history;
  the picture stays a pure function of width.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:354-356` | `gridCache.get(checked.config, config, effectiveSeed, loadSalt)`. |
| `render/Tileset.svelte:313-317, 1267` | `reservationCss(uid, checked, rules, base)` into a `<style>` via `{@html}`, only when rules exist. |
| `render/Tileset.svelte:321-332` | `FlipFlop.record(ruleKey, performance.now())`, `DEV` only, then `console.warn` naming `scrollbar-gutter: stable`. |
| `render/Tileset.svelte:333-343` | `inertCellSizeRules`, `DEV` only, through `WarnOnce`. |

Callees: `generate`; `activeRules`, `bandWidths`, `ruleOverride` (`../responsive.ts`); `reshape`
(`../shape.ts`); `naturalHeight`, `naturalRatio` (`geometry.ts`); `renderOverride` (`options.ts`).

### Tests: `breakpoints.test.ts`

- **`GridCache`:** generates once per shape however often a breakpoint is crossed; returns the
  identical grid for a seen shape; does not regenerate for a density-only change; starts over when
  the base config, seed or loadSalt changes.
- **`reservationCss`:** the base comes first, unconditionally; each band gets the ratio its cascade
  resolves (`width < 500px`, `500px < width < 900px`, `width: 500px`, `width > 900px`); a band made
  fixed reserves a `height`; every rule carries `:not([data-measured])`.
- **`FlipFlop`:** fires once for an oscillation; stays quiet for an ordinary drag across two
  breakpoints; ignores a repeated key.
- **`inertCellSizeRules`:** flags a fluid cellSize-only rule; not where a rule (or the base) makes it
  fixed; not when it also changes `columns`.

### Gotchas & rejected alternatives

- **Why reserve per band at all.** Without it the box would reserve the base shape's ratio and jump
  at the first measurement: a layout shift "on every phone load of a page whose hero has more rows
  on a phone, which is the headline use of rules". The server cannot pick a rule because it does
  not know the width; a container query can.
- **The base comes first** "for a browser without container queries".
- **Why cellSize-only rules are inert under fluid.** A cell is `Wpx · cellSize / referenceWidth`,
  and `reshape` keeps the bleed in cells, so `referenceWidth` scales with `cellSize` and the two
  cancel. Under fluid the density knob is `columns`.

### Review notes

- `GridCache`'s comment says "It holds at most one grid per band". The cache is keyed by
  `(rows, columns)` and never evicts, so it holds one grid per distinct *shape* seen, which can be
  fewer than the bands but is not bounded by them (for example after the host replaces its rules
  without changing base, seed or loadSalt).
