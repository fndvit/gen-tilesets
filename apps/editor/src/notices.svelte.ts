/**
 * The notices' state: the pushed notices and the dismissals.
 *
 * The logic is in `notices.ts`, which is unit-tested. This module holds only
 * the `$state`, for the same reason `drafting.svelte.ts` does: a test cannot
 * import a module that holds a rune.
 *
 * Conditions are not stored here. The caller derives them from the document
 * and passes them to `shown`, so they go away by themselves when the document
 * no longer has them.
 */

import { dismissalId, prune, upsert, visible, type Notice } from "./notices.js";

let pushed = $state<Notice[]>([]);
let dismissed = $state<ReadonlySet<string>>(new Set());

export const notices = {
  /** Shows a notice that follows an event (an import's notes). Same key: replaced. */
  push(notice: Notice): void {
    pushed = upsert(pushed, notice);
  },

  /**
   * Hides a notice. A pushed one is removed; a condition stays hidden until
   * its details change or it goes away and returns.
   */
  dismiss(notice: Notice): void {
    if (pushed.some((n) => n.key === notice.key)) {
      pushed = pushed.filter((n) => n.key !== notice.key);
    } else {
      dismissed = new Set([...dismissed, dismissalId(notice)]);
    }
  },

  /** What to show for the given conditions, with the pushed notices after them. */
  shown(conditions: readonly Notice[]): Notice[] {
    return visible([...conditions, ...pushed], dismissed);
  },

  /** Forgets the dismissals whose condition no longer holds. Call from an effect. */
  forget(conditions: readonly Notice[]): void {
    const next = prune([...conditions, ...pushed], dismissed);
    if (next !== dismissed) dismissed = next;
  },

  /** A new or imported document starts with no notices. */
  clear(): void {
    pushed = [];
    dismissed = new Set();
  },
};
