/**
 * Migration — `06-config-schema.md` §4.3, §4.5.
 *
 * §4.3 fixes when `schemaVersion` moves and, in the same breath, what a bump
 * costs:
 *
 * > Most bumps will carry a no-op migration, which is the correct cost: the
 * > migration table gains a row saying *nothing to do*, and the loader gains the
 * > ability to say *this file is newer than this build* instead of *I do not
 * > recognize the key `curve`*.
 *
 * This is that table, and the walk over it. It discharges `06` §12's
 * `[EXTENSION POINT]` — *"`schemaVersion: 2` and a migration path"* — which was
 * open only because there was nothing yet to migrate from.
 *
 * ## Why this is not inside `validate()`
 *
 * `06` §9.2: **validation never coerces.** "No clamping, no rounding, no
 * truncation, no substituting a default for a value that is present but wrong."
 * Rewriting a file's `schemaVersion` is precisely a coercion, and putting it
 * inside the one function whose defining rule forbids coercion would make that
 * rule a thing with an exception rather than a rule.
 *
 * So migration runs **first** and produces a new value; `validate()` then sees a
 * file claiming the one version it knows, and is unchanged by any of this.
 *
 * ## It does not validate, either
 *
 * A migrated file is *shaped for* this build's schema, not proven legal by it.
 * `06` **C5** keeps the two apart, and a migration that also validated would make
 * `validate()` reachable by two paths with two answers — the second source of
 * truth **C8** rejects one level down.
 */

import { SCHEMA_VERSION } from "./validate.js";

/**
 * One step between adjacent schema versions.
 *
 * **A no-op row is still a row.** §4.3 argues the point directly: "A version
 * number that moves only when someone judges the change important is a version
 * number that does not move." The row records that the answer to *what has to
 * change* is *nothing*, which is a fact worth carrying rather than an absence
 * worth omitting.
 */
export interface Migration {
  from: number;
  to: number;
  /** What this step does, surfaced to the author. "nothing to do" is a legal answer. */
  note: string;
  /** Whole-value. Never mutates its input — the caller may still be holding it. */
  upgrade(file: Record<string, unknown>): Record<string, unknown>;
}

/**
 * What `migrate` found. Four cases, kept distinct because they take four
 * different actions and conflating two of them is what produced the defect this
 * module exists to fix.
 *
 * - `current` — nothing to do; the file already declares this build's version.
 * - `migrated` — upgraded, with the steps taken, for the advisory.
 * - `newer` — `09` §12.4's case, and **the only one** where *update the editor,
 *   not the file* is the right advice.
 * - `unrecognized` — absent, not an integer, or a past version with no path.
 *   Left to `validate()`, which reports `SCHEMA_VERSION_MISSING` or
 *   `SCHEMA_VERSION_UNKNOWN` at `/schemaVersion` like any other error.
 */
export type MigrationOutcome =
  | { kind: "current" }
  | { kind: "migrated"; file: unknown; steps: Migration[] }
  | { kind: "newer"; declared: number }
  | { kind: "unrecognized"; declared: unknown };

/**
 * The migration table — `06` §4.5.
 *
 * Ordered, adjacent, and terminating at {@link SCHEMA_VERSION}. A future
 * `2 → 3` row appends here and composes with this one; nothing existing changes.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    from: 1,
    to: 2,
    // ADR-005 added the `scale` attribute. Its only reach into the *file* is
    // that `Operation.target`'s admissible set gained `"scale"` (`06` §7) --
    // a pure widening, so every legal v1 file is already a structurally legal
    // v2 file. `TileState` gained a field too, but `TileState` is `generate()`'s
    // output and is not in a `TilesetFile` at all; `06` §4.2 puts it outside
    // `schemaVersion`'s remit entirely.
    note: "nothing to do — ADR-005 widened Operation.target and changed no key",
    upgrade: (file) => ({ ...file, schemaVersion: 2 }),
  },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Bring a parsed file up to {@link SCHEMA_VERSION}, or say why it cannot be.
 *
 * Takes a parsed value rather than text, for `06` §10's reason: JSON syntax
 * errors belong to whoever called `JSON.parse`.
 *
 * **The declared version is read strictly.** `"1"` is not `1`: §5.2 makes an
 * integer "a JSON number with no fractional part", and accepting the string here
 * would be the coercion this module is careful to keep out of `validate()`,
 * relocated rather than removed.
 */
export function migrate(file: unknown): MigrationOutcome {
  if (!isObject(file)) return { kind: "unrecognized", declared: undefined };

  const declared = file.schemaVersion;
  if (!Number.isSafeInteger(declared)) return { kind: "unrecognized", declared };

  const version = declared as number;
  if (version === SCHEMA_VERSION) return { kind: "current" };
  if (version > SCHEMA_VERSION) return { kind: "newer", declared: version };

  const steps: Migration[] = [];
  let at = version;
  let current: Record<string, unknown> = file;

  // Walked rather than indexed, so a gap in the table is a refusal rather than a
  // silent skip to the next row that happens to fit.
  for (;;) {
    if (at === SCHEMA_VERSION) return { kind: "migrated", file: current, steps };
    const step = MIGRATIONS.find((m) => m.from === at);
    if (step === undefined) return { kind: "unrecognized", declared: version };
    current = step.upgrade(current);
    steps.push(step);
    at = step.to;
  }
}
