/**
 * Swapping a prepared document in — the side-effecting half of §12.4.
 *
 * `prepareArchive` (`import.ts`) decides what an archive amounts to and touches
 * nothing; this does the swap once it is `ready`. Import and the New tileset
 * popup's templates (B-016) both call the pair, so a template opens exactly as
 * an exported zip of it would.
 *
 * Plain `.ts`, not `.svelte.ts`: it holds no rune of its own, only calls into
 * the modules that do. It has no unit test for the reason `drafting.svelte.ts`
 * gives — every line is a call into a rune-holding store, which Vitest cannot
 * load without the Svelte plugin (see `vitest.config.ts`).
 */

import { importNotices } from "./advisories.js";
import { replaceAll } from "./assets.js";
import { drafting } from "./drafting.svelte.js";
import type { Prepared } from "./import.js";
import { notices } from "./notices.svelte.js";
import { session } from "./session.svelte.js";

/** Replaces the open document, its pictures, its draft and its notices. */
export async function adopt(prepared: Extract<Prepared, { kind: "ready" }>): Promise<void> {
  const failed = await replaceAll(prepared.incoming);

  session.open(prepared.file);
  // A draft built against the outgoing document names ids the incoming one
  // does not have.
  drafting.discard();

  // A new document starts with no notices, then gets its own. Non-fatal:
  // the upgrade already happened (**E16**), and a document whose pictures
  // are absent is still a legal file the author can repair by dropping the
  // images back in. Refusing would throw away the operations, the seed and
  // the layout over a picture.
  notices.clear();
  for (const notice of importNotices({ upgrades: prepared.upgrades, failed })) {
    notices.push(notice);
  }
}
