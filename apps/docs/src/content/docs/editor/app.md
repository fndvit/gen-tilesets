---
title: App.svelte
description: The editor shell. One page that holds the sidebar of controls, the live preview, the confirmation gate for destructive edits and the export button.
sidebar:
  order: 40
---

**Written from:** `apps/editor/src/App.svelte`, `apps/editor/src/main.ts`, `apps/editor/index.html`,
and the components and modules they import. No test file covers either.

## Overview

`App.svelte` is the whole editor screen. `main.ts` mounts it into the page, and from then on it
is the only top-level component. It defines the layout: a fixed-width sidebar on the left that
scrolls, and a preview column on the right that holds the picture. The page itself never
scrolls, so whatever the author changes in the sidebar, the picture stays on screen.

The sidebar is a stack of collapsible panels: Grid, Design, Breakpoints, Derived, Tiles,
Operations, Seed and Import, with a download button pinned underneath. Each panel either edits
one part of the open tileset document or opens a tool that does. Above both columns the shell
can show two banners: a confirmation box when an edit would damage hand-placed work, and an
advisory listing operations that a resize has pushed off the grid.

The preview is the package's own tileset component mounted on the document the editor holds,
so the editor shows exactly what a production page would draw. Over it, the shell layers the
outline of the operation being edited and, when that operation is hand-painted, the brush.

In the editor's pipeline (import → document → draft/history → preview → export), the shell is
the place where all five meet. It reads the document from the session, routes every edit
through it, hands the open draft to the preview's overlays, and calls the export.

## In detail

### Purpose

`App.svelte` wires the editor's state modules to its components. It owns almost no logic of its
own: a handful of `$derived` values computed from `session.file` and `drafting.draft`, three
pieces of local state (`pending`, `loadSalt`, `failures`, plus the export flags), and the
markup. Every edit goes through `session.apply(transition)` with a transition from
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
  - `App.svelte`
    - header: engine and schema version, **Undo** button
    - confirmation dialog (*if* `pending !== null`)
    - "Orphaned by a resize" advisory (*if* `orphaned.length > 0`)
    - `aside` (sidebar)
      - [`Section`](/editor/section/) "Grid"
        - [`NumericInput`](/editor/numeric-input/) rows, y offset
      - [`Section`](/editor/section/) "Design" (`destructive`)
        - [`NumericInput`](/editor/numeric-input/) design width, cell size
        - alignment segmented buttons (`column` / `gutter`)
      - [`Section`](/editor/section/) "Breakpoints" (open when the file has rules)
        - per rule: [`NumericInput`](/editor/numeric-input/) per present field, an "add field" `<select>`
        - "Add breakpoint" button
      - [`Section`](/editor/section/) "Derived" (closed): read-only `<dl>`, "New document"
      - [`Section`](/editor/section/) "Tiles"
        - [`TileLibrary`](/editor/tile-library/)
          - [`NumericInput`](/editor/numeric-input/) per asset weight
      - [`Section`](/editor/section/) "Operations"
        - [`OperationStack`](/editor/operation-stack/), with a `draftPanel` snippet
          - [`OperationDraft`](/editor/operation-draft/) (*if* a draft is open)
            - [`ParamFields`](/editor/param-fields/) → [`ParamControl`](/editor/param-control/)
            - [`PaletteBar`](/editor/palette-bar/) or [`NumericMapping`](/editor/numeric-mapping/)
            - [`BlendControl`](/editor/blend-control/)
      - [`Section`](/editor/section/) "Seed" (closed): seed field, rerolls, load preview
      - [`Section`](/editor/section/) "Import" (closed, `destructive`)
        - [`ImportPanel`](/editor/import-panel/)
      - download footer: export button, advisories
    - `section.preview`
      - [`PreviewFrame`](/editor/preview-frame/)
        - [`ReferenceControls`](/editor/reference-controls/)
        - [`ReferenceLayer`](/editor/reference-layer/) (*if* a reference image is loaded)
        - `children(Wpx)` snippet:
          - `<Tileset>` from `@fndvit/gen-tilesets/Tileset.svelte`
          - [`SelectionOverlay`](/editor/selection-overlay/) (*if* `shadow !== null`)
          - [`PaintLayer`](/editor/paint-layer/) (*if* the draft has a `cellList` param and `renderBox` is bound)
      - notes, asset failure list, "The file" `<details>` with the JSON

### Inputs → outputs

#### State it reads

| Source | What |
| --- | --- |
| [`session`](/editor/session/) | `file`, `canUndo`; `apply`, `undo`, `reset` |
| [`drafting`](/editor/drafting/) | `draft`, `editing`; `start`, `edit`, `discard` |
| local `$state` | `failures`, `renderBox`, `loadSalt`, `pending`, `exporting`, `exportError` |

#### Derived values

| Name | From | Used by |
| --- | --- | --- |
| `file`, `config`, `layout`, `rules` | `session.file` (`rules` is `file.responsive ?? []`) | everything |
| `shapedAt(Wpx)` | [`reshape`](/api/index/functions/reshape/)`(file, `[`ruleOverride`](/api/index/functions/ruleoverride/)`(`[`activeRules`](/api/index/functions/activerules/)`(rules, Wpx)))` | the frame's ratio and both overlays' geometry |
| `currentBleed` | `bleed(referenceWidth, cellSize, columns)` from `derive.ts` | Derived panel |
| `visibleHeight` | [`naturalHeight`](/api/render/functions/naturalheight/) at `Wpx = referenceWidth`, so `s = 1` and the result is in design px | Derived panel |
| `clipped` | `yOffset * cellSize` | Derived panel |
| `varies`, `inert` | `loadVaries(config)`, `inertFlags(config)` from [reseed.ts](/editor/reseed/) | Seed panel |
| `risked` | `atRisk(config)` from [orphans.ts](/editor/orphans/) | confirmation, Design and Breakpoints warnings |
| `orphaned` | `orphans(config, config.defaultSeed, loadSalt)` | top advisory |
| `painting` | the draft's Selection schema, looked up via [`selections`](/api/index/variables/selections/), searched for a param of type `cellList` | `PaintLayer`, `PreviewFrame`'s `painting` |
| `shadow` | `toShadowOperation(draft)`, spliced into `config.operations` | `SelectionOverlay` |
| `empty` | `drawsNothing(file)` from `export.ts` | export advisory |

#### The preview's props

`<Tileset {file} options={{ loadSalt, provider: editorProvider, onAssetError }} bind:box={renderBox} />`.

- **No `seed`.** The comment says the seed field writes `config.defaultSeed` and the component
  falls back to it, so the preview always shows what a visitor with no host seed would see. A
  separate preview seed "would let the author approve a picture the file does not produce".
- **`onAssetError` is always wired.** Each failure appends `"<tileId>/<assetId>: <cause>"` to
  `failures`, listed under the preview. The empty cell is not filled and no placeholder is drawn.
- **`renderBox`** is bound out so `PaintLayer` can convert pointer events into render space.
  Since the canvas substrate became the default, the box is the canvas's wrapper `<div>`, which
  is why it is typed `HTMLElement`.

The overlays are given geometry from `shapedAt(Wpx)` rather than from the base file, because
at a width where a rule changes `columns` the picture is not the base file's grid. The editing
controls keep reading the base, because the base is what they edit.

#### The destructive gate

`destructive(label, transition)` is called by design width, cell size and the alignment toggle.
If `needsConfirmation(config)` is true it parks `{ label, apply: transition }` in `pending`;
otherwise it applies at once. The dialog names every Operation in `risked`, and "Change it"
calls `session.apply(pending.apply)`. Holding a `Transition` rather than a value means the
confirm step does not have to work out which field the value belonged to.

#### Breakpoints panel

Each rule shows one `NumericInput` per field in `RULE_FIELDS` that the rule sets, each with a
× that calls `removeRuleField`. A `<select>` adds a missing field with `addRuleField`. The
`rows` and `columns` options are disabled (and labelled "pinned") while any Operation is
coordinate-bound. Arrows call `moveRule`; × calls `removeRule`; "Add breakpoint" calls
`addRule()`. The panel opens by default only when the file already has rules.

#### Operations panel

`onCreate` starts a draft with `nextOperationId(config.operations.map((o) => o.id))`; `onEdit`
calls `drafting.edit(op)`. `editingId` is `drafting.draft.id` only when `drafting.editing` is
true, so a create-draft renders under the button and an edit-draft under its row.

An `$effect` discards an edit-draft whose Operation is no longer in the stack (removed, or
undone away). Committing it would otherwise run `replaceOperation` against an id that matches
nothing, which `session.apply` correctly declines to push, so the button would seem to work
and do nothing.

#### Seed panel

The text field writes `setDefaultSeed` on every `input`. "New seed" applies `rerollSeed()`.
"Reroll assets" applies `rerollAssets()` and shows `assetSalt`. A checkbox writes
`setReseedAssetsOnLoad`. "Preview a fresh load" sets `loadSalt = drawLoadSalt()` and writes no
field. It is disabled when `loadVaries(config)` is false. If any Operation carries
`reseedOnLoad` over a non-stochastic Source, an advisory lists them and does not clear the flag.

#### Export

`runExport()` awaits `exportZip(file)`, shows "Building…" while it runs, and puts any thrown
message in `exportError`. When `drawsNothing(file)` is true, an advisory says so, and the export
is still allowed.

### Invariants

- **One preview, the real component** (**S2**). No preview mode and no second implementation.
- **Every edit is a transition through `session.apply`** and therefore undoable (**E6**). Undo,
  reset and import are the only other writes, and all three go through `session`.
- **Destructive edits confirm only where something is at risk** (**E12**). A config holding only
  procedural Selections applies directly. The comment quotes the reason: "a dialogue that
  appears every time teaches the author to dismiss it before reading".
- **`loadSalt` writes no field and is held for the session** (**R12**). Only the "Preview a fresh
  load" button moves it.
- **`columns` is displayed, never edited** (**E1**). The Derived panel shows it with a "derived"
  tag.
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

Callees, by import (`App.svelte:19`–`69`): from the package, [`selections`](/api/index/variables/selections/),
[`reshape`](/api/index/functions/reshape/), [`activeRules`](/api/index/functions/activerules/),
[`ruleOverride`](/api/index/functions/ruleoverride/), [`naturalHeight`](/api/render/functions/naturalheight/),
[`naturalRatio`](/api/render/functions/naturalratio/), `Tileset.svelte`; from the editor,
`assets.ts` (`editorProvider`), `derive.ts` (`bleed`), `download.ts` (`exportZip`), `export.ts`
(`drawsNothing`), `document.ts` (sixteen transitions and `ENGINE_VERSION`), `draft.svelte.ts`
(`toShadowOperation`), `drafting.svelte.ts`, `fields.ts` (four parsers, `RULE_FIELDS`,
`RULE_PARSERS`), `ids.ts` (`nextOperationId`), `orphans.ts`, `reseed.ts`, `session.svelte.ts`,
and the nine `lib/` components in the tree above.

### Tests

No test file. `.svelte` components cannot be unit-tested in this repo, so the logic the shell
calls is tested where it lives: `orphans.test.ts` pins `atRisk`, `needsConfirmation` and
`orphans`; `rules.test.ts` pins the Breakpoints transitions (`addRule`, `addRuleField`,
`removeRuleField`, `moveRule`, `removeRule`, `setRuleField`) and checks that each result
validates.

### Gotchas & rejected alternatives

- **A full-height shell, not a scrolling document.** The page does not scroll; the sidebar and
  the preview column each scroll their own contents. `main` is a flex column rather than grid
  rows because the dialog and the orphan banner are conditional, and a fixed row template would
  put the flexible track under the wrong child.
- **`min-width: 0` on both columns.** Without it the preview frame's explicit pixel width (up to
  1440px) would grow the grid track and squeeze the sidebar.
- **Destructive control is a number field, not the drag handle.** The comment: a page edge that
  can be dragged reads as a viewport, and a viewport does not destroy work. So the harmless
  control is the drag handle and the destructive one is the numeric field.
- **Export is pinned, import is not.** Export "ends the session" and should not need scrolling
  to; import starts one, so it is an ordinary `Section` at the bottom.
- **The shadow config replaces, then appends.** An edit-draft's id is already in the stack, so
  appending would put two Operations with one id in it, and `selection()` would find the
  unedited one first. Replacing by id covers both cases.
- **The dialog is a `div`, not a `section`.** A `section` carries an implicit `region` role and
  cannot take `alertdialog`.

### Review notes

- `App.svelte:886` says "what Step 11 will export". The export exists (the download footer at
  line 766). The comment is stale.
- `failures` is append-only and never cleared, and the list is keyed by the string itself
  (`{#each failures as failure (failure)}`, line 876). The package calls `onAssetError` from
  inside a derivation (`Tileset.svelte:199`–`204`), so if the same asset fails again on a later
  re-derivation the same string would be appended twice and Svelte's keyed `each` would see a
  duplicate key. Not verified at runtime.
- The seed field (line 674) commits on every `input` without `NumericInput`'s draft-text model.
  The empty case is safe, because `setDefaultSeed` (`document.ts:325`) trims and refuses `""`.
  But every keystroke that changes the seed is its own undo entry, so undoing a typed seed
  takes one undo per character. The same holds for the tile rename in `TileLibrary`. The source
  does not say whether that is intended.
- Clicking "Add operation" while an edit-draft is open calls `drafting.start`, which replaces the
  open draft without asking. Nothing in the source says whether that is intended.
