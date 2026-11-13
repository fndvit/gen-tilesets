---
title: tour-preview.svelte.ts
description: How much of the file the preview draws while the onboarding tour rebuilds Mosaic. Written by the tour, read by the preview.
sidebar:
  order: 95
---

**Written from:** `apps/editor/src/tour-preview.svelte.ts`, its writer `lib/Tour.svelte`, and its
reader `App.svelte`. No test file.

## Overview

On a first visit, the [tour](/editor/tour-dialog/)'s steps 5 to 11 empty the preview and draw
Mosaic again one operation at a time (B-036). This module holds that one number: how many of the
file's operations the preview draws, or `null` for all of them.

It is a rune of its own rather than a prop through `App`, because the tour is mounted beside the
preview, not inside it, as [opening.svelte.ts](/editor/opening/) is for the same reason.

## In detail

### Public surface

`tourPreview`, an object:

| Member | What |
| --- | --- |
| `kept` | Get and set. `number \| null`: how many operations the preview draws, or `null` (no tour building). |

### Invariants

- **Only the picture reads it.** `App.svelte`'s `shown` passes the file, or the open draft's file,
  through `stagedFile` ([tour.ts](/editor/tour/)) when `kept` is set. The file, undo, advisories
  and the export never see a staged file, so the tour can't change what is saved.
- **It goes back to `null` however the tour ends:** Done, Skip tour, Esc, a step off the build, and
  the tour's unmount.

### Callers / callees

| Caller | What |
| --- | --- |
| `lib/Tour.svelte` | Sets `kept` to the step's `ops` on each step, and to `null` on finishing and on unmount |
| `App.svelte` | Reads `kept` into `shown`, the file the preview draws |

### Tests

None: the module holds a rune, which `vitest.config.ts` cannot load (the reason
[drafting](/editor/drafting/) gives). The logic is `stagedFile` in `tour.ts`, which is tested,
against the real Mosaic too.
