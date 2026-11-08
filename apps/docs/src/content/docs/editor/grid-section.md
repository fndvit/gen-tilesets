---
title: sections/GridSection.svelte
description: The Grid & Size section. Cell size, rows, y offset, design width and alignment, with the three destructive fields routed through App's confirmation gate, and a folded Details list of what they imply.
sidebar:
  order: 42
---

**Written from:** `apps/editor/src/lib/sections/GridSection.svelte`, and its call site in
`App.svelte`.

## Overview

The first section of the sidebar, matching the Figma *Grid & Size* frame. It holds the grid's
shape: cell size, rows, y offset, design width (not in Figma, placed beside alignment) and the
column / gutter alignment.

Three of these fields, cell size, design width and alignment, change the column count. When an
operation is tied to specific cells, a change to one of them asks first, in a dialog. Each
field's hint says whether that will happen. Rows and y offset apply directly.

Cell size, rows and design width commit when the author leaves the field or presses Enter, not on
every keystroke, so the dialog asks once, about the whole value, and typing "14" never first
builds a 1-row grid. The preview does not follow the typing in those three fields; each shows
"↵ Enter to apply" while it holds a change. Alignment is a toggle, so a click is already a commit.

Under the fields, a folded **Details** group lists what the file implies but the author does not
type: columns, grid width and height, visible height, bleed, how many tiles and operations, and the
engine and schema versions. Closed, it shows "12 columns · 960 × 640 px". Until batch 01 (T-03,
D-02 A) these were a section of their own, "Derived"; they moved here to sit next to the fields
that change them. The rows come from [grid-details.ts](/editor/grid-details/).

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `risked` | `Operation[]` | The coordinate-bound Operations (`atRisk(config)` from [orphans.ts](/editor/orphans/)). |
| `destructive` | `(field, value, transition) => void` | App's gate: confirm if `needsConfirmation`, else apply. `field` is lower case ("cell size") and `value` is the text, for the dialog's question. |

It reads `session.file` itself and writes through `session.apply`.

### Inputs → outputs

| Row | Control | Writes |
| --- | --- | --- |
| Cell size | [`NumericInput`](/editor/numeric-input/), `parseCellSize`, `commit="blur"` | `destructive("cell size", t, setCellSize(t))` |
| Rows | `NumericInput`, `parseRows`, step 1, `commit="blur"` | `session.apply(setRows(t))` |
| Y offset | `NumericInput`, `parseYOffset`, step 0.05 | `session.apply(setYOffset(t))` |
| Design width | `NumericInput`, `parseReferenceWidth`, `commit="blur"` | `destructive("design width", t, setReferenceWidth(t))` |
| Alignment | [`FieldRow`](/editor/ui-field-row/) + [`Toggle`](/editor/ui-toggle/) Column / Gutter | `destructive("alignment", option, setHorizontalAlignment(option))` |
| Details | [`Collapsible`](/editor/ui-collapsible/) `variant="group"`, closed, over a `<dl>` of `gridDetails(session.file)` | nothing: read-only |

The three destructive hints end with the same sentence, `consequence`: either "… *ids* … tied to
specific cells, so a change asks first", or "Every selection here survives a resize, so it
applies at once".

### Invariants

- **The destructive fields are typed, not dragged** (`09` §9.2, §9.3). The preview's drag handle
  only changes the render width, which destroys nothing.
- **Confirmation only where something is at risk** (**E12**, §9.3). The gate lives in `App.svelte`.
- **Confirmation only once the value is committed** (Pol, W1). That is why cell size and design
  width use `commit="blur"`: in the default mode, the dialog could ask after the first digit.

### Callers / callees

Caller: `App.svelte` (`<GridSection {risked} {destructive} />`), first of the sections. Callees:
`Section`, `NumericInput`, `FieldRow`, `Toggle`, `Collapsible`; `grid-details.ts` (`gridDetails`); `document.ts` (`setCellSize`, `setRows`, `setYOffset`,
`setReferenceWidth`, `setHorizontalAlignment`); `fields.ts` (four parsers).

### Tests

None for the component. The transitions and parsers are tested in `document.test.ts` and through
`fields.ts`'s callers; the Details rows in `grid-details.test.ts`.
