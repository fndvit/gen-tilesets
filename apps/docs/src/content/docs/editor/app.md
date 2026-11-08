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

The sidebar is two parts, as in Figma. The top part scrolls and holds the sections: Grid & Size
(with its folded Details, which was the Derived section), Tiles, Operations and Breakpoints, in the
order a tileset is built in (batch 01, T-03). The bottom part is a fixed black footer with the
seed, undo, import, new document and download. The shell asks with a dialog before an edit
that would damage hand-placed work, and before starting a new document. Everything else the
document holds, such
as operations a resize has pushed off the grid or pictures that did not load, is a notice in a
stack floating over the preview.

The preview is the package's own tileset component mounted on the document the editor holds,
so the editor shows exactly what a production page would draw. Over it, the shell layers the
outline of the operation being edited and, when that operation is hand-painted, the brush.

In the editor's pipeline (import → document → draft/history → preview → export), the shell is
the place where all five meet. It reads the document from the session, routes every edit
through it, and hands the open draft to the preview's overlays.

## In detail

### Purpose

`App.svelte` wires the editor's state modules to its components. It owns almost no logic of its
own: a handful of `$derived` values computed from `session.file` and `drafting.draft`, some
local state (`pending`, `askingResize`, `askingNew`, `failures`, `conditions`, `renderBox`;
`loadSalt` is read from `preview.loadSalt`), the destructive gate, `newTileset`, `openOperation`, and the markup. The sidebar sections live in `lib/sections/`. Every edit goes through `session.apply(transition)` with a transition from
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
  - `App.svelte` (`main`: the page grid, two columns; one stacked column below `40rem` for
    reflow, where only the page scrolls)
    - `aside` (sidebar, 1px ink frame, `--color-surface`)
      - `.scrollable`, holding a [`ScrollArea`](/editor/ui-scroll-area/) (overlay scroll handle)
        - `.sections` (a one-column grid, no gap, 12px bottom padding)
          - [`GridSection`](/editor/grid-section/) "Grid & Size", ending in a folded "Details"
            group ([grid-details.ts](/editor/grid-details/))
          - [`TilesSection`](/editor/tiles-section/) "Tiles"
          - [`OperationsSection`](/editor/operations-section/) "Operations"
            - an [`OperationHeader`](/editor/operation-header/) per Operation, and
              [`OperationBody`](/editor/operation-body/) under the open one (*if* a draft is open)
          - [`BreakpointsSection`](/editor/breakpoints-section/) (open when the file has rules)
      - [`SidebarFooter`](/editor/sidebar-footer/) (`.fixed`)
        - [`ImportPanel`](/editor/import-panel/), [`Popup`](/editor/ui-popup/)s for reports
    - `section.preview`: [`PreviewTopBar`](/editor/preview-bars/), then `.canvas` (the backdrop)
      holding a [`ScrollArea`](/editor/ui-scroll-area/) (`fill`) and `.preview-body` (clips the grid)
      - `.stage` (centres the frame in the visible height), holding
        [`PreviewFrame`](/editor/preview-frame/)
        - `children(Wpx)` snippet:
          - [`PreviewGrid`](/editor/preview-grid/) (*if* `preview.showGrid`)
          - `<Tileset>` from `@vit-foundation/gen-tilesets/Tileset.svelte`
          - [`SelectionOverlay`](/editor/selection-overlay/) (*if* `shadow !== null`)
          - [`PaintLayer`](/editor/paint-layer/) (*if* the draft has a `cellList` param and `renderBox` is bound)
      - `NoticeStack` (`lib/preview/NoticeStack.svelte`), after the `ScrollArea` and inside
        `.canvas` (`position: relative`), so it stays put while the picture scrolls. It gets
        `notices.shown(conditions)` and `onDismiss={(n) => notices.dismiss(n)}`.
- two [`Dialog`](/editor/ui-dialog/)s after `main`: E12's resize confirmation and New tileset.
- `<svelte:window>` forwards `oninputcapture`, `onchange`, `onfocusout` and `onkeydown` to
  `entry` (`entry.svelte.ts`), which tracks whether the author is entering a value.

### Inputs → outputs

#### State it reads

| Source | What |
| --- | --- |
| [`session`](/editor/session/) | `file`; `apply`, `reset` |
| [`drafting`](/editor/drafting/) | `draft`, `editing`; `discard` |
| [`notices`](/editor/notices/) | `shown`, `forget`, `dismiss`, `clear` |
| `entry` (`entry.svelte.ts`) | `active`; `input`, `done`, `keydown` |
| [`opening`](/editor/opening/) | `open` (the orphan notice's action) |
| local `$state` | `failures`, `conditions`, `renderBox`, `pending`, `askingResize`, `askingNew` |

#### Derived values

| Name | From | Used by |
| --- | --- | --- |
| `file`, `config`, `rules` | `session.file` (`rules` is `file.responsive ?? []`) | everything |
| `drawn` | `draftFile(file, drafting.draft)` ([draft.svelte.ts](/editor/draft/)), or `null` with no draft | `shown`, the draft cue, `failures`' `drafted` |
| `shown` | `drawn ?? file` | `<Tileset>`, `liveFailures` |
| `shapedAt(Wpx)` | [`reshape`](/api/index/functions/reshape/)`(file, `[`ruleOverride`](/api/index/functions/ruleoverride/)`(`[`activeRules`](/api/index/functions/activerules/)`(rules, Wpx)))` | the frame's ratio and both overlays' geometry; from the saved file even while a draft is drawn, which has the same shape (`draftFile` changes only `config.operations`) |
| `risked` | `atRisk(config)` from [orphans.ts](/editor/orphans/) | confirmation, Grid & Size hints, Breakpoints' pinned fields |
| `orphaned` | `orphans(config, config.defaultSeed, loadSalt)` | `current` |
| `liveFailures` | the `failures` whose asset still has the same `meta` object, and, for one reported while a draft was drawn, whose tile a palette in `shown` still names (`paintedTiles`), as text | `current` |
| `current` | `documentNotices(file, orphaned, liveFailures, openOperation)` from `advisories.ts` | `conditions` |
| `painting` | the draft's Selection schema, looked up via [`selections`](/api/index/variables/selections/), searched for a param of type `cellList` | `PaintLayer`, `PreviewFrame`'s `painting` |
| `loadSalt` | `preview.loadSalt` ([view.svelte.ts](/editor/preview-width/)) | `<Tileset>`, `SelectionOverlay`, `orphaned` |
| `shadow` | `shadowConfig(config, draft)` ([draft.svelte.ts](/editor/draft/)) | `SelectionOverlay` |

#### The preview's props

`<Tileset file={shown} options={{ loadSalt, provider: editorProvider, onAssetError }} bind:box={renderBox} />`.

- **The live draft** (item 12, the **S2** amendment in the header comment). While the open draft
  is complete, `shown` is `draftFile(file, $state.snapshot(draft))` (a plain copy, so the engine
  never reads the draft's proxies per cell): the file with the draft's Operation in it,
  which is what Save will commit, so every change to the draft shows at once. While it is
  incomplete, or with no draft, `shown` is the saved file. A separate preview renderer was
  rejected because it could drift from what Save produces. **E3** is untouched. `shapedAt` keeps
  reading the saved file: reshaping `shown`, a new object on every change, rebuilt both overlays
  each time (N3 measured it as most of a weight drag's cost on 61×120).
- **The draft cue.** While `drawn !== null`, `.canvas` gets `.drafting` (a 2px `--color-accent`
  inset frame on an `::after` over the picture, under the notices, letting the pointer through),
  and [NoticeStack](/editor/notice-stack/) gets `draft`, which shows the "Draft · not saved" tag.

- **No `seed`.** The comment says the seed field writes `config.defaultSeed` and the component
  falls back to it, so the preview always shows what a visitor with no host seed would see. A
  separate preview seed "would let the author approve a picture the file does not produce".
- **`onAssetError` is always wired.** Each failure appends `{ ref, meta, text }` to `failures`.
  `text` is `"<tile name> · <assetId>: <reason>"`. The reason is "no file attached" when the
  store has no file for the asset (`stored()` from `assets.ts`), and the cause otherwise. `meta`
  is the asset's `meta` object at the time, and `drafted` whether a draft was being drawn. A failure whose text is already in the list is
  dropped: the notice's signature is the list, so a repeat would bring back a dismissed notice
  for nothing. The renderer reports a failure once per resolution (`provider.ts`
  `DrawableCache`), but it resolves again when an asset's `meta` changes, and the same picture
  can then fail the same way. The empty cell is not filled and no placeholder is drawn.
- **`liveFailures`** keeps only failures whose asset still has the same `meta` object. An import,
  or attaching the file again, writes a new `meta`, so the failure goes. A deleted asset's goes
  too. A failure reported while a draft was drawn also goes once no palette in `shown` names its
  tile, so discarding a draft takes its pictures' failures with it. A failure from the saved file
  is kept as before.
- **`renderBox`** is bound out so `PaintLayer` can convert pointer events into render space.
  Since the canvas substrate became the default, the box is the canvas's wrapper `<div>`, which
  is why it is typed `HTMLElement`.

The overlays are given geometry from `shapedAt(Wpx)` rather than from the base file, because
at a width where a rule changes `columns` the picture is not the base file's grid. The editing
controls keep reading the base, because the base is what they edit.

#### Notices

`current = documentNotices(file, orphaned, liveFailures)` is every condition the document holds:
§12.2's advisories and §12.3's failures. It is derived, so a notice goes away by itself when the
document no longer has the condition.

A numeric field commits on every keystroke that parses (**E5**), so `current` moves while the
author types. An effect copies `current` into `conditions` only when `entry.active` is false, so
the stack holds still until the value is committed. A second effect runs
`notices.forget(conditions)`, so a dismissal is forgotten when its condition goes, and the notice
returns if the condition does.

#### The destructive gate

`destructive(field, value, transition)` is passed to `GridSection`, which calls it for cell
size, design width and the alignment toggle, once the value is committed (the two fields use
`NumericInput`'s `commit="blur"`). If `needsConfirmation(config)` is true it parks
`{ field, value, apply: transition }` in `pending` and opens a [`Dialog`](/editor/ui-dialog/);
otherwise it applies at once. The dialog asks "Change cell size to 54?", lists every Operation in
`risked` in a well (its index square, then `id · selection type`), and its verb, "Change cell
size", calls `session.apply(pending.apply)`. Cancel drops `pending`; the field already shows the
file's value, because its draft went when it committed. Holding a `Transition` rather than a
value means the confirm step does not have to work out which field the value belonged to.

#### Opening an orphaned operation

`openOperation(id)` is handed to `documentNotices`, which puts "Open op-2" on the orphan notice
(one per orphaned operation, at most three). It calls `opening.open(id, "selection")`, which goes
through the unsaved-changes guard, opens the operation on its Selection step, and unfolds the
Operations section.

#### Operations panel

`App` renders `<OperationsSection />` with no props. Starting, opening and committing drafts all
happen in [OperationsSection](/editor/operations-section/) and
[OperationBody](/editor/operation-body/). What stays here is the preview side of the draft (the
shadow config, the overlay and the brush) and one guard.

An `$effect` discards an edit-draft whose Operation is no longer in the stack (removed, or
undone away). Committing it would otherwise run `replaceOperation` against an id that matches
nothing, which `session.apply` correctly declines to push, so the button would seem to work
and do nothing.

#### New document

The footer's *New* button calls `newTileset` (passed as `onNew`), which is **confirmed and not
undoable**. The button opens a [`Dialog`](/editor/ui-dialog/), "Start a new tileset?", and only
its verb, "Start new", calls `newTileset`. That calls
`session.reset()`, sets `failures = []`, calls `notices.clear()`, and awaits `replaceAll([])` to reclaim every picture the
session held. Reset comes first so the outgoing document is already gone from the preview: no
`<img>` then draws an object URL `replaceAll` has just revoked, and nothing reports those as
failures.

### Invariants

- **One preview, the real component** (**S2**). No preview mode and no second implementation.
  While a complete draft is open its input is the file with the draft in it (item 12).
- **Every edit is a transition through `session.apply`** and therefore undoable (**E6**). Undo,
  reset and import are the only other writes, and all three go through `session`. Reset (New
  document) is the one deliberate exception to undoability, and is confirmed first.
- **Destructive edits confirm only where something is at risk** (**E12**), and only once the
  value is committed (Pol, W1). A config holding only
  procedural Selections applies directly. The comment quotes the reason: "a dialogue that
  appears every time teaches the author to dismiss it before reading".
- **`loadSalt` writes no field and is held for the session** (**R12**). Only the footer's Fresh
  load button moves it.
- **`columns` is displayed, never edited** (**E1**). Grid & Size's Details shows it.
- **Advisories never block and never modify the file** (**E16**): orphans, inert flags and the
  empty-document note.
- **The draft is not in the document** (**E3**). The overlay resolves against a local shadow
  config, and `paintCells` writes into `draft.selectionParams` only.

### Callers / callees

| Caller | What |
| --- | --- |
| `apps/editor/src/main.ts:2` | `import App from "./App.svelte"` |
| `apps/editor/src/main.ts:7` | `mount(App, { target: document.getElementById("app")! })` |
| `apps/editor/index.html:10` | `<script type="module" src="/src/main.ts">`, with `<div id="app">` at line 9 |

`apps/demo/src/main.ts:2` also imports an `App.svelte`, but that is the demo's own file.

Callees, by import: from the package, [`selections`](/api/index/variables/selections/),
[`reshape`](/api/index/functions/reshape/), [`activeRules`](/api/index/functions/activerules/),
[`ruleOverride`](/api/index/functions/ruleoverride/), [`naturalRatio`](/api/render/functions/naturalratio/),
`Tileset.svelte`; from the editor, `advisories.ts` (`documentNotices`), `entry.svelte.ts`,
`notices.svelte.ts` (and the `Notice` type from `notices.ts`), `assets.ts` (`editorProvider`, `replaceAll`, `stored`), `document.ts`
(the `Transition` type), `draft.svelte.ts` (`toShadowOperation`), `drafting.svelte.ts`, `opening.svelte.ts`, `orphans.ts`, `session.svelte.ts`,
the five `lib/sections/` components (Grid, Tiles, Operations, Breakpoints, SidebarFooter),
`PreviewFrame`, `NoticeStack`, `SelectionOverlay`, `PaintLayer` and `ui/Dialog`.

### Tests

No test file. `.svelte` components cannot be unit-tested in this repo, so the logic the shell
calls is tested where it lives: `orphans.test.ts` pins `atRisk`, `needsConfirmation` and
`orphans`; `rules.test.ts` pins the Breakpoints transitions (`addRule`, `addRuleField`,
`removeRuleField`, `moveRule`, `removeRule`, `setRuleField`) and checks that each result
validates.

### Gotchas & rejected alternatives

- **A full-height shell, not a scrolling document.** `main` is a grid,
  `var(--sidebar-w) minmax(0, 1fr)` at `100dvh`. The sidebar's sections and the preview column
  each scroll their own contents. The notice stack sits in the preview column, and the dialogs
  are modal, so the grid needs no conditional rows.
- **The last section ends on a darker ground.** `--color-surface` is `--aqua-200`, and each
  open section body is the lighter `--color-section` (`--aqua-50`, Figma's colour). Sections touch
  (Pol); the `.sections` bottom padding lets the ground show under the last one,
  so where a section ends is visible before the footer (Pol, Block F review).
- **`min-width: 0` on both columns.** Without it the preview frame's explicit pixel width (up to
  1440px) would grow the grid track and squeeze the sidebar.
- **Destructive control is a number field, not the drag handle.** A page edge that can be dragged
  reads as a viewport, and a viewport does not destroy work.
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
  (`DrawableCache`) rather than on every reseed, and New document clears `failures`. Since
  Stage 2 W3 there is no keyed list: the failures are one notice.
- The seed field (now in `SidebarFooter`) commits on every `input` without `NumericInput`'s draft-text model.
  The empty case is safe, because `setDefaultSeed` (`document.ts`) trims and refuses `""`.
  But every keystroke that changes the seed is its own undo entry, so undoing a typed seed
  takes one undo per character. The tile rename no longer has this problem: `TileGroup` uses `ui/InlineEdit`, which commits once
  on Enter or blur. The source does not say whether the seed behaviour is intended.
- Clicking "Add operation" while an edit-draft is open calls `drafting.start`, which replaces the
  open draft without asking. Nothing in the source says whether that is intended. **Fixed in
  Block E:** the guard asks first, when the open draft differs from the file (`draftDiffers`).
  Since Stage 2 W4 it is the "Discard your changes?" `Dialog`, held in `opening.svelte.ts`.
