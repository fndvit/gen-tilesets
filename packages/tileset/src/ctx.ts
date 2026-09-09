/**
 * The Source context — `04-operations.md` §5.1, **O4**.
 *
 * **Invariant O4** — `ctx` is closed at
 * `{rows, columns, extent, effectiveSeed, operationId, salt}`. A Source receives
 * nothing else.
 *
 * The closure is the point. Every field added here becomes a field every future
 * Source may depend on and every future renderer must supply. `02` §4.2's
 * prohibited-input list sits immediately behind it: `ctx` is the doorway through
 * which a pixel measurement would enter the engine, so it stays narrow.
 *
 * Grid dimensions are present because a spanning Source cannot normalize without
 * them; the hash key components are present so a Source can call `hash()` itself.
 *
 * **`extent` is the one addition since `04` §5.1 wrote that list**, and it is
 * admissible on the test the closure exists to enforce rather than in spite of
 * it: it is a pure function of the config's own Selection parameters, in design
 * space, and it is not a measurement. Its own field comment carries the defect it
 * was added to fix. `04` §5.1's five-field list is therefore one the code has
 * moved past — the code is the authority, and this is the disagreement.
 *
 * **On `effectiveSeed` rather than the seed string.** `valueNoise` calls `hash()`
 * itself, so a Source handed the raw seed would hash against it directly and
 * silently ignore its own Operation's `reseedOnLoad` flag — a flagged
 * `valueNoise` that never varies between loads, with nothing anywhere to
 * indicate why. Resolving it once, outside the Source, makes the flag work
 * whether or not the Source's author was thinking about it (ADR-002).
 */

import { pickSeed, type EffectiveSeeds } from "./hash.js";
import { selections } from "./registry/selections.js";
import type { Extent, Operation, TilesetConfig } from "./types.js";

export interface EvalCtx {
  /**
   * The grid, as such. **Not** what a spanning Source normalizes over — see
   * `extent` below, and prefer it.
   */
  rows: number;
  columns: number;
  /**
   * The rectangle a **spanning** Source normalizes over: the Operation's
   * Selection extent, or the whole grid where the Selection declares none.
   *
   * **This, not `rows`/`columns`, is a spanning Source's domain.** A `gradient`
   * confined to a `rect` used to receive whatever slice of a grid-wide sweep
   * happened to fall across it — a seven-row band of a ten-row grid got
   * `t` in `[0.05, 0.65]`, so `range: [0.3, 1]` topped out at 0.767 and
   * `steps: 7` collapsed to five distinct bands. Both fields are kept because
   * `EvalCtx` is public API and a future Source may legitimately want the grid
   * itself; the two are not interchangeable and picking the wrong one is silent.
   *
   * **This widens O4, deliberately.** The closure above is the point, and every
   * field added here is one every future Source may depend on. This one is
   * admissible on the test the closure exists to enforce: it is a pure function
   * of the config's own Selection parameters, entirely in design space, and it
   * is not a measurement — `02` §4.2's prohibited-input list is untouched. It
   * carries no more information than the Selection the same Operation already
   * names.
   */
  extent: Extent;
  /** `uint32`. Stage-1 hashed and load-mixed where `reseedOnLoad` is set (`02` §6.7). */
  effectiveSeed: number;
  operationId: string;
  /**
   * `04` §5.1's block types this `number`; `04` §3 and `06` **C9** type it
   * `uint32` — an integer in `[0, 2^32)`. The narrow reading is taken, since
   * every consumer truncates anyway (`06` §5.2).
   */
  salt: number;
}

/**
 * One Operation's `ctx`, built the same way for `generate()` and `selection()`.
 *
 * Shared rather than written twice on `07` **R1**'s reasoning one layer up: the
 * `09` §6.2 export exists so the editor's overlay shows the cells the Operation
 * will actually act on, and two constructions of this object could disagree
 * about the effective seed or the salt while both looking correct.
 */
export function operationCtx(
  config: Pick<TilesetConfig, "rows" | "columns">,
  op: Operation,
  seeds: EffectiveSeeds,
): EvalCtx {
  // Resolved here rather than per cell: a Selection's extent is a function of
  // parameters already fixed, and `gradient` would otherwise walk a cellList's
  // bounding box once per cell.
  //
  // Resolved here rather than in `generate()` for this function's own reason,
  // one field down: `generate()` and `selection()` must build this object the
  // same way or the editor's overlay can disagree with the picture beside it.
  //
  // `selections.get` throws on an unknown type (X7) -- which is the established
  // answer and not a new failure mode, since both callers already resolve the
  // same registration for `impl`. C5 keeps validation elsewhere.
  const registration = selections.get(op.selection.type);
  const declared = registration.extent?.(op.selection as Record<string, unknown>);

  return {
    rows: config.rows,
    columns: config.columns,
    // The grid is the default, and it belongs here: a Selection is handed no
    // dimensions, so it cannot name the grid itself.
    extent: declared ?? { x: 0, y: 0, width: config.columns, height: config.rows },
    effectiveSeed: pickSeed(seeds, op.reseedOnLoad),
    operationId: op.id,
    // 06 §5.1: absent means 0.
    salt: op.salt ?? 0,
  };
}
