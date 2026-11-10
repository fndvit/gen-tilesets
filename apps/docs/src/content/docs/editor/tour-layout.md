---
title: tour-layout.ts
description: The onboarding tour's geometry. Which elements a step cuts out, the cut-outs, scrolling to a target, and where the step's bubble goes.
sidebar:
  order: 96
---

**Written from:** `apps/editor/src/tour-layout.ts`, `tour-layout.test.ts`, and its caller `lib/Tour.svelte`.

## Overview

The tour (B-017) points at a part of the editor through a hole in a dark scrim, with a bubble of
text beside it. [Tour.svelte](/editor/tour-dialog/) measures the DOM; this module turns the numbers
into the holes, the scroll and the bubble's place. It is pure, so it is tested (CLAUDE.md, Testing).
The rules are DESIGN_SYSTEM.md § "Onboarding: the tour", "The scrim and the cut-out" and
"Placement".

## In detail

### Public surface

| Export | Kind | Meaning |
| --- | --- | --- |
| `resolveTargets(step, find)` | function | The elements a step cuts out. `find` looks a `TargetKey` up (a `data-tour` query in the app). When the first target is missing, the step's `fallback` alone; otherwise whatever was found. |
| `oneWindow(boxes, viewport)` | function | Whether the boxes' span fits the window. When it doesn't, `Tour.svelte` cuts out the step's `alone` target instead (step 6 stacked). |
| `cutout(box, pad)` | function | The box grown by `pad` (`--space-2`) on every side: the hole. |
| `clip(box, within)` | function | The part of `box` inside `within`: a target's visible part in its scroller. |
| `scrollDelta(view, target, topInset)` | function | The px to scroll so `target` shows below `topInset`. Negative scrolls up. |
| `placeBubble(input)` | function | `{ top, left, width }` for the bubble. |
| `aboveOrBelow(anchor, height, viewport, margin)` | function | The bubble's top under or over a cut-out. |

`placeBubble` takes the window, the sidebar's box, the holes (the one the text is about first),
the width (`--explainer-w`), the margin (`--space-4`), the gutter (16px), `inSidebar` (step 6) and
`heightAt(width)`, which `Tour.svelte` answers by setting the bubble's width and reading its height.

### Behaviour

- **Two columns:** beside the sidebar, level with the first hole, kept inside the window, through
  `placeBeside` in [popover.ts](/editor/ui-popover-ts/), as the Explainer is placed. Whether
  there are two columns is measured, not the 40rem media query: is there room for the bubble right
  of the sidebar?
- **Step 6 in two columns** (`inSidebar`): in the sidebar column, left-aligned with the card, so it
  doesn't cover the picture that is the step's second hole.
- **Stacked, or no room beside:** the window's width less the gutters.
- **Above or below:** below the hole if it fits, else above it, else at the window's bottom.
- **`scrollDelta`** is `revealDelta`'s rule from [reveal.ts](/editor/ui-reveal-ts/) going down (the
  bottom into view, never the top out of it), and it also goes up.

### Tests

`tour-layout.test.ts`: targets found, with a fallback, and with neither; `oneWindow` for one box, two in two columns, two stacked, and too wide; the cut-out; `clip`, and a
box wholly outside; `scrollDelta` in view, down, past a tall target, and up under a stuck header;
`aboveOrBelow` below, above, on neither side, and taller than the window; `placeBubble` beside,
moved up inside the window, step 6 below and above its card, stacked (measured at its own width),
step 6 stacked, and a preview column too narrow for the bubble.

### Gotchas & rejected alternatives

- **Rejected: one SVG `path` for the scrim, with evenodd holes** (the O3b plan). A path's `d` can
  be transitioned only in Chromium, so the hole would jump while the bubble slid. The holes are
  `<rect>`s in a mask instead, placed in CSS, and they glide everywhere `x`/`y`/`width`/`height`
  transition.
- **Fitting on neither side goes to the bottom, not to the side with more room.** Step 6's open
  card fills the sidebar at 1440 × 900. With the bubble on the side with more room, clamped, it
  sat over the card's head, which names operation 3. At the bottom it covers the end of the
  palette instead.
- **`revealDelta` alone was not enough.** It never scrolls up, because a user who just pressed
  something has it on screen. Back on the tour returns to a target the last step scrolled past.
- **Step 6 stacked is measured, not the 40rem media query** (`oneWindow`), as two columns is.
  Stacked, the card fills the window and the picture is a window's height below it; its ring was
  off screen until O4. Rejected: the card alone (Pol), which left "outlined on the picture"
  pointing at nothing on screen.
- **A cut-out is clipped to its scroller.** Operation 4's open card is taller than the sidebar,
  and its ring ran on over the footer.
