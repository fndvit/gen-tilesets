/**
 * `selection()` — `09-editor.md` §6.2, **E8**; `02-generation-contract.md` §12.
 *
 *     selection(config, operationId, seed, loadSalt = 0) -> (x, y) -> boolean
 *
 * A pure function of the same inputs `generate()` takes, returning a predicate.
 *
 * ## Why this exists
 *
 * **Invariant E8** — *the set of cells an overlay covers is obtained from the
 * engine package. The editor contains no implementation of any Selection's test.*
 *
 * Without it the editor reimplements `checkerboard`'s parity test, `everyNth`'s
 * remainder, `rect`'s half-open bounds, and `random`'s selection-channel draw —
 * a second implementation of the only engine behaviour the editor touches, and
 * one that drifts silently in the one place the author is looking directly at it.
 * That is `07` **R1**'s argument one layer up: the picture right, the selection
 * boxes a few pixels off, and nothing anywhere reporting it.
 *
 * **Why not diff two grids.** The alternative avoiding a new export is generating
 * with and without the Operation and highlighting the difference. It answers a
 * different question: a diff shows *effect*, not *selection*. An Operation can
 * select a cell and write a value identical to what was there — `multiply` by
 * one, a palette entry matching the tile already present, a `set` of the default
 * — and those cells would vanish from an overlay that is supposed to show what
 * the Operation acts on. It also costs two generations per frame where one
 * suffices (`09` §6.2).
 *
 * ## What it costs
 *
 * An added export that moves no output — a **minor engine bump** under `05`
 * §10.2, the same shape as the `generateRegion` row `02` §12 already carries.
 * No `schemaVersion` bump, and no picture already drawn moves.
 */

import { operationCtx } from "./ctx.js";
import { effectiveSeeds } from "./hash.js";
import { selections } from "./registry/selections.js";
import type { Operation, TilesetConfig } from "./types.js";

/**
 * The predicate for one Operation's Selection.
 *
 * **Total and unbounded in `(x, y)`**, matching `07` §8.2's reasoning for
 * `cellAt`. `04` §4.2 permits a `rect` to extend past the grid — *"an author
 * dragging a rectangle to the grid edge should not have it silently resized"* —
 * and an author dragging one needs to see where it reached. Callers bound at the
 * draw site, since only cells in `rows x columns` have a `cellBox` worth drawing
 * (`09` §6.2).
 *
 * It resolves the Operation's effective seed per `02` §6.7 and its selection
 * channel per `04` §4.3, so a `random` Selection's overlay matches the cells the
 * Operation will actually act on — including under a set `reseedOnLoad` flag at
 * the previewed `loadSalt`.
 *
 * @param config the same `TilesetConfig` `generate()` takes. Never the whole
 *   `TilesetFile` (`06` **C1**).
 * @param operationId the Operation to test. Unique within the stack (`06` **C10**).
 * @param seed the run's seed string. The engine never applies
 *   `config.defaultSeed` — the caller does (`02` §4.1, `07` §9.2).
 * @param loadSalt the caller's `loadSalt`, so an overlay drawn beside a preview
 *   at a given load agrees with it (`07` **R12**).
 *
 * **This function validates nothing**, on `06` **C5**'s reasoning: validation is
 * a separate function and the engine trusts its input. The one exception is the
 * lookup below, which cannot proceed at all.
 *
 * **An unresolvable `operationId` throws.** The alternative is a predicate that
 * answers `false` everywhere, which is an empty overlay — indistinguishable from
 * a Selection that legitimately matches nothing, on a screen where the author is
 * judging exactly that. It is `05` **X7**'s reasoning applied to an id rather
 * than a type name: a plausible-looking wrong answer with no error anywhere is
 * worse than a stack trace. `09` §6.2 does not state this case; it is recorded
 * in `DECISIONS.md` D11.
 */
export function selection(
  config: TilesetConfig,
  operationId: string,
  seed: string,
  loadSalt = 0,
): (x: number, y: number) => boolean {
  const op: Operation | undefined = config.operations.find((o) => o.id === operationId);
  if (op === undefined) {
    throw new Error(
      `No Operation with id "${operationId}" in this config. ` +
        `Present: ${config.operations.map((o) => o.id).join(", ") || "(none)"}.`,
    );
  }

  // Resolved once, outside the returned closure. The predicate is called per
  // cell, and the effective seed cannot change between those calls -- it is a
  // function of arguments already fixed.
  const registration = selections.get(op.selection.type);
  const ctx = operationCtx(config, op, effectiveSeeds(seed, loadSalt));
  const params = op.selection as Record<string, unknown>;

  return (x, y) => registration.impl(params, x, y, ctx);
}
