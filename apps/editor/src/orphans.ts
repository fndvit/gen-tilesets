/**
 * The destructive edit's two halves — `09-editor.md` §9.3, §9.4.
 *
 * **Invariant E12** — *changing `referenceWidth`, `cellSize`, or
 * `horizontalAlignment` re-derives `columns` and requires explicit confirmation
 * whenever the config holds a coordinate-bound Selection. The confirmation names
 * the Operations that will be affected.*
 *
 * §9.4 then splits the response in three, and this file is the first and second:
 *
 * 1. **Before** the change, name the affected Operations — `atRisk`.
 * 2. **After** the change, carry each affected Operation as a §12.2 advisory
 *    until the author touches it — `orphans`.
 * 3. **Undo restores the file whole** (**E6**), which restores the Selections
 *    with it. That is `session.undo()`, and it is the *only* repair: nothing is
 *    migrated, in either case.
 *
 * ## Why nothing is migrated
 *
 * §9.4: "Migration has to guess, and there is no non-arbitrary answer. A `rect`
 * spanning columns 0–7 in an 8-column grid, in a grid that becomes 10 columns:
 * proportional says 0–9, absolute says 0–7, and both are defensible readings of
 * what the author meant. Choosing one silently rewrites an authored value, which
 * is `06` §9.2's coercion applied to the thing the author cares about most."
 */

import { selection, selections, type Operation, type TilesetConfig, type TilesetFile } from "@vit-foundation/gen-tilesets";

/**
 * The Operations a design-width change puts at risk — E12's "names the
 * Operations that will be affected".
 *
 * **Read from the registry's `coordinateBound` declaration**, never a list of
 * names. `04` §4.4's table names six Selections and the registry is open; a
 * Selection registered later would otherwise be classified by a list that had
 * never heard of it, and silently exempted from the confirmation.
 *
 * **Confirmation is required only where something is at risk** (§9.3):
 * procedural Selections survive a resize unharmed, and "a dialogue that appears
 * every time teaches the author to dismiss it before reading, which is worse
 * than no dialogue". So an empty result here means the edit applies directly.
 */
export function atRisk(config: TilesetConfig): Operation[] {
  return config.operations.filter((op) => selections.get(op.selection.type).coordinateBound);
}

/** Whether the three destructive fields need confirming at all — E12. */
export function needsConfirmation(config: TilesetConfig): boolean {
  return atRisk(config).length > 0;
}

/**
 * An Operation orphaned by a resize — §9.4's step 2, and a §12.2 advisory.
 *
 * `04` §4.4's distinction "survives in the advisory's wording — a `rect` is
 * offered a jump to its control, a `cellList` is told how many of its entries are
 * now unreachable — but not in the repair, because there is none."
 */
export interface Orphan {
  operationId: string;
  selectionType: string;
  /** Cells inside the grid the Selection still matches. */
  reachable: number;
  /** Entries the author authored, where the Selection has a countable list. */
  authored?: number;
  /** True where the Selection now matches nothing at all — `06` §10.4's third. */
  empty: boolean;
}

/**
 * Coordinate-bound Operations that no longer reach what they were authored to.
 *
 * **The cell counts come from `selection()`** — **E8**: "the set of cells an
 * overlay covers is obtained from the engine package. The editor contains no
 * implementation of any Selection's test." That matters more here than it looks:
 * asking whether a `rect` "lies outside the grid" by comparing its `x` and
 * `width` against `columns` would be a second implementation of `rect`'s
 * half-open bounds, written in the one place nobody would think to check it
 * against the first.
 *
 * Asking the predicate instead works for every coordinate-bound Selection with
 * nothing written per type, including ones registered later.
 *
 * **This never modifies the file** (**E16**): an advisory "never blocks an
 * action, never modifies the file, and is never reported as an error".
 */
export function orphans(config: TilesetConfig, seed: string, loadSalt = 0): Orphan[] {
  const out: Orphan[] = [];

  for (const op of atRisk(config)) {
    const includes = selection(config, op.id, seed, loadSalt);

    let reachable = 0;
    for (let y = 0; y < config.rows; y++) {
      for (let x = 0; x < config.columns; x++) if (includes(x, y)) reachable++;
    }

    // `cellList` is the one Selection whose authored extent is countable — its
    // parameter *is* the list. A `rect`'s is not: `04` §4.2 lets it extend past
    // the grid on purpose, so "how much of it is outside" is not a defect to
    // report, only "does it still reach anything".
    const cells = (op.selection as { cells?: unknown }).cells;
    const authored = Array.isArray(cells) ? cells.length : undefined;

    if (reachable === 0 || (authored !== undefined && reachable < authored)) {
      out.push({
        operationId: op.id,
        selectionType: op.selection.type,
        reachable,
        // Spread rather than assigned: `exactOptionalPropertyTypes` makes
        // `authored: undefined` a different thing from an absent `authored`, and
        // the absent one is what "this Selection has no countable extent" means.
        ...(authored === undefined ? {} : { authored }),
        empty: reachable === 0,
      });
    }
  }

  return out;
}

/**
 * The entries of `op`'s painted list that lie outside `config`'s grid, as the
 * very arrays the list holds (so a caller can drop them by identity). Empty
 * for a Selection with no countable list.
 *
 * This is the grid's extent, `0 <= x < columns` and `0 <= y < rows`, and not a
 * Selection test: **E8** keeps "which cells does this Selection match" in the
 * engine, but "where does the grid end" is two fields of the file. Batch 01
 * (T-05, B-014): the cells the orphan notice offers to remove.
 */
export function outsideCells(op: Operation, config: Pick<TilesetConfig, "rows" | "columns">): [number, number][] {
  const cells = (op.selection as { cells?: unknown }).cells;
  if (!Array.isArray(cells)) return [];
  return (cells as [number, number][]).filter(
    ([x, y]) => !(x >= 0 && x < config.columns && y >= 0 && y < config.rows),
  );
}

/**
 * Whether `op`'s loss came with the file the session opened rather than from a
 * resize made since — which decides whether the orphan notice may say "Undo
 * puts the grid back" (B-014: after an import, Undo goes back to the previous
 * *document*, so offering it there is false).
 *
 * `opened` is the file as `session.open` received it, or `null` when the
 * session started from a new document. The history is not consulted: it keeps
 * no mark of where an open happened, and the write path (`apply`, `history.ts`)
 * is not changed to add one (T-05's plan).
 *
 * - **A painted list** came with the file when every cell now outside the grid
 *   was already in the opened file's list for this operation id, and already
 *   outside *that* file's grid. A cell pushed out by a later resize fails the
 *   second test, so the notice keeps offering Undo, which is then true.
 * - **Any other coordinate-bound Selection** (a `rect`) came with the file when
 *   neither it nor the grid has changed since the open: then no edit in this
 *   session caused the loss.
 *
 * Operation ids are reused across documents (`op1`), so after undoing *past*
 * the open the previous document may share an id with the opened one; the
 * cell-by-cell test is what keeps that from matching by accident.
 */
export function cameWithFile(op: Operation, config: TilesetConfig, opened: TilesetFile | null): boolean {
  if (opened === null) return false;
  const was = opened.config.operations.find((o) => o.id === op.id);
  if (was === undefined || was.selection.type !== op.selection.type) return false;

  const now = outsideCells(op, config);
  if (Array.isArray((op.selection as { cells?: unknown }).cells)) {
    if (now.length === 0) return false;
    const before = new Set(outsideCells(was, opened.config).map(([x, y]) => `${x},${y}`));
    return now.every(([x, y]) => before.has(`${x},${y}`));
  }

  const sameGrid = config.rows === opened.config.rows && config.columns === opened.config.columns;
  return sameGrid && JSON.stringify(op.selection) === JSON.stringify(was.selection);
}
