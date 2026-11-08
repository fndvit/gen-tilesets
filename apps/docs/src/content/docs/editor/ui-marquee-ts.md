---
title: ui/marquee.ts
description: The console strip's timing, distance over a constant speed.
sidebar:
  order: 72
---

**Written from:** `apps/editor/src/lib/ui/marquee.ts` and `lib/ui/marquee.test.ts`.

## Overview

`marquee.ts` works out how long the console strip takes to scroll its text once. The speed is
fixed, so a longer summary takes longer rather than moving faster.

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `marqueeDuration` | `(distancePx, pxPerSecond) => number` | Seconds; `0` means do not animate. |

It returns `0` unless both arguments are positive numbers (so `NaN` gives `0` too).

### Callers / callees

Caller: `lib/ui/Marquee.svelte`. No callees.

### Tests

`lib/ui/marquee.test.ts`: distance over speed, and `0` for no overflow, a negative distance, a zero
speed and `NaN`.
