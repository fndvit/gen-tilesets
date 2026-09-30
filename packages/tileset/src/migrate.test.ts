/**
 * Migration — `06-config-schema.md` §4.3, §4.5.
 *
 * The property that matters is the pair: a migrated file **validates**, and is
 * otherwise **identical to what went in**. A migration that quietly changed
 * anything else would be the coercion §9.2 keeps out of `validate()`, relocated
 * rather than removed.
 */

import { describe, expect, it } from "vitest";
import { migrate, MIGRATIONS } from "./migrate.js";
import type { TilesetFile } from "./types.js";
import { SCHEMA_VERSION, validate } from "./validate.js";

/** A current file that validates clean, used as the shape everything else varies. */
const current = (): TilesetFile => ({
  schemaVersion: SCHEMA_VERSION,
  engineVersion: "0.0.0",
  config: {
    rows: 4,
    columns: 6,
    defaultSeed: "sunset-3",
    assetSalt: 0,
    reseedAssetsOnLoad: false,
    tiles: [{ id: "leaf", name: "leaf", assets: [{ id: "a1", weight: 1 }] }],
    operations: [
      {
        id: "op1",
        salt: 3,
        reseedOnLoad: false,
        selection: { type: "checkerboard", parity: 1 },
        source: { type: "constant" },
        target: "tileId",
        mapping: { palette: [{ tileId: "leaf", weight: 1 }] },
        blend: "set",
      },
    ],
  },
  layout: { cellSize: 175, referenceWidth: 1280, yOffset: 0.25, horizontalAlignment: "gutter" },
});

/** The same document as it would have been written before ADR-005. */
const v1 = (): Record<string, unknown> => ({ ...current(), schemaVersion: 1 });

describe("migrate — the v1 → current path", () => {
  it("upgrades a v1 file, one row at a time", () => {
    const outcome = migrate(v1());
    expect(outcome.kind).toBe("migrated");
    if (outcome.kind !== "migrated") return;
    expect((outcome.file as TilesetFile).schemaVersion).toBe(SCHEMA_VERSION);
    expect(outcome.steps.map((s) => [s.from, s.to])).toEqual([
      [1, 2],
      [2, 3],
    ]);
  });

  /**
   * §4.3's *nothing to do*, asserted rather than asserted-about. ADR-005's only
   * reach into the file was widening `Operation.target`'s admissible set, so
   * there is nothing in a v1 document to convert.
   */
  it("changes nothing but the version number", () => {
    const before = v1();
    const outcome = migrate(before);
    if (outcome.kind !== "migrated") throw new Error("expected a migration");
    expect(outcome.file).toEqual({ ...before, schemaVersion: SCHEMA_VERSION });
  });

  /** The whole point: an old file opens. */
  it("produces a file that validates clean", () => {
    const outcome = migrate(v1());
    if (outcome.kind !== "migrated") throw new Error("expected a migration");
    expect(validate(outcome.file)).toEqual([]);
  });

  /** Whole-value — the caller may still be holding the pre-import document. */
  it("does not mutate its input", () => {
    const before = v1();
    migrate(before);
    expect(before.schemaVersion).toBe(1);
  });

  /**
   * Migration is not validation (**C5**). A file that is invalid for an
   * unrelated reason still migrates; `validate()` then reports the real problem
   * at its own path, rather than the version standing in for it.
   */
  it("migrates a file that is invalid for an unrelated reason", () => {
    const broken = { ...v1(), somethingElse: true };
    const outcome = migrate(broken);
    expect(outcome.kind).toBe("migrated");
    if (outcome.kind !== "migrated") return;
    expect(validate(outcome.file).map((e) => [e.code, e.path])).toEqual([
      ["UNKNOWN_KEY", "/somethingElse"],
    ]);
  });
});

describe("migrate — the v2 → v3 path", () => {
  /**
   * 0.7.0's row. `responsive` is optional, and a v2 file has none, which is what
   * "one shape at every width" always was — so there is nothing to convert.
   */
  it("changes nothing but the version number, and adds no rules", () => {
    const before = { ...current(), schemaVersion: 2 };
    const outcome = migrate(before);
    if (outcome.kind !== "migrated") throw new Error("expected a migration");
    expect(outcome.steps.map((s) => [s.from, s.to])).toEqual([[2, 3]]);
    expect(outcome.file).toEqual({ ...before, schemaVersion: 3 });
    expect("responsive" in (outcome.file as object)).toBe(false);
    expect(validate(outcome.file)).toEqual([]);
  });
});

describe("migrate — the other three outcomes", () => {
  it("reports a current file as current, and touches nothing", () => {
    expect(migrate(current())).toEqual({ kind: "current" });
  });

  /**
   * `09` §12.4's case, and the **only** one where *update the editor, not the
   * file* is the right advice. Firing that message on an older file was the
   * defect this module fixes.
   */
  it("reports a newer file as newer", () => {
    const newer = SCHEMA_VERSION + 1;
    expect(migrate({ ...current(), schemaVersion: newer })).toEqual({ kind: "newer", declared: newer });
  });

  it("reports an absent or non-integer version as unrecognized", () => {
    const { schemaVersion: _drop, ...bare } = current();
    expect(migrate(bare).kind).toBe("unrecognized");
    // `"2"` is not `2`: §5.2 makes an integer a JSON number, and accepting the
    // string would be the coercion this module keeps out of `validate()`.
    expect(migrate({ ...current(), schemaVersion: "2" }).kind).toBe("unrecognized");
    expect(migrate({ ...current(), schemaVersion: 1.5 }).kind).toBe("unrecognized");
  });

  /** A past version with no row is a refusal, never a silent skip. */
  it("reports an unreachable past version as unrecognized", () => {
    expect(migrate({ ...current(), schemaVersion: 0 })).toEqual({ kind: "unrecognized", declared: 0 });
    expect(migrate({ ...current(), schemaVersion: -3 }).kind).toBe("unrecognized");
  });

  it("survives a value that is not an object at all", () => {
    expect(migrate(null).kind).toBe("unrecognized");
    expect(migrate([]).kind).toBe("unrecognized");
    expect(migrate("{}").kind).toBe("unrecognized");
  });
});

describe("the table is well-formed — 06 §4.5", () => {
  /** So a future row cannot be added inconsistently and go unnoticed. */
  it("is adjacent, ascending, and terminates at SCHEMA_VERSION", () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    for (const step of MIGRATIONS) expect(step.to).toBe(step.from + 1);
    MIGRATIONS.forEach((step, i) => {
      if (i > 0) expect(step.from).toBe(MIGRATIONS[i - 1]!.to);
    });
    expect(MIGRATIONS[0]!.from).toBe(1);
    expect(MIGRATIONS[MIGRATIONS.length - 1]!.to).toBe(SCHEMA_VERSION);
  });

  it("carries a note on every row — a no-op row still says so", () => {
    for (const step of MIGRATIONS) expect(step.note.length).toBeGreaterThan(0);
  });

  /** Every reachable past version has a path to the present. */
  it("reaches the current version from every version it names", () => {
    for (const step of MIGRATIONS) {
      const outcome = migrate({ ...current(), schemaVersion: step.from });
      expect(outcome.kind).toBe("migrated");
      if (outcome.kind !== "migrated") continue;
      expect((outcome.file as TilesetFile).schemaVersion).toBe(SCHEMA_VERSION);
    }
  });
});
