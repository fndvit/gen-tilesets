/**
 * Generated identifiers — `09-editor.md` §4.3, `06-config-schema.md` §5.3.
 *
 * **`Tile.id`, `TileAsset.id`, and `Operation.id` are generated here and never
 * authored.** They match `[A-Za-z0-9_-]+`, exclude the colon, and are unique in
 * the scope `06` **C10** fixes:
 *
 * | Id             | Unique within  |
 * | -------------- | -------------- |
 * | `Tile.id`      | the library    |
 * | `TileAsset.id` | its Tile       |
 * | `Operation.id` | the stack      |
 *
 * ## Two of the constraints are correctness, not tidiness
 *
 * **`Operation.id` uniqueness.** `02` §6.3 namespaces both hash channels by
 * `operationId`, so two Operations sharing an id return identical Source values
 * at every cell and their `random` Selections agree everywhere — "a picture that
 * looks oddly aligned with itself, with no error anywhere".
 *
 * **The excluded colon.** `04` §4.3 builds the selection channel by
 * concatenating `operationId + ":selection"`, so ids and channel strings occupy
 * one namespace. An Operation with `id: "op7:selection"` would occupy Operation
 * `op7`'s selection channel, and nothing downstream of the concatenation can
 * tell them apart.
 *
 * ## An id is never reassigned
 *
 * §4.3: "An id is assigned at creation and **never reassigned**, including
 * through duplication: duplicating an Operation produces a new id, which is why
 * the duplicate looks different from its original. That is the intended
 * behaviour and authors will ask about it — a duplicate that looked identical
 * would be one that shared a hash channel."
 *
 * This is why the ids here are opaque counters rather than slugs of the author's
 * name. A name-derived id disagrees with its own Tile the first time the author
 * renames it, and §10.1 forbids the editor from ever blocking a rename.
 * Recorded in `DECISIONS.md` D14.
 */

/**
 * The next free `prefix + n`, scanning what is already there.
 *
 * Scanning rather than holding a counter beside the document, because the
 * counter would be editor state with nowhere legal to live — **E4** forbids
 * `meta`, and §14's first row postpones every other option. The file already
 * carries the answer.
 *
 * Ids that do not match the pattern are ignored rather than rejected: an
 * imported file may carry any legal identifier, and this only has to avoid
 * colliding with them.
 */
function nextId(prefix: string, taken: readonly string[]): string {
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  let highest = 0;
  for (const id of taken) {
    const match = pattern.exec(id);
    if (match !== null) highest = Math.max(highest, Number(match[1]));
  }
  return `${prefix}${highest + 1}`;
}

/**
 * Each takes **the ids already in scope**, not the objects carrying them.
 *
 * That keeps one shape across all three and lets `nextIds` below thread a
 * growing list through a multi-file drop without knowing what the ids belong to.
 */

/** Unique within the library (`06` **C10**). */
export function nextTileId(taken: readonly string[]): string {
  return nextId("t", taken);
}

/** Unique **within its Tile only** — `06` §6 confirms rather than tightens this. */
export function nextAssetId(taken: readonly string[]): string {
  return nextId("a", taken);
}

/** Unique within the stack, and a correctness requirement — see above. */
export function nextOperationId(taken: readonly string[]): string {
  return nextId("op", taken);
}

/**
 * Allocates `count` ids in one go, so a multi-file drop does not have to thread
 * a growing array through its own loop and cannot hand out the same id twice.
 */
export function nextIds(
  count: number,
  taken: readonly string[],
  next: (taken: readonly string[]) => string,
): string[] {
  const out: string[] = [];
  const running = [...taken];
  for (let i = 0; i < count; i++) {
    const id = next(running);
    out.push(id);
    running.push(id);
  }
  return out;
}

/** `06` **C10**'s charset, for asserting what this module produces. */
export const IDENTIFIER = /^[A-Za-z0-9_-]+$/;
