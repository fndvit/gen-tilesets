/**
 * Selection layers, as the editor reads them — B-033.
 *
 * An Operation's `selection` is a list of layers since schema v6, always, even
 * of one. Code that asks a question of "the painted cells" or "the Selection's
 * type" has to ask it of every layer, or a Handpick layer beside another one is
 * invisible to it: never counted by the orphan notice, never trimmed by "Remove
 * N cells outside the grid". These are the two questions asked in more than
 * one place.
 */

import type { Selection } from "@vit-foundation/gen-tilesets";

/** A layer's painted `cells` list, or `undefined` where it has none. */
export function cellsOf(layer: Selection): [number, number][] | undefined {
  const cells = (layer as { cells?: unknown }).cells;
  return Array.isArray(cells) ? (cells as [number, number][]) : undefined;
}

/**
 * The selection's layer types, for a notice or a dialog that names an
 * Operation by what it selects: `"rect"`, or `"rect + random"`. Raw type names,
 * as those places showed before layers existed.
 */
export function selectionTypes(selection: readonly Selection[]): string {
  return selection.map((layer) => layer.type).join(" + ");
}
