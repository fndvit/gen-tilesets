---
title: operations/OperationHeader.svelte
description: One operation's 56px bar. Its number, trash and re-seed, each step's answer over its step tab, and up/down arrows.
sidebar:
  order: 46
---

**Written from:** `apps/editor/src/lib/operations/OperationHeader.svelte`, and its call sites in
`sections/OperationsSection.svelte`.

## Overview

The Figma *Operation header*, closed and opened. A black bar, 56px tall (40 in Figma, so each icon column holds two targets: trash 24px over the 28px re-seed, and the two 24px arrows; WCAG 2.5.8), with four parts from left
to right:

1. the operation's number in the stack;
2. a column with a trash icon and a re-seed icon (in the seed colour);
3. the summary, one console cell per step (`Checkered`, `Opacity [0.5 - 1]`, `Random`, `Set`),
   each the width of the [tab bar](/editor/ui-tab-bar/) tab under it, so a step's answer sits over
   that step. A cell that does not fit ends in an ellipsis and scrolls while hovered
   ([marquee](/editor/ui-marquee/) `scroll="hover"`);
4. a column with up and down arrows to move the operation earlier or later.

Closed, no tab is active. Opened, the tab of the current step is active (paper), and the body
below is drawn by the caller.

## In detail

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `index` | `number` | required | 1-based stack position. Shown, and used in every `aria-label`. |
| `cells` | `Record<Step, string>` | required | Each step's answer, from `summaryCells` in [labels.ts](/editor/operation-labels/). |
| `active` | `Step \| null` | required | The open step, or `null` when closed. |
| `onSelect` | `(step: Step) => void` | required | A tab was clicked. |
| `onDelete` | `() => void` | required | Trash. |
| `onReseed` | `(() => void) \| undefined` | none | Re-seed. Absent for an operation not in the file yet, which disables the icon. |
| `onMoveUp`, `onMoveDown` | `() => void` | required | The arrows. |
| `canMoveUp`, `canMoveDown` | `boolean` | required | Disable an arrow at an end of the stack. |
| `panelId` | `string` | none | The open body's id, passed to `TabBar` for the active tab's `aria-controls`. |

### Inputs → outputs

- Tabs are `STEPS.map((id) => ({ id, label: id, detail: cells[id] }))`: `selection`,
  `attribute`, `source`, `blend`, in step order. `detail` puts the step's answer in the tab's
  accessible name (`selection: Checkered`).
- The cells are a flex row of four `Marquee scroll="hover"` strips, `flex: 1 1 0`, each overlapping
  its neighbour by `--rule-w` so dividers stay 1px. The row is `aria-hidden`: a screen reader
  hears each answer once, from its tab.
- `IconButton`s: `trash` ("Delete operation N"), `reseed` with `tone="seed"` ("Re-seed operation
  N"), `up` ("Move operation N earlier"), `down` ("Move operation N later").
- The index cell has `aria-label="Operation N"`. The tab bar is labelled "Steps of operation N".
- Layout: a flex row at `min-height: var(--op-header-h)` on `--color-bar`. The middle column
  takes the rest of the width (`min-width: 0`, so the cells can scroll), and the tab row fills
  what the strip leaves of the height.

### Invariants

- **The index is a position, not an identity.** Randomness hangs on `id` and `salt` (`02` §6.3),
  so moving an operation changes the picture by composition only (**G3**, **D44**).
- **The arrows are disabled at the ends, not hidden**, so the icons beside them never move under
  the pointer.
- **Re-seed is on every stored operation**, not only stochastic ones, because a `random`
  Selection also uses the salt (`04` §4.3, `09` §8.3). It keeps its seed colour while open: the
  colour is a meaning, not a state.
- **The header holds no state.** Every action is a callback.

### Callers / callees

| Caller | Use |
| --- | --- |
| `sections/OperationsSection.svelte:28` | import |
| `sections/OperationsSection.svelte:105` | one per stored operation, with `onReseed` and real arrows |
| `sections/OperationsSection.svelte:126` | the new operation's header: no `onReseed`, both arrows disabled, `onDelete` discards the draft |

Callees: `STEPS`, `Step` (`draft.svelte.ts`); [IconButton](/editor/ui-icon-button/),
[Marquee](/editor/ui-marquee/), [TabBar](/editor/ui-tab-bar/).

### Tests

None (the vitest config cannot load `.svelte`).

### Gotchas & rejected alternatives

- **The tab labels are the raw step ids** (`selection`, not "Selection"). `labelFor` is not
  applied here, though `OperationBody` uses it for the same step names in Save's hint.
- **Reordering is arrows, not a drag** (**D44**). A drag would be many moves for one gesture; an
  arrow is one transition and one undo entry.

### Review notes

None found.
