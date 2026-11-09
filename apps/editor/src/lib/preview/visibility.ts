/**
 * Hidden operations — batch 02 T-02, B-012.
 *
 * The author hides an operation to see the tileset without it, then shows it
 * again. **Only while the editor is open** (Pol, batch 02 D-02 A): the set of
 * hidden ids is preview view state (`view.svelte.ts`), never a field of the
 * file. A saved "hidden" would be a new `Operation` field — a schema bump — and
 * would hide the operation on every website that uses the tileset, which is not
 * what comparing with and without it means.
 *
 * So hiding is one more derived file, the way the live draft is (`draftFile`):
 * the preview draws `withoutHidden(drawn ?? file, …)`, and so does Export image
 * (D-03 A: the image is a picture of the preview). Everything that is about the
 * *document* — advisories, `shapedAt`, the `.json` export, undo — keeps reading
 * the saved file, which still holds every operation.
 */

import type { Operation, TilesetFile } from "@vit-foundation/gen-tilesets";

/**
 * The file minus the hidden operations, except `exceptId`.
 *
 * `exceptId` is the operation open for editing: it is drawn even when hidden,
 * because you cannot edit what you cannot see, and it hides again when its card
 * closes — the set is untouched by opening it.
 *
 * Returns `file` **itself** when nothing is left out. The preview's `<Tileset>`
 * and `shapedAt` both key on object identity (`App.svelte`), so a filter that
 * always built a new file would redraw on every unrelated change.
 */
export function withoutHidden(
  file: TilesetFile,
  hidden: ReadonlySet<string>,
  exceptId: string | null = null,
): TilesetFile {
  if (hidden.size === 0) return file;
  const kept = file.config.operations.filter((op) => op.id === exceptId || !hidden.has(op.id));
  if (kept.length === file.config.operations.length) return file;
  return { ...file, config: { ...file.config, operations: kept } };
}

/** The set with `id` hidden if it was shown, shown if it was hidden. A new set. */
export function toggled(hidden: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(hidden);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * The set without ids that are no longer in the file.
 *
 * Needed because an id can be given again: `nextOperationId` takes the next
 * number after the ones in use, so deleting the newest operation frees its id,
 * and the next operation added would otherwise start hidden. Pruning also means
 * an operation brought back by undo starts visible — it is, in the editor's
 * terms, a different arrival of that id.
 *
 * Returns `hidden` **itself** when nothing was pruned, so the effect that calls
 * this can write the result back without retriggering.
 */
export function pruned(
  hidden: ReadonlySet<string>,
  operations: readonly Pick<Operation, "id">[],
): ReadonlySet<string> {
  if (hidden.size === 0) return hidden;
  const ids = new Set(operations.map((op) => op.id));
  for (const id of hidden) {
    if (!ids.has(id)) return new Set([...hidden].filter((h) => ids.has(h)));
  }
  return hidden;
}
