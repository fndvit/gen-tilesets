/**
 * `loadTilesetFile()` and `assertValidFile()` — `./load.ts`.
 *
 * The behaviour under test is the **sequence**, not the two functions it calls:
 * `migrate()` runs first, `"newer"` gets its own message, and every other
 * unusable version falls through to `validate()` rather than growing a second
 * error format. `migrate.test.ts` and `validate.test.ts` own the parts.
 */

import { describe, expect, it } from "vitest";
import { assertValidFile, loadTilesetFile } from "./load.js";
import type { TilesetFile } from "./types.js";
import { SCHEMA_VERSION } from "./validate.js";

/** A v2 file that validates clean, used as the shape everything else varies. */
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

describe("loadTilesetFile — the happy paths", () => {
  it("returns a current file unchanged, by identity", () => {
    const raw = current();
    // `"current"` carries no payload, so the value returned must be the input
    // itself rather than a copy — a host holding a stable reference (which
    // `<Tileset>` requires) depends on nothing being cloned underneath it.
    expect(loadTilesetFile(raw)).toBe(raw);
  });

  it("migrates a v1 file and returns it at the current version", () => {
    const loaded = loadTilesetFile(v1());
    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("migrates before validating", () => {
    // The whole reason the order is fixed. A v1 file declares a version
    // `validate()` alone rejects outright, so if these ran the other way round
    // this would throw instead of returning.
    expect(() => loadTilesetFile(v1())).not.toThrow();
  });
});

describe("loadTilesetFile — a version it cannot use", () => {
  it("gives `newer` its own message, naming both versions", () => {
    const raw = { ...current(), schemaVersion: SCHEMA_VERSION + 1 };
    // `09` §12.4 — the one case where the advice is *update the code, not the
    // file*, so it must not arrive dressed as a validation error.
    expect(() => loadTilesetFile(raw)).toThrow(
      new RegExp(`declares schemaVersion ${SCHEMA_VERSION + 1}.*knows ${SCHEMA_VERSION}`, "s"),
    );
    expect(() => loadTilesetFile(raw)).toThrow(/Upgrade the package/);
  });

  it("leaves an absent schemaVersion to validate()", () => {
    const raw: Record<string, unknown> = { ...current() };
    delete raw.schemaVersion;
    expect(() => loadTilesetFile(raw)).toThrow(/SCHEMA_VERSION_MISSING/);
    expect(() => loadTilesetFile(raw)).toThrow(new RegExp("/schemaVersion"));
  });

  it('leaves a non-integer schemaVersion to validate() — "2" is not 2', () => {
    // `migrate()` reads the version strictly and returns `"unrecognized"`; the
    // coercion that would accept this is the one `06` §9.2 keeps out.
    expect(() => loadTilesetFile({ ...current(), schemaVersion: "2" })).toThrow(
      /SCHEMA_VERSION_UNKNOWN/,
    );
  });

  it("leaves a non-object to validate()", () => {
    for (const raw of [null, 42, "a string", [current()]]) {
      expect(() => loadTilesetFile(raw)).toThrow(/TYPE_MISMATCH/);
    }
  });
});

describe("loadTilesetFile — an invalid file", () => {
  it("names the offending path and code", () => {
    const raw = current();
    raw.config.rows = 0;
    expect(() => loadTilesetFile(raw)).toThrow(/\/config\/rows \[OUT_OF_RANGE\]/);
  });

  it("reports every error, not the first", () => {
    const raw = current();
    raw.config.rows = 0;
    raw.config.columns = -3;
    let message = "";
    try {
      loadTilesetFile(raw);
    } catch (cause) {
      message = String(cause);
    }
    expect(message).toContain("/config/rows");
    expect(message).toContain("/config/columns");
  });

  it("uses the caller's label, so the message names the file the host read", () => {
    const raw = current();
    raw.config.rows = 0;
    expect(() => loadTilesetFile(raw, "static/tileset.json")).toThrow(/static\/tileset\.json/);
  });
});

describe("assertValidFile", () => {
  it("returns the file when it validates", () => {
    const raw = current();
    expect(assertValidFile(raw, "a file")).toBe(raw);
  });

  it("does not migrate — that is loadTilesetFile's half of the job", () => {
    // The component asserts with this, and a component must never coerce a
    // version: it is handed a `TilesetFile` and holds it, per **S3**.
    expect(() => assertValidFile(v1(), "a file")).toThrow(/SCHEMA_VERSION_UNKNOWN/);
  });

  it("appends the hint after the error list when given one", () => {
    const raw = current();
    raw.config.rows = 0;
    let message = "";
    try {
      assertValidFile(raw, "a file", "Call loadTilesetFile() first.");
    } catch (cause) {
      message = String(cause);
    }
    expect(message).toContain("/config/rows");
    expect(message.indexOf("Call loadTilesetFile() first.")).toBeGreaterThan(
      message.indexOf("/config/rows"),
    );
  });

  it("shows the document root as `/` rather than as an empty path", () => {
    // An RFC 6901 pointer to the root is `""`, which in a list of paths reads as
    // a missing field instead of as the whole file.
    expect(() => assertValidFile(null, "a file")).toThrow(/ {2}\/ \[TYPE_MISMATCH\]/);
  });
});
