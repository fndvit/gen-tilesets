---
title: Tour.svelte
description: The onboarding tour, a modal dialog over the window. The scrim with its cut-outs and rings, the Welcome card and the step bubble, and what happens on each step.
sidebar:
  order: 97
---

**Written from:** `apps/editor/src/lib/Tour.svelte`, and the call site in `App.svelte`.

## Overview

The tour (B-017) shows on a first visit, over Collage, and from "?" (O3c). It draws the model in
[tour.ts](/editor/tour/): a Welcome card, then a bubble per step pointing at a part of the editor
through a hole in a 40% ink scrim. It only points. Next always works, and the user doesn't have to
do the step. The look is DESIGN_SYSTEM.md § "Onboarding: the tour".

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `run` | `TourRun` | `"first"` or `"replay"`. Read once: the tour starts from it. |
| `onEnd` | `() => void` | After the dialog has closed, by Done, Skip tour or Esc. |
| `returnFocus` | `HTMLElement \| undefined` | Where focus goes at the end: "?" after a replay (O3c). Absent, the Grid & size header. |

`App.svelte` holds `touring` (`TourRun | null`), seeded from its `tourRun` mount prop, and renders
the tour while it is set. `onEnd` clears it.

### Structure

- **A native modal `<dialog>`** covering the window. The top layer puts it over every popover
  with no z-index, and `showModal()` makes the editor inert, the cut-outs included. Esc is the
  dialog's `cancel`, turned into Skip tour.
- **The scrim** is an SVG over the window: one rect in `--color-scrim`, masked by a black `<rect>`
  per hole. Over each hole, a 2px ink ring with a 2px white halo outside it. The holes and rings
  are placed in CSS, so they glide to the next target over `--dur-fast`. A press on the scrim does
  nothing, and its `mousedown` is cancelled so focus stays on Next.
- **The Welcome card** is centred, `--tour-welcome-w` wide (the window less 16px on each side
  below 40rem), with Skip tour and Start tour at the right and no count.
- **The step bubble** has the title and count ("3 of 9") in its header, the text, then Skip tour
  at the left (not on the last step) and Back and Next (or Done) at the right.
- The dialog is named by the title and count and described by the text. A polite live region
  announces each later step, because focus landing on the same Next says nothing new.

### On each step

1. Leaving "An operation", close the card it opened, unsaved (`drafting.discard()`).
2. Entering it, open Collage's operation 4 through `opening.open(id, "attribute")`, as pressing the
   card's title does, if `exampleOperation` finds it. Then wait out the card's slide.
3. Find the targets by `data-tour` (`resolveTargets`, with the step's fallback). An element that
   isn't drawn counts as missing.
4. Scroll the first target into view in its scroller, below a stuck section header, then in the
   page (below 40rem the page scrolls too). Every scroll is instant: the hole and the bubble are
   what move, and measuring after a smooth scroll would have to guess when it ends.
5. Measure: each target's box, clipped to its scroller and grown by `--space-2`; then
   `placeBubble`.
6. Focus the primary button, and announce the step.

A window resize, or a `ResizeObserver` on the targets, measures again. Each step bumps a counter,
so a step still waiting out the slide can't place over the next one.

### Ending

Done, Skip tour and Esc all call `end(seenStore())`, which sets the seen flag, then close the
dialog, move focus, and call `onEnd`.

### Tests

None here: `.svelte` files can't be unit-tested (CLAUDE.md). The geometry is
[tour-layout.ts](/editor/tour-layout/) and the model is [tour.ts](/editor/tour/), both tested. The
O3b browser probe walked both runs at 1440 × 900 and 375 × 800, Esc, Back and Esc on step 6, a
press on the scrim and in a cut-out, Tab, and axe-core.

### Gotchas & rejected alternatives

- **`show` runs untracked.** It reads the file and the draft, and opening the card changes the
  draft, so a tracked effect would run the step again.
- **The holes in an SVG mask measure as 0 × 0** with `getBoundingClientRect`. A probe has to read
  the rings.
- **The card the tour opened is the only one it closes.** `opened` is set only when the draft that
  results is that operation's edit draft.
