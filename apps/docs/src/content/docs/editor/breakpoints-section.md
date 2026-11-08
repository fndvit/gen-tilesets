---
title: sections/BreakpointsSection.svelte
description: The Breakpoints section. The file's responsive rules, each a tile-group-style bar with its fields, reorder and delete.
sidebar:
  order: 43
---

**Written from:** `apps/editor/src/lib/sections/BreakpointsSection.svelte`, and its call site in
`App.svelte`.

## Overview

The file's breakpoints: rules that override the grid's shape below or above a width, applied in
order like CSS, so a later rule wins. They are not in Figma and are built from the same pieces as
the rest of the sidebar. Each rule is a black bar (delete, move earlier, move later) over a paper
body that lists the fields it sets. Each field can be dropped again, a menu adds a missing one,
and the black plus bar adds a rule.

While an operation is tied to specific cells, a rule may not change rows or columns. Those two
options are disabled and marked "pinned".

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `risked` | `Operation[]` | The coordinate-bound Operations, which pin `rows` and `columns`. |

### Inputs → outputs

- `rules = session.file.responsive ?? []`. The section opens by default only when there are rules.
- Per rule: [`Collapsible`](/editor/ui-collapsible/) `variant="group"` titled "Rule N", with
  [`IconButton`](/editor/ui-icon-button/)s in `actions`: trash → `removeRule(i)`, up / down →
  `moveRule(i, i ∓ 1)` (disabled at the ends).
- Per present field in `RULE_FIELDS`: a [`NumericInput`](/editor/numeric-input/) with
  `RULE_PARSERS[field]` → `setRuleField(i, field, t)`, and a trash `IconButton` →
  `removeRuleField(i, field)`. The label is the field name in words (`minWidth` → "min width").
- `rows`, `columns` and `cellSize` (`GRID_SHAPING`) use `commit="blur"`: they commit once, on blur
  or Enter, and show the "↵ Enter to apply" cue while they hold a change, as Grid & size does.
  Otherwise typing "14" would build a 1-row grid first (Pol, Stage 2 W5). The other fields follow
  the typing, like Grid & size's Y offset.
- A native `<select>` styled as a chip adds a missing field with `addRuleField`. `rows` and
  `columns` are disabled while `risked` is not empty.
- [`AddBar`](/editor/ui-add-bar/) "Add breakpoint" → `addRule()`.

### Invariants

- **Every edit goes through `document.ts`**, which refuses one that would leave the file illegal
  (**E5**). Where the editor already knows an option would be refused, it is disabled with the
  reason in its text.

### Callers / callees

Caller: `App.svelte`. Callees: `Section`, `Collapsible`, `IconButton`, `AddBar`, `NumericInput`;
`document.ts` (`addRule`, `addRuleField`, `moveRule`, `removeRule`, `removeRuleField`,
`setRuleField`); `fields.ts` (`RULE_FIELDS`, `RULE_PARSERS`).

### Tests

`rules.test.ts` pins every transition the section calls and checks that each result validates.

### Gotchas & rejected alternatives

- The explanatory paragraph under the old panel ("Rules change the shape, never the design…")
  moved into the header comment. Redesigned UI carries no spec prose (Block B review).
