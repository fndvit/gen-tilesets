---
title: ui/ScrollArea.svelte
description: A scrolling region whose scrollbar is a thin handle drawn over the content, so it never takes width.
sidebar:
  order: 73
---

**Written from:** `apps/editor/src/lib/ui/ScrollArea.svelte`.

## Overview

`ScrollArea` holds the sidebar's sections and scrolls them. A normal scrollbar appears only when
the content gets too tall, and on some systems it takes room when it does, so the whole sidebar
gets narrower and every control shifts. `ScrollArea` hides that scrollbar and draws a thin grey
handle on top of the content instead, as VS Code does. The handle shows while the pointer is over
the area, while it scrolls and while it is dragged, then fades out.

## In detail

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `children` | `Snippet` | required | The scrolling content. |
| `fill` | `boolean` | `false` | Makes the content a flex column at least as tall as the area, so a child with `flex: 1` can centre itself in the visible height and still scroll once taller. The preview column uses it. |

### Inputs → outputs

- `.viewport` scrolls natively (`overflow-y: auto`) with its own scrollbar hidden
  (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`). Wheel, trackpad, keyboard
  and focus scrolling are the browser's.
- A `ResizeObserver` on the viewport and on the content re-measures `clientHeight`,
  `scrollHeight` and `scrollTop`, because folding a section or opening an operation changes the
  height without a scroll event. `scroll` re-measures too.
- The handle's geometry is [`thumbFor`](/editor/ui-scrollbar-ts/) with a 24px minimum. With no
  overflow there is no handle.
- Dragging the handle (pointer capture) sets `scrollTop` through `scrollForDrag`.
- The handle is `aria-hidden`: assistive technology scrolls the viewport.
- Look: `--scrollbar-w` (6px) wide, `--scrollbar-inset` (2px) from the right edge, round ends,
  `--color-scrollbar` (mid grey, readable on the black bars and on paper). Opacity 0 at rest,
  `--scrollbar-opacity` (0.6) while the area is hovered or for 800ms after a scroll,
  `--scrollbar-opacity-hover` (0.9) on the handle or while dragging. Fades over `--dur-slow`,
  instantly under `prefers-reduced-motion`.

### Callers / callees

Caller: `App.svelte`, around the sidebar's sections in `.scrollable`. Callee:
`lib/ui/scrollbar.ts`.
