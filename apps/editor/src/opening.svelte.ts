/**
 * Opening an operation, from anywhere, without losing a draft's changes.
 *
 * One draft at most is open (`drafting.svelte.ts`). Opening another operation
 * while the open draft has unsaved changes asks first, "Discard your changes?"
 * (Pol, Block E). With nothing changed it switches at once: discarding costs
 * nothing because the draft was never in the file (Q7).
 *
 * The guard used to live in `OperationsSection`, which is the only place that
 * opened operations. Stage 2 W4 adds a second: the orphan notice's "Open op-2"
 * action, in the preview. Both go through `guard` here, so neither can drop a
 * draft without asking. `OperationsSection` still draws the question, from
 * `asking` and `confirm` / `cancel`.
 *
 * A module holding a rune, with no logic worth a unit test, for the reason
 * `drafting.svelte.ts` gives.
 */

import { draftDiffers, type Step } from "./draft.svelte.js";
import { drafting } from "./drafting.svelte.js";
import { session } from "./session.svelte.js";

/** The switch waiting on the answer. */
let pending = $state<(() => void) | null>(null);
let asking = $state(false);

/** Bumped by `open`, so the Operations section unfolds and brings the card into view. */
let revealed = $state(0);

function editingId(): string | null {
  return drafting.editing ? (drafting.draft?.id ?? null) : null;
}

/** Runs `action` now, or after the author agrees to drop the open draft's changes. */
function guard(action: () => void): void {
  const draft = drafting.draft;
  if (draft !== null) {
    const id = editingId();
    const committed = session.file.config.operations.find((op) => op.id === id) ?? null;
    if (draftDiffers(draft, drafting.editing ? committed : null)) {
      pending = action;
      asking = true;
      return;
    }
  }
  action();
}

export const opening = {
  /** Whether the "Discard your changes?" dialog is showing. */
  get asking(): boolean {
    return asking;
  },
  set asking(value: boolean) {
    asking = value;
  },

  get revealed(): number {
    return revealed;
  },

  guard,

  /** The author chose Discard: drop the draft, then do what was waiting. */
  confirm(): void {
    const action = pending;
    pending = null;
    drafting.discard();
    action?.();
  },

  /** Keep editing, or Esc. */
  cancel(): void {
    pending = null;
  },

  /**
   * Opens operation `id` at `step`, through the guard, and asks the Operations
   * section to show it. An id no longer in the stack does nothing.
   */
  open(id: string, step: Step): void {
    const op = session.file.config.operations.find((o) => o.id === id);
    if (!op) return;
    const show = (): void => {
      revealed++;
    };
    if (editingId() === id && drafting.draft !== null) {
      drafting.draft.step = step;
      show();
      return;
    }
    guard(() => {
      drafting.edit(op);
      if (drafting.draft !== null) drafting.draft.step = step;
      show();
    });
  },
};
