/**
 * The open create-operation draft — `09-editor.md` §4.1.
 *
 * §4.1 puts transient UI state "beside the file, keyed by the identifiers the
 * file already carries". This is that, for the draft: never in the file, never in
 * `meta` (**E4**), session-scoped, and gone on a reload.
 *
 * ## Why the draft is here and not inside the panel that edits it
 *
 * **Two surfaces need the same draft.** The panel builds it, and the *preview*
 * writes to it — §7.3's brush paints a `cellList` parameter by clicking on the
 * picture, and Step 8's overlay reads the same draft's Selection. A draft owned
 * by the sidebar is unreachable from the surface the author is painting on, and
 * threading it down through the preview would put a create-operation concern
 * inside the component whose only job is drawing the file.
 *
 * ## Why this is a separate module from `draft.svelte.ts`
 *
 * That one is the draft's *logic* — `isComplete`, `toOperation`, `retarget` —
 * and it is unit-tested. `vitest.config.ts` deliberately runs without the Svelte
 * plugin (Vitest 2 bundles Vite 5; the plugin needs Vite 8), so a module holding
 * a rune cannot be imported by a test. Keeping the `$state` in a module with no
 * logic in it is what keeps the logic testable.
 */

import type { Operation } from "@fndvit/gen-tilesets";
import { fromOperation, newDraft, type Draft } from "./draft.svelte.js";

let open = $state<Draft | null>(null);

/**
 * Which transition the open draft commits.
 *
 * It cannot be inferred from the draft. An edit-draft's id **is** in
 * `config.operations` and a create-draft's is not, so "is this id in the stack?"
 * would answer correctly — right up until the Operation being edited is removed
 * underneath the panel, at which point the same question turns an edit into a
 * silent creation that re-adds what the author just deleted. The mode is
 * recorded rather than reconstructed, and the stale case is handled as the stale
 * case it is (`App.svelte`).
 */
let mode = $state<"create" | "edit">("create");

export const drafting = {
  get draft(): Draft | null {
    return open;
  },

  /** Whether the open draft replaces an Operation rather than appending one. */
  get editing(): boolean {
    return open !== null && mode === "edit";
  },

  /** The id is allocated once, here, and never reassigned (§4.3). */
  start(id: string): void {
    open = newDraft(id);
    mode = "create";
  },

  /**
   * Reopen an existing Operation — §4.3's id survives, and with it the
   * Operation's hash channels, its stack index and its salt.
   *
   * The panel is the same one a creation uses. `09` §6.1 already speaks of the
   * overlay being shown for "the Operation being edited", which is the create
   * workflow read as one case of editing rather than the other way round.
   */
  edit(op: Operation): void {
    open = fromOperation(op);
    mode = "edit";
  },

  /**
   * Discarding costs nothing because the draft was never in the file — Q7's
   * answer, rather than a convenience the panel arranges.
   */
  discard(): void {
    open = null;
  },
};
