/**
 * The V1 Selection presets — `04-operations.md` §4.2.
 *
 * A Selection answers one question: *is this cell affected?*
 *
 *     Selection: (x, y) -> boolean
 *
 * **Invariant O2** — a Selection is a pure function of `(x, y)` and its own
 * parameters. It never reads the accumulated `TileState`.
 *
 * **Accepted, not a defect:** *"paint only where nothing is yet"* is not
 * expressible in V1. Most cases restructure by reordering the stack — paint the
 * scattered thing *after* the background rather than guarding it against
 * overwriting (`04` §4.1).
 *
 * Coordinates are grid-absolute (`02` §5) and every cell in `rows x columns` is
 * tested, including cells the renderer will clip (**G2**).
 */

import type { EvalCtx } from "../ctx.js";
import type { Extent } from "../types.js";
import { hash, selectionChannel } from "../hash.js";
import { Registry, type ParamSchema } from "./registry.js";

export type SelectionImpl = (
  params: Record<string, unknown>,
  x: number,
  y: number,
  ctx: EvalCtx,
) => boolean;

export interface SelectionRegistration {
  name: string;
  params: ParamSchema;

  /**
   * Whether the Selection is **coordinate-bound** — `04` §4.4's table.
   *
   * | Term                 | Defined by             | Survives a resize |
   * | -------------------- | ---------------------- | ----------------- |
   * | **Procedural**       | a rule                 | ✅                |
   * | **Coordinate-bound** | specific coordinates   | ❌ orphaned       |
   *
   * `09` **E12** requires confirmation before a design-width change "whenever the
   * config holds a coordinate-bound Selection", and `09` §9.3 is explicit that a
   * dialogue appearing every time "teaches the author to dismiss it before
   * reading, which is worse than no dialogue". So the editor has to know which
   * Selections are at risk, exactly.
   *
   * **A declaration rather than a list of names in the editor**, on the same
   * reasoning **X5** gives for `stochastic`: `04` §4.4's table names six
   * Selections and the registry is open, so a Selection registered later would
   * be classified by a list that had never heard of it — silently procedural,
   * and silently exempt from the one confirmation that protects it.
   *
   * Deriving it from the `ParamSchema` is not available either: `everyNth`'s
   * `offset` and `rect`'s `y` are both bounded integers, and nothing in the
   * schema distinguishes *a rule's parameter* from *a coordinate*.
   */
  coordinateBound: boolean;

  /**
   * The rectangle of grid coordinates this Selection can match — or **absent**
   * for *"the whole grid"*.
   *
   * **What reads it.** A *spanning* Source normalizes over this rather than over
   * `rows x columns`, so a `gradient` confined to a Selection sweeps its full
   * range inside it instead of receiving whatever slice of a grid-wide sweep
   * happens to fall there. `operationCtx` resolves it once per Operation into
   * `EvalCtx.extent`; a Source never calls this function itself.
   *
   * **A declaration rather than a table of names**, on exactly the reasoning
   * `coordinateBound` above and **X5**'s `stochastic` already give: the registry
   * is open, so a Selection registered later would be classified by a list that
   * had never heard of it — here, silently normalized over the whole grid, which
   * is the bug this field exists to remove.
   *
   * **Absent, not `null`, for the grid.** The default belongs to the resolver,
   * which is the only place that knows `rows` and `columns`; a Selection cannot
   * name the grid without being handed the dimensions it is not otherwise given.
   *
   * **A pure function of the Selection's own parameters**, and of nothing else.
   * Not of `ctx`, and emphatically not of a measurement — see the note on
   * **O4** at `EvalCtx.extent`.
   */
  extent?: (params: Record<string, unknown>) => Extent;

  impl: SelectionImpl;
}

export const selections = new Registry<SelectionRegistration>("selection");

/** Always. */
selections.register({
  name: "all",
  coordinateBound: false,
  params: {},
  impl: () => true,
});

/**
 * `x <= cx < x+width` and `y <= cy < y+height`.
 *
 * A `rect` **may extend beyond the grid**; cells outside it simply never test
 * true. This is deliberate — "an author dragging a rectangle to the grid edge
 * should not have it silently resized" (`04` §4.2). `06` §10.4 accordingly makes
 * a wholly out-of-grid `rect` an advisory diagnostic rather than an error.
 *
 * Half-open on both axes, the same discipline as `07` **R11**'s cell boxes and
 * `02` §6.6's `[0, 1)`.
 */
selections.register({
  name: "rect",
  coordinateBound: true,
  params: {
    x: { type: "integer" },
    y: { type: "integer" },
    width: { type: "integer" },
    height: { type: "integer" },
  },
  impl: (p, cx, cy) => {
    const x = p.x as number;
    const y = p.y as number;
    return cx >= x && cx < x + (p.width as number) && cy >= y && cy < y + (p.height as number);
  },
  /**
   * The rect itself, **verbatim and unclamped** — the same four numbers `impl`
   * tests against, so the extent cannot disagree with the selection.
   *
   * Not clipped to the grid, for §4.2's reason above: an author dragging a
   * rectangle past the edge should not have it silently resized, and the extent
   * is the one place where resizing it would be invisible rather than merely
   * wrong. It is also what keeps **G2** — an overhanging rect sweeps its whole
   * declared width, so a gradient's midpoint stays where the author put it and
   * the clipped cells still consume their share of the range. The visible part
   * of such a rect therefore does *not* reach the ends of the range, and that is
   * correct.
   */
  extent: (p) => ({
    x: p.x as number,
    y: p.y as number,
    width: p.width as number,
    height: p.height as number,
  }),
});

/**
 * `(cx + cy) mod 2 == parity`.
 *
 * **This is the residual `%` hazard `04` §4.2 flags.** It compares against a
 * *non-zero* residue, which is where JS's remainder and a true modulo genuinely
 * diverge. It is safe only because `cx` and `cy` are non-negative by `02` §5, so
 * the sum never is.
 *
 * **Any future Selection testing a non-zero residue over a possibly-negative
 * operand must use a true modulo, not `%`.**
 */
selections.register({
  name: "checkerboard",
  coordinateBound: false,
  params: { parity: { type: "enum", values: [0, 1] } },
  impl: (p, cx, cy) => (cx + cy) % 2 === p.parity,
});

/**
 * `(coord - offset) mod n == 0`.
 *
 * **`%` is correct here and `offset` needs no lower bound.** `05` §5.1 admits any
 * integer `offset`, so `coord - offset` can be negative, and JS `%` is a
 * remainder that takes the sign of its left operand. For a test against **zero**
 * this makes no difference whatever: a remainder is zero exactly when the divisor
 * divides the dividend, so `a % n === 0` and `a mod n === 0` agree for every
 * integer `a`, and `-0 === 0` covers the boundary (`04` §4.2, `06` Q11).
 *
 * Recorded because the asymmetry with `checkerboard` above looks alarming and
 * the next reader will check.
 */
selections.register({
  name: "everyNth",
  coordinateBound: false,
  params: {
    axis: { type: "enum", values: ["column", "row"] },
    n: { type: "integer", min: 1 },
    offset: { type: "integer", default: 0 },
  },
  impl: (p, cx, cy) => {
    const coord = p.axis === "column" ? cx : cy;
    return (coord - ((p.offset as number) ?? 0)) % (p.n as number) === 0;
  },
});

/**
 * `hSel(cx, cy) < density`.
 *
 * The Selection that makes *"rotate 30% of tiles, leave the rest alone"*
 * expressible: there is no numeric range meaning "do not write", so the subset
 * has to be the Selection itself (`04` §4.3).
 *
 * **It draws from its own hash channel** — `operationId + ":selection"`, never
 * the Operation's Source channel. Sharing one would make an Operation using
 * `random` Selection at `density = 0.5` together with the `random` Source select
 * exactly the cells whose value is below 0.5, then hand those same low values to
 * the mapping: every selected cell landing in the bottom half of the range.
 * Correlation, presenting as a subtle and very hard-to-diagnose bias (**O3**).
 *
 * Both channels take the Operation's `salt`, so one reroll moves both together.
 */
selections.register({
  name: "random",
  coordinateBound: false,
  params: { density: { type: "number", min: 0, max: 1 } },
  impl: (p, cx, cy, ctx) =>
    hash(ctx.effectiveSeed, selectionChannel(ctx.operationId), cx, cy, ctx.salt) < (p.density as number),
});

/**
 * The pair is present in the list.
 *
 * The editor-facing "manual" Selection (`04` §4.4) — one the author painted cell
 * by cell, and the reason `05` §5.1's parameter schema needs a list type at all.
 */
selections.register({
  name: "cellList",
  coordinateBound: true,
  params: { cells: { type: "cellList" } },
  impl: (p, cx, cy) => {
    const cells = p.cells as [number, number][];
    for (const cell of cells) if (cell[0] === cx && cell[1] === cy) return true;
    return false;
  },
  /**
   * The bounding box of the painted cells.
   *
   * A bounding box rather than the cells themselves, because an extent is what a
   * spanning Source projects a direction onto and a sparse set has no meaningful
   * projection domain beyond its hull. A gradient over an L-shaped brush stroke
   * therefore sweeps across the L's bounding box, which is what the author sees
   * themselves having drawn across.
   *
   * **An empty list yields a zero-area extent** (`width`/`height` of 0), which is
   * degenerate and is the caller's to guard — `gradient` returns 0. Returning the
   * grid instead would make a gradient over an empty brush sweep the whole
   * canvas, which is a wrong picture rather than a missing one.
   */
  extent: (p) => {
    const cells = p.cells as [number, number][];
    if (cells.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [cx, cy] of cells) {
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
    }
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  },
});
