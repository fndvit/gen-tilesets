# CLAUDE.md

## The specification is the source of truth

`/spec` holds a complete, agreed ten-document specification package. **Read
`/spec/00-overview.md` before doing anything else.** It is the front door: it says what the
system is, what V1 includes and excludes, and which document to open next. `/spec/01-glossary.md`
is the naming authority and `/spec/roadmap.md` is the complement of `00` — everything V1 is not.

Where code and a spec disagree, **the spec is right and the code is a bug.** Where the spec is
wrong, it gets amended — never worked around, never silently reinterpreted.

**Do not restate the spec.** Do not summarise it into another file, do not paraphrase a section
into a code comment, do not describe what a document says without opening it. This package's
recorded failure mode is stale restatement: ten cross-document claims described work that had
already landed, and two were written by passes that had just finished criticising the pattern.
A citation (`04` §7.2) is cheap and stays true; a paraphrase rots.

**A claim about a spec document is stale by default.** Before asserting what any document says,
open it, and name what you opened.

## Citations

Cite as `` `04` §7.2 `` — backticked document number, then the section. Invariants are cited by
ID: **G2**, **R10**, **C4**. Never write a bare `§7.2`; `01` §1.2 withdrew that shorthand.

## Terminology is not negotiable

`Cell`, `TileState`, `Tile`, `TileAsset`, `Grid`, `Layout`, `Operation`, `TilesetFile`,
`TilesetConfig`.

Not `CellState`, not `TileType`, not `Variant`. `01` §10.1 holds the full list of rejected forms,
§10.2 the reserved words, §10.3 the collisions that are deliberate and must not be "fixed".
Terminology drift is the cheapest way to break this package quietly. Check `01` before coining
any name that will appear in a type, an export, a config key, or an error code.

Qualify `type` and `default` — each carries four senses (`01` §11.5). Write _registered type_,
_Target type_, _default Blend_, _parameter default_, _attribute default_.

## Invariants are the test vocabulary

The package declares 86 invariants across eight documents: **G**1–5, **D**1–11, **O**1–8,
**X**0–10, **C**1–10, **R**1–15, **S**1–10, **E**1–16 (`01` §13).

Every test that discharges an invariant is named for it:

```
test('G2: clipped cells participate fully in generation', …)
test('R10: paint order is row-major', …)
```

Run `pnpm invariants` for coverage against the declared set. An invariant that is a posture
rather than an assertion is listed in `test/untestable.md` with a reason — absent and untestable
must never be indistinguishable.

## Amending a spec

Implementation will find contradictions and under-determination. When it does: **stop, do not
resolve it in code, and use the `spec-amendment` skill.** Propose the change, wait for
confirmation, then apply it — never amend a spec in passing or as a step inside a larger task.
Section numbers are append-only (`01` §11.4) — new sections take the next unused number, nothing
is renumbered, a removed section keeps its number as a tombstone.

## Regression vectors

Four exact tables define output stability: hash and `mixLoad` (`02` §6.6, §6.7; **X10**), and
geometry and transform (`07` §11.3; **R15**). Plus reference configs snapshotted against a
`(config, seed, loadSalt)` triple.

**Never regenerate a vector table to make a test pass.** An unexpected diff means output moved
without anyone intending it, which is the entire point of the tables. Regeneration happens only
alongside a deliberate major bump. Use the `regression-vectors` skill.

## Layout

```
packages/tileset/     engine + renderer, one package (E2 requires one pinned version)
apps/editor/          the editor; a host, not a caller (08 §3.1, S2)
spec/                 the specification package — read-only in practice
adr/                  ADR-001, ADR-002
PLAN.md               build order and sequencing — deliberately NOT in /spec (roadmap §3.3)
pnpm-workspace.yaml   declares packages/* and apps/*
```

The engine is pure and knows nothing of pixels (`02` §4.2, **G1**). The renderer owns layout,
scaling, clipping, and asset resolution. Nothing in `packages/tileset` may import from
`apps/editor`.

## Commands

```
pnpm -r build
pnpm -r test
pnpm -r lint

pnpm --filter @tileset/core test           # the package alone; pure, browser-free
pnpm --filter @tileset/core vectors:check  # regression tables; must pass before any commit
pnpm --filter @tileset/editor dev

pnpm invariants   # root script: invariant coverage across both workspaces, against the declared 86
```

`invariants` is a root script rather than a per-workspace one on purpose. The census is package-wide — **E**1–16 live in `apps/editor` and the rest in `packages/tileset` — and a count that can only be taken one workspace at a time cannot be checked against `01` §13's 86.

## Standing rules

- We are before `1.0.0`. `0.x` promises nothing (`05` §10.3) — but `1.0.0` is a **decision**, not
  a milestone that arrives on its own. Do not declare it.
- Never invent to fill a gap. If the spec does not settle something, say so and stop.
- Do not add a schedule or a priority to anything in `/spec`. Sequencing lives in `PLAN.md`.
- `05` §3 assumes one engine. There is no public plugin API and no second implementation.
