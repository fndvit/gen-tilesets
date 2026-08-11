/**
 * The undo stack — `09-editor.md` §4.4, **E6**.
 *
 * **Invariant E6** — *undo restores a previous `TilesetFile` in full. No editor
 * action is outside the undo stack, including the design-width change of §9.3.*
 *
 * §4.4: "`TilesetFile` is plain serializable data, edits are whole transitions
 * (E5), and the engine is pure, so a restored file is a restored picture with
 * nothing else to reset." So this is a stack of whole values rather than a log of
 * inverse operations — there is no inverse to write and nothing beside the file
 * to roll back with it.
 *
 * **Generic and pure, so it can be tested.** `session.svelte.ts` holds this in a
 * rune and is therefore unreachable from a test — `vitest.config.ts` runs without
 * the Svelte plugin, deliberately. Keeping the rule here and the reactivity there
 * is the same split `draft.svelte.ts` and `drafting.svelte.ts` take.
 */

/**
 * How many files to keep.
 *
 * A **UI constant with no authority anywhere**, recorded in `DECISIONS.md`. It
 * exists because §5 notes that a slider dragged across a frame changes `file` on
 * every frame, so an unbounded stack holds every intermediate value of every
 * drag for the session.
 */
export const UNDO_LIMIT = 100;

export interface History<T> {
  /** Previous values, oldest first. The last is what one undo returns to. */
  past: T[];
  current: T;
}

export function historyOf<T>(current: T): History<T> {
  return { past: [], current };
}

/**
 * Apply a transition and push the value it replaced.
 *
 * **A refusal pushes nothing.** A transition that declines returns its input
 * unchanged — a refused deletion (§4.2), a refused zero weight (§10.2), a field
 * that did not parse (**E5**) — and arrives here as an identity. Pushing it would
 * put an entry on the stack that undoes to the state it is already in: an undo
 * that visibly does nothing, in the one control whose whole value is being
 * trusted.
 *
 * The comparison is by reference, and that is exact rather than approximate:
 * every transition is whole-value, so an unchanged file **is** the same object
 * and a changed one never is.
 */
export function applied<T>(history: History<T>, f: (value: T) => T, limit = UNDO_LIMIT): History<T> {
  const next = f(history.current);
  if (next === history.current) return history;
  return { past: [...history.past, history.current].slice(-limit), current: next };
}

/**
 * Replace the current value outright, keeping it undoable.
 *
 * For the actions that are not transitions of the current file — "New document"
 * is the only one — because **E6** admits no editor action outside the stack and
 * that is the most destructive one there is.
 */
export function replaced<T>(history: History<T>, value: T, limit = UNDO_LIMIT): History<T> {
  return { past: [...history.past, history.current].slice(-limit), current: value };
}

/** Restore the previous value, whole. A no-op at the bottom of the stack. */
export function undone<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return { past: history.past.slice(0, -1), current: previous };
}
