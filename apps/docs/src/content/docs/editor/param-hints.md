---
title: param-hints.ts
description: What each of a Source's or a Selection's params does, for the hint on its label.
sidebar:
  order: 47
---

**Written from:** `apps/editor/src/controls/param-hints.ts` and `controls/param-hints.test.ts`.

## Overview

A param's label has a hint that opens on hover. It always said what range the param accepts.
Since item 12 it can also say what the param does: "Cells per feature" explains that it sets the
patch size, and "Octaves" that it makes the middle entries more common. Since B-009, Every Nth's
"N" explains that the count runs row after row, so the picture depends on the column count. The
words are kept here, by type and then by param name, because a param name alone (`octaves`, `n`)
does not say which Source or Selection it belongs to.

A param with no entry keeps the range hint alone, so a type registered later needs no change here
(**E9**).

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `SOURCE_PARAM_HINTS` | `Record<sourceType, Record<param, string>>` | The Source words. Only `valueNoise` has entries. |
| `SELECTION_PARAM_HINTS` | `Record<selectionType, Record<param, string>>` | The Selection words. Only `everyNth`'s `n` has one. |
| `sourceParamHints` | `(sourceType: string \| null) => Record<string, string>` | One Source's hints; empty for none. |
| `selectionParamHints` | `(selectionType: string \| null) => Record<string, string>` | One Selection's hints; empty for none. |

### Why Every Nth, and why on `n`

Every Nth counts cells `y · columns + x`, so with N = 3 a 10-column grid draws diagonals and a
9-column grid draws vertical stripes. Pol chose to accept that and explain it (B-009, Block 1)
rather than count against a fixed width, and this hint is the explanation. It sits on `n` because
that is the param whose picture changes with the width; `offset` only shifts it. Row/Column has no
hint: what N counts is in its name.

### Callers

`lib/operations/OperationBody.svelte` passes `sourceParamHints(draft.sourceType)` to the Pattern
step's [ParamFields](/editor/param-fields/) and `selectionParamHints(layer.type)`, the active selection layer's type
(B-033), to the Selection step's, as `hints`, which gives each [ParamControl](/editor/param-control/) its `about`.
The hint then reads "*about* Accepts *range*."

### Tests

`controls/param-hints.test.ts`: in both maps, every key names a registered type and one of its real
params, so a renamed param fails here. Noise's two params are both explained; Every Nth's `n` is
explained and names the column count. An unexplained type (`gradient`, `rowColumn`), or none,
gets none.
