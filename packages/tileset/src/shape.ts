/**
 * Shape — one authored design, drawn at any size.
 *
 * ## Design and shape
 *
 * A `TilesetFile` holds two different kinds of thing, and this module is the line
 * between them:
 *
 * - **the design** — `tiles`, `operations`, `defaultSeed`, the salts: *what* is
 *   drawn. Shared, never overridden.
 * - **the shape** — `rows`, `columns`, `cellSize`, `bleed`, `yOffset`: *how many
 *   cells, and how big*. Overridable.
 *
 * The shape is split across two objects on disk — `rows` and `columns` are
 * `TilesetConfig` fields because the engine loops over them, `cellSize`,
 * `referenceWidth` and `yOffset` are `Layout` fields because only the renderer
 * reads them — and that split is the only reason "the same design at another
 * size" used to be another file. {@link reshape} makes the split invisible: it
 * overrides shape fields and shares every design field **by reference**.
 *
 * ## Why one design can serve every shape
 *
 * Because the data model is already size-independent everywhere except two
 * Selections. `registry/selections.ts` flags `rect` and `cellList`
 * `coordinateBound: true` — they hold literal cell coordinates — while `all`,
 * `checkerboard`, `everyNth` and `random` are rules and hold at any size. And
 * randomness is addressed by `(x, y)` rather than drawn from a stream
 * (`hash.test.ts`, "is positional, not sequential"), so every cell present in both
 * grids keeps its TileState and its asset.
 *
 * **The one exception is `gradient`**, which normalises over `ctx.extent` — the
 * whole grid under `all` — and so stretches to the new size: a ramp authored across
 * 40 columns is a 3-step ramp across 3. `valueNoise` does not: it samples
 * grid-absolute coordinates, so its feature size *in cells* is invariant, which
 * means its feature size in pixels follows `cellSize`.
 *
 * ## The one restriction
 *
 * An Operation that picks cells by hand pins the grid's `rows` and `columns`.
 * Everything else about the shape can still change — `cellSize`, `bleed` and
 * `yOffset` move no cell, so a file with a `rect` in it may still be reshaped
 * through them. {@link reshapeErrors} is that check, and it reads the registry
 * flag, never a list of names: the registry is open, and a list would silently
 * classify anything registered later as reusable. `apps/editor/src/orphans.ts`'s
 * `atRisk()` reads the same flag for the same reason.
 *
 * This module replaces `decoration.ts` (0.5.0), whose `decorationFile` was this
 * transform locked to one preset: `reshape(style, {rows, columns, cellSize,
 * bleed: 0, yOffset: 0})`. Decorations are still that preset —
 * `<TileDecoration>` writes it — but reuse is no longer only reachable as one.
 */

import { selections } from "./registry/selections.js";
import type { Operation, Shape, TilesetFile } from "./types.js";

/** The field names, in the order messages list them. */
export const SHAPE_FIELDS: readonly (keyof Shape)[] = ["rows", "columns", "cellSize", "bleed", "yOffset"];

/** A file's own shape, with `bleed` read back out of `referenceWidth`. */
export function shapeOf(file: TilesetFile): Shape {
  const { rows, columns } = file.config;
  const { cellSize, referenceWidth, yOffset } = file.layout;
  return { rows, columns, cellSize, bleed: columns - referenceWidth / cellSize, yOffset };
}

/**
 * `(file, override) -> TilesetFile`. A pure transform: the override's fields
 * replace the file's, everything else passes through **by reference**.
 *
 * Sharing rather than cloning is the point. Twelve reshapes hold one `tiles`
 * array between them, so there is nothing to drift; and when `rows` and `columns`
 * are unchanged the result holds the **same `config` object**, which is what lets
 * `<Tileset>` tell a density change (geometry only) from a size change
 * (regenerate) by identity alone. It is safe because nothing downstream mutates a
 * config — `generate()` is pure and the editor's only write path replaces whole
 * files.
 *
 * **It validates nothing**, for `06` **C5**'s reason: the separate check is
 * {@link reshapeErrors}.
 *
 * ## `referenceWidth` is derived, and how
 *
 * An override speaks `bleed`, in cells, because `referenceWidth` would make every
 * change of `columns` a sum the caller has to redo by hand — and getting it wrong
 * reintroduces or removes a bleed silently. The derivation, in order:
 *
 * 1. `bleed` given: `referenceWidth = (columns - bleed) * cellSize`. At `bleed: 0`
 *    that is `columns * cellSize` exactly, which is the decoration preset and what
 *    buys it `originX === 0` and `s === 1` (`shape.test.ts` asserts both).
 * 2. `bleed` absent, `columns` and `cellSize` unchanged: the file's
 *    `referenceWidth`, **verbatim**. Not re-derived: `ref / cell * cell` need not
 *    be `ref` to the last bit, and an override that changes only `rows` must not
 *    move a pixel of the width.
 * 3. `bleed` absent otherwise: the file's bleed **in cells** is kept, so a grid
 *    grown by four columns stays exactly as far past its box as before.
 *
 * ## The file's `responsive` rules are dropped
 *
 * They were written against the shape this call replaces — "14 rows below 500px"
 * means something about *that* grid — and re-applying them to a different base
 * would be applying them to a design nobody wrote them for. A host that wants
 * rules on a reshaped file passes its own, through `options.responsive`.
 *
 * `horizontalAlignment` passes through untouched: it is authoring metadata read by
 * neither engine nor renderer (`02` §7.3).
 */
export function reshape(file: TilesetFile, s: Partial<Shape>): TilesetFile {
  const c = file.config;
  const l = file.layout;
  const rows = s.rows ?? c.rows;
  const columns = s.columns ?? c.columns;
  const cellSize = s.cellSize ?? l.cellSize;
  const yOffset = s.yOffset ?? l.yOffset;

  let referenceWidth: number;
  if (s.bleed !== undefined) referenceWidth = (columns - s.bleed) * cellSize;
  else if (columns === c.columns && cellSize === l.cellSize) referenceWidth = l.referenceWidth;
  else referenceWidth = (l.referenceWidth / l.cellSize + (columns - c.columns)) * cellSize;

  const sameConfig = rows === c.rows && columns === c.columns;
  const sameLayout =
    cellSize === l.cellSize && referenceWidth === l.referenceWidth && yOffset === l.yOffset;
  if (sameConfig && sameLayout && file.responsive === undefined) return file;

  const { responsive: _dropped, ...rest } = file;
  return {
    ...rest,
    config: sameConfig ? c : { ...c, rows, columns },
    layout: sameLayout ? l : { ...l, cellSize, referenceWidth, yOffset },
  };
}

/**
 * What is wrong with one shape field's value, or `null`. The single statement of
 * each field's domain: {@link reshapeErrors} and `validate()`'s rule walk both
 * read it, so the two cannot disagree about what a legal `rows` is.
 *
 * `code` is `validate.ts`'s vocabulary, which is why it is a string union here
 * rather than an import: the engine's schema module depends on this one, not the
 * other way round.
 */
export function shapeFieldProblem(
  field: keyof Shape,
  value: unknown,
): { code: "TYPE_MISMATCH" | "NOT_FINITE" | "NOT_AN_INTEGER" | "OUT_OF_RANGE"; message: string } | null {
  if (typeof value !== "number") {
    return { code: "TYPE_MISMATCH", message: `${field} must be a number, got ${typeof value}` };
  }
  if (!Number.isFinite(value)) {
    return { code: "NOT_FINITE", message: `${field} must be finite, got ${String(value)}` };
  }
  switch (field) {
    case "rows":
    case "columns":
      if (!Number.isSafeInteger(value)) {
        return { code: "NOT_AN_INTEGER", message: `${field} must be an integer, got ${value}` };
      }
      return value >= 1 ? null : { code: "OUT_OF_RANGE", message: `${field} must be >= 1, got ${value}` };
    case "cellSize":
      return value > 0 ? null : { code: "OUT_OF_RANGE", message: `cellSize must be > 0, got ${value}` };
    case "yOffset":
      return value >= 0 && value < 1
        ? null
        : { code: "OUT_OF_RANGE", message: `yOffset must be in [0, 1), got ${value}` };
    case "bleed":
      // Its bound is relative — `columns - bleed > 0`, so `referenceWidth > 0` —
      // and is checked against the resolved shape, where `columns` is known.
      return null;
  }
}

/**
 * The Operations whose Selection is `coordinateBound`, in stack order — the ones
 * that pin `rows` and `columns`.
 *
 * An unrecognised Selection type is skipped rather than reported: `validate()`
 * raises `UNKNOWN_TYPE_NAME` for it, which is the whole of **X7**'s enforcement,
 * and `selections.get` would throw where this function's job is to return
 * findings.
 */
export function coordinateBoundOperations(operations: readonly Operation[]): Operation[] {
  return operations.filter(
    (op) => selections.has(op.selection.type) && selections.get(op.selection.type).coordinateBound,
  );
}

/** The message for one pinning Operation. Shared with `validate()`'s rule walk. */
export function coordinateBoundMessage(op: Operation): string {
  return (
    `Operation "${op.id}" uses the coordinate-bound Selection "${op.selection.type}", ` +
    `which holds literal cell coordinates, so the grid's rows and columns cannot change. ` +
    `cellSize, bleed and yOffset can. To resize, use only procedural Selections ` +
    `(${selections
      .all()
      .filter((r) => !r.coordinateBound)
      .map((r) => r.name)
      .join(", ")}).`
  );
}

/**
 * Everything wrong with reshaping `file` by `s`, as messages. Empty means the
 * reshape is sound.
 *
 * **Separate from {@link reshape}, for `06` **C5**'s reason**: the transform
 * trusts its input as `generate()` does, and this is what earns the trust.
 * `<Tileset>` (for host rules) and `<TileDecoration>` call it under `DEV` and
 * throw; production does not call it.
 *
 * **"Names", not "changes".** An override that *mentions* `rows` or `columns` is
 * checked against the pinning Operations even when the value equals the file's.
 * That makes the rule predictable from the override alone — a decoration
 * placement always names both, and always needs a reusable style — and needs no
 * value comparison.
 *
 * `unknown` keys are reported because the check exists for what arrives without
 * types: plain JavaScript, a cast, a value read from a CMS. `referenceWidth` gets
 * its own message, since it is the one a reader of the file will reach for.
 */
export function reshapeErrors(file: TilesetFile, s: Partial<Shape>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(s)) {
    if ((SHAPE_FIELDS as readonly string[]).includes(key)) continue;
    errors.push(
      key === "referenceWidth"
        ? "`referenceWidth` is not a shape field; set `bleed` (columns that overhang the box) instead."
        : `\`${key}\` is not a shape field (${SHAPE_FIELDS.join(", ")}).`,
    );
  }
  let valuesOk = true;
  for (const field of SHAPE_FIELDS) {
    const v = s[field];
    if (v === undefined) continue;
    const problem = shapeFieldProblem(field, v);
    if (problem !== null) {
      errors.push(problem.message);
      valuesOk = false;
    }
  }
  if (valuesOk) {
    const out = reshape(file, s);
    if (!(out.layout.referenceWidth > 0)) {
      // The effective bleed, read back from the result, not `s.bleed`: an
      // inherited bleed (rule 3 of `reshape`) is absent from `s`, and this used
      // to print "bleed undefined" for exactly the case most likely to surprise.
      const bleed = shapeOf(out).bleed;
      const which = s.bleed === undefined ? `the file's bleed (${bleed} columns, kept)` : `bleed ${bleed}`;
      errors.push(
        `${which} leaves no box: columns - bleed must be > 0 (columns is ${out.config.columns}).`,
      );
    }
  }
  if (s.rows !== undefined || s.columns !== undefined) {
    for (const op of coordinateBoundOperations(file.config.operations)) {
      errors.push(coordinateBoundMessage(op));
    }
  }
  return errors;
}
