/**
 * Loading a `TilesetFile` — the convenience path over `06`'s `migrate()` and
 * `validate()`.
 *
 * Neither function is reimplemented here. This module is the *sequence*, which
 * every host was otherwise obliged to write out: `migrate()` **before**
 * `validate()`, because rewriting a `schemaVersion` is a coercion and `06` §9.2
 * forbids `validate()` from coercing anything. Left to each consumer that
 * ordering is unenforceable — reverse the two calls and nothing complains, the
 * file is validated against a version it does not yet claim, and the failure is
 * silent. Putting it behind one function is what makes it a property of the
 * package rather than an instruction in a README.
 *
 * **What it gives up.** It throws, and in throwing it discards both
 * `MigrationOutcome.steps` and the structured `ValidationError[]`. That is
 * exactly what an editor cannot afford: `apps/editor/src/lib/ImportPanel.svelte`
 * needs the steps to raise `09`'s **E16** upgrade advisory and the errors to
 * report each at its own path. So this is the plain consumer's door, not the only
 * one — a host that needs either keeps calling `migrate()` and `validate()`
 * directly, and nothing about that path changes.
 */

import { migrate } from "./migrate.js";
import type { TilesetFile } from "./types.js";
import { SCHEMA_VERSION, validate } from "./validate.js";

/**
 * Run `06`'s `validate()` and throw unless it passes, returning the file at its
 * proper type.
 *
 * **The cast is the whole point.** `TilesetFile.schemaVersion` is the literal
 * type `2`, so a `JSON` import — which widens it to `number` — never assigns to
 * `TilesetFile` on its own. Validation is what earns it, and this is the only
 * place in the package that performs it.
 *
 * Separate from {@link loadTilesetFile} because it has a second caller:
 * `<Tileset>` asserts with it under `DEV` (`08` open question 3). It lives in a
 * `.ts` rather than inside the component for the reason `CLAUDE.md` gives —
 * `.svelte` cannot be unit-tested here, so logic that matters belongs where a
 * test can import it.
 *
 * @param label What the file is, for the message ("tileset.json", "`<Tileset>`'s
 *   `file` prop"). The caller knows; this function cannot.
 * @param hint Appended after the error list when there is an action to name.
 */
export function assertValidFile(file: unknown, label: string, hint?: string): TilesetFile {
  const errors = validate(file);
  if (errors.length > 0) {
    // `path` is an RFC 6901 pointer, and the pointer to the document root is the
    // empty string — which reads as a missing field rather than as the whole
    // file, so it is shown as `/`.
    const detail = errors.map((e) => `  ${e.path || "/"} [${e.code}] ${e.message}`).join("\n");
    throw new Error(
      `${label} is not a valid TilesetFile:\n${detail}` + (hint === undefined ? "" : `\n\n${hint}`),
    );
  }
  return file as TilesetFile;
}

/**
 * Bring a parsed value up to {@link SCHEMA_VERSION} and validate it, or throw.
 *
 * Takes a *parsed* value rather than text, for `06` §10's reason: a JSON syntax
 * error belongs to whoever called `JSON.parse`.
 *
 * @param label What the file is, for the message. Defaults to a generic noun so
 *   the common `loadTilesetFile(raw)` call needs no second argument.
 */
export function loadTilesetFile(raw: unknown, label = "tileset file"): TilesetFile {
  const outcome = migrate(raw);

  // `09` §12.4's case, and **the only one** where the advice is *update the
  // code, not the file*. It gets its own throw because `validate()` would report
  // it as `SCHEMA_VERSION_UNKNOWN` — true, but it would send the reader looking
  // for a mistake in a file that has none.
  if (outcome.kind === "newer") {
    throw new Error(
      `${label} declares schemaVersion ${outcome.declared}, but this build of ` +
        `@fndvit/gen-tilesets knows ${SCHEMA_VERSION}. Upgrade the package.`,
    );
  }

  // `"unrecognized"` deliberately has **no** branch. Absent, non-integer, or a
  // past version with no migration path all fall through to `validate()`, which
  // reports `SCHEMA_VERSION_MISSING` or `SCHEMA_VERSION_UNKNOWN` at
  // `/schemaVersion` like any other error (`06` §4.3) — and reports it *alone*,
  // per **C2**, rather than guessing a version from the fields present. That is
  // the choice `ImportPanel.svelte` makes too, and it keeps one error format
  // instead of two.
  //
  // Note the asymmetry in `MigrationOutcome`: `"migrated"` carries the rewritten
  // file, `"current"` carries nothing, so an unmigrated file is `raw` itself.
  const candidate: unknown = outcome.kind === "migrated" ? outcome.file : raw;

  return assertValidFile(candidate, label);
}
