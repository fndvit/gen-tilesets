/**
 * The Source context — `04-operations.md` §5.1, **O4**.
 *
 * **Invariant O4** — `ctx` is closed at
 * `{rows, columns, effectiveSeed, operationId, salt}`. A Source receives nothing
 * else.
 *
 * The closure is the point. Every field added here becomes a field every future
 * Source may depend on and every future renderer must supply. `02` §4.2's
 * prohibited-input list sits immediately behind it: `ctx` is the doorway through
 * which a pixel measurement would enter the engine, so it stays narrow.
 *
 * Grid dimensions are present because a spanning Source cannot normalize without
 * them; the hash key components are present so a Source can call `hash()` itself.
 *
 * **On `effectiveSeed` rather than the seed string.** `valueNoise` calls `hash()`
 * itself, so a Source handed the raw seed would hash against it directly and
 * silently ignore its own Operation's `reseedOnLoad` flag — a flagged
 * `valueNoise` that never varies between loads, with nothing anywhere to
 * indicate why. Resolving it once, outside the Source, makes the flag work
 * whether or not the Source's author was thinking about it (ADR-002).
 */

import { pickSeed, type EffectiveSeeds } from "./hash.js";
import type { Operation, TilesetConfig } from "./types.js";

export interface EvalCtx {
  rows: number;
  columns: number;
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
  return {
    rows: config.rows,
    columns: config.columns,
    effectiveSeed: pickSeed(seeds, op.reseedOnLoad),
    operationId: op.id,
    // 06 §5.1: absent means 0.
    salt: op.salt ?? 0,
  };
}
