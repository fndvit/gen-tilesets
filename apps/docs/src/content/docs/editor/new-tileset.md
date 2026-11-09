---
title: NewTileset.svelte
description: The New tileset Form popup. Start empty, or open a template through Import's own sequence, with the unsaved-work warning in the same step.
sidebar:
  order: 85
---

**Written from:** `apps/editor/src/lib/sections/NewTileset.svelte`, and its call site in
`App.svelte`. No test file; the logic it calls is in [starters.ts](/editor/starters/) and
[import.ts](/editor/import/), both tested.

## Overview

New in the top bar opens this popup. It asks one thing: start from an **empty** grid, or **from a
template**, a finished tileset to change and learn from. Choosing From template shows the list of
templates (today only Collage) with a picture of each. The warning that the current tileset is
lost sits in the same popup, so starting over is one step.

It replaced the "Start a new tileset?" Dialog (B-016, Pol's S1 pick 1B).

In the editor's pipeline (**import** → document → draft/history → preview → export), it is a
second way in, next to Import.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `open` | `boolean` (bindable) | App's `askingNew`. |
| `onEmpty` | `() => Promise<void> \| void` | App's `newTileset`, called by Start new. |

### Behaviour

- **Start** is a described [Radio list](/editor/ui-radio-list/) with a hidden legend: Empty ("A
  blank grid. Add your own tiles.") and From template ("A finished tileset to change and learn
  from."). Every opening starts on Empty, and focus starts on it.
- **Template** shows only while From template is chosen, as its own radio group under Start. The
  first time, it fetches the manifest through [starters-client.ts](/editor/starters-client/)'s
  shared `manifest()`, so later openings, choices and the Tile gallery reuse it, and a failed
  fetch is retried next time. While loading it says
  "Loading templates…"; on failure, "Couldn't load the templates: <reason>" beside an `alert`
  icon. Its first template is chosen when the list appears.
- **The verb** follows the choice: **Start new**, or **Open <label>** ("Open Collage"). It is
  disabled while no template is chosen and while a template loads, when it reads "Opening…".
- **Start new** awaits `onEmpty()`, then closes.
- **Open <label>** calls `loadTemplate` → `prepareArchive` → `adopt`, the same pair Import uses,
  then closes. Like Start new, it cannot be undone (`adopt` starts a fresh history). A `"newer"` or `"invalid"` result, or any throw (a missing picture, a 404), closes
  the popup and opens [ImportRefused](/editor/import-refused/) with the template's label as
  `subject`. Nothing is replaced.
- **Closing during a load abandons it.** `closed()` bumps a `generation` counter, and a load
  compares it before acting, so a template the author cancelled never replaces the document.

### Look

- The popup is `wide` (592px), so the `LossWarning` line fits on one line:
  an `alert` icon, then "**Everything in the current tileset is lost, and it can't be undone.**
  Export it first to keep it." Import's question shows the same component.

- Template cards are white on the field-grey well: the 96 × 60 thumbnail (`--template-thumb-w`,
  16:10, `object-fit: cover`), the name in `.t-title`, and the summary in muted mono. The
  summary's parts are each unbreakable, so a narrow popup wraps between them.
- The chosen card has a 2px ink ring; hover on another card draws 1px. The radio inside is
  visually hidden but focusable, and the focus ring is drawn on the card.

### Callers / callees

| Caller | Use |
| --- | --- |
| `App.svelte` | `<NewTileset bind:open={askingNew} onEmpty={newTileset} />`, in place of the old Dialog |

Callees: `BASE`, `manifest` ([starters-client.ts](/editor/starters-client/)); `loadTemplate`
([starters.ts](/editor/starters/));
`prepareArchive` ([import.ts](/editor/import/)); `adopt` ([adopt.ts](/editor/adopt/));
`ImportRefused`, `LossWarning`; `ui/Popup`, `ui/RadioList`, `ui/Button`, `ui/Icon`.

### Gotchas & rejected alternatives

- **Rejected: a New menu and then the Dialog** (S1 1A). Two steps, and no room for a thumbnail.
- **Rejected: fetching the manifest when the popup opens.** It is fetched only on From template,
  so a plain New costs no request.
- **The template list sits under the choices, not inside the chosen row** (S2), so each radio
  group has its own name for assistive tech.
- `fetch` is wrapped (`(url) => fetch(url)`) because the loaders' `Fetch` type takes only a URL.
