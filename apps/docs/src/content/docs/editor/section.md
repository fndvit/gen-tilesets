---
title: Section.svelte
description: A sidebar section. The Figma section bar from Collapsible over its padded content.
sidebar:
  order: 41
---

**Written from:** `apps/editor/src/lib/Section.svelte` and its callers.

## Overview

`Section` is one sidebar section: the black Figma *Section Header* bar with its chevron and
title, over the section's content. Clicking the bar collapses or expands it. The open or closed
state lasts only for the session. It is never saved, and nothing in the document changes when a
section is collapsed.

In the editor's pipeline (import → document → draft/history → preview → export) it plays no part.
It is layout.

## In detail

### Purpose

The bar, chevron and disclosure semantics are [`ui/Collapsible`](/editor/ui-collapsible/)'s
(`variant="section"`). `Section` adds only the Figma content padding: 6px, then a 4px slot
(`calc(var(--space-3) + var(--space-2))`). It sets no gap between rows, because the bodies differ:
fields are 8px apart, lists of bars 4px. Each body sets its own.

The open content is on `--color-section` (`--aqua-50`, Figma's sidebar colour), closed by a
1px bottom border in `--color-separator`, the same colour as the separator under every section bar. The sidebar behind it is the darker `--color-surface` (`--aqua-200`), showing
under the last section (App's `.sections` bottom padding; sections touch, Pol), so where an open section
ends is visible (Pol, Block F review).

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `title` | `string` | required | The bar's title, uppercased by `.t-section`. |
| `open` | `boolean` | `true` | The **initial** state only. Read once into local state, which is bound to `Collapsible`. |
| `summary` | `string` | none | The muted line a closed section shows. |
| `onAdd` | `() => void` | none | Puts a "+" in the header; it also unfolds the section. |
| `addLabel` | `string` | `"Add to <title>"` | The "+" button's name. |
| `addHaspopup` | `"dialog"` | none | `aria-haspopup` on the "+", when it opens a dialog rather than adding at once. Tiles' "+" opens the [Tile gallery](/editor/tile-gallery/) (B-016 S3c). |
| `actions` | `Snippet` | – | Header controls before the "+", outside the disclosure button, so pressing one does not fold the section. The Operations section's (i) (batch 01, T-07). |
| `reveal` | `number` | `0` | A counter. Each change unfolds the section, for something outside that asks to show an item in it (Stage 2 W4: `opening.revealed`, from the orphan notice's "Open op-2"). |
| `tour`, `tourHeading`, `tourAdd` | `string` | none | `data-tour` on the card, its header and its "+". The [tour](/editor/tour-dialog/) finds what it points at by this attribute, so a change of label or class can't break it (B-017). Rejected: finding targets by `aria-label` or by class. |
| `children` | `Snippet` | required | The content, rendered only while open. |

No events, no bindings.

### Invariants

- **Collapsed state is transient and local.** Persisted editor state is postponed (`09` §12), and
  `meta` is forbidden as a place to put it (**E4**).
- **`open` is captured once** (`svelte-ignore state_referenced_locally`): a later change to it
  would reopen a section the author had just closed.

### Callers / callees

| Caller | Title |
| --- | --- |
| `lib/sections/GridSection.svelte` | "Grid & Size" |
| `lib/sections/BreakpointsSection.svelte` | "Breakpoints", `open={rules.length > 0}` |
| `lib/sections/TilesSection.svelte` | "Tiles" |
| `lib/sections/OperationsSection.svelte` | "Operations", `reveal={opening.revealed}`, `actions` (the (i)) |

Callees: `lib/ui/Collapsible.svelte`.

### Tests

No test file.

### Gotchas & rejected alternatives

- **No destructive look.** The old `destructive` prop drew an orange border. Figma has none, and
  the protection for destructive edits is App's confirmation gate, not a colour (Block C).
- **Collapsing unmounts the content.** Collapsing Operations unmounts the operation body, but the
  draft survives in `drafting`.
- **Breakpoints opens by default only for a file that has rules.** Because `open` is read once,
  a rule added later does not reopen a collapsed section.

### Review notes

None found.
