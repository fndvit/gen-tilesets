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
   Where the Pattern is random-based, a last chip, **Reseed on load: On / Off**, toggles the flag
   without opening the card (batch 01, T-11, B-021). It is a `role="switch"` with `aria-checked`,
   pressed by click, Space or Enter; On wears the selected state (ink, white text). It is absent
   where the toggle is absent inside the card.
4. **Actions**: an eye that hides the operation from the preview (batch 02 T-02, B-012; only while
   the editor is open, D-02 A), then re-seed, always visible, and a [menu](/editor/ui-menu/) with Move earlier, Move
   later and Delete. Open, a close button joins them.

Hidden, the card says **Hidden** in text before its actions, its index square goes hollow, its
title's attribute takes the muted colour and its thumbnails fade: never colour alone, and every word
keeps its contrast. The eye is one button labelled "Hide operation N" with `aria-pressed` (and the
`eye-off` icon while pressed), the APG toggle-button pattern; a label that also flipped to "Show"
would be announced as "Show …, pressed". It is absent on a new operation.

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
| `hidden?` | Whether the operation is hidden from the preview. Default `false`. |
| `onToggleHidden?` | Hides or shows it; the eye is absent without it. |
| `onMoveUp`, `onMoveDown`, `canMoveUp`, `canMoveDown` | Reordering stays one gesture and one undo entry (D44). |
| `reseedOnLoad?` | The flag, for the Reseed on load chip; `undefined` hides the chip (a Pattern that is not random-based: `reseedOnLoadChip` in [reseed.ts](/editor/reseed/)). |
| `onReseedOnLoad?(on)` | Sets the flag from the chip; the chip is absent without it. |
| `panelId?` | The open body's id, for the title's `aria-controls`. |
| `children?` | The stepper, shown while open. |
