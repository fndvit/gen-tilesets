# Tileset generator

A procedural tileset generator: a pure engine, `generate(config, seed, loadSalt) → Grid<TileState>`,
and a Svelte renderer that owns layout, scaling, clipping and asset resolution. The editor is an
ordinary consumer of that package — its preview is a plain `<Tileset>`.

**Read `ARCHITECTURE.md` first** for how the code is laid out. This file is the rules.

## Where things are

| Path                  | What                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `ARCHITECTURE.md`     | Module map, data flow, the two substrates, the testing situation. |
| `CHANGELOG.md`        | What was built, per version.                                      |
| `packages/tileset`    | Engine and renderer. **The only published package.**              |
| `apps/editor`         | The editor. Private, unpublished. Dev server on 5174.             |
| `apps/demo`           | A fixture page for the renderer. Private, unpublished. Port 5173.  |

## The specification is archived

The specification, the five ADRs and `DECISIONS.md` are **not in this repository**. They are at
`../gen-tileset-spec-archive/`, frozen, and no longer maintained. They describe the code as it was
built up to v0.1.0.

**The code is the authority now.** It is typed and it is tested; the archive is not checked against
it. Where the two disagree, the code is right.

Source comments carry ~1,200 citations of the form `` `07` §6.4 `` and **R8**. They are kept on
purpose: they still say *which rule this code obeys*, which is information the code cannot express
on its own. They point into the archive. Do not strip them, and do not treat a citation as a
document you must go and reconcile — read the archive only when you need to know *why* a decision
went the way it did.

## Rules

- **Open a document before making any claim about it.** A claim about another file is stale by
  default. Every known-false statement written in this project was written by someone describing a
  document they had not just read.

- **Terminology is fixed.** `TileState` not `CellState`, `Tile` not `TileType`, `TileAsset` not
  `Variant`. Renaming these is never a cleanup.

- **`generate()` trusts its input.** Validation is a separate function and is not on the critical
  path. `migrate()` runs *before* `validate()`, because rewriting a version is a coercion and
  `validate()` never coerces.

- **Determinism is the load-bearing property.** The engine is pure. Positional hashing is chosen
  over a sequential PRNG so that resize is stable and per-operation reroll is possible. Anything
  that changes generated output for an unchanged `(config, seed, loadSalt)` is a breaking change,
  not a fix.

- **Failure is loud.** An unknown type is a load failure and nothing is substituted. Asset
  resolution never substitutes and never returns null. Validation produces errors, not warnings.

- **Rationale goes where it is read.** When you make a non-obvious choice, write why *at the point
  of use*, including what you rejected. This is now the only place such reasoning gets recorded.

## Versioning

`packages/tileset` is published; the two apps are not. Consumers pin an **exact** version.

We are at `0.x`, and `0.x` promises nothing about output stability — that is deliberate, and it is
what substitutes for the frozen regression tables that do not exist yet. Before declaring `1.0.0`,
generated and drawn output must be pinned by real vector tables; until then, an output change is a
version bump and a changelog line, not a crisis.

## Testing

`pnpm test` and `pnpm typecheck` from the root. Both must be green.

`.svelte` components cannot be unit-tested here — Vitest 2 bundles Vite 5 and the Svelte plugin
needs Vite 8. That is why logic lives in plain `.ts` beside the components that use it, and why
`svelte-check` and the two apps are the only coverage `Tileset.svelte` has. Keep it that way:
logic that matters belongs in a `.ts` file that a test can import.
