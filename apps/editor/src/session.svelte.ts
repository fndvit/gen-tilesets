/**
 * The live document, and the only way to change it — `09-editor.md` §4.1, §4.2.
 *
 * **E3** puts the `TilesetFile` itself in `$state`. There is no second document
 * model, so this holds the file and nothing that projects to one.
 *
 * **E5** is enforced structurally: `file` is readable but not assignable from
 * outside, and `apply()` is the only mutator. Every caller therefore hands over a
 * `TilesetFile -> TilesetFile`, which is the invariant restated as an API rather
 * than as a rule someone has to remember.
 *
 * ## Undo — **E6**, §4.4
 *
 * **Invariant E6** — *undo restores a previous `TilesetFile` in full. No editor
 * action is outside the undo stack, including the design-width change of §9.3.*
 *
 * §4.4: "`TilesetFile` is plain serializable data, edits are whole transitions
 * (E5), and the engine is pure, so a restored file is a restored picture with
 * nothing else to reset." That is why this is a stack of whole files rather than
 * a log of inverse operations — there is no inverse to write, and nothing beside
 * the file to roll back with it.
 *
 * It lands inside `apply()`, which is what makes E6's *no editor action is
 * outside* structural: `apply` is already the only mutator, so an action that
 * escaped the stack would have to escape the document too.
 *
 * **Transient UI state** (§4.1) — the create-operation draft, which panel is
 * open, a muted Operation — lives *beside* this, keyed by the identifiers the
 * file already carries. It is session-scoped and does not survive a reload.
 * Never in `meta` (**E4**), and never in the file.
 *
 * The draft is deliberately **not** undone with the file. §4.4 restores a
 * `TilesetFile`, and a draft is not in one; an undo that also rewound a
 * half-built Operation would be restoring something the author never committed.
 */

import type { TilesetFile } from "@fndvit/gen-tilesets";
import { newDocument, type Transition } from "./document.js";
import { applied, historyOf, replaced, undone, type History } from "./history.js";

/**
 * The document and everything it has been.
 *
 * The **rule** lives in `history.ts` and is unit-tested; this holds it in a rune.
 * `vitest.config.ts` runs without the Svelte plugin deliberately, so a module
 * containing `$state` cannot be imported by a test — the same split
 * `draft.svelte.ts` and `drafting.svelte.ts` take, for the same reason.
 */
let history = $state<History<TilesetFile>>(historyOf(newDocument()));

export const session = {
  /**
   * The document. Read-only from outside: `08` **S3** requires the host to hold
   * a valid file at every instant, and an assignable field is a way to hold an
   * invalid one.
   */
  get file(): TilesetFile {
    return history.current;
  },

  /** Whether there is anything to undo — the button's enabled state. */
  get canUndo(): boolean {
    return history.past.length > 0;
  },

  /**
   * Apply one transition — **E5** — and push the file it replaced (**E6**).
   *
   * **A refusal pushes nothing.** A transition that declines returns its input
   * unchanged (a refused deletion, §4.2; a refused zero-weight, §10.2), and it
   * arrives here as an identity. Pushing it would put an entry on the stack that
   * undoes to the state it is already in — an undo that visibly does nothing,
   * which is `05` §6.1's complaint in the one control whose whole job is to be
   * trusted.
   *
   * The comparison is by reference, which is exact here rather than approximate:
   * every transition is whole-value, so an unchanged file *is* the same object
   * and a changed one never is.
   */
  apply(transition: Transition): void {
    history = applied(history, transition);
  },

  /**
   * Restore the previous file, whole — §4.4.
   *
   * This is also **§9.4's repair**, and that is the point of E6 rather than a
   * side benefit: `02` §7.5 refused to migrate an orphaned `rect` or `cellList`
   * because migration has to guess, and undo "returns the author's authored
   * values rather than the editor's guess at them, and it needs no rule about
   * what a coordinate means when the grid changes underneath it".
   */
  undo(): void {
    history = undone(history);
  },

  /**
   * Discard the document and start again from `08` §3.4's valid skeleton.
   *
   * **Undoable, like everything else.** E6 admits no editor action outside the
   * stack, and this is the most destructive one there is.
   */
  reset(): void {
    history = replaced(history, newDocument());
  },

  /**
   * Open an imported document, whole — §12.4.
   *
   * `reset()` is the precedent and this is the same shape: a *replacement*
   * rather than a transition, because there is no function from the outgoing
   * file to the incoming one and pretending otherwise would put a `() => file`
   * on the stack that ignores its argument.
   *
   * **Undoable**, again by **E6** — an import replaces everything the author had,
   * so it is exactly the action that most needs to be reversible. Undo restores
   * the previous document; it does **not** restore that document's asset bytes,
   * which live in the session store outside the file and were swapped with it.
   * That is `09` §15 Q8's session-scoped store showing through, not a defect in
   * the undo stack, and it is the same gap a reload has always had.
   *
   * **The file is validated before it gets here.** §12.4 refuses to open a file
   * with any `ValidationError`, and **S3** requires the host to hold a valid file
   * at every instant — so this takes a `TilesetFile`, and the caller has already
   * proved it is one.
   */
  open(file: TilesetFile): void {
    history = replaced(history, file);
  },
};
