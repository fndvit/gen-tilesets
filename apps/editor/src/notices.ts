/**
 * Notices: what the editor tells the author without stopping them (`09` §12).
 *
 * A notice is either an **advisory** (§12.2: worth knowing, never blocking,
 * never editing the file, never styled as an error, **E16**) or a **failure**
 * (§12.3: something did not work, such as a picture that did not load).
 *
 * ## Keyed by condition, not by text
 *
 * Each notice has a `key` (which condition: "asset-failed:tiles/sand.png") and
 * a `signature` (the condition's current details: which cells, which sizes).
 * Dismissing a notice records `key` + `signature`. The same notice stays
 * dismissed while the condition holds unchanged, and comes back when its
 * details change, or when it goes away and later returns. Nothing is counted
 * and nothing is badged (Pol, W0, 2026-11-06).
 *
 * ## Two sources, one list
 *
 * - **Conditions** are derived from the document on every change (an orphaned
 *   operation, a non-square asset). They go away by themselves.
 * - **Pushed** notices follow an event that leaves no trace in the document (an
 *   import's notes). They stay until dismissed or until the document is replaced.
 *
 * This module is the logic, and it holds no state. `notices.svelte.ts` holds
 * the state, because `vitest.config.ts` cannot load a module holding a rune.
 */

export type NoticeKind = "advisory" | "failure";

export interface NoticeAction {
  label: string;
  run: () => void;
}

export interface Notice {
  /** Which condition. One notice per key. */
  key: string;
  /** The condition's details. A change brings a dismissed notice back. Defaults to "". */
  signature?: string;
  kind: NoticeKind;
  title: string;
  /** Data, one line each: file names, operation ids, sizes. Drawn in mono. */
  data?: readonly string[];
  /** A short explanation, drawn muted. */
  body?: string;
  actions?: readonly NoticeAction[];
}

/** What a dismissal records. */
export function dismissalId(notice: Notice): string {
  return `${notice.key}\u0000${notice.signature ?? ""}`;
}

/**
 * Adds a pushed notice, or replaces the one with the same key in place, so an
 * event that happens twice shows once.
 */
export function upsert(list: readonly Notice[], notice: Notice): Notice[] {
  const at = list.findIndex((n) => n.key === notice.key);
  if (at === -1) return [...list, notice];
  return list.map((n, i) => (i === at ? notice : n));
}

/**
 * What to show, in order: failures, then advisories, each in the order given.
 * The first notice with a key wins, and dismissed ones are left out.
 */
export function visible(all: readonly Notice[], dismissed: ReadonlySet<string>): Notice[] {
  const seen = new Set<string>();
  const shown: Notice[] = [];
  for (const notice of all) {
    if (seen.has(notice.key)) continue;
    seen.add(notice.key);
    if (!dismissed.has(dismissalId(notice))) shown.push(notice);
  }
  return [...shown.filter((n) => n.kind === "failure"), ...shown.filter((n) => n.kind === "advisory")];
}

/**
 * Forgets the dismissals whose condition no longer holds exactly, so a
 * condition that goes away and comes back is shown again. Returns the same set
 * when nothing changes, so a caller storing it in state does not re-render.
 */
export function prune(all: readonly Notice[], dismissed: ReadonlySet<string>): ReadonlySet<string> {
  const live = new Set(all.map(dismissalId));
  const kept = [...dismissed].filter((id) => live.has(id));
  return kept.length === dismissed.size ? dismissed : new Set(kept);
}
