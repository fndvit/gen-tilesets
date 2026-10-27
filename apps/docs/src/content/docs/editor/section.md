---
title: Section.svelte
description: The sidebar's one collapsible panel shell. A title button, an optional destructive look, and a body snippet.
sidebar:
  order: 41
---

**Written from:** `apps/editor/src/lib/Section.svelte` and the call sites in `App.svelte`.

## Overview

`Section` is the card that every panel in the editor's left-hand sidebar sits in: Grid, Design,
Breakpoints, Derived, Tiles, Operations, Seed and Import. It draws a heading that doubles as a
button. Clicking the heading collapses or expands the panel.

A section marked as destructive is drawn differently, so that the panels whose edits can damage
work look unlike the others. The open or closed state lasts only for the session. It is never
saved anywhere, and nothing in the tileset document changes when a panel is collapsed.

In the editor's pipeline (import → document → draft/history → preview → export) it plays no
part at all. It is layout.

## In detail

### Purpose

The header comment says the component exists because the `.panel` class and the `h2` treatment
"were previously duplicated verbatim across four components". It carries no specification
obligation; panel layout is deliberately unspecified.

### Public surface

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `title` | `string` | required | Header text. The stylesheet uppercases it. |
| `open` | `boolean` | `true` | The **initial** state only. Read once to seed `expanded`. |
| `destructive` | `boolean` | `false` | Adds the `destructive` class to the `<section>`. |
| `children` | `Snippet` | required | The panel body, rendered only while expanded. |

No events, no bindings.

### Inputs → outputs

Renders `<section class="panel">` containing `<h2><button aria-expanded>` with the title and a
decorative chevron (`▲` expanded, `▼` collapsed, `aria-hidden`). The body is inside `{#if
expanded}`, so collapsing **unmounts** the children rather than hiding them.

### Invariants

- **Collapsed state is transient and local.** The comment: persisted editor state is postponed,
  and `meta` is forbidden as a place to put it (**E4**), so it is a rune in this component that
  neither reads nor writes the file.
- **`open` is captured once.** Marked `svelte-ignore state_referenced_locally` on purpose: a later
  change to `open` would reopen a panel the author had just closed.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte:64` | import |
| `App.svelte:432` | "Grid" |
| `App.svelte:452` | "Design", `destructive` |
| `App.svelte:508` | "Breakpoints", `open={rules.length > 0}` |
| `App.svelte:580` | "Derived", `open={false}` |
| `App.svelte:623` | "Tiles" |
| `App.svelte:627` | "Operations" |
| `App.svelte:673` | "Seed", `open={false}` |
| `App.svelte:755` | "Import", `open={false}`, `destructive` |

Callees: none.

### Tests

No test file.

### Gotchas & rejected alternatives

- **`<h2>` wraps the `<button>`, not the reverse.** The heading has to stay a heading for the
  sidebar's outline, and the button carries the disclosure semantics. The comment says this is
  the same shape as `BlendControl`'s `button.disclose`.
- **Unmounting on collapse loses child state.** Collapsing Operations unmounts the draft panel,
  but the draft itself survives because it lives in `drafting`, not in the panel (stated in
  `App.svelte:629`–`639`).
- **Breakpoints opens by default only for a file that has rules.** Because `open` is read once,
  a rule added later does not reopen a collapsed panel.

### Review notes

None found.
