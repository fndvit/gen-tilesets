---
title: ui/motion.ts
description: How long a JavaScript transition lasts, read from a motion token and zero under reduced motion.
sidebar:
  order: 75
---

**Written from:** `apps/editor/src/lib/ui/motion.ts` and `lib/ui/motion.test.ts`.

## Overview

`motion.ts` gives a Svelte transition its duration. The CSS rule in `base.css` that switches
animation off under `prefers-reduced-motion` only reaches CSS transitions. Svelte's transitions
(the slide when a section or tile group folds) run in JavaScript, so they read their duration
here: the same `--dur-*` token the CSS uses, or 0 when the person asked for less motion.

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `parseDuration` | `(value: string) => number` | A CSS time (`120ms`, `0.3s`) in ms; 0 for anything else, including negative or unitless values. |
| `motionDuration` | `(element: Element, name = "--dur-fast") => number` | The token's value on `element` in ms, or 0 under `prefers-reduced-motion: reduce` or outside a browser. |

### Callers / callees

Caller: [Collapsible](/editor/ui-collapsible/) (the body's `slide`). Callees: `getComputedStyle`,
`matchMedia`.

### Tests: `motion.test.ts`

- Reads milliseconds and seconds, with surrounding spaces.
- Returns 0 for an empty string, a word, a negative time and a unitless number.
