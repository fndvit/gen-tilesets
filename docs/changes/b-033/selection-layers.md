# B-033 Selection layers: an operation's selection is a list of layers
Backlog: B-033 · Tier: big · Areas: engine, schema, operations-ui · Decisions: Pol, 2026-11-12 (selection is always a list; accordion layer UI; × hint only before a Random layer)
Output: unchanged
Package: yes

## What changed
`Operation.selection` is an array of one or more Selections ("layers"), and an Operation affects every cell any layer selects. The schema goes from 5 to 6, and `migrate()`'s 5 → 6 row wraps each older selection in a one-item list, so migrated files draw byte-identically. `random` layers are channelled by position: layer 0 keeps `opId:selection`, and layer i ≥ 1 uses `opId:i:selection`. The extent is the bounding box of the layers, or the whole grid if any layer has none, and an Operation is coordinate-bound if any layer is. `validate()` refuses a non-array or an empty list. New export: `isCoordinateBound(layers)`. **Breaking under 0.x:** a config built in TypeScript, or passed to `generate()` without `migrate()`, must use the list.

## Notes
- Plan and reviews are in `docs/plans/selection-layers.md`. PR #31.
- Rejected: a `union` Selection beside the plain one (61d6c74, undone in 11a71c7), a chip strip instead of the accordion, a default type for a new layer, and reordering, since order only moves the Random scatter (it may come with B-034).
- Editor: the Selection step lists the layers (`SelectionLayers.svelte`: accordion rows, "+ Add selection layer", and a × hint when a Random layer comes after). The live picture keeps the typed layers while a new one has no type yet (Block 3 fix). The editor's templates went to v6.
- Docs: glossary, determinism, responsive and decorations pages describe layers.
- The version bump and the `CHANGELOG.md` section happen at release (`pnpm changelog draft`).
