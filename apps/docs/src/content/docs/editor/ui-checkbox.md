---
title: ui/Checkbox.svelte
description: One on/off setting with its label always beside it. A native checkbox drawn as a 16px ink square.
sidebar:
  order: 98
---

**Written from:** `apps/editor/src/lib/ui/Checkbox.svelte`.

## Overview

`Checkbox` is a small square with its label beside it, for one setting that is either on or off.
It is "Reseed on load" on an operation: on the closed card, on a row of its own under the step
chips, and in the open card's Pattern step, so one setting has one control everywhere (batch 03
T-07, B-029). Ticking it takes effect at once.

## In detail

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | required | The visible label, and the checkbox's accessible name. |
| `checked` | `boolean` | required | What the box shows. |
| `onChange` | `(checked: boolean) => void` | required | Called with the new value on every press. |
| `hint` | `string` | — | Explanation shown on hovering the label ([`Hint`](/editor/ui-hint/)); also the checkbox's `aria-describedby`. |
| `disabled` | `boolean` | `false` | |

### Inputs → outputs

- A `<label>` holding a native `<input type="checkbox">`, a drawn `.box` and the label text. The
  input is invisible but stays in the tree, so Tab reaches it, Space toggles it, a click anywhere
  on the label toggles it, and assistive technology hears a checkbox with its name and state.
- The box is `--checkbox` (16px) with a 1.5px edge in the text colour, as
  [RadioList](/editor/ui-radio-list/)'s ring, radius `--radius-xs`, white inside. Checked, it fills
  with the text colour and shows a white `check` icon at 12px.
- The label is `.t-body` in ink, at least `--target-min` (24px) tall with `--space-2` side padding:
  the whole label is the target (WCAG 2.5.8). Hover washes it with `--color-hover`, press with
  `--color-pressed`; keyboard focus rings the whole label in the accent (`:has(:focus-visible)`),
  as RadioList rings its row. Disabled, the text and box take `--color-disabled`.
- The label is `position: relative`, so the hidden input's containing block is the label. An
  absolutely positioned element with no positioned ancestor nearer than
  [ScrollArea](/editor/ui-scroll-area/)'s viewport escapes clipping and holds the sidebar's
  scroll height (found in T-05, see [reveal.ts](/editor/ui-reveal-ts/)).

### Invariants

- **Controlled.** It shows `checked` and never keeps a value of its own: a press puts the input
  back at once and calls `onChange`, and the new value arrives as the prop. A caller that writes
  the file (`OperationsSection`'s `setReseedOnLoad`, one undo entry) or a draft is never out of
  step with what the box shows.

### Callers / callees

Callers: [OperationCard](/editor/operation-card/) (the closed card's Reseed on load),
[OperationBody](/editor/operation-body/) (the Pattern step's Reseed on load). Callees:
[Icon](/editor/ui-icon/) (`check`), [Hint](/editor/ui-hint/).

### Tests

None (the vitest config cannot load `.svelte`). It holds no logic beyond handing the press on.

### Gotchas & rejected alternatives

- **Not a `role="switch"` chip**, which is what it replaces: as the last step chip it landed in a
  different place on each card, or on a second line, and its On/Off read like a step's answer.
- **Not a [Toggle](/editor/ui-toggle/)**: a segmented control chooses between named values; one
  setting being on or off is a checkbox.
