---
title: sections/SidebarFooter.svelte
description: The sidebar's fixed "Randomness" card. The seed, assets on load, reroll assets and a fresh-load preview.
sidebar:
  order: 45
---

**Written from:** `apps/editor/src/lib/sections/SidebarFooter.svelte`, and its call site in
`App.svelte`.

## Overview

A white card at the bottom of the sidebar, titled "Randomness". It never scrolls or collapses.
Since iteration 2 it holds only what decides the picture's randomness:

- **Seed:** the text field (mono, so the case shows as typed) and a re-seed button.
- **Assets on load:** Fixed or Reseed.
- **Reroll assets:** reroll which variant each cell shows.
- **Preview a fresh load:** preview another visitor's load. It is disabled when nothing reseeds
  on load.

The two actions wear the re-seed icon: the shape, not a colour, says "draw again". Undo, New,
Import and Export moved to the [sidebar top bar](/editor/sidebar-top-bar/), and so did dropping a
zip.

## In detail

### Public surface

| Prop | Type | Meaning |
| --- | --- | --- |
| `loadSalt` | `number` (bindable) | §8.5's load-preview value. App holds it because `<Tileset>` reads it. |

### Inputs → outputs

| Control | Writes |
| --- | --- |
| Seed field (`.t-value`, mono, so the case shows as typed) | `setDefaultSeed(value)` on every `input` |
| New seed `IconButton` (`strong`) | `rerollSeed()` |
| Assets on load `Toggle` | `setReseedAssetsOnLoad(on)` |
| Reroll assets `Button` | `rerollAssets()` |
| Preview a fresh load `Button` (disabled unless `loadVaries`) | `loadSalt = drawLoadSalt()`; writes no field |

The fresh-load hint only says whether a fresh load varies. The inert-flags advisory (Operations
that reseed on load over a source that is not random) is now the `inertReseed` notice in the
preview's stack (`advisories.ts`, Stage 2 W3), not a clause in this hint.

### Look

A white card on the sidebar ground (`--color-card`), 8px from the edges, with 12px of padding
above and 16px at the sides and below. Its heading is a `.t-title`. The two actions share a row,
and stack in a narrow sidebar.

### Invariants

- **`loadSalt` writes no field** (§8.1) and moves only on this button (**R12**).
- **The seed field has no preview seed beside it** (§5): it writes `config.defaultSeed`.

### Callers / callees

Caller: `App.svelte` (`<SidebarFooter bind:loadSalt />`). Callees: `FieldRow`, `Hint`,
`IconButton`, `Toggle`, `Button`; `document.ts` (`setDefaultSeed`, `rerollSeed`, `rerollAssets`,
`setReseedAssetsOnLoad`); `reseed.ts` (`loadVaries`, `drawLoadSalt`). Export, Import, New and
Undo live in `SidebarTopBar` since iteration 2.

### Tests

None for the component. `reseed.test.ts` and `export.test.ts` cover what it calls.

### Review notes

- Every keystroke in the seed field is its own undo entry, as before the redesign.
- Salt values (`assetSalt`, `loadSalt`) are no longer displayed (Block B decision).
