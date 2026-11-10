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
 * A **UI constant with no authority anywhere**, recorded in `DECISIONS.md` D32. It
 * exists because §5 notes that a slider dragged across a frame changes `file` on
 * every frame, so an unbounded stack holds every intermediate value of every
 * drag for the session.
 */
export const UNDO_LIMIT = 100;

export interface History<T> {
  /** Previous values, oldest first. The last is what one undo returns to. */
  past: T[];
  current: T;
  /**
   * The live gesture `current` belongs to, if any (`appliedLive`). Every other
   * operation returns a history without one, which is what ends a gesture.
   */
  gesture?: string;
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
 * Apply one frame of a live gesture (a slider being dragged), so the picture
 * follows the drag while the whole drag stays **one** undo entry.
 *
 * The first frame of gesture `key` is an ordinary `applied`, pushing the value
 * from before the drag. Later frames of the same gesture replace `current`
 * without pushing, so one undo returns to before the drag, never to a
 * half-way frame. Any other operation ends the gesture, and `settled` ends it
 * on release, so the next drag of the same control is a new entry.
 *
 * A refused first frame pushes nothing and starts no gesture: otherwise the
 * next frame would change the file with nothing on the stack to undo to.
 */
export function appliedLive<T>(history: History<T>, key: string, f: (value: T) => T, limit = UNDO_LIMIT): History<T> {
  if (history.gesture !== key) {
    const next = applied(history, f, limit);
    return next === history ? history : { ...next, gesture: key };
  }
  const next = f(history.current);
  return next === history.current ? history : { ...history, current: next };
}

/** End the live gesture, if one is open: the next frame starts a new entry. */
export function settled<T>(history: History<T>): History<T> {
  if (history.gesture === undefined) return history;
  const { gesture: _, ...rest } = history;
  return rest;
}

/** Restore the previous value, whole. A no-op at the bottom of the stack. */
export function undone<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return { past: history.past.slice(0, -1), current: previous };
}
