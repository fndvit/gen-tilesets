---
title: App.svelte
description: The editor shell. The page grid, the sidebar (scrolling sections over a fixed footer), the live preview and the confirmation gate for destructive edits.
sidebar:
  order: 40
---

**Written from:** `apps/editor/src/App.svelte`, `apps/editor/src/main.ts`, `apps/editor/index.html`,
and the components and modules they import. No test file covers either.

## Overview

`App.svelte` is the whole editor screen. `main.ts` mounts it into the page, and from then on it
is the only top-level component. It defines the layout: a sidebar on the left (`--sidebar-w`)
and the preview on the right. The page itself never scrolls, so whatever the author changes in
the sidebar, the picture stays on screen. There is no header.

The sidebar is two parts, as in Figma. The top part scrolls and holds the sections: Grid & Size,
Breakpoints, Derived, Tiles and Operations. The bottom part is a fixed black footer with the
seed, undo, import, new document and download. At the top of the preview the shell can show two
notices: a confirmation when an edit would damage hand-placed work, and an advisory listing
operations a resize has pushed off the grid.

The preview is the package's own tileset component mounted on the document the editor holds,
so the editor shows exactly what a production page would draw. Over it, the shell layers the
outline of the operation being edited and, when that operation is hand-painted, the brush.

In the editor's pipeline (import → document → draft/history → preview → export), the shell is
the place where all five meet. It reads the document from the session, routes every edit
through it, and hands the open draft to the preview's overlays.

## In detail

### Purpose

`App.svelte` wires the editor's state modules to its components. It owns almost no logic of its
own: a handful of `$derived` values computed from `session.file` and `drafting.draft`, four
pieces of local state (`pending`, `loadSalt`, `failures`, `renderBox`), the destructive gate,
`newTileset`, and the markup. The sidebar sections live in `lib/sections/`. Every edit goes through `session.apply(transition)` with a transition from
[document.ts](/editor/document/). The header comment states the load-bearing rule: the preview
is `<Tileset>` on the file, drawing the complete operation stack, and overlays are drawn over
that output, never in place of it (cited as **S2**).

`main.ts` is four lines: it imports `mount` from Svelte and `App`, and mounts `App` on
`document.getElementById("app")!`. The `#app` element is in `apps/editor/index.html`.

### Public surface

Neither file exports anything. `App.svelte` takes no props. `main.ts` has a side effect only.

### Component tree

Which component renders which, in source order. Conditional children are marked.

- `main.ts` mounts `App` into `#app`
  - `App.svelte` (`main`: the page grid)
    - `aside` (sidebar, 1px ink frame, `--color-surface`)
      - `.scrollable`
        - [`GridSection`](/editor/grid-section/) "Grid & Size"
        - [`BreakpointsSection`](/editor/breakpoints-section/) (open when the file has rules)
        - [`DerivedSection`](/editor/derived-section/) (closed)
        - [`Section`](/editor/section/) "Tiles"
          - [`TileLibrary`](/editor/tile-library/)
        - [`Section`](/editor/section/) "Operations"
          - [`OperationStack`](/editor/operation-stack/), with a `draftPanel` snippet
            - [`OperationDraft`](/editor/operation-draft/) (*if* a draft is open)
      - [`SidebarFooter`](/editor/sidebar-footer/) (`.fixed`)
        - [`ImportPanel`](/editor/import-panel/), [`Popup`](/editor/ui-popup/)s for reports
    - `section.preview`
      - `.notices` (sticky, *if* either is showing): the confirmation (*if* `pending !== null`),
        "Orphaned by a resize" (*if* `orphaned.length > 0`)
      - [`PreviewFrame`](/editor/preview-frame/)
        - [`ReferenceControls`](/editor/reference-controls/)
        - [`ReferenceLayer`](/editor/reference-layer/) (*if* a reference image is loaded)
        - `children(Wpx)` snippet:
          - `<Tileset>` from `@vit-foundation/gen-tilesets/Tileset.svelte`
          - [`SelectionOverlay`](/editor/selection-overlay/) (*if* `shadow !== null`)
          - [`PaintLayer`](/editor/paint-layer/) (*if* the draft has a `cellList` param and `renderBox` is bound)
      - notes, asset failure list, "The file" `<details>` with the JSON

### Inputs → outputs

#### State it reads

| Source | What |
| --- | --- |
| [`session`](/editor/session/) | `file`; `apply`, `reset` |
| [`drafting`](/editor/drafting/) | `draft`, `editing`; `start`, `edit`, `discard` |
| local `$state` | `failures`, `renderBox`, `loadSalt` (bound into the footer), `pending` |

#### Derived values

| Name | From | Used by |
| --- | --- | --- |
| `file`, `config`, `rules` | `session.file` (`rules` is `file.responsive ?? []`) | everything |
| `shapedAt(Wpx)` | [`reshape`](/api/index/functions/reshape/)`(file, `[`ruleOverride`](/api/index/functions/ruleoverride/)`(`[`activeRules`](/api/index/functions/activerules/)`(rules, Wpx)))` | the frame's ratio and both overlays' geometry |
| `risked` | `atRisk(config)` from [orphans.ts](/editor/orphans/) | confirmation, Grid & Size hints, Breakpoints' pinned fields |
| `orphaned` | `orphans(config, config.defaultSeed, loadSalt)` | top advisory |
| `painting` | the draft's Selection schema, looked up via [`selections`](/api/index/variables/selections/), searched for a param of type `cellList` | `PaintLayer`, `PreviewFrame`'s `painting` |
| `shadow` | `toShadowOperation(draft)`, spliced into `config.operations` | `SelectionOverlay` |

#### The preview's props

`<Tileset {file} options={{ loadSalt, provider: editorProvider, onAssetError }} bind:box={renderBox} />`.

- **No `seed`.** The comment says the seed field writes `config.defaultSeed` and the component
  falls back to it, so the preview always shows what a visitor with no host seed would see. A
  separate preview seed "would let the author approve a picture the file does not produce".
- **`onAssetError` is always wired.** Each failure appends `"<tileId>/<assetId>: <cause>"` to
  `failures`, listed under the preview. A string already in the list is dropped, because the list
  is keyed by the string and a repeat would be a duplicate `{#each}` key, which Svelte throws on.
  The renderer reports a failure once per resolution (`provider.ts` `DrawableCache`), but it
  resolves again when an asset's `meta` changes, and the same picture can then fail the same way.
  The empty cell is not filled and no placeholder is drawn.
- **`renderBox`** is bound out so `PaintLayer` can convert pointer events into render space.
  Since the canvas substrate became the default, the box is the canvas's wrapper `<div>`, which
  is why it is typed `HTMLElement`.

The overlays are given geometry from `shapedAt(Wpx)` rather than from the base file, because
at a width where a rule changes `columns` the picture is not the base file's grid. The editing
controls keep reading the base, because the base is what they edit.

#### The destructive gate

`destructive(label, transition)` is passed to `GridSection`, which calls it for cell size, design
width and the alignment toggle.
If `needsConfirmation(config)` is true it parks `{ label, apply: transition }` in `pending`;
otherwise it applies at once. The confirmation, at the top of the preview, names every
Operation in `risked`, and "Change it"
calls `session.apply(pending.apply)`. Holding a `Transition` rather than a value means the
confirm step does not have to work out which field the value belonged to.

#### Operations panel

`onCreate` starts a draft with `nextOperationId(config.operations.map((o) => o.id))`; `onEdit`
calls `drafting.edit(op)`. `editingId` is `drafting.draft.id` only when `drafting.editing` is
true, so a create-draft renders under the button and an edit-draft under its row.

An `$effect` discards an edit-draft whose Operation is no longer in the stack (removed, or
undone away). Committing it would otherwise run `replaceOperation` against an id that matches
nothing, which `session.apply` correctly declines to push, so the button would seem to work
and do nothing.

#### New document

The footer's *New* button calls `newTileset` (passed as `onNew`), which is **confirmed and not
undoable**. It asks with `confirm(...)` first and returns if the author declines. Then it calls
`session.reset()`, sets `failures = []`, and awaits `replaceAll([])` to reclaim every picture the
session held. Reset comes first so the outgoing document is already gone from the preview: no
`<img>` then draws an object URL `replaceAll` has just revoked, and nothing reports those as
failures.

### Invariants

- **One preview, the real component** (**S2**). No preview mode and no second implementation.
- **Every edit is a transition through `session.apply`** and therefore undoable (**E6**). Undo,
  reset and import are the only other writes, and all three go through `session`. Reset (New
  document) is the one deliberate exception to undoability, and is confirmed first.
- **Destructive edits confirm only where something is at risk** (**E12**). A config holding only
  procedural Selections applies directly. The comment quotes the reason: "a dialogue that
  appears every time teaches the author to dismiss it before reading".
- **`loadSalt` writes no field and is held for the session** (**R12**). Only the footer's Fresh
  load button moves it.
- **`columns` is displayed, never edited** (**E1**). The Derived section shows it.
- **Advisories never block and never modify the file** (**E16**): orphans, inert flags and the
  empty-document note.
- **The draft is not in the document** (**E3**). The overlay resolves against a local shadow
  config, and `paintCells` writes into `draft.selectionParams` only.

### Callers / callees

| Caller | What |
| --- | --- |
| `apps/editor/src/main.ts:2` | `import App from "./App.svelte"` |
| `apps/editor/src/main.ts:4` | `mount(App, { target: document.getElementById("app")! })` |
| `apps/editor/index.html:10` | `<script type="module" src="/src/main.ts">`, with `<div id="app">` at line 9 |

`apps/demo/src/main.ts:2` also imports an `App.svelte`, but that is the demo's own file.

Callees, by import: from the package, [`selections`](/api/index/variables/selections/),
[`reshape`](/api/index/functions/reshape/), [`activeRules`](/api/index/functions/activerules/),
[`ruleOverride`](/api/index/functions/ruleoverride/), [`naturalRatio`](/api/render/functions/naturalratio/),
`Tileset.svelte`; from the editor, `assets.ts` (`editorProvider`, `replaceAll`), `document.ts`
(the `Transition` type), `draft.svelte.ts` (`toShadowOperation`), `drafting.svelte.ts`, `ids.ts`
(`nextOperationId`), `orphans.ts`, `session.svelte.ts`, the four `lib/sections/` components,
`Section`, `TileLibrary`, `OperationStack`, `OperationDraft`, `PreviewFrame`, `SelectionOverlay`,
`PaintLayer` and `ui/Button`.

### Tests

No test file. `.svelte` components cannot be unit-tested in this repo, so the logic the shell
calls is tested where it lives: `orphans.test.ts` pins `atRisk`, `needsConfirmation` and
`orphans`; `rules.test.ts` pins the Breakpoints transitions (`addRule`, `addRuleField`,
`removeRuleField`, `moveRule`, `removeRule`, `setRuleField`) and checks that each result
validates.

### Gotchas & rejected alternatives

- **A full-height shell, not a scrolling document.** `main` is a grid,
  `var(--sidebar-w) minmax(0, 1fr)` at `100dvh`. The sidebar's sections and the preview column
  each scroll their own contents. The two notices sit in the preview column, not above both
  columns, so the grid needs no conditional rows.
- **`min-width: 0` on both columns.** Without it the preview frame's explicit pixel width (up to
  1440px) would grow the grid track and squeeze the sidebar.
- **Destructive control is a number field, not the drag handle.** A page edge that can be dragged
  reads as a viewport, and a viewport does not destroy work.
- **Footer controls are temporary.** The footer's contents are Stage 2's design. Until then they
  are the old Seed and Import panels, the header's undo and the download button, built from
  primitives.
- **The shadow config replaces, then appends.** An edit-draft's id is already in the stack, so
  appending would put two Operations with one id in it, and `selection()` would find the
  unedited one first. Replacing by id covers both cases.
- **The dialog is a `div`, not a `section`.** A `section` carries an implicit `region` role and
  cannot take `alertdialog`.

### Review notes

- `failures` is append-only and never cleared, and the list is keyed by the string itself
  (`{#each failures as failure (failure)}`, line 900). The package calls `onAssetError` from
  inside a derivation (`Tileset.svelte:199`–`204`), so if the same asset fails again on a later
  re-derivation the same string would be appended twice and Svelte's keyed `each` would see a
  duplicate key. Not verified at runtime. **Fixed in 0.8.1:** `onAssetError` drops a failure
  string already in the list, and the package now reports on a microtask, not from inside the
  derivation. Since then the renderer also reports a failure once per resolution
  (`DrawableCache`) rather than on every reseed, and New document clears `failures`.
- The seed field (now in `SidebarFooter`) commits on every `input` without `NumericInput`'s draft-text model.
  The empty case is safe, because `setDefaultSeed` (`document.ts`) trims and refuses `""`.
  But every keystroke that changes the seed is its own undo entry, so undoing a typed seed
  takes one undo per character. The same holds for the tile rename in `TileLibrary`. The source
  does not say whether that is intended.
- Clicking "Add operation" while an edit-draft is open calls `drafting.start`, which replaces the
  open draft without asking. Nothing in the source says whether that is intended.
