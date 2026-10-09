---
title: options.ts
description: The Tileset component's one settings object. Its type, its defaults (written in one place), its development-build check, and the rule cascade's render half.
sidebar:
  order: 4
---

**Written from:** `packages/tileset/src/render/options.ts`, `options.test.ts`, and the call sites
in `render/Tileset.svelte`, `render/breakpoints.ts`, `render/TileDecoration.svelte` and the demo.

## Overview

The drawing component takes the tileset file and one settings object. This module defines that
object: the seed, which drawing substrate to use, whether cells scale with the box or stay a fixed
size, how the grid aligns, which page elements to keep clear of, host-supplied responsive rules,
and how to find each tile's image. Every field is optional.

The module also fills in defaults (in exactly one place), checks an options object for mistakes in
a development build, and handles the render-side half of responsive rules: which rules apply and
what sizing and alignment they produce. It sits at the start of drawing. The host passes the file
and the settings, the component resolves the settings, then: load → generate → draw.

## In detail

### Purpose

Before 0.6.0, `seed`, `loadSalt`, `provider`, `onAssetError` and `substrate` were separate props.
They moved into one typed object, with "one way to say each thing": the old props are not kept as
aliases, because two spellings would need a precedence rule. Passing one throws in development and
names its new place.

### Public surface

All re-exported from `render/index.ts:43-60`.

**[`TilesetOptions`](/api/render/interfaces/tilesetoptions/)**, every field also accepting
`undefined`:

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `seed` | `string` | `file.config.defaultSeed` | Absent means a fixed picture (cited as **S4**). |
| `loadSalt` | `number` | `0` | Per-load variation, drawn once per session by the host. |
| `substrate` | [`Substrate`](/api/render/type-aliases/substrate/) | `"canvas"` | `"canvas"` (one bitmap, seamless, draws nothing until measured) or `"dom"` (one element per cell, hit-testable, SSR-complete). |
| `overflow` | [`Overflow`](/api/render/type-aliases/overflow/) | `"hidden"` | `"visible"` hands the clip to the host. **DOM only.** |
| `sizing` | `Sizing` | `"fluid"` | `"fixed"` keeps `layout.cellSize` CSS px and crops. |
| `align` | `{ x?: AlignX; y?: AlignY }` | `center` / `top` | Which edge of the design box stays put. |
| `avoid` | `{ targets: AvoidTargets; padding? }` | absent | Hide tiles over these elements. `padding` defaults to `0`. |
| `responsive` | `readonly HostRule[]` | the file's rules | Replaces `file.responsive` wholesale; `[]` turns the file's off. |
| `provider` | `AssetProvider` | `defaultProvider` | `(tileId, assetId)` → drawable. |
| `onAssetError` | `(ref, cause) => void` | none | Resolution and load failures alike (cited as **S6**). |

**Other exports:**

| Export | Signature | Meaning |
| --- | --- | --- |
| [`HostRule`](/api/render/interfaces/hostrule/) | `ResponsiveRule & { sizing?, align? }` | A host rule may also set sizing and alignment. |
| [`AvoidTargets`](/api/render/type-aliases/avoidtargets/) | `string \| Element \| Iterable<Element>` | A selector, one element, or several. |
| [`NormalizedTargets`](/api/render/type-aliases/normalizedtargets/) | `{ kind: "selector", selector } \| { kind: "elements", elements }` | Targets with their shape decided. |
| [`ResolvedOptions`](/api/render/interfaces/resolvedoptions/) | interface | Every default filled in; `align` split into `alignX`/`alignY`; `avoid` normalised or `null`. |
| [`DEFAULT_OPTIONS`](/api/render/variables/default_options/) | frozen `ResolvedOptions` | The defaults, as data. |
| [`resolveOptions`](/api/render/functions/resolveoptions/) | `(o?) → ResolvedOptions` | Fill defaults with `??`. |
| [`effectiveRules`](/api/render/functions/effectiverules/) | `(file, host?) → HostRule[]` | `host ?? file.responsive ?? []`. |
| [`renderOverride`](/api/render/functions/renderoverride/) | `(base, active) → { sizing, alignX, alignY }` | The render-space half of the cascade. |
| [`normalizeTargets`](/api/render/functions/normalizetargets/) | `(t) → NormalizedTargets` | String → selector; element → one; iterable → list. |
| [`sameTargets`](/api/render/functions/sametargets/) | `(a, b) → boolean` | Equal selectors, or the same elements in the same order. |
| [`optionErrors`](/api/render/functions/optionerrors/) | `(o: unknown) → string[]` | Every problem, as messages naming the field. |
| [`LEGACY_PROPS`](/api/render/variables/legacy_props/) | `["seed", "loadSalt", "provider", "onAssetError", "substrate"]` | The pre-0.6.0 props. |
| [`legacyPropErrors`](/api/render/functions/legacyproperrors/) | `(rest) → string[]` | One message per legacy prop found. |

### Inputs → outputs

- **`resolveOptions(undefined)`** is a copy of `DEFAULT_OPTIONS`. Otherwise each field is
  `o.field ?? default`, so present-but-`undefined` equals absent. `avoid` becomes
  `{ targets: normalizeTargets(o.avoid.targets), padding: o.avoid.padding ?? 0 }` or `null`.
- **`renderOverride`** applies active rules in order, a later rule winning field by field, the same
  cascade `ruleOverride` runs over shape fields.
- **`normalizeTargets`** tests `nodeType` **before** iterability, because an `HTMLSelectElement`
  iterates its options and a single `<select>` means the select.
- **`optionErrors`** returns `[]` for `undefined`, one message for a non-object, and otherwise
  checks: unknown keys; `seed` a string; `loadSalt` finite; `substrate`, `overflow`, `sizing`,
  `align.x`, `align.y` in their sets; `overflow: "visible"` only with `substrate: "dom"` (an absent
  substrate counts as canvas); `avoid` an object with only `targets`/`padding`, `targets` a
  non-blank selector or an element or an iterable, `padding` finite and `>= 0`; `responsive` an
  array of valid rules; `provider` and `onAssetError` functions.
- **Each host rule** (private `ruleErrors`) must be an object; have only `minWidth`, `maxWidth`, the
  shape fields, `sizing`, `align` (with a special message for `referenceWidth`: "set `bleed`
  instead"); have finite non-negative bounds, at least one of them, `minWidth <= maxWidth`; valid
  shape fields per `shapeFieldProblem`; and set at least one thing.
- **`legacyPropErrors`** names each legacy prop present and says to pass it as
  `options={{ k }}`.

### Invariants

- **Defaults live in `resolveOptions` and nowhere else** (`DEFAULT_OPTIONS` is what it reads).
- **Resolving trusts its input; checking is separate** (cited as **C5**). `<Tileset>` runs
  `optionErrors` in a development build only and throws on any message. It "reports and never
  coerces": `substrate: "svg"` is an error, not a fallback to canvas.
- **`unknown`, not `TilesetOptions`,** for the check, because it exists for what arrives without
  types: plain JavaScript, a cast, a CMS value.
- **Host rules replace file rules, never merge.** A host that wants both spreads them:
  `[...file.responsive ?? [], mine]`.
- **`reshape()` has already dropped a reshaped file's rules**, so `effectiveRules` needs no case for
  it.

### Callers / callees

| Caller | Uses |
| --- | --- |
| `render/Tileset.svelte:160-170` | `legacyPropErrors(rest)` and `optionErrors(options)` (DEV), then `resolveOptions(options)`. |
| `render/Tileset.svelte:195-199` | `sameTargets` to keep the targets' identity when an inline array is rebuilt. |
| `render/Tileset.svelte:264` | `effectiveRules(checked, hostRules)`. |
| `render/Tileset.svelte:305-307` | `renderOverride(base, shaped.active)`. |
| `render/breakpoints.ts:20, 103, 197` | `renderOverride` in `reservationCss` and `inertCellSizeRules`. |
| `render/measure.ts:54` | The `NormalizedTargets` type. |
| `render/TileDecoration.svelte:35` | The `TilesetOptions` type, passed straight through. |
| `apps/demo/src/Hosting.svelte:28-35` | Imports `TilesetOptions`, `Sizing`, `AlignX`, `AlignY`, `Substrate` to build its options. |
| `apps/demo/src/Responsive.svelte:28`, `Kelp.svelte:20` | `HostRule`, `Substrate`; `Overflow`. |

Callees: `shapeFieldProblem`, `SHAPE_FIELDS` (`../shape.ts`); `defaultProvider` (`provider.ts`).

### Tests: `options.test.ts`

- `resolveOptions(undefined)` and `({})` equal `DEFAULT_OPTIONS`, and `DEFAULT_OPTIONS` equals a
  literal object of the documented defaults; present-but-`undefined` fields are absent; each field
  overrides on its own (including both `avoid` shapes).
- `normalizeTargets` decides the shape once and treats an iterable element as one element;
  `sameTargets` compares by content and order.
- `optionErrors` accepts thirteen valid objects and rejects thirty-one invalid ones, each with a
  message containing its path.
- `legacyPropErrors` names each legacy prop and its new place, and is silent when there are none.
- `effectiveRules` takes the host's rules wholesale, lets `[]` turn the file's off, and falls back
  to the file's, then none.
- `renderOverride` cascades field by field.

### Gotchas & rejected alternatives

- **Named `options`, not `config`.** `file.config` is already `TilesetConfig`, and a `config` prop
  beside it would give one word two meanings on one line of markup.
- **`undefined` is accepted everywhere** so that a wrapper can forward its own optional field under
  `exactOptionalPropertyTypes`, "the exact spread workaround `<TileDecoration>` used to need".
- **`overflow` on canvas is an error, not a no-op.** A canvas cannot paint outside its bitmap.
  **Rejected:** an enlarged raster hanging past the box, which would move the canvas's presentation
  geometry. Not a `HostRule` field, because no case for changing it at a width has come up.
- **`sizing` and `align` are host rules only.** They are how a page *hosts* a design, not part of
  the design, so one file can be fluid in a hero and fixed in a sidebar.
- **`avoid` does not track** a target moved by a CSS animation; call `refresh()` when it settles.
- **`sameTargets` exists for inline arrays.** Without it, every host render would tear down and
  re-register the tracker's observers.

### Review notes

- The header says the component "has three props: `file`, `options`, and the bindable `box`".
  `<Tileset>` also collects `...rest`, solely to catch legacy props in development. Not wrong, but
  worth knowing.
- The header says defaults live in one place "so the table in the README and the behaviour cannot
  drift apart without a test noticing". The test pins `DEFAULT_OPTIONS` against a literal in the test
  file; no test reads the README, so README drift would go unnoticed.
- `resolveOptions` calls `normalizeTargets(o.avoid.targets)` without checking it. In production,
  where `optionErrors` does not run, `avoid: {}` makes `normalizeTargets` read `nodeType` of `undefined`
  and throw a bare `TypeError` rather than a named error. Consistent with "production trusts its input", but
  the failure is an unhelpful message.
