# Tileset generator

A procedural tileset generator: a pure engine, `generate(config, seed) → Grid<TileState>`,
and a Svelte renderer that owns layout, scaling, clipping and asset resolution.

There is one engine. It publishes as a package and consumers pin a version, so any change
to generated output is a versioning problem, not a conformance one (`05` **X9**).

## Where things are

| Path               | What                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| `/spec`            | The specification. Read `/spec/README.md` first — not all of it binds equally. |
| `/adr`             | Reversed or contested decisions. Five files.                                   |
| `/attic`           | The authoring-phase audit and its harvests. Historical. **Do not cite it.**    |
| `packages/tileset` | Engine and renderer. `@tileset/core`.                                          |
| `apps/editor`      | The editor. Not started.                                                       |

## Rules

- **Open a document before making any claim about it.** A claim about another file is stale
  by default. Every known-false statement in this package was written by someone describing
  a document they had not just read.
- **Section numbers are append-only** — `01` §11.4. New sections take the next unused number.
  Nothing is renumbered; a removed section keeps its number as a tombstone.
- **Never regenerate a vector table to make a test pass** — ADR-004. An unexpected diff means
  output moved without anyone intending it, which is the point of the table.
- **Terminology is fixed.** `TileState` not `CellState`, `Tile` not `TileType`, `TileAsset`
  not `Variant`. The rejected names and why they lost are in `01` §10.1. Drift here is the
  cheapest thing to preserve and the most expensive thing to lose.
- **`generate()` trusts its input** (`06` §10, **C5**). Validation is a separate function and
  is not on the critical path.

## Current state

Pre-implementation. Nine engine units, then a minimal renderer:

1. Hash core — `02` §6.6, §6.7
2. Attribute table and bounding — `03` §5.1–§5.4
3. `Tile`, `TileAsset`, the weight walk — `03` §3, §4.1–§4.3
4. `TileState` and null initialization — `02` §8, §8.1
5. Selection presets — `04` §4.2–§4.5
6. Source presets — `04` §5.2–§5.4, `05` §6.2, §6.4
7. Mapping — `04` §6.1–§6.4
8. Blend and Target — `04` §7.1–§7.3, ADR-001
9. `generate()` and the evaluation loop — `02` §4, §5, §9

Then `cellBox` / `cellAt` (`07` §5.2–§5.3, §8.2–§8.3) and a `<Tileset>` that resolves each
cell to a `Drawable` (`08` §4.2) and nothing more.

## Deferred on purpose

Not open questions. Do not rediscover them as such.

- **Vector tables** — all five, generated once units 1–9 pass, under ADR-004.
- **`validate()` and the error vocabulary** — `06` §5–§10, after the engine draws.
- **Reference configs** — `05` §11.1, once the Sources they exercise exist.
- **Transforms, cropping, `onAssetError`** — `07` §6, §6.4; `08` §4.4.
- **The editor** — after the renderer.
- **The invariant census and `pnpm invariants`** — at 1.0 planning, not before.
