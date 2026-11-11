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
import type { Extent, Selection } from "../types.js";
import { hash, layerOwner, selectionChannel } from "../hash.js";
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
   *
   * **A function where the answer depends on the parameters** — `union`'s, which
   * is bound exactly when one of its layers is (B-033). A static `true` there
   * would put the E12 confirmation in front of every procedural union, which is
   * §9.3's dialogue that teaches dismissal; a static `false` would let a rect
   * layer be orphaned without one. Read it through {@link isCoordinateBound},
   * never directly: a function is truthy.
   */
  coordinateBound: boolean | ((params: Record<string, unknown>) => boolean);

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
   *
   * **May return `undefined`** — the grid — where the answer depends on the
   * parameters: a `union` with a layer that declares no extent (B-033).
   */
  extent?: (params: Record<string, unknown>) => Extent | undefined;

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
 *
 * **This was `everyNth` until schema v5** (B-009), with these params and this
 * impl unchanged. `migrate()`'s 4 → 5 row renames it in every older file, so a
 * migrated file draws byte-identically; the name went to the row-major count
 * below.
 */
selections.register({
  name: "rowColumn",
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
 * `(cy * columns + cx - offset) mod n == 0` — every nth cell, counted left to
 * right and row after row, the count carrying across a row boundary.
 *
 * **`%` is correct here for `rowColumn`'s reason above:** the test is against
 * zero, so a negative operand (an `offset` past the cell index) is harmless.
 *
 * **The count is row-major over the grid as drawn**, `ctx.columns`, so the
 * picture depends on the column count: n = 3 is diagonals at 10 columns and
 * vertical stripes at 9. It still *holds* at any size — it is a rule, and
 * nothing in it names a cell — but a resize or a breakpoint that changes the
 * column count changes what it looks like (Pol, B-009 Block 1: accept it and say
 * so in the editor's hint).
 *
 * Rejected: counting against the design width (`ceil(referenceWidth /
 * cellSize)`), which would keep the pattern still across a resize. The engine
 * never sees `Layout` (`02` **G5**), and the count would then disagree with the
 * cells the author sees whenever the grid is reshaped — a pattern whose rows
 * visibly do not continue into each other.
 */
selections.register({
  name: "everyNth",
  coordinateBound: false,
  params: {
    n: { type: "integer", min: 1 },
    offset: { type: "integer", default: 0 },
  },
  impl: (p, cx, cy, ctx) =>
    (cy * ctx.columns + cx - ((p.offset as number) ?? 0)) % (p.n as number) === 0,
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

/**
 * Every cell any layer selects — `layers[0] || layers[1] || …` (B-033).
 *
 * The editor's "selection layers": one Operation, several of the selections
 * above, combined. It is never offered in the editor's type picker; the editor
 * builds it from the layer list and writes a single layer as the plain
 * Selection, so a one-layer union never exists (`validate()` requires two).
 * A layer cannot itself be a union — nesting adds nothing a flat list does not
 * already say, and `validate()` refuses it.
 *
 * **Coordinate-bound when any layer is**, by the reasoning on
 * {@link SelectionRegistration.coordinateBound}.
 */
selections.register({
  name: "union",
  // Total over unvalidated input, for isCoordinateBound's reason below: a
  // `layers` that is not an array is validate()'s to report, not this one's.
  coordinateBound: (p) => Array.isArray(p.layers) && (p.layers as Selection[]).some(isCoordinateBound),
  params: { layers: { type: "selectionList" } },
  impl: (p, cx, cy, ctx) => {
    const layers = p.layers as Selection[];
    const ctxs = layerCtxs(ctx, layers.length);
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]!;
      if (selections.get(layer.type).impl(layer as Record<string, unknown>, cx, cy, ctxs[i]!)) return true;
    }
    return false;
  },
  /**
   * The bounding box of the layers' extents, or **absent — the whole grid —
   * when any layer declares none.** A gradient over `rect ∪ random` sweeps the
   * grid, because the `random` layer can reach any cell of it.
   *
   * **Zero-area extents are skipped** — an empty Handpick layer's `{0,0,0,0}`
   * would otherwise drag the box to the origin. If every layer is zero-area the
   * result is zero-area, which `gradient` already guards (see `cellList`).
   */
  extent: (p) => {
    let box: Extent | undefined;
    for (const layer of p.layers as Selection[]) {
      const declared = selections.get(layer.type).extent?.(layer as Record<string, unknown>);
      if (declared === undefined) return undefined;
      if (declared.width <= 0 || declared.height <= 0) continue;
      box = box === undefined ? declared : boundingBox(box, declared);
    }
    return box ?? { x: 0, y: 0, width: 0, height: 0 };
  },
});

function boundingBox(a: Extent, b: Extent): Extent {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

/**
 * One `EvalCtx` per layer, so each `random` layer draws from its own hash
 * channel (B-033). Without it two `random` layers at the same density would
 * select the same cells, and a union of them would be one of them.
 *
 * **By position (Pol, B-033 Block 1).** Layer 0 gets the Operation's own `ctx`,
 * so its channel is `opId:selection` exactly as when it stands alone: adding a
 * second layer never moves the first one's scatter, and a union collapsed back
 * to one layer draws as it did. Layer i ≥ 1 gets `operationId` rewritten to
 * {@link layerOwner}`(opId, i)`, so its channel is `opId:i:selection`. Deleting
 * or moving a layer reshuffles the `random` layers after it — accepted, like a
 * reroll. Rejected: a stable per-layer id saved in the file, which would cost
 * every layer an extra key and break "one layer saves exactly as today".
 *
 * **Why rewrite `operationId` rather than add a field.** `EvalCtx` is closed by
 * **O4**, and a field read only by `random`-inside-`union` would be one every
 * Source and renderer must carry. Only a Selection ever sees a layer ctx — the
 * Source still gets the Operation's — and a Selection reads `operationId` only
 * to name its channel.
 *
 * Cached per `ctx`, which `operationCtx` builds once per Operation per
 * generation, so the per-cell cost is one `WeakMap` lookup, not an allocation.
 */
const layerCtxCache = new WeakMap<EvalCtx, EvalCtx[]>();

function layerCtxs(ctx: EvalCtx, count: number): EvalCtx[] {
  let out = layerCtxCache.get(ctx);
  if (out === undefined || out.length < count) {
    out = [ctx];
    for (let i = 1; i < count; i++) out.push({ ...ctx, operationId: layerOwner(ctx.operationId, i) });
    layerCtxCache.set(ctx, out);
  }
  return out;
}

/**
 * Whether a Selection holds literal cell coordinates, so it pins `rows` and
 * `columns` (`04` §4.4, `09` **E12**). The one way to ask: it resolves a
 * parameter-dependent {@link SelectionRegistration.coordinateBound}.
 *
 * **Total over unvalidated input**, because `validate()`'s resize rule and the
 * editor call it on files not yet known to be valid: an unknown type, or a
 * `union` whose `layers` is not an array, answers `false` and is left to the
 * error `validate()` raises at its own path.
 */
export function isCoordinateBound(selection: Selection): boolean {
  if (typeof selection !== "object" || selection === null || typeof selection.type !== "string") return false;
  if (!selections.has(selection.type)) return false;
  const bound = selections.get(selection.type).coordinateBound;
  return typeof bound === "boolean" ? bound : bound(selection as Record<string, unknown>);
}
