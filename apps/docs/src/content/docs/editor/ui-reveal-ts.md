---
title: ui/reveal.ts
description: How far to scroll so that a section or group the user just opened can be seen, without its header leaving the top, and how to scroll with a fold that closes without the browser clamping it.
sidebar:
  order: 76
---

**Written from:** `apps/editor/src/lib/ui/reveal.ts` and `lib/ui/reveal.test.ts`.

## Overview

When the user opens a section or a group near the bottom of the sidebar, its content would unfold
below the visible area, behind the footer. [Collapsible](/editor/ui-collapsible/) calls this
module once the body has slid open, and the sidebar scrolls until the opened content's bottom is
in view, but never so far that its header leaves the top. A section taller than the view ends with
its header at the top. Something already fully visible does not scroll. The scroll takes
`--dur-slow` (300 ms).

Closing works the other way round (B-028). When a section closes near the bottom of the sidebar,
the content gets shorter and the browser would clamp the scroll, which made the sidebar jump. So
before the body goes, Collapsible asks `closeDrop` how far up the sidebar has to move, and
scrolls by that much over the same 220 ms (`--dur-close`) and the same curve as the fold. The
scroll then always stays ahead of the collapse.

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `Span` | `{ top, bottom }` | A vertical span in client px. |
| `revealDelta` | `(view: Span, target: Span, topInset = 0) => number` | The px to scroll down to reveal `target` in `view`; 0 for none. |
| `ScrollNode` | `{ parentElement, scrollHeight, clientHeight }` | What `scrollParent` reads, so a test can pass a plain object. |
| `scrollParent` | `(node, overflowY?) => ScrollNode \| null` | The nearest ancestor with `overflow-y: auto` or `scroll` that has something to scroll, or null. |
| `revealInScroller` | `(element, topInset, duration) => void` | Measures `element` and its scroller and scrolls by `revealDelta` with `tweenScroll` over `duration` ms on `--ease`. Does nothing outside a scroll container. |
| `closeDrop` | `(scroller: { scrollTop, clientHeight, scrollHeight }, bodyHeight) => number` | How far to scroll up so removing `bodyHeight` px never clamps the scroll: `bodyHeight` less the distance to the bottom, at least 0, at most `scrollTop`. |
| `Ease` | `(t: number) => number` | An easing curve, 0 → 0 and 1 → 1. |
| `cubicBezier` | `(x1, y1, x2, y2) => Ease` | CSS `cubic-bezier()` as a function (bisection on x, then y). |
| `parseEase` | `(value: string) => Ease` | `cubic-bezier(…)` or `linear`; anything else is CSS's `ease`. |
| `cssEase` | `(element, name = "--ease") => Ease` | The token on `element`, parsed. |
| `Scrollable`, `Frames` | `{ scrollTop }`, `{ now, request, cancel }` | What `tweenScroll` writes to and the frame clock it runs on, so a test passes plain objects. |
| `moved` | `(now, left, end) => boolean` | Whether someone else moved the scroller during a tween (see below). |
| `tweenScroll` | `(scroller, delta, duration, ease, frames?) => stop` | Scrolls by `delta` over `duration` ms, one step per animation frame; `duration` 0 jumps. Returns a function that stops it. |

- `revealDelta` is `min(hidden, room)`: `hidden` is how far the target's bottom is below the
  view's, `room` how far its top is below the view's top plus `topInset`. It is 0 when less than
  a pixel is hidden (subpixel rounding) or when there is no room, so it never scrolls up.
- `topInset` is the height of an enclosing section's sticky header, which covers the top of the
  view (T-08). A group revealed inside a section stops with its header just under it.
- `scrollParent` never returns the element itself, nor the root element, whose computed
  `overflow-y` is `visible`: the page itself is never scrolled from here.
- `closeDrop` never clamps: with `gap` the distance to the bottom, at fold progress `e` the scroll
  has moved `(bodyHeight − gap)·e` while the maximum fell by `bodyHeight·e`, leaving `gap·e ≥ 0`.
- `tweenScroll` writes the exact end value on its last step. A new tween on the same scroller
  stops the running one. It stops by itself when `moved` says someone else scrolled: more than a
  pixel from where its last step left it, against its own way or past its end. A move along its
  way, up to its end, is the browser clamping a frame early, and the tween keeps going.
- In a browser its clock is `document.timeline.currentTime`, the clock of the fold's Web
  Animation and of every `requestAnimationFrame` timestamp. `performance.now()` is later than the
  frame's start, so a tween timed by it ran up to a frame behind the fold.

### Callers / callees

Caller: [Collapsible](/editor/ui-collapsible/): `revealInScroller` on its body's `introend`,
only after the user opened it from its own header; `closeDrop`, `tweenScroll` and `cssEase` when
the user closes it. `tour-layout.ts` uses `revealDelta`; `Tour.svelte` uses `scrollParent`.
Callees: `getComputedStyle`, `getBoundingClientRect`, `requestAnimationFrame`,
`document.timeline`.

### Tests: `reveal.test.ts`

- No scroll for a fully visible target; scrolls a hidden bottom into view.
- A target taller than the view stops with its top at the view's top, or under a `topInset`.
- Never scrolls up, nor a target whose top is already at or above the top; ignores subpixel
  overflow.
- `scrollParent` finds the nearest scrolling ancestor, skips one with nothing to scroll and a
  clipping one, never returns the element itself, and is null outside any scroller.
- `closeDrop`: 0 when the scroller is far enough from its bottom; the body less the gap when
  nearer; never past the top; and, along `--ease`, the scroll stays at or under its maximum on
  every step of a fold.
- `cubicBezier` and `parseEase`: exact at 0 and 1, the identity on a straight curve, the token's
  text parsed, an unknown value read as `ease`.
- `tweenScroll` on a fake frame clock: starts where the scroller is and ends exactly at
  `start + delta`; scrolls up along the given curve; jumps with no duration; stops when moved;
  keeps going when clamped along its way; tolerates whole-pixel rounding; replaces a running tween;
  stops where it is. `moved` on its own: subpixel, against the way, past the end, along the way.

### Gotchas & rejected alternatives

- **Not `scrollIntoView({ block: "nearest" })`.** For an element taller than the view it aligns
  the bottom, so the header the user just clicked leaves the screen, and it cannot know that a
  stuck header covers the top of the view.
- **After the slide, not at `tick()`.** During the slide the body is still short, so its final
  bottom is not known yet. Under reduced motion the slide takes 0 ms and the scroll is instant.
- **Not `scrollBy({ behavior: "smooth" })`** (until batch 03): its duration and curve are the
  browser's, and closing has to move on exactly the fold's clock.
- **What made closing jump (T-05).** Measured closing Operations scrolled to the bottom: the clamp
  dropped 210 px in one frame, nothing moved for the rest of the fold, then the last 494 px
  dropped in one frame when the body was removed. The pause came from
  [OperationCard](/editor/operation-card/)'s visually hidden "Operation N:", absolutely positioned
  against `ScrollArea`'s viewport: it escapes the fold's `overflow: hidden` and holds the scroll
  height at the old bottom. Leading the fold with the scroll removes the jump whatever holds the
  height. Setting `position: relative` on the body during the fold was tried and does nothing:
  Svelte's `slide` runs as a Web Animation, and `position` is not animatable.
