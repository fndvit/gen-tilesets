# Harvest ledger

Append-only. One block per completed document, pasted from that conversation's
end-of-conversation checklist items 3 and 4. Never rewritten, never summarized.

**This file is not sufficient input on its own.** It was once described as _the only input the
`01` harvest needs_, and the `01` pass of 2026-08-05 found no `09` block here at all — the
document had landed and the block was never appended. Nothing was lost, because the harvest
read `09-editor.md` directly. The failure is invisible by construction: an append-only file
with a missing entry is indistinguishable from one that is current, so no inspection of this
file could have detected it. **A harvest therefore checks this file against the document list
before trusting it**, and the absence of a block is a question rather than an answer. Recorded
as `01` open question 9, alongside the mirror-image failure `00` §10.2 records.

The `00` harvest has never run, and `roadmap`'s second pass consumed the `09` block on
2026-08-06. For both, this file is a supplement in the same way: their input is the
`[EXTENSION POINT]` / `[POSTPONED]` tables in every completed document, plus the "Not in this
document" routings that name them, plus the blocks below.

**The `09` block's closing note is wrong about the Amended header lines** and is left standing
because blocks are not rewritten. It records that none of `02`, `03`, `04` carries one for the
`09` amendments; `02` and `04` both do, and `03` was never owed one, since all three amendments
land in those two documents. Found by the `roadmap` pass, which had already repeated the claim
once before opening the headers.

## Why this file starts at `07`

Deliberate, and recorded so the absence does not read as an oversight.

`01-glossary.md` was re-harvested after `06-config-schema.md` landed and is current through
`06`: `01` §1.2 records that pass, §3.1 notes the six rows it closed, and the vocabulary `06`
coined — `TilesetFile`, `ParamSpec`, `ValidationError`, the error code table — is already in
place. Blocks for `02`–`06` would restate what the glossary already holds, and the glossary is
the source of truth for terminology, not this file.

This ledger exists because that harvest had to reconstruct its own input by reading every spec.
From `07` onward the input is written down as each document lands.

**If a term from `02`–`06` turns out to be missing**, the fix is a patch to `01`, not a
retroactive block here. This file records what has not yet been harvested; it is not an archive
of what has.

## How a block is retired

When a harvest consumes a block, mark its heading `— harvested into 01, <date>` and leave the
block in place. Do not delete it. The ledger is append-only for the same reason `01` §11.4's
section numbers are: a deleted block is indistinguishable from one that was never written, and
the next harvest has no way to tell whether it is looking at new material or at a gap.

**The marker is applied by the harvest, never by the conversation that writes the block.** Both
markers below were once applied at authoring time and struck on inspection: `01` had none of
`render box`, `Wpx`, or `onAssetError`. A marker is a claim about `01`, so it is only true once
`01` has changed, and it is verified by opening `01` rather than by trusting this file.

---

## 07-render-contract.md — ~~harvested into 01, 2026-08-04~~ (unearned, struck) · **harvested into 01, 2026-08-05**

### Terms coined

| Term                                      | Owner                | Note for the glossary                                                                                                                |
| ----------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Render box**                            | `07` §5.1            | The rectangle the grid is drawn into. Its width `Wpx` is supplied by the host; it is the only clipping boundary (**R9**).            |
| **Render space**                          | `07` §5.1            | Rendered px, origin at the render box's top-left. The third space, alongside grid space and design px.                               |
| **Scale factor**                          | `07` §5.1            | `s = Wpx / referenceWidth`. Derived from width alone; height never affects it. **Closes the `[UNHARVESTED]` row in `01` §6.**        |
| `Wpx`                                     | `07` §5.1            | The render box's width in rendered px. Host-supplied. Whether it is border-box or content-box is `07` Q7 → `08`.                     |
| **Cell box**                              | `07` §5.2            | A cell's rect in render space. A function of `Layout`, `rows`, `columns`, and `Wpx` alone (**R5**).                                  |
| **Drawable box**                          | `07` §6.1            | The cell box at scale 1. The reference every transform is taken against; its centre is the cell box's centre.                        |
| `Drawable`                                | `07` §4.1            | What an `AssetRef` resolves to. Concrete type deferred to `08` (`07` Q4).                                                            |
| `AssetProvider`                           | `07` §4.1            | `(ref: AssetRef) -> Drawable \| Promise<Drawable>`. Pure per render session (**R2**).                                                |
| `AssetRef`                                | `07` §4.1            | `{ tileId, assetId, meta }`. The key is the **pair**, because `TileAsset.id` is unique within its Tile only (`06` §6).               |
| `cellBox(x, y)`                           | `07` §5.2, §8.1      | Forward coordinate mapping. Public surface.                                                                                          |
| `cellAt(px, py)`                          | `07` §8.2            | Inverse mapping. **Total and unbounded** — may return coordinates outside the grid, because `rect` may extend past it (`04` §4.2).   |
| **Coordinate mapping**                    | `07` §8, **R1**      | The pair above. One implementation; overlays use the geometry the renderer drew with.                                                |
| **Render session**                        | `07` §9.1            | One caller holding one `(file, seed, loadSalt)` triple. `generate()` runs when it begins and when one of the three changes.          |
| **Authoring resize**                      | `07` §9.1            | The author drags the design page width; `referenceWidth` changes and `columns` is re-derived. A destructive config edit (`02` §7.5). |
| **Viewport resize**                       | `07` §9.1            | A visitor changes their window; `Wpx` and `s` change. A pure scale change — **no regeneration**.                                     |
| **Centre-crop**                           | `07` §6.4, **R8**    | How a non-square asset is fitted to the drawable box, before any transform. Declarative, so no measurement is needed.                |
| **Natural height**                        | `07` §5.3            | `s * (rows − yOffset) * cellSize`. The box that exactly contains the visible grid. A default, not a constraint.                      |
| **Row-major paint order**                 | `07` §7.4, **R10**   | Ascending `y`, then ascending `x`. Part of the rendered output, not an implementation choice.                                        |
| **Applier**                               | `07` §10             | The table entry that turns one named attribute into drawing. Keyed by attribute name.                                                |
| **Facet**                                 | `07` §10.1           | Which part of drawing an attribute contributes to: `transform` or `compositing`.                                                     |
| **Composition order**                     | `07` §10.1           | A transform contributor's ordinal. `03` **D11** generalized.                                                                         |
| **Geometry vectors**                      | `07` §11.3, **R15**  | `(Layout, rows, columns, Wpx, x, y) → cellBox`, plus the `cellAt` round trip. Exact, browserless.                                    |
| **Transform vectors**                     | `07` §11.3, **R15**  | `(scaleX, scaleY, rotation, cellBox) → [a b c d e f]`. Catches **D11**, the rotation sign, the centre.                               |
| `meta.src` / `meta.width` / `meta.height` | `07` §4.4            | The default provider's V1 convention. `width` and `height` are measured once at attach time and read by nothing in V1.               |
| **Cost of arrival**                       | `roadmap` §3.2       | Seven named tiers labelling rules already fixed by `05` §10.2, `06` §4.3, **X9**, **R14**.                                           |
| **Gated on** / **gate discharged**        | `roadmap` §3.2, §5.1 | What must land first; and the case where later work removed a blocker without the blocked row being updated.                         |

### For `01` §10.1 — rejected

| Do not write                                              | Write                               | Because                                                                                                                                     |
| --------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-cell clipping                                         | the render box as the only boundary | It would clip the two features the attribute set exists to provide: a bare 45° rotation already spills (`07` §7.1).                         |
| Stretch, or letterbox                                     | centre-crop                         | Stretch distorts silently; letterbox breaks **R7**'s tangency for some assets and not others (`07` §6.4).                                   |
| A provider returning `null`                               | throw or reject                     | A `null` drawable is a third way to express emptiness alongside `tileId: null` and `opacity: 0` (`07` §4.3, `06` §5.1).                     |
| A provider keyed on `assetId` alone                       | the `(tileId, assetId)` pair        | `TileAsset.id` is unique within its Tile only, so one Tile's `a1` would resolve to another's drawable, silently, forever (`07` §4.1).       |
| _"identical grid output"_ as the test for a renderer bump | identical **drawn** output          | Reversing **D11** leaves `generate()` byte-identical and changes every rotated, non-uniformly scaled tile (`07` §11.1; `05` §10.2 amended). |

### Closes in `01` §3.1

Deferral vocabulary · layer compositing vocabulary, whose owner moved here from `07`/`08`.

### For `01` §10.2 — reserved

| Word                 | Held for                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crop`, `sourceRect` | The author-controlled crop `meta` key. `[EXTENSION POINT]` — costs no `schemaVersion` bump, and must ship with a default equal to the centre square (`07` §6.4, §13). |

### For `01` §10.3 — collisions deliberately tolerated

| Collision                                                                                         | Why it stands                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **resize** means an authoring edit and a viewport change                                          | Genuinely different events with different costs. `07` §9.1 carries the two-row table that keeps them apart; the first re-derives `columns`, the second changes only `s`. |
| **scale** means an attribute (`scaleX`, `scaleY`) and the viewport **scale factor** `s`           | Different layers entirely. `07` says _scale factor_ for the second throughout, and **R7** exists to state precisely how the two meet at the number `1`.                  |
| **schema** means the config format (`06`) and the registry's `ParamSchema` (`05` §5.1, `06` §7.4) | Different layers, neither renameable now. `roadmap` §4.1 carries the note, because the two extension-point rows contradict each other on their face.                     |

### Closes in `01` §3.1

Asset provider contract · the contents of a TileAsset's `meta` block · transform mathematics ·
how the caller draws `loadSalt` and what it does with `defaultSeed` · renderer-side regression
snapshots · scale factor.

Layer compositing vocabulary is partly filled — `07` §13 fixes that layers supply the paint
order **R10** leaves no room for within a grid — and stays open pending `08`.

### For `roadmap.md`

`[EXTENSION POINT]`

| Point                                                            | Note                                                                                                                              |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Author-controlled cropping — a `meta` key carrying a source rect | Costs no `schemaVersion` bump (**C4**, **R4**); must ship with a default equal to the centre square or its arrival breaks **R14** |
| Layer compositing — N grids stacked by the renderer              | `03` §8; layers must agree on `rows`, `columns`, `cellSize`; the layer supplies paint order                                       |
| Multiple Layouts keyed by `minWidth`                             | `02` §12, `06` §12; changes which `Layout` parameterizes `07` §5, not the formula                                                 |
| Open attribute registry                                          | The applier contract now exists (`07` §10, **R13**). Gated on `03` **D7** and a `schemaVersion` bump; **no longer gated on `07`** |
| DPR-aware asset selection                                        | Entirely inside the provider; **R2** requires only that one session sees one answer                                               |
| Vertical bleed as a `Layout` field                               | Achievable today through the render box's height (`07` §7.3); a field would be a bump                                             |

`[POSTPONED]`

| Point                                       | Note                                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Pixel-level compositing regression artifact | `07` §11.3; paint order, clipping, crop, and alpha resist everything short of the brittle comparison `05` Q5 rejected         |
| Skipping work for provably invisible cells  | `03` §6.4 calls it an optimization for `07`; it interacts with `07` §4.3, since a skipped resolution is an unreported failure |

### For `roadmap.md`

`[EXTENSION POINT]`: harvest passes for `09` and `00`.
`[POSTPONED]`: a _next_ marker; per-item revisit lists.

### Open questions handed forward

| From    | Question                                                           | To                  |
| ------- | ------------------------------------------------------------------ | ------------------- |
| `07` Q1 | Compositing half of the renderer regression artifact               | Open; `[POSTPONED]` |
| `07` Q2 | Is `loadSalt` an exposed prop or sealed inside the component?      | `08`                |
| `07` Q3 | Does the component adopt its natural height or fill its container? | `08`                |
| `07` Q4 | What is a `Drawable`, concretely?                                  | `08`                |
| `07` Q5 | Should `meta` be validated at all?                                 | Open                |
| `07` Q6 | Does the editor ever want `cellAt` bounded?                        | `09`                |
| `07` Q7 | Is `Wpx` border-box or content-box?                                | `08`                |

---

## 08-renderer-svelte.md — ~~harvested into 01, 2026-08-04~~ (unearned, struck) · **harvested into 01, 2026-08-05**

### Terms coined

| Term                                      | Owner             | Note for the glossary                                                                                                                                                                                    |
| ----------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Host**                                  | `08` §3.2         | Whatever mounts `<Tileset>` — a page, a layout, `09`. Supplies a valid file and a provider, owns the render box's width and the error channel. Distinct from **caller**, which is the component.         |
| `<Tileset>`                               | `08` §3, **S1**   | The one entry point. Takes a `TilesetFile`, calls `generate()`, draws. Nothing in the package accepts a `Grid<TileState>`.                                                                               |
| `Drawable`                                | `08` §4.2, **S5** | `{ src: string }`, drawn as an `<img>`. Raster and SVG alike are sealed pictures — not stylable from the host page. **Closes `07` Q4.**                                                                  |
| **Default provider**                      | `08` §4.3         | `(ref) => ({ src: ref.meta.src })`. Renames one field; fetches, measures, and caches nothing. Throws on an absent or non-string `src`.                                                                   |
| **Render box element**                    | `08` §6.2, **S9** | The DOM element the component owns. No padding, no border, so `Wpx` is unambiguous. Carries the clip **R9** requires and the positioning context for cells. **Closes `07` Q7.**                          |
| **Natural ratio**                         | `08` §6.1, **S8** | `referenceWidth : (rows − yOffset) * cellSize`. Declared instead of a height, so height follows width with no measurement. The primary quantity; `07` §5.3's _natural height_ is it multiplied by `Wpx`. |
| **Resolution failure** / **load failure** | `08` §4.4, **S6** | The two ways a cell ends up with no drawable: the provider throws, or the `<img>` errors. Both empty the cell and report.                                                                                |
| `onAssetError`                            | `08` §4.4         | `(ref: AssetRef, cause: unknown) => void`. The single error channel `07` §4.3 left shapeless.                                                                                                            |
| `cellBox` / `cellAt` as exports           | `08` §7, **S10**  | Pure functions of `(layout, rows, columns, Wpx, …)`, not component methods. What `07` **R15**'s geometry vectors test.                                                                                   |

### Corrections to already-harvested entries

| Entry                 | Currently                                                                    | Should read                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `01` §5, **Caller**   | "Whatever invokes `generate()`… usually the renderer, but not by definition" | `<Tileset>`, permanently (`08` **S1**). The _role_ is closed; add **Host** beside it for what mounts the component. |
| `01` §5, **Renderer** | "The consumer of engine output"                                              | Also its producer's caller. The renderer invokes `generate()` rather than receiving its output from elsewhere.      |

### For `01` §10.1 — rejected

| Do not write                                              | Write                                             | Because                                                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A component taking `(grid, layout)`                       | `<Tileset {file} />`                              | Nothing produces a grid that did not come from a file, and split props make a mismatched grid/`Layout` pair expressible and undetectable (`08` §3.1). |
| "Preview mode", or a second component for the editor      | one component, with overlays drawn over it        | `07` §3 made literal by `08` **S2**. Two implementations drift, and the drift surfaces where the author is looking directly at it.                    |
| `Drawable = string`                                       | `{ src: string }`                                 | A bare string cannot grow; `07` §13's DPR point would be a breaking change instead of an added key (`08` §4.2).                                       |
| Drawing `loadSalt` in component init or a module constant | a prop, drawn by the host once                    | Both run twice under SSR and produce two pictures for one page (`08` §5.1).                                                                           |
| Alt text or accessible names on tiles                     | `aria-hidden`, `alt=""`                           | The output is decorative; meaningful content is never a tile (`08` §4.5).                                                                             |
| A width prop                                              | CSS, and `Wpx` as whatever width the element gets | Measuring reintroduces exactly what `07` §5.3 removes (`08` §4).                                                                                      |

### For `01` §10.2 — reserved

| Word                | Held for                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `srcset`, `sources` | The DPR-aware `Drawable` key. `[EXTENSION POINT]` — additive under **S5**.                                                 |
| `markup`, `inline`  | Recolourable tiles via inlined SVG. `[EXTENSION POINT]` — a second `Drawable` shape and a second draw path.                |
| `layers`            | The layer feature, whose real content is enforcing agreement on `rows`, `columns`, `cellSize`, `referenceWidth` (`08` §8). |

### For `01` §10.3 — collisions deliberately tolerated

None new. **Host** is introduced specifically to avoid overloading _caller_, which `07` §9 had left ambiguous.

### Closes in `01` §3.1

Component API and props · the concrete type of a `Drawable` · the `loadSalt` mechanism · the
sizing default · the `Wpx` box model · the provider's error channel · how the coordinate mapping
is exposed.

**Layer compositing vocabulary stays open**, and its owner moves. `08` §8 defers the feature to a
`schemaVersion` bump, so the terms belong to `roadmap.md` rather than to `07`/`08` as `03` §8
originally routed them.

### For `roadmap.md`

`[EXTENSION POINT]`

| Point                                                     | Note                                                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Recolourable tiles — inlined SVG markup                   | A second `Drawable` shape and draw path; moves no picture already drawn, so **R14** is untouched. Brings sanitisation and loses image caching. |
| DPR-aware `Drawable` — `srcset` or a resolution-keyed set | Additive key under **S5**; `07` §13 already puts the selection inside the provider                                                             |
| A bare-grid drawing surface                               | Would split `<Tileset>` into a caller and a surface (`08` §3.1). **S1** restated, not removed.                                                 |
| Canvas or WebGL substrate                                 | `02` **G5** and `07` §3.1 keep it live; gated on node count biting, and it forecloses SSR                                                      |

`[POSTPONED]`

| Point                                             | Note                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Layers — N grids with enforced agreement          | `08` §8; a `schemaVersion` bump. Unenforced stacking already works via host CSS, which is the trap. |
| Non-decorative output — accessible names on tiles | `08` §4.5; needs a reason for a background to be content                                            |

### Open questions handed forward

| From    | Question                                                                       | To                           |
| ------- | ------------------------------------------------------------------------------ | ---------------------------- |
| `08` Q1 | Should the component memoize resolution per session, making **R2** structural? | Open — implementation        |
| `08` Q2 | Does **S6** belong in `07` **R3** rather than in `08`?                         | `07`, if taken               |
| `08` Q3 | How does the component know whether it is a development or production build?   | Open — implementation        |
| `08` Q4 | Is `Wpx` ever needed before first paint?                                       | Open; nothing in V1 needs it |
| `08` Q5 | Should `meta` be validated at all? (`07` Q5)                                   | Open                         |
| `08` Q6 | Does the editor ever want `cellAt` bounded? (`07` Q6)                          | `09`                         |

---

## 09-editor.md — **harvested into 01, 2026-08-05** · **harvested into roadmap, 2026-08-06**

**Written retroactively by the `01` harvest, not by the `09` conversation.** This inverts the
rule under _How a block is retired_ — the harvest is supposed to apply the marker and never to
author the block — and it is recorded rather than tidied, because a block that looks like every
other block would conceal that its own provenance is different. Reconstructed from
`09-editor.md` §3–§14; the conversation that wrote that document is discarded and cannot be
consulted.

### Terms coined

| Term                       | Owner               | Note for the glossary                                                                                                                                                             |
| -------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manufactured guarantee** | `09` §3, **E1**     | A property no document enforces because the editor produces it. Six of them. **An advisory diagnostic is the shadow of one** — four of the six are exactly `06` §10.4's rows.     |
| **Legal transition**       | `09` §4.2, **E5**   | Every file-touching action is `TilesetFile → TilesetFile`, total on legal input. In-flight input lives in the control. Makes a `ValidationError` unreachable while editing.       |
| **Transient UI state**     | `09` §4.1, **E3**   | Editor state held beside the file, keyed by the identifiers the file already carries. Session-scoped. **E4** forbids parking it in `meta`.                                        |
| **Mute-by-removal**        | `09` §4.1           | No disabled flag; muting is removal plus UI state. Correct for free under **G3** — a muted-then-unmuted Operation draws exactly what it drew.                                     |
| **Overlay**                | `09` §6.1, **E7**   | Exactly one kind: low-opacity rectangles over an Operation's selected cells, drawn from `cellBox`. `07` §3.1 anticipated a family; V1 ships the first only.                       |
| `selection()`              | `09` §6.2, **E8**   | `(config, operationId, seed, loadSalt) -> (x, y) -> boolean`. **The document's one substantive ask of a completed spec** — `02` §12 gains it. Total and unbounded, like `cellAt`. |
| **Affordance**             | `09` §3.1           | A control plus its obligation. This document specifies affordances, never appearance.                                                                                             |
| **Affordance mapping**     | `09` §7.1, **E9**   | `ParamSpec` → control, driven by bounds rather than a widget table. **Total**, so a registered type needs no editor code. `cellList` is the one declared exception (§7.3).        |
| **`editor` block**         | `09` §7.2           | Optional on a Registration: `label`, `description`, `control`. Package-internal, no bump of any kind. **The one place in the package where an unknown name is not an error.**     |
| **Soft track**             | `09` §7.5           | A track that extends to contain any typed value and never clamps one. `[−2, 2]` for scale — a UI constant with no authority anywhere.                                             |
| **Authoring range**        | `09` §7.5           | The finite track drawn for an attribute whose domain is open. Distinct from **domain** (**D4**).                                                                                  |
| **Palette bar**            | `09` §7.6           | The palette as one contiguous weight-segmented bar, not a list — because under a banded Source, threshold adjacency is spatial adjacency (**O6**).                                |
| **Design width**           | `09` §9.3, **E12**  | The **numeric** control writing `referenceWidth`. Destructive; three fields trigger the re-derivation, not one.                                                                   |
| **Preview width**          | `09` §9.2, **E11**  | The **draggable** control. Sets `Wpx`, writes nothing, never confirmed. `07` §9.1's second row, already specified.                                                                |
| **Load preview**           | `09` §8.5, **E10**  | A control drawing a fresh `loadSalt` and passing it as a prop. Persists nothing. Disabled where no flag is set.                                                                   |
| **Asset attach**           | `09` §10.3, **E13** | Measure and write `src`, `width`, `height` together — **or fail**. A `meta` block missing two of the three is never written.                                                      |
| **Export folder**          | `09` §11.1, **E14** | `tileset.json` beside `tiles/<tileId>/<assetId>.<ext>`. Nested, not flat: the directory structure is the pair, for the reason the provider key is.                                |
| **The import gate**        | `09` §12.1, **E15** | Validation is a gate at import and an assertion while editing. **Every `ValidationError` an author sees originates at import** — on the one screen with no file and no preview.   |
| **Editor-only** (a cost)   | `09` §14.1          | An eighth cost tier: nothing pins the editor's version, so no number anywhere moves. Closes `roadmap` Q3.                                                                         |

**Five advisory diagnostics coined** (`09` §12.2), joining `06` §10.4's four for nine in V1:
nothing to draw · two Tiles sharing a `name` · a non-square asset will be centre-cropped · a
palette reordered under `random` · a stepped `rotation` mapping whose endpoints coincide mod 360.
Diagnostic 7 is the **only consumer of `meta.width` / `meta.height` in the package**.

### Corrections to already-harvested entries

| Entry                              | Currently                                                       | Should read                                                                                                                                            |
| ---------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `01` §5, **Editor**                | "The authoring tool that produces a `TilesetFile`"              | Also a **host** (`08` §3.2) and **the only writer** of a `TilesetFile` (`09` §3, **E1**) — the clause the six manufactured guarantees hang from.       |
| `01` §5.3, **Advisory diagnostic** | "Three exist in V1"                                             | **Four** in `06` §10.4 — `07` §5.2 added the fourth in passing — and nine once `09` §12.2's five are counted. `01` §3.1 carried the same stale figure. |
| `01` §6, **Destructive edit**      | "V1 behaviour is warn-and-confirm; Selections are not migrated" | Correct, but attached to the wrong control. `09` §9.2 withdraws `02` §7.5's premise: it is the numeric **design width**, and three fields trigger it.  |
| `01` §7.1, `Tile.name`             | "disambiguating two Tiles called _leaf_ is `09`'s problem"      | Answered: the editor **never blocks a rename**, suffixes the id where two collide, and raises an advisory. Display behaviour; the file is untouched.   |
| `01` §8.7, **Registration**        | `{ kind, name, params, impl, ...kind-specific }`                | Gains an optional `editor` block (`09` §7.2), which resolves `05` Q6 by generalizing it.                                                               |

### For `01` §10.1 — rejected

| Do not write                                                        | Write                                      | Because                                                                                                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A second document model projecting to a file on export              | the file **is** the editor's state         | A projection can differ from what previews, and **S2** requires a live file at every instant regardless — so it adds a divergence without removing a requirement (§4.1, **E3**).               |
| An `editor` block, or `meta`, for editor state                      | UI state beside the file                   | `meta` is tempting because **C4** exempts it, and **R4** makes anything put there permanent and shipped to every host. A top-level block is a bump for a key no consumer reads (§4.1, **E4**). |
| A `disabled` flag on an Operation                                   | removal, held in UI state                  | There is no field for one and adding one is a `schemaVersion` bump. **G3** makes removal correct for free (§4.1).                                                                              |
| A separate preview seed                                             | the seed field writes `config.defaultSeed` | A preview seed lets the author approve a picture the file does not produce — `07` §3's worst outcome by another route (§5).                                                                    |
| Diffing two grids to derive an overlay                              | the `selection()` export                   | A diff shows **effect**, not **selection**: an Operation can select a cell and write the value already there, and those cells vanish. Also two generations per frame (§6.2).                   |
| A draggable page width that writes `referenceWidth`                 | a numeric **design width** field           | A draggable edge reads as a viewport, and a viewport does not destroy work. **The destructive edit must not be the one that is easy to do by accident** (§9.2, **E11**).                       |
| Migrating an orphaned `rect` or `cellList`                          | nothing — undo is the repair               | Proportional and absolute are both defensible readings, and choosing silently is `06` §9.2's coercion applied to the thing the author cares about most (§9.4).                                 |
| A placeholder glyph in the preview                                  | report the failure beside the preview      | A placeholder is a drawable the renderer did not choose, in a cell **R3** says must draw nothing — and it misrepresents the picture being approved (§12.3).                                    |
| A drag affordance on a Tile's asset list                            | a plain list                               | **D3** sorts by id regardless, so the gesture would have no effect. The contrast with §7.6's bar is the point (§10.1).                                                                         |
| Clearing an imported `reseedOnLoad` flag on a non-stochastic Source | leave it, and raise an advisory            | The flag still moves the Operation's `random` Selection (`04` §8.2), so it is not inert. Hide the control; do not correct the file (§8.4).                                                     |

### For `01` §10.2 — reserved

| Word   | Held for                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `over` | An explicit region on a spanning Source — `gradient { angle, over? }`. `[EXTENSION POINT]`, raised at §14.2, **owned by `04` and `05`**. |

**Not** _breakpoint_. The editor's preset widths on the preview-width control are an unnamed
convenience; the word stays reserved for `06` §12's `layouts` (§9.2).

### For `01` §10.3 — collisions deliberately tolerated

None new.

### Closes in `01` §3.1

Authoring ranges on `scaleX` / `scaleY` · how a palette is presented so order reads as
meaningful · repair of an orphaned `rect` versus an orphaned `cellList` · palette builder, dual
slider handles, collapse-on-`constant` · how a `ValidationError` is presented and the repair
offered per code · the advisory diagnostics · whether a registered type carries a human-readable
description.

**Two of these close as refusals rather than designs.** There is no orphan repair (§9.4), and
the import screen offers no automatic repair (§12.4). A closed hole is not the same as a built
feature, and `01` should record the answer rather than the shape it was expecting.

### For `roadmap.md`

`[EXTENSION POINT]`

| Point                                                                           | Note                                                                                                                                                       |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A public config-writing surface — docs or checks for third parties              | §3.1. Costs promoting §3's table into published prose or code; `validate()` and **C7** already ship. Reverses no argument and needs no change to `00` §5.2 |
| An explicit region on spanning Sources — `gradient { angle, over? }`            | §14.2. **Owned by `04` and `05`, raised in `09`.** Minor engine bump; no `schemaVersion` bump                                                              |
| Selection composition in the overlay — `and` / `or` / `not`                     | Inherited. `selection()` takes an `operationId` and returns a predicate, so composition arrives with no change to `09`'s surface                           |
| A registered type's `editor` block growing beyond label / description / control | Package-internal (`06` §7.4), so no bump of any kind. **E9**'s totality keeps every addition optional                                                      |

`[POSTPONED]`

| Point                                                       | Note                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persisted editor state — collapsed panels, muted Operations | §14. Three shapes, none V1: a sidecar file, a top-level `editor` block (a bump for a key no consumer reads), or `meta` (**forbidden by E4**)                                                                                                                   |
| Image export from the editor                                | §14.1. **Editor-only cost.** The objection is `00` §8.2's, not §5.2's: an exporter that draws differently produces a picture the author cannot check by looking. SVG serialization is testable against **R15** rather than being a blind second implementation |
| Migrating orphaned Selections rather than reporting them    | §9.4 rejects it. Would need a stated rule the author can predict                                                                                                                                                                                               |

**Two `roadmap` questions close.** Q1 — asset authoring — resolves as `roadmap` proposed, **with
the line drawn at bundling**: §11.1 takes import, attach, the library UI, and export of the
folder; optimization, source formats, and sprite sheets stay in `roadmap` §4.4. Q3 resolves yes:
§14.1 is the first row needing an **editor-only** cost tier.

**A gate discharged.** `roadmap` §4.4's routing for asset authoring was `00` §9's named instance
of a routing with no destination. It now has one.

### Open questions handed forward

| From     | Question                                                                  | To                                |
| -------- | ------------------------------------------------------------------------- | --------------------------------- |
| `09` Q8  | Should the editor's own asset store be specified?                         | Open — implementation             |
| `09` Q9  | Is `selection()` enough, or will an overlay want per-cell values?         | Open; would revisit `08` §4.5     |
| `09` Q10 | Does mute-by-removal confuse an author when it does not survive a reload? | Open — implementation observation |
| `09` Q11 | Completeness.                                                             | `01`, `roadmap`, `00` harvests    |

**A correction to Q11, found by the `01` pass.** It records three amendments as owed to `02` and
`04` — §6.2, §9.2, §14.2. **All three had already landed** when `01` opened those documents:
`02` §7.5 carries the withdrawn premise, `02` §12 carries the `selection()` row, `04` §10 carries
the explicit-region row. Third instance of the pattern `00` §10.2 generalizes, and the same shape
as `roadmap` Q2. What is genuinely outstanding is smaller and different: none of `02`, `03`, `04`
carries an **Amended** header line for them, and `05` §13 has no row for the explicit region
though §14.2 names `05` as co-owner.

---

## 00-overview.md — the `09` pass, 2026-08-06 · **no marker: no harvest follows this block**

**This block records a nil harvest, and that is why it exists.** `00` is the last document
written and the last of the three harvests; `01` §15 Q6 and `roadmap` §1.1 both closed before it
opened, so nothing downstream will ever consume this block and no `— harvested into 01` marker
will ever be applied to it. Under _How a block is retired_ an unmarked block reads as
outstanding; this heading says otherwise explicitly. Appended by the `00` conversation itself,
which inverts the same rule the `09` block inverts, for the narrower reason that there is no
later conversation to do it.

It is appended at all because `01` open question 9 is about the opposite failure: a block that
was never written is indistinguishable from a file that is up to date, and no inspection of this
file can detect it. A block saying _nothing was coined_ is checkable. An absence is not.

### Terms coined

**None.** `00` §1.1 forbids it — _"nothing is coined here; a boundary that this document appears
to draw was drawn somewhere else, and the citation says where."_ The pass rewrote §4.4 from a
placeholder into a citation of `09` §3, added four rows to §4.5's census, quoted `01` §11.2 in
§9 where it had paraphrased, and rewrote §10's opening, §10.1, §10.2, and §12. Every noun in the
new material is `09`'s or `01`'s.

`01` §11.6 already holds the vocabulary this document owns — _cost of arrival_, _gate
discharged_, _standing posture_, _permanent non-goal_, _homeless question_, _the census_ — and
§11.6's five-principle table matches `00` §8 unchanged. Verified by opening `01` on 2026-08-06.
Nothing was added to either.

### Corrections to already-harvested entries

| Entry          | Currently                                                       | Should read                                                                                                                                                   |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01` §13, tail | "**D3** is owed the same treatment by open question 7's rename" | **D3** joins the rewritten-in-place list. `03` carries it — §4.2, §4.3, and **D3** rewritten, with a header line citing `01` §7.1, Q7. Found by opening `03`. |

That is the whole of it. `01` §5's **Editor**, §5.3's **Advisory diagnostic**, and §11.6 were
all checked against the amended `00` and none moved: the census gained rows, not a definition.

### For `01` §10.1 — rejected

**None.** The pass rejected one thing and it is a process choice rather than a name: a
fourteen-row register of §10.2's instances, one row per instance, was considered and cut in
favour of a table of _sites_ — where the instances are recorded, and how many each site holds.
The register would have made `00` the owner of rows no other document carries, which is
authorship, and §1.1 forbids it. Recorded here rather than in `01` because no word was coined
either way.

### For `01` §10.2 — reserved

**None.**

### For `01` §10.3 — collisions deliberately tolerated

**None.**

### Closes in `01` §3.1

**Nothing, and §3.1 was already empty.** `01`'s status line reads _Draft, agreed. All ten
sources harvested — `02`–`09`, `00`, and `roadmap.md`_, and no `[UNHARVESTED]` marker remains.
Verified by opening `01`.

### For `roadmap.md`

**No new `[EXTENSION POINT]` and no new `[POSTPONED]`.** `roadmap` §9 already anticipated this
in as many words — _"`00` landed and added no row: it is itself a harvest and coins no
deferral"_ — and the `09` pass had already delivered its own harvest row there.

Two of `00` §12's four rows became tombstones this pass:

| Row                                                           | Now                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| A harvest pass after `09` lands                               | **Delivered** — this pass                                                                  |
| Amending `07` §3.1's reference to the old index wording       | **Discharged, and not owed when the row was written.** `07` §3.1 cites `00` §6 approvingly |
| Generating §6 and §7's graph from the header blocks           | Unchanged. `roadmap` §5.4's row still cites it, alongside `01` §14, `01` Q5, and `06` Q12  |
| A one-paragraph summary of each document beside the index row | Unchanged                                                                                  |

`roadmap` §5.4's generated-navigation row therefore needs no edit: both documents it cites for
`00` are still §12's, and both survive.

### Amendments owed to completed specs

Three, each verified by opening the document named rather than inferred, per `00` §10.2 and
`roadmap` §10 Q6. All three are one line and none originates with this pass:

| Document    | What                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `07` §9.1   | The first row still says the author _drags the design page width_, the premise `09` §9.2 withdrew and **E11** / **E12** replaced            |
| `07` header | No **Amended** line for either `09`-driven change to it — §9.1's row or §3.1's title gloss                                                  |
| `09` Q11    | Reads _open until the package's harvests run_, and all three have; its parenthetical is the instance corrected in this file's `09` Q11 note |

### Open questions handed forward

| From    | Question                                                               | To                                              |
| ------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `00` Q3 | Does §8 belong in a specification at all?                              | Open — revisit if §8 is ever cited as authority |
| `00` Q4 | Should §5.2's permanent non-goals carry invariant IDs in their owners? | Open — three do, two do not, unexamined         |
| `00` Q5 | Completeness.                                                          | **Resolved** — ten of ten, `00` §10             |

**Nothing is handed to a document.** Q3 and Q4 are `00`'s own and there is no later pass to take
them; they are answerable only by a conversation that reopens this document deliberately. The
package's remaining live questions are elsewhere and are named in `00` §10.1 and `roadmap` §7.1:
`gradient`'s transcendental reproducibility (A1), which gates `1.0.0`, and `01` Q1's two senses
of `Grid`, which gates nothing and costs nothing but should be settled deliberately rather than
by the first type alias written.
