---
title: ui/Explainer.svelte
description: A non-modal popover that explains something too long for a hint, such as how noise works.
sidebar:
  order: 76
---

**Written from:** `apps/editor/src/lib/ui/Explainer.svelte`, `apps/editor/src/lib/ui/explainer.ts`,
`apps/editor/src/lib/operations/noise-explainer.ts` and `lib/operations/noise-explainer.test.ts`.

## Overview

The Explainer is a small white panel that opens under a button and explains something: what the
params do, measured figures as small bars, and a note. It is used for "ⓘ How noise works" on the
Pattern step under Noise (item 12). Hints open only on hover, so an explanation that keyboard users
also need lives here. It never holds a control.

It does not block the page. Esc, ✕ or a press outside closes it; Esc and ✕ put focus back on the
button. Tabbing out of it closes it too.

## In detail

### Public surface

`Explainer.svelte`:

| Prop | Type | Meaning |
| --- | --- | --- |
| `anchor` | `HTMLElement` | The trigger it hangs from, right side to right side. |
| `content` | `ExplainerContent` | What it says. |
| `onClose` | `(refocus: boolean) => void` | `true` after Esc or ✕: return focus to the trigger. |

`explainer.ts` holds the content's shape: `title`, `intro`, `params` (`{ name, text }`), `shares`
(`{ label, shares }` rows, drawn by ratio), `sharesBy` (what a row's label counts, for screen
readers), `advice` and `note`.

`noise-explainer.ts` holds `NOISE_EXPLAINER`, the N1 mock's text. Its bars are the shares three
equal entries paint under Octaves 1, 2 and 3 (23/52/26, 15/68/17, 12/75/14), measured in N1 with
`fieldOf` and `coverageOf` on a 40×40 grid, Cells per feature 5, over 40 seeds. Nothing derives
them: re-measure if the engine's noise changes.

### Inputs → outputs

- **Placement:** [`placeAt`](/editor/ui-popover-ts/) with 420px of room, `position: fixed`, at
  most `--explainer-w` (340px) wide and never taller than the space on its side (it scrolls).
  A window resize closes it.
- **Focus:** the panel (`role="dialog"`, named by its heading) takes focus when it opens. It is not
  a focus trap: focus leaving it for anything but the trigger closes it without refocusing.
- **Bars:** each row is a mono label and one segment per share, the middle ones ink and the ends
  grey. The bars are hidden from assistive tech; each row has a hidden line instead, such as
  "Octaves 2: 15%, 68%, 17%".

### Callers

`lib/operations/OperationBody.svelte`. The trigger is a tertiary [Button](/editor/ui-button/) with
the `info` icon at the right of the Pattern's options bar, shown only under Noise; the popover
closes when the step or the Pattern changes.

### Tests

`lib/operations/noise-explainer.test.ts`: one bar row per Octaves value, three shares each, adding
up to about 100; the param names are the fields' own labels (`labelFor`).
