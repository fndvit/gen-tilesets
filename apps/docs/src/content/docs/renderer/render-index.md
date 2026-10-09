---
title: index.ts (render)
description: The @fndvit/gen-tilesets/render entry point. Every pure function and type the renderer exports, grouped by job.
sidebar:
  order: 2
---

**Written from:** `packages/tileset/src/render/index.ts`, and the import sites in `apps/editor/src`
and `apps/demo/src`.

## Overview

This file is the renderer's public door: what a host gets when it imports from
`@fndvit/gen-tilesets/render`. It contains no logic. It re-exports, in groups, the pure functions
and types the renderer is built from, so that a host, the editor, or a test can use the same
arithmetic the component uses instead of writing a second copy.

The two components are **not** here. `<Tileset>` and `<TileDecoration>` are imported by their own
paths, `@fndvit/gen-tilesets/Tileset.svelte` and `@fndvit/gen-tilesets/TileDecoration.svelte`, as
every app in the repository does. This entry point is for everything around them: geometry for an
overlay, the options type, an asset provider, the keep-out mask, and so on.

## In detail

### Purpose

The header names one invariant (cited as **S10**): `cellBox` and `cellAt` are exported pure
functions, independent of the component, so that neither the component nor an overlay reimplements
the arithmetic (cited as **R1**). The other groups carry their own one-paragraph comments saying why
each is public.

### Public surface

| Group | Source | Exports | Why public (from the comments) |
| --- | --- | --- | --- |
| Geometry | [geometry.ts](/renderer/geometry/) | `alignFraction`, `cellAt`, `cellBox`, `cellCentre`, `cellPlacementAffine`, `cellPlacementPercent`, `cssLength`, `gridWidth`, `latticeRange`, `naturalHeight`, `naturalRatio`, `originX`, `originY`, `scaleFactor`, `visibleColumns`; types `Affine`, `AlignX`, `AlignY`, `CellBox`, `CellPlacement`, `CellPlacementAffine`, `CellRange`, `GridGeometry`, `Lattice`, `Sizing` | One coordinate mapping (S10). |
| Options | [options.ts](/renderer/options/) | `DEFAULT_OPTIONS`, `LEGACY_PROPS`, `legacyPropErrors`, `normalizeTargets`, `optionErrors`, `resolveOptions`, `sameTargets`, `effectiveRules`, `renderOverride`; types `AvoidTargets`, `NormalizedTargets`, `ResolvedOptions`, `HostRule`, `Overflow`, `Substrate`, `TilesetOptions` | `<Tileset>`'s one settings object; `resolveOptions` is the only place a default is written. |
| Breakpoints | [breakpoints.ts](/renderer/breakpoints/) | `reservationCss` | For a host rendering its own shell, and so the reservation is checkable without a component. |
| Render space | [space.ts](/renderer/space/) | `metricsOf`, `rectToRenderSpace`, `toRenderSpace`; types `BoxMetrics`, `RenderRect` | The editor's brush and the keep-out tracker both convert through it. |
| Keep-out mask | [occlusion.ts](/renderer/occlusion/) | `occlusionMask`, `sameMask`, `stableMask`; type `OcclusionMask` | So a host overlay can show exactly which cells are hidden. |
| Measurement | [measure.ts](/renderer/measure/) | `refresh`, `track`; type `Measurement` | `refresh()` for keep-out elements moved by CSS animation; `track` for a keep-out measurement without a `<Tileset>`. |
| Transforms | [transform.ts](/renderer/transform/) | `applyMatrix`, `cssTransform`, `drawnHalfExtents`, `isIdentityTransform`, `maxSpill`, `sincos`, `transformMatrix`, `translationDev`; types `Matrix`, `TransformAttributes`, `Translation` | (no comment on this group) |
| Edges | [edges.ts](/renderer/edges/) | `coverRect`, `snap` | (no comment on this group) |
| Uniform cell | [uniform.ts](/renderer/uniform/) | `canvasPresentation`, `domGeometry`, `domLattice`, `uniformDrawList`, `uniformGeometry`; types `CanvasPresentation`, `DomGeometry`, `UniformGeometry`, `UniformItem` | A host sizing an export or reporting the residual must read the one implementation. |
| Asset rules | [warn.ts](/renderer/warn/) | `assetTooSmall`, `cellTooSmall`, `SOFT_CELL_DEV`, `WarnOnce` | A host can surface them in its own UI. |
| Assets | [provider.ts](/renderer/provider/) | `assetKey`, `defaultProvider`, `parseAssetKey`, `prefixedProvider`; types `AssetProvider`, `AssetRef`, `Drawable` | (no comment on this group) |

Generated API pages for every one of these are under `/api/render/`, except `sincos`, which is
documented with the engine at [`/api/index/functions/sincos/`](/api/index/functions/sincos/).

**Not exported** from this entry point, although exported from their modules: `ImageBank`,
`NaturalSizeChecks`, `requireNaturalSize`, `NO_NATURAL_SIZE` (`images.ts`); `resolveDrawable`,
`recordLoadFailure`, `loadBlocked` (`provider.ts`); `drawnTiles`, `DrawnTiles` (`occlusion.ts`); `Scheduler`, `MeasureEnv`,
`browserEnv`, `WRAPPER_ATTRIBUTE`, `scopeOf`, `currentDpr`, `observeDpr` (`measure.ts`); `GridCache`,
`FlipFlop`, `inertCellSizeRules` (`breakpoints.ts`).

### Inputs → outputs

None. The file only re-exports.

### Invariants

- **One implementation of each piece of arithmetic** (cited as **S10** and **R1**). The comment on
  the uniform group says the same about `uniformGeometry` and `domGeometry`, and adds: "An overlay
  wants `cellPlacementPercent`, not either of these", because under canvas the presentation scale
  cancels the quantisation exactly.

### Callers

| Importer | Imports |
| --- | --- |
| `apps/editor/src/paint.ts:33-38, 50` | `cellAt`, `toRenderSpace`, `BoxMetrics`, `GridGeometry`; re-exports `metricsOf`, `toRenderSpace`. |
| `apps/editor/src/lib/PaintLayer.svelte:26-30` | `cellPlacementPercent`, `naturalHeight`, `GridGeometry`. |
| `apps/editor/src/lib/SelectionOverlay.svelte:36-40` | `cellPlacementPercent`, `naturalHeight`, `GridGeometry`. |
| `apps/editor/src/App.svelte:21` | `naturalHeight`, `naturalRatio`, `AssetRef`. |
| `apps/editor/src/assets.ts:36` | `assetKey`, `parseAssetKey`, `AssetProvider`, `AssetRef`, `Drawable`. |
| `apps/editor/src/download.ts:21` | `assetKey`. |
| `apps/demo/src/App.svelte:22`, `Decorations.svelte:32` | `prefixedProvider`, `AssetRef`. |
| `apps/demo/src/Hosting.svelte:27-34` | `prefixedProvider`, `AlignX`, `AlignY`, `Sizing`, `Substrate`, `TilesetOptions`. |
| `apps/demo/src/Responsive.svelte:28` | `prefixedProvider`, `HostRule`, `Substrate`. |
| `apps/demo/src/Kelp.svelte:20` | `prefixedProvider`, `AssetRef`, `Overflow`. |
| `apps/demo/src/Square2x2.svelte:36-44` | `domGeometry`, `naturalHeight`, `prefixedProvider`, `scaleFactor`, `uniformGeometry`, `AssetRef`, `GridGeometry`. |

Inside the package, modules import each other directly, never through this file.

### Tests

No test file. Each module's own tests import from the module, not from here.

### Gotchas & rejected alternatives

- **The components are imported by path,** not from this entry point.
- **`sincos` is re-exported twice:** from the engine entry (`packages/tileset/src/index.ts:71`) and
  from here through `transform.ts`.

### Review notes

- The header's S10 comment says "The component computes placement from" `cellBox` and `cellAt`,
  "and `09` draws every overlay from them". Neither is true today: `<Tileset>` places cells with
  `cellPlacementAffine` and `domGeometry`, the editor overlays use `cellPlacementPercent`, and
  `cellBox` has no production caller. The rule still holds; the named functions are stale.
- `refresh`, `track`, `occlusionMask`, `reservationCss`, `transformMatrix`, `applyMatrix`, `snap`,
  `cellBox` and `gridWidth` have no importer in `apps/editor/src` or `apps/demo/src`. They are
  public for hosts, so this is not dead code, but nothing in the repository exercises them through
  the entry point.
