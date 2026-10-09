---
title: index.ts
description: The engine entry point of @fndvit/gen-tilesets. What it exports, grouped, and why each group is public.
sidebar:
  order: 3
---

**Written from:** `packages/tileset/src/index.ts`, and the import sites of the package in
`apps/editor/src` and `apps/demo/src`.

## Overview

The index module is the front of the published package. When an app writes
`import { … } from "@fndvit/gen-tilesets"`, this file decides what it gets. It contains no logic of
its own: it gathers the engine's functions and types from the other modules and re-exports them.

It also draws a boundary. Everything reachable from here is pure engine code, with no page, no
pixels and no images. The drawing code lives behind a second entry point,
`@fndvit/gen-tilesets/render`. A host app imports this entry to load a file, inspect or reshape it,
and run generation; it imports the render entry to put the result on screen.

This page lists the exports and the reasons the file's own comments give for exporting them. What
each function does is on that module's page.

## In detail

### Purpose

The header states the contract: `generate(config, seed, loadSalt) → Grid<TileState>` is pure, and
nothing exported from this entry point touches the DOM, a pixel measurement or a graphical
resource. The renderer is under `/render`.

### Public surface

Grouped as the file groups them, in file order.

| Group | Exports | Source module | Why it is public (from the comments in `index.ts`) |
| --- | --- | --- | --- |
| The engine | [`generate`](/api/index/functions/generate/) | [`generate.ts`](/engine/generate/) | The package's reason to exist. |
| Overlay predicate | [`selection`](/api/index/functions/selection/) | [`selection.ts`](/engine/selection/) | The editor's overlay gets its cell set from the engine, so the editor implements no Selection test. Moves no output, so it was a minor bump. |
| Attributes | [`ATTRIBUTE_NAMES`](/api/index/variables/attribute_names/), [`ATTRIBUTES`](/api/index/variables/attributes/), [`bound`](/api/index/functions/bound/), [`initialTileState`](/api/index/functions/initialtilestate/), [`writeAttribute`](/api/index/functions/writeattribute/), [`AttributeSpec`](/api/index/interfaces/attributespec/), [`Bounding`](/api/index/type-aliases/bounding/) | [`attributes.ts`](/engine/attributes/) | No comment. |
| Asset walk | [`canonicalAssets`](/api/index/functions/canonicalassets/), [`prepareTile`](/api/index/functions/preparetile/), [`walkWeights`](/api/index/functions/walkweights/), [`PreparedTile`](/api/index/interfaces/preparedtile/) | [`assets.ts`](/engine/assets/) | No comment. |
| Shape | [`coordinateBoundOperations`](/api/index/functions/coordinateboundoperations/), [`reshape`](/api/index/functions/reshape/), [`reshapeErrors`](/api/index/functions/reshapeerrors/), [`SHAPE_FIELDS`](/api/index/variables/shape_fields/), [`shapeOf`](/api/index/functions/shapeof/) | [`shape.ts`](/engine/shape/) | `reshape` is a pure `(TilesetFile, Partial<Shape>) → TilesetFile`. It writes a `Layout` but reads only the `selections` registry and nothing in `render/`, so it belongs in the engine entry. `reshapeErrors` is separate because the transform trusts its input as `generate()` does. Replaces 0.5.0's `decorationFile`. |
| Responsive rules | [`activeKey`](/api/index/functions/activekey/), [`activeRules`](/api/index/functions/activerules/), [`bandWidths`](/api/index/functions/bandwidths/), [`matches`](/api/index/functions/matches/), [`ruleOverride`](/api/index/functions/ruleoverride/), [`rulesReshapeErrors`](/api/index/functions/rulesreshapeerrors/) | [`responsive.ts`](/engine/responsive/) | Which override holds at a render-box width. Pure: the width is an argument, and measuring belongs to `/render`. |
| Source context | [`operationCtx`](/api/index/functions/operationctx/), [`EvalCtx`](/api/index/interfaces/evalctx/) | [`ctx.ts`](/engine/ctx/) | No comment. |
| Trigonometry | [`sincos`](/api/index/functions/sincos/) | [`angle.ts`](/engine/angle/) | Shared by `gradient` and the renderer's matrix. Exported here *as well as* from `/render` because it is engine code now. |
| Hashing | [`ASSET_CHANNEL`](/api/index/variables/asset_channel/), [`channelU32`](/api/index/functions/channelu32/), [`effectiveSeeds`](/api/index/functions/effectiveseeds/), [`hash`](/api/index/functions/hash/), [`hashU32`](/api/index/functions/hashu32/), [`mixLoad`](/api/index/functions/mixload/), [`pickSeed`](/api/index/functions/pickseed/), [`selectionChannel`](/api/index/functions/selectionchannel/), [`stage1`](/api/index/functions/stage1/), [`EffectiveSeeds`](/api/index/interfaces/effectiveseeds/) | [`hash.ts`](/engine/hash/) | No comment. |
| Mapping | [`applyNumericMapping`](/api/index/functions/applynumericmapping/), [`applyTileMapping`](/api/index/functions/applytilemapping/), [`isTileMapping`](/api/index/functions/istilemapping/), [`paletteTotal`](/api/index/functions/palettetotal/) | [`mapping.ts`](/engine/mapping/) | No comment. |
| Registries | [`acceptedBlends`](/api/index/functions/acceptedblends/), [`blends`](/api/index/variables/blends/), [`isAccepted`](/api/index/functions/isaccepted/), [`TARGETS`](/api/index/variables/targets/), [`BlendRegistration`](/api/index/interfaces/blendregistration/), [`BlendValue`](/api/index/type-aliases/blendvalue/), [`TargetSpec`](/api/index/interfaces/targetspec/); [`Registry`](/api/index/classes/registry/), [`ParamSchema`](/api/index/type-aliases/paramschema/), [`ParamSpec`](/api/index/type-aliases/paramspec/); [`selections`](/api/index/variables/selections/), [`SelectionRegistration`](/api/index/interfaces/selectionregistration/); [`evalSource`](/api/index/functions/evalsource/), [`sources`](/api/index/variables/sources/), [`SourceRegistration`](/api/index/interfaces/sourceregistration/) | `registry/*.ts` | No comment. |
| Migration | [`migrate`](/api/index/functions/migrate/), [`MIGRATIONS`](/api/index/variables/migrations/), [`Migration`](/api/index/interfaces/migration/), [`MigrationOutcome`](/api/index/type-aliases/migrationoutcome/) | `migrate.ts` | The migration table and the walk over it. Runs **before** `validate()`, because validation may not coerce. |
| Validation | [`SCHEMA_VERSION`](/api/index/variables/schema_version/), [`validate`](/api/index/functions/validate/), [`ErrorCode`](/api/index/type-aliases/errorcode/), [`ValidationError`](/api/index/interfaces/validationerror/) | `validate.ts` | A separate function, off the critical path. `generate()` trusts its input; this is what earns that trust. |
| Loading | [`assertValidFile`](/api/index/functions/assertvalidfile/), [`loadTilesetFile`](/api/index/functions/loadtilesetfile/) | [`load.ts`](/engine/load/) | The two-in-one door for a plain consumer. A host that needs migration steps or structured errors (the editor) uses `migrate`/`validate` directly. `assertValidFile` is public because `<Tileset>` asserts with it under `DEV`. |
| Data model | [`tileStateAt`](/api/index/functions/tilestateat/) and 23 types (see [`types.ts`](/engine/types/)) | [`types.ts`](/engine/types/) | No comment. |

### Inputs → outputs

None. The file is re-exports only.

### Invariants

- **No DOM, no pixels, no graphical resources** from this entry point. The header states it; the
  renderer is a separate subpath.
- **`reshape` is here, not in `/render`,** because of what it imports, not what it writes: it
  reads the `selections` registry and nothing in `render/`.
- **The check is always separate from the transform.** `validate` beside `generate`,
  `reshapeErrors` beside `reshape`.

### Not exported

Modules in this section that are reachable only inside the package: `dev.ts` (`DEV`), and from
`shape.ts` the helpers `shapeFieldProblem` and `coordinateBoundMessage`, which `validate.ts` and
`render/options.ts` import directly.

### Callers / callees

The apps import this entry as `@fndvit/gen-tilesets`: 30 non-test files in `apps/editor/src` and
`apps/demo/src`. Each symbol's own page lists its call sites.

### Tests

No test file. The package's own tests import from the individual modules (for example
`./generate.js`), not from `index.ts`. Twelve editor test files (`apps/editor/src/*.test.ts`,
`controls/*.test.ts`) import from `@fndvit/gen-tilesets`, so the symbols they use are exercised
through this entry. Nothing pins the export list as a whole.

### Gotchas & rejected alternatives

- **`sincos` has two public paths.** `render/transform.ts` re-exports it from `angle.ts`, and
  `render/index.ts` exports it again, so an existing import from `/render` still resolves.
- **`assertValidFile` is not migration-aware.** It is exported for `<Tileset>`'s `DEV` assertion,
  not as a consumer entry; consumers use `loadTilesetFile`.

### Review notes

None found.
