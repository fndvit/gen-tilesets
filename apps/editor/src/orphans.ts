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

import { selection, selections, type Operation, type TilesetConfig } from "@fndvit/gen-tilesets";

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
