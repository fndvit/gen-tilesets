/**
 * Selection layers, as the editor reads them — B-033.
 *
 * An Operation's Selection is either one Selection or a `union` of several
 * (its `layers`). Code that asks a question of "the painted cells" or "the
 * Selection's type" has to ask it of every layer, or a Handpick layer inside a
 * union is invisible to it: never counted by the orphan notice, never trimmed
 * by "Remove N cells outside the grid".
 *
 * **Found by declaration, not by the name `union`.** A Selection holds layers
 * when its registration declares a `selectionList` parameter, the same way a
 * painted Selection is found by its `cellList` parameter (`App.svelte`,
 * `paint.ts` `rectParams`) — so a later list-holding Selection is read
 * correctly with nothing written here.
 */

import { selections, type Selection, type SelectionRegistration } from "@vit-foundation/gen-tilesets";

/** The name of the registration's `selectionList` parameter, or `null` if it holds no layers. */
export function layersParam(registration: Pick<SelectionRegistration, "params">): string | null {
  for (const [name, spec] of Object.entries(registration.params)) {
    if (spec.type === "selectionList") return name;
  }
  return null;
}

/** Whether a registered Selection is made of layers — kept out of the type picker. */
export function holdsLayers(registration: Pick<SelectionRegistration, "params">): boolean {
  return layersParam(registration) !== null;
}

/**
 * The layers of a Selection: its `selectionList` when it has one, otherwise the
 * Selection itself as the only layer. An unknown type, or a list that is not an
 * array, is one layer — `validate()` reports it, and this only reads.
 */
export function layersOf(selection: Selection): Selection[] {
  if (!selections.has(selection.type)) return [selection];
  const name = layersParam(selections.get(selection.type));
  if (name === null) return [selection];
  const layers = selection[name];
  return Array.isArray(layers) ? (layers as Selection[]) : [selection];
}

/**
 * A copy of `selection` with `layer` replaced by `next` — `layer` indexes
 * {@link layersOf}. A single-layer Selection is replaced whole. Never mutates.
 */
export function withLayer(selection: Selection, layer: number, next: Selection): Selection {
  const name = selections.has(selection.type) ? layersParam(selections.get(selection.type)) : null;
  const layers = name === null ? undefined : selection[name];
  if (name === null || !Array.isArray(layers)) return next;
  return { ...selection, [name]: layers.map((l, i) => (i === layer ? next : l)) };
}

/** The painted cells of a Selection's `cells` list, or `undefined` where it has none. */
export function cellsOf(selection: Selection): [number, number][] | undefined {
  const cells = (selection as { cells?: unknown }).cells;
  return Array.isArray(cells) ? (cells as [number, number][]) : undefined;
}
