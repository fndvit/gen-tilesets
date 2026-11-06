---
title: operations/OperationCard.svelte
description: One operation as a card that reads as what it does. It shows what it writes, then its other steps as chips, with re-seed and a more menu.
sidebar:
  order: 46
---

**Written from:** `apps/editor/src/lib/operations/OperationCard.svelte`, and its call sites in
`sections/OperationsSection.svelte`.

## Overview

Iteration 2's replacement for the operation header. The old header repeated four step tabs on
every row, and squeezed each step's answer into a clipped caption above them. A collapsed stack
therefore said little about what each operation did. The card leads with the answers instead:

1. **Index square**: the stack position, in the shape of a tile. Ink at rest, the accent while
   the operation is open.
2. **Title, what it writes**: the attribute (`Tile`, `Rotation`) in the group-title style, then
   the mapping. A tile mapping shows up to four palette thumbnails and the tile names. A numeric
   mapping shows its range in mono, for example `0 – 270 · 4 steps` (`writesOf` in
   [labels](/editor/operation-labels/)). Under Constant it names only the entry that paints,
   even for a file saved with several, because the card says what the operation does (T4). Clicking it opens the attribute step.
3. **Chips**: one each for Selection, Pattern and Blend, in step order. Each shows the step name
   (`STEP_LABELS`, so the Source step reads "Pattern"), muted, then the answer in mono. A chip opens its step. The chips wrap rather than clip.
4. **Actions**: re-seed, always visible, and a [menu](/editor/ui-menu/) with Move earlier, Move
   later and Delete. Open, a close button joins them.

Open, the card turns white with an accent edge, and its `children` (the
[operation body](/editor/operation-body/)'s stepper) replace the chips.

## In detail

### Public surface

| Prop | Notes |
|---|---|
| `index` | 1-based stack position. |
| `parts`, `tiles` | What the title and chips read (`partsOf` or `draftParts`). |
| `open` | Whether the draft is open in this card. |
| `onSelect(step)` | Opens or moves the draft to that step. |
| `onClose`, `onDelete`, `onReseed?` | `onReseed` is absent for an operation that is not in the file yet. |
| `onMoveUp`, `onMoveDown`, `canMoveUp`, `canMoveDown` | Reordering stays one gesture and one undo entry (D44). |
| `panelId?` | The open body's id, for the title's `aria-controls`. |
| `children?` | The stepper, shown while open. |
