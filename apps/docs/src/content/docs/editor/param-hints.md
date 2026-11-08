---
title: param-hints.ts
description: What each of a Source's params does, for the hint on its label.
sidebar:
  order: 47
---

**Written from:** `apps/editor/src/controls/param-hints.ts` and `controls/param-hints.test.ts`.

## Overview

A param's label has a hint that opens on hover. It always said what range the param accepts.
Since item 12 it can also say what the param does: "Cells per feature" explains that it sets the
patch size, and "Octaves" that it makes the middle entries more common. The words are kept here, by
Source type and then by param name, because a param name alone (`octaves`) does not say which
Source it belongs to.

A param with no entry keeps the range hint alone, so a Source registered later needs no change here
(**E9**).

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `SOURCE_PARAM_HINTS` | `Record<sourceType, Record<param, string>>` | The words. Only `valueNoise` has entries. |
| `sourceParamHints` | `(sourceType: string \| null) => Record<string, string>` | One Source's hints; empty for none. |

### Callers

`lib/operations/OperationBody.svelte` passes `sourceParamHints(draft.sourceType)` to
[ParamFields](/editor/param-fields/) as `hints`, which gives each
[ParamControl](/editor/param-control/) its `about`. The hint then reads "*about* Accepts *range*."

### Tests

`controls/param-hints.test.ts`: every key names a registered Source and one of its real params, so
a renamed param fails here; Noise's two params are both explained; an unexplained Source gets none.
