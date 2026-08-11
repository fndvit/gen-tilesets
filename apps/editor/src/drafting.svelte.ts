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

import { newDraft, type Draft } from "./draft.svelte.js";

let open = $state<Draft | null>(null);

export const drafting = {
  get draft(): Draft | null {
    return open;
  },

  /** The id is allocated once, here, and never reassigned (§4.3). */
  start(id: string): void {
    open = newDraft(id);
  },

  /**
   * Discarding costs nothing because the draft was never in the file — Q7's
   * answer, rather than a convenience the panel arranges.
   */
  discard(): void {
    open = null;
  },
};
