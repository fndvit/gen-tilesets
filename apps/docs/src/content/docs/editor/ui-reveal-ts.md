---
title: ui/reveal.ts
description: How far to scroll so that a section or group the user just opened can be seen, without its header leaving the top.
sidebar:
  order: 76
---

**Written from:** `apps/editor/src/lib/ui/reveal.ts` and `lib/ui/reveal.test.ts`.

## Overview

When the user opens a section or a group near the bottom of the sidebar, its content would unfold
below the visible area, behind the footer. [Collapsible](/editor/ui-collapsible/) calls this
module once the body has slid open, and the sidebar scrolls until the opened content's bottom is
in view, but never so far that its header leaves the top. A section taller than the view ends with
its header at the top. Something already fully visible does not scroll.

## In detail

### Public surface

| Export | Signature | Meaning |
| --- | --- | --- |
| `Span` | `{ top, bottom }` | A vertical span in client px. |
| `revealDelta` | `(view: Span, target: Span, topInset = 0) => number` | The px to scroll down to reveal `target` in `view`; 0 for none. |
| `ScrollNode` | `{ parentElement, scrollHeight, clientHeight }` | What `scrollParent` reads, so a test can pass a plain object. |
| `scrollParent` | `(node, overflowY?) => ScrollNode \| null` | The nearest ancestor with `overflow-y: auto` or `scroll` that has something to scroll, or null. |
| `revealInScroller` | `(element, topInset, behavior) => void` | Measures `element` and its scroller and scrolls by `revealDelta`. Does nothing outside a scroll container. |

- `revealDelta` is `min(hidden, room)`: `hidden` is how far the target's bottom is below the
  view's, `room` how far its top is below the view's top plus `topInset`. It is 0 when less than
  a pixel is hidden (subpixel rounding) or when there is no room, so it never scrolls up.
- `topInset` is the height of an enclosing section's sticky header, which covers the top of the
  view (T-08). A group revealed inside a section stops with its header just under it.
- `scrollParent` never returns the element itself, nor the root element, whose computed
  `overflow-y` is `visible`: the page itself is never scrolled from here.

### Callers / callees

Caller: [Collapsible](/editor/ui-collapsible/), on its body's `introend`, only after the user
opened it from its own header. Callees: `getComputedStyle`, `getBoundingClientRect`,
`Element.scrollBy`.

### Tests: `reveal.test.ts`

- No scroll for a fully visible target; scrolls a hidden bottom into view.
- A target taller than the view stops with its top at the view's top, or under a `topInset`.
- Never scrolls up, nor a target whose top is already at or above the top; ignores subpixel
  overflow.
- `scrollParent` finds the nearest scrolling ancestor, skips one with nothing to scroll and a
  clipping one, never returns the element itself, and is null outside any scroller.

### Gotchas & rejected alternatives

- **Not `scrollIntoView({ block: "nearest" })`.** For an element taller than the view it aligns
  the bottom, so the header the user just clicked leaves the screen, and it cannot know that a
  stuck header covers the top of the view.
- **After the slide, not at `tick()`.** During the slide the body is still short, so its final
  bottom is not known yet. Under reduced motion the slide takes 0 ms and the scroll is instant.
