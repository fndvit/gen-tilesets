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

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `title` | `string` | required | The bar's title, uppercased by `.t-section`. |
| `open` | `boolean` | `true` | The **initial** state only. Read once into local state, which is bound to `Collapsible`. |
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
| `lib/sections/DerivedSection.svelte` | "Derived", `open={false}` |
| `lib/sections/TilesSection.svelte` | "Tiles" |
| `lib/sections/OperationsSection.svelte` | "Operations" |

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
