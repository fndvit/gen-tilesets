---
title: Review findings
description: Everything noticed while documenting, collected rather than fixed silently.
---

Everything below was noticed while writing the module pages from source. **Nothing here has been
changed in the source.** Each finding links to the module page where it was found, and the page's
*Review notes* section has the detail and the line numbers.

Every *possible bug* was re-checked against the source after it was reported. Four depend on
runtime behaviour that was **not** reproduced: overlapping tile drops, duplicate failure keys, the
URL revoke in `download.ts`, and the unhandled-rejection noise. The `edges.ts` SVG finding was
reproduced in headless Chrome. The other kinds were spot-checked, not all re-read.

## Summary

| Kind | Count | Meaning |
| --- | --- | --- |
| possible bug | 15 | Behaviour that looks wrong. Read first. |
| inconsistency | 29 | Two places that disagree, or one place that disagrees with its own comment. |
| dead code | 4 | Exported or written, never called in production. |
| missing test | 14 | A behaviour the source relies on that no test pins. |
| doc gap | 14 | Something a reader needs that no comment says. |
| stale comment | 37 | A comment that describes an earlier state of the code. |

113 findings in all.

## Possible bugs

| Module | Finding |
| --- | --- |
| [export.ts](/editor/export/) | An imported document's `engineVersion` is never restamped: only `newDocument()` writes it, `session.open` and `serialize` pass the file through, so a 0.6.0 file edited and exported by the 0.8.0 editor still says `"0.6.0"` — the case E2 exists to prevent ([Versioning](/concepts/versioning/)) |
| [edges.ts](/renderer/edges/) | Verified in headless Chrome: a viewBox-only SVG reports `naturalWidth/Height` 150×150 (not 0, as `edges.test.ts:83` assumes) but `drawImage` with that source rect paints it into the top-left third, so the canvas substrate draws such tiles shrunk (16 px in a 48 px cell). DOM is unaffected; every demo SVG declares `width`/`height` |
| [shape.ts](/engine/shape/) | `reshapeErrors` builds its no-box message from `String(s.bleed)`, so a failure with inherited bleed (fewer columns, no `bleed` given) reads "bleed undefined leaves no box: …"; the test only checks for `columns - bleed` |
| [Tileset.svelte](/renderer/tileset/) | An async provider whose promise rejects is never reported through `onAssetError`: canvas swallows it with `.catch(() => {})` (l.634) and DOM's `{:catch}` (l.1220) renders nothing. The comment at l.632 assumes the provider threw synchronously |
| [Tileset.svelte](/renderer/tileset/) | `loadFailed` is only ever added to (l.427–433). After an `<img>` fails, every cell using that asset stays unmounted even if the host changes `provider` or `file`; canvas's `ImageBank` does clear failures when the `src` changes |
| [Tileset.svelte](/renderer/tileset/) | A synchronous provider throw is stored as `Promise.reject(cause)` (l.417); under DOM, if every cell using that asset is culled, nothing handles the rejection (console noise; the error is already reported) |
| [measure.ts](/renderer/measure/) | `track`'s first synchronous measurement (l.225) uses `getBoundingClientRect()`, which includes ancestor zoom, not the layout width; under a scaled ancestor (the editor's PreviewFrame) `Wpx` is wrong until the first ResizeObserver entry |
| [assets.ts](/editor/assets/) | `TileLibrary.svelte:174` and `:183` call `release()` before the delete transition. Undoing the delete brings back a Tile/asset with no stored bytes: `editorProvider` throws, `<Tileset>` draws a hole, and export throws "no attached bytes" |
| [ids.ts](/editor/ids/) | "Never reassigned" does not hold for the highest id: scanning for the maximum hands the same id out again once the highest is deleted (remove `op3` from [op1, op2, op3] → next is `op3`), so a new Operation inherits the deleted one's hash channels. The test only deletes a middle id |
| [download.ts](/editor/download/) | The object URL is revoked immediately after `anchor.click()`; the source asserts this is safe, nothing verifies it |
| [TileLibrary.svelte](/editor/tile-library/) | `removeAsset` → `deleteAsset` (`document.ts:512`) checks only the asset count, so deleting the only non-zero-weight asset (`[1, 0]` → `[0]`) leaves a Tile whose weights sum to zero: the session then holds a file `validate()` rejects (`ZERO_WEIGHT_SUM`), the state `setAssetWeight` refuses. No test covers it |
| [TileLibrary.svelte](/editor/tile-library/) | `dropAsTiles` allocates ids before its awaits and `addTiles` does not check for duplicates, so two overlapping drops could produce the same tile id (not reproduced) |
| [App.svelte](/editor/app/) | `failures` is append-only and keyed by its own string (l.876); `onAssetError` is called from inside a derivation, so a repeat failure could produce a duplicate key (not checked at runtime) |
| [ParamControl.svelte](/editor/param-control/) | A slider uses exclusive bounds as its ends and commits without calling `admits`, so it could land on an excluded value (no registered spec triggers this today); same root cause in `affordance.ts` |
| [ParamControl.svelte](/editor/param-control/) | The range readout marks only `exclusiveMin` as open (l.46); `exclusiveMax` is shown with `]` |

## Engine

| Module | Finding | Kind |
| --- | --- | --- |
| [hash.ts](/engine/hash/) | `channelCache` is described as bounded by the operation count, but it is module-level and never cleared, so in a long-lived editor it grows with every distinct `operationId` ever seen | inconsistency |
| [mapping.ts](/engine/mapping/) | `applyTileMapping` sums weights with its own loop instead of calling `paletteTotal` from the same file | inconsistency |
| [shape.ts](/engine/shape/) | Header says editor `orphans.ts` `atRisk()` reads the coordinateBound flag "for the same reason", but `atRisk` (orphans.ts:44) calls `selections.get` without the `selections.has` guard, so it would throw on an unknown type (latent: editor configs are validated) | inconsistency |
| [validate.ts](/engine/validate/) | A non-string `target` is reported as OUT_OF_RANGE, but a non-string `blend` is reported as TYPE_MISMATCH, although both are bare strings from a fixed set | inconsistency |
| [registry.ts](/engine/registry/) | registry.ts:30 cites "CONVENTIONS.md §10.3" for the `random` name collision, while registry.test.ts:39 cites "01 §10.3" | inconsistency |
| [blends.ts](/engine/blends/) | mapping.test.ts:291 says the `__test_min` registration test is "deliberately last" because it writes into the shared registry, but the test at mapping.test.ts:304 runs after it | inconsistency |
| [registry.ts](/engine/registry/) | `Registration<Impl>` (registry.ts:20) is exported but nothing imports it, and index.ts does not re-export it | dead code |
| [types.ts](/engine/types/) | `tileStateAt`'s out-of-range branch (returns `undefined`, never wraps) is not asserted by any test | missing test |
| [hash.ts](/engine/hash/) | `hash.test.ts` "never reaches 1.0 even at the top of the uint32 range" asserts the constant `0xffffffff / 2**32 < 1` and never calls `hash` | missing test |
| [responsive.ts](/engine/responsive/) | `rulesReshapeErrors` has no direct test; its band composition and deduplication are unpinned | missing test |
| [validate.ts](/engine/validate/) | An unregistered Blend name is reported as INVALID_TARGET_BLEND, not UNKNOWN_TYPE_NAME (unlike Selection and Source), and validate.test.ts does not pin this case | missing test |
| [validate.ts](/engine/validate/) | When `target` is illegal, `blend` is never checked against any registry, and no test covers it | missing test |
| [ctx.ts](/engine/ctx/) | No `ctx.test.ts`; `operationCtx` is tested only inside `selection.test.ts` | doc gap |
| [attributes.ts](/engine/attributes/) | `ATTRIBUTE_NAMES` is public (`index.ts:20`) but has no caller anywhere, tests included, and nothing pins its contents | doc gap |
| [validate.ts](/engine/validate/) | everyBandHasABox stops at the first failing band (it returns after the first add), and no comment says so | doc gap |
| [selections.ts](/engine/selections/) | `rect`'s width and height have no `min`, so a zero or negative size validates and matches nothing; nothing says whether that is intended | doc gap |
| [sources.ts](/engine/sources/) | valueNoise's params and gradient's `angle` have no `default`, so a file must include them; only the editor's draft path fills them, and sources.ts does not say so | doc gap |
| [load.ts](/engine/load/) | `assertValidFile` docstring says `schemaVersion` is the literal type `2`; `types.ts:319` says `4` | stale comment |
| [load.ts](/engine/load/) | `load.test.ts:15` calls its fixture "a v2 file"; it is `SCHEMA_VERSION` (4) | stale comment |
| [hash.ts](/engine/hash/) | `hash()` docstring says X6 makes 1.0 illegal because the palette walk and stepped mapping need `t < 1`; `mapping.ts` says X6 is now closed `[0, 1]` and both handle `t = 1`. The guarantee holds because `hash()` is `[0, 1)`; only the stated reason is stale | stale comment |
| [hash.ts](/engine/hash/) | The comment "The three channel-string shapes… closed at three" sits above `ASSET_CHANNEL` alone | stale comment |
| [mapping.ts](/engine/mapping/) | `mapping.test.ts:14` is titled "never attains max when continuous, because t < 1 strictly", but the code returns `max` at `t === 1` (X6 closed); it passes only because it feeds `0xffffffff/2^32` | stale comment |
| [assets.ts](/engine/assets/) | `walkWeights` cites X6 for `h < 1`, and its test title says "which is why X6 forbids it", but X6 is now the closed Source bound; asset `h` comes from `hash()`, so the walk is still total | stale comment |
| [dev.ts](/engine/dev/) | Header says dev builds "assert `0 <= t < 1`", but `registry/sources.ts:326` checks `t >= 0 && t <= 1` | stale comment |
| [migrate.ts](/engine/migrate/) | migrate.ts:77–78 says "A future `2 → 3` row appends here", but the table already holds 2→3 and 3→4 | stale comment |
| [selections.ts](/engine/selections/) | registry.test.ts:157 says "h < 1 strictly by X6", but X6 is now closed [0, 1]; the strictness comes from `hash` being half-open | stale comment |
| [sources.ts](/engine/sources/) | registry.test.ts:371–373 says "`gradient` projects (x + 0.5, y + 0.5)", but gradient now projects cell indexes and sources.ts calls the centre offset the defect it fixed | stale comment |
| [blends.ts](/engine/blends/) | blends.ts:29 (BlendValue doc) says "Numeric for four Targets, a tileId for one", but TARGETS now has 7 numeric Targets and 1 tile Target | stale comment |

## Renderer

| Module | Finding | Kind |
| --- | --- | --- |
| [Tileset.svelte](/renderer/tileset/) | `cellTooSmall` and `assetTooSmall` run only in the canvas paint effect, so DOM tilesets never get softness warnings | inconsistency |
| [uniform.ts](/renderer/uniform/) | `cellMatrix` repeats `transformMatrix`'s six-term formula, although its comment says the arithmetic is "restated rather than duplicated" | inconsistency |
| [space.ts](/renderer/space/) | `metricsOf` uses the rounded `offsetWidth`, which the file's own `layoutWidth` comment names as the less accurate source; the tracker avoids it, the editor brush does not | inconsistency |
| [transform.ts](/renderer/transform/) | `transformMatrix` and `applyMatrix` have no caller outside tests; canvas uses `uniform.ts`'s private copy | dead code |
| [edges.ts](/renderer/edges/) | `snap` is exported and tested but has no production caller | dead code |
| [measure.ts](/renderer/measure/) | `observeDpr`, `currentDpr` and `browserEnv` have no tests | missing test |
| [space.ts](/renderer/space/) | No `space.test.ts`; `rectToRenderSpace` is tested only inside `occlusion.test.ts` | missing test |
| [warn.ts](/renderer/warn/) | No test file, although `WarnOnce` is an instance specifically so it could be tested | missing test |
| [images.ts](/renderer/images/) | No test file; ignoring stale loads and not retrying a failed `src` are untested | missing test |
| [geometry.ts](/renderer/geometry/) | Editor overlays use `cellPlacementPercent`, which handles only fluid sizing with top alignment; they would drift if the preview were ever hosted fixed or aligned | doc gap |
| [uniform.ts](/renderer/uniform/) | `domGeometry`'s docstring refers to `domPlacement`, a private function inside `Tileset.svelte` | doc gap |
| [options.ts](/renderer/options/) | In production `avoid: {}` fails inside `normalizeTargets` with a bare `TypeError`; by design (dev builds name it via `optionErrors`), but undocumented at the call | doc gap |
| [TileDecoration.svelte](/renderer/tile-decoration/) | The comment calls a decoration "`aria-hidden` ornament", but the attribute comes from `<Tileset>`'s box, not from this component | doc gap |
| [Tileset.svelte](/renderer/tileset/) | Template comment l.1009-1013 says the canvas render box "is the canvas: one element"; the box is now the wrapper and the canvas a separate element | stale comment |
| [Tileset.svelte](/renderer/tileset/) | Comment l.373-379 says placement is `cellPlacementPercent`'s via `cellStyle`; placement now goes through `domPlacement` (`cellPlacementAffine` before measurement, `domGeometry` after) | stale comment |
| [Tileset.svelte](/renderer/tileset/) | The `mask`/`lastMask` docstring (l.771-780) is followed directly by the docstring for `drawn`, so it documents nothing | stale comment |
| [Tileset.svelte](/renderer/tileset/) | `.cell` CSS comment (l.1308-1311) says width and margins are percentages; only true before measurement, px afterwards | stale comment |
| [Tileset.svelte](/renderer/tileset/) | Comment l.174-175 says nothing below reads `resolved` except `reportAssetError`, but `targets` (l.193) does | stale comment |
| [render/index.ts](/renderer/render-index/) | The S10 header says the component computes placement from `cellBox`/`cellAt` and overlays are drawn from them; neither is true now, and `cellBox` has no production caller | stale comment |
| [geometry.ts](/renderer/geometry/) | The header repeats the stale S10 claim about `cellBox`/`cellAt` | stale comment |
| [uniform.ts](/renderer/uniform/) | `DomGeometry.originYDev`'s comment says "0 when yOffset is 0, negative otherwise", but a non-top `alignY` shift can make it non-zero or positive | stale comment |
| [breakpoints.ts](/renderer/breakpoints/) | `GridCache` says it "holds at most one grid per band"; it is keyed by `(rows, columns)` and never evicts, so the bound is shapes seen, not bands | stale comment |
| [options.ts](/renderer/options/) | Header says the README defaults table cannot drift "without a test noticing"; the test pins `DEFAULT_OPTIONS` against a literal and nothing reads the README | stale comment |
| [provider.ts](/renderer/provider/) | The test header says `defaultProvider` "shipped untested"; it is tested now | stale comment |

## Editor

| Module | Finding | Kind |
| --- | --- | --- |
| [document.ts](/editor/document/) | Several transitions return a new object when nothing changes (`setRows` to the current value, `setDefaultSeed` with the same trimmed text, `setHorizontalAlignment` to the current value, `rerollOperation`/`setReseedOnLoad` with an unknown id, `renameTile` to the same name), each pushing an undo entry; `App.svelte:475` can open the confirmation dialogue for a no-op alignment change | inconsistency |
| [history.ts](/editor/history/) | `applied`'s docstring says "an unchanged file **is** the same object"; `history.test.ts:89-94` pins the opposite (`setRows("5")` at 5 rows is "a genuine entry") | inconsistency |
| [session.svelte.ts](/editor/session/) | The `apply` docstring (`:69-78`) repeats the "unchanged file is the same object" claim | inconsistency |
| [assets.ts](/editor/assets/) | `StoredAsset.width`/`height` are documented as "design px", but `measure` returns `naturalWidth`/`naturalHeight` (image pixels) | inconsistency |
| [ids.ts](/editor/ids/) | `IDENTIFIER` duplicates the private regex at `packages/tileset/src/validate.ts:99`, so the two can drift | inconsistency |
| [draft.svelte.ts](/editor/draft/) | Named `.svelte.ts` but holds no rune, and must stay rune-free to remain importable by three test files; the suffix invites a `$state` that would break them | inconsistency |
| [App.svelte](/editor/app/) | The seed field and tile rename commit on every keystroke, so each keystroke is a separate undo entry | inconsistency |
| [OperationStack.svelte](/editor/operation-stack/) | The × button's aria-label leaves out the op id, which the other four row buttons include | inconsistency |
| [OperationDraft.svelte](/editor/operation-draft/) | Under a `constant` Source the control collapses, but a stored `range[1]` stays in the file, hidden | inconsistency |
| [ParamControl.svelte](/editor/param-control/) | `pending` treats empty text as `Number("")` = 0, while `commit` refuses `""` | inconsistency |
| [ParamControl.svelte](/editor/param-control/) | Dragging the slider leaves stale typed text in the exact-value field until blur | inconsistency |
| [PaletteBar.svelte](/editor/palette-bar/) | A refused weight edit leaves the refused number in the box; no draft-text model | inconsistency |
| [PaletteBar.svelte](/editor/palette-bar/) | The weight input has `step="1"`, but weights may be fractional | inconsistency |
| [NumericMapping.svelte](/editor/numeric-mapping/) | The `steps` input has no draft-text model, unlike the two range ends | inconsistency |
| [NumericMapping.svelte](/editor/numeric-mapping/) | Slider step is `/200` here but `/100` in affordance.ts; neither comment mentions the other | inconsistency |
| [BlendControl.svelte](/editor/blend-control/) | The single-option sentence always talks about palettes, though the branch applies to any target with one accepted Blend (not reachable today) | inconsistency |
| [PreviewFrame.svelte](/editor/preview-frame/) | `clearReference` resets `yOffset` but not `opacity` or `inFront` | inconsistency |
| [PreviewFrame.svelte](/editor/preview-frame/) | `9px` is a CSS literal in three rules as well as `HANDLE = 9` in the script | inconsistency |
| [ReferenceControls.svelte](/editor/reference-controls/) | The y input has no draft-text model, so an emptied box is not reverted on blur | inconsistency |
| [SelectionOverlay.svelte](/editor/selection-overlay/) | `styleOf`, `vScale` and their 45-line comment are duplicated verbatim in PaintLayer.svelte | inconsistency |
| [paint.ts](/editor/paint/) | `strandedCells` is exported and tested but never called; App uses `orphans()` instead | dead code |
| [assets.ts](/editor/assets/) | `measure`, `attach`, `release`, `replaceAll` and `editorProvider` are untested, including `replaceAll`'s URL-revocation ordering | missing test |
| [fields.ts](/editor/fields/) | `parseWidth`, `parseBleed` and `format` have no direct tests | missing test |
| [download.ts](/editor/download/) | `zipOf` is pure but untested; `import.test.ts:156` builds its own zip helper instead | missing test |
| [affordance.ts](/editor/affordance/) | Nothing tests `defaultFor`'s midpoint branch (`exclusiveMin` plus an upper bound) | missing test |
| [controls/mapping.ts](/editor/controls-mapping/) | `ATTRS` in `mapping.test.ts:14` leaves out translateX and translateY, so four test families skip them | missing test |
| [fields.ts](/editor/fields/) | `toFiniteNumber` claims to reject "JS's more generous coercions" but uses `Number()`, which accepts hex/binary/octal (`parseRows("0x10")` → 16) | doc gap |
| [export.ts](/editor/export/) | User-facing error messages cite archived spec sections (`09 §11.1`, `E14`, `09 §15 Q8`) the author cannot see: `export.ts:100-101`, `:116-117`, `import.ts:71-72`, `assets.ts:241-242` | doc gap |
| [App.svelte](/editor/app/) | "Add operation" while an edit-draft is open replaces it without asking; nothing says whether that is intended | doc gap |
| [ImportPanel.svelte](/editor/import-panel/) | Says import is "undoable", but `replaceAll` has already revoked the previous document's assets, so undo restores it without pictures (session.svelte.ts documents this; the panel does not) | doc gap |
| [PaintLayer.svelte](/editor/paint-layer/) | No keyboard path for adding a cell to a `cellList` | doc gap |
| [document.ts](/editor/document/) | `document.ts:199-204` says the confirmation "is Step 10 and is not implemented here"; it exists in `App.svelte:207` (`destructive()`) | stale comment |
| [history.ts](/editor/history/) | `replaced`'s docstring says "New document is the only one" that uses it; `session.open` (import) also does | stale comment |
| [seed.ts](/editor/seed/) | The docstring on `pick` (`seed.ts:37`) says "Exclusive of `n`…" but `pick` has no `n` | stale comment |
| [draft.svelte.ts](/editor/draft/) | `isComplete`'s docstring says "Step 6b adds it [the mapping] to this check", but the body already checks the mapping | stale comment |
| [export.ts](/editor/export/) | `serialize`'s docstring (`:55`) says "`schemaVersion: 2`"; the document is 4 (`document.ts:128`) | stale comment |
| [App.svelte](/editor/app/) | l.886 says "what Step 11 will export"; export exists | stale comment |
| [NumericInput.svelte](/editor/numeric-input/) | `note`'s comment says it is "used for the destructive three"; its only user is y offset, not one of them | stale comment |
| [NumericInput.svelte](/editor/numeric-input/) | l.54 refers to "an undo at Step 10"; undo exists | stale comment |
| [TileLibrary.svelte](/editor/tile-library/) | Header says the palette bar "is Step 6b"; it exists as PaletteBar.svelte | stale comment |
| [OperationStack.svelte](/editor/operation-stack/) | `onCreate` comment says "Step 6 supplies it"; App.svelte does | stale comment |
| [OperationDraft.svelte](/editor/operation-draft/) | Comment says "five Targets… four attributes plus tileId"; there are 8 Targets | stale comment |
| [OperationDraft.svelte](/editor/operation-draft/) | The `draft` prop comment refers to "Step 8's overlay" | stale comment |
| [PreviewFrame.svelte](/editor/preview-frame/) | l.321 says "Step 7's brush will need it"; the brush exists | stale comment |
| [ReferenceLayer.svelte](/editor/reference-layer/) | Header says "nothing else names a z-index", but the grab surface has 2 and PreviewFrame's handles 4 | stale comment |
| [SelectionOverlay.svelte](/editor/selection-overlay/) | The header's E7 statement says geometry "comes from `cellBox`"; the code uses `cellPlacementPercent` | stale comment |
