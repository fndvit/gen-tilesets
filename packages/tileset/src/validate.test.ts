/**
 * `validate()` — `06-config-schema.md` §5–§10.
 *
 * One case per code in §10.3's table, plus the properties the codes rest on:
 * strictness at every depth (**C4**), no coercion (§9.2), the mapping's kind
 * coming from the Target (**C8**), and the `(target, blend)` pair checked
 * against the derived table rather than a copy of it (ADR-001).
 */

import { describe, expect, it } from "vitest";
import type { Operation, Tile, TilesetFile } from "./types.js";
import { SCHEMA_VERSION, validate, type ErrorCode } from "./validate.js";

const leaf: Tile = { id: "leaf", name: "leaf", assets: [{ id: "a1", weight: 1 }] };

const paint: Operation = {
  id: "op1",
  salt: 0,
  reseedOnLoad: false,
  selection: { type: "all" },
  source: { type: "constant" },
  target: "tileId",
  mapping: { palette: [{ tileId: "leaf", weight: 1 }] },
  blend: "set",
};

const file = (over: Partial<TilesetFile> = {}): TilesetFile => ({
  schemaVersion: SCHEMA_VERSION,
  engineVersion: "0.0.0",
  config: {
    rows: 4,
    columns: 6,
    defaultSeed: "sunset-3",
    assetSalt: 0,
    reseedAssetsOnLoad: false,
    tiles: [leaf],
    operations: [paint],
  },
  layout: { cellSize: 175, referenceWidth: 1280, yOffset: 0.25, horizontalAlignment: "gutter" },
  ...over,
});

/** Mutates a deep copy, so each case states only what it breaks. */
const broken = (mutate: (f: any) => void): unknown => {
  const copy = structuredClone(file()) as any;
  mutate(copy);
  return copy;
};

const codes = (value: unknown): ErrorCode[] => validate(value).map((e) => e.code);
const paths = (value: unknown): string[] => validate(value).map((e) => e.path);

describe("validate — the valid case", () => {
  it("accepts a whole file with no errors", () => {
    expect(validate(file())).toEqual([]);
  });

  /**
   * §5 — both arrays may be empty. That is the state a fresh editor document is
   * in; it generates a grid of `tileId: null`, which is legal and renders
   * nothing (**G4**). Rejecting it would mean the editor cannot save an
   * unfinished document.
   */
  it("accepts an empty document", () => {
    expect(validate(broken((f) => ((f.config.tiles = []), (f.config.operations = []))))).toEqual([]);
  });

  /** §5.1 — a field is optional iff a default is declared for it. */
  it("accepts every optional field absent", () => {
    expect(
      validate(
        broken((f) => {
          delete f.config.assetSalt;
          delete f.config.reseedAssetsOnLoad;
          delete f.config.operations[0].salt;
          delete f.config.operations[0].reseedOnLoad;
          delete f.config.tiles[0].assets[0].meta;
        }),
      ),
    ).toEqual([]);
  });

  /** `04` §6.2 — `min > max` is legal and reverses the map. */
  it("accepts a reversed numeric range", () => {
    const f = broken((f) => {
      f.config.operations[0].target = "opacity";
      f.config.operations[0].mapping = { range: [1, 0] };
    });
    expect(validate(f)).toEqual([]);
  });

  /** §7.3, §5.1 — the one place `null` is a value rather than an error. */
  it("accepts a null palette tileId — it means clear this cell", () => {
    expect(
      validate(broken((f) => (f.config.operations[0].mapping.palette[0].tileId = null))),
    ).toEqual([]);
  });

  /** §5.1 — `steps` absent is a *meaning*, continuous, not a default value. */
  it("accepts a numeric mapping with no steps", () => {
    const f = broken((f) => {
      f.config.operations[0].target = "rotation";
      f.config.operations[0].mapping = { range: [0, 90] };
    });
    expect(validate(f)).toEqual([]);
  });

  /** `03` §4.1 — zero is legal and means *listed but never chosen*. */
  it("accepts a zero-weight asset beside a non-zero one", () => {
    expect(
      validate(broken((f) => f.config.tiles[0].assets.push({ id: "a2", weight: 0 }))),
    ).toEqual([]);
  });
});

describe("the V1 codes — 06 §10.3", () => {
  it("SCHEMA_VERSION_MISSING", () => {
    expect(codes(broken((f) => delete f.schemaVersion))).toEqual(["SCHEMA_VERSION_MISSING"]);
  });

  it("SCHEMA_VERSION_UNKNOWN", () => {
    expect(codes(broken((f) => (f.schemaVersion = 1)))).toEqual(["SCHEMA_VERSION_UNKNOWN"]);
  });

  /**
   * **C2** — "the loader never guesses a version from the fields present." A
   * hundred shape errors against a schema the file was not written for would be
   * exactly that guess, made loudly.
   */
  it("reports a bad schemaVersion alone, checking nothing else", () => {
    const f = broken((f) => {
      f.schemaVersion = 99;
      f.config = "not an object";
      delete f.layout;
    });
    expect(codes(f)).toEqual(["SCHEMA_VERSION_UNKNOWN"]);
  });

  it("MISSING_KEY", () => {
    expect(codes(broken((f) => delete f.config.rows))).toEqual(["MISSING_KEY"]);
    expect(paths(broken((f) => delete f.config.rows))).toEqual(["/config/rows"]);
  });

  it("UNKNOWN_KEY", () => {
    expect(codes(broken((f) => (f.config.colums = 6)))).toEqual(["UNKNOWN_KEY"]);
  });

  it("TYPE_MISMATCH", () => {
    expect(codes(broken((f) => (f.config.defaultSeed = 7)))).toEqual(["TYPE_MISMATCH"]);
  });

  /** §5.1 — `null` is never a way to write "absent". */
  it("TYPE_MISMATCH on null where null is not legal", () => {
    expect(codes(broken((f) => (f.config.operations[0].mapping.palette[0].weight = null)))).toContain(
      "TYPE_MISMATCH",
    );
  });

  it("NOT_AN_INTEGER", () => {
    expect(codes(broken((f) => (f.config.rows = 4.5)))).toEqual(["NOT_AN_INTEGER"]);
  });

  it("NOT_FINITE", () => {
    expect(codes(broken((f) => (f.layout.cellSize = Number.NaN)))).toEqual(["NOT_FINITE"]);
    expect(codes(broken((f) => (f.layout.cellSize = Number.POSITIVE_INFINITY)))).toEqual([
      "NOT_FINITE",
    ]);
  });

  it("OUT_OF_RANGE", () => {
    expect(codes(broken((f) => (f.config.rows = 0)))).toEqual(["OUT_OF_RANGE"]);
  });

  it("INVALID_IDENTIFIER", () => {
    expect(codes(broken((f) => (f.config.tiles[0].id = "leaf!")))).toContain("INVALID_IDENTIFIER");
  });

  /**
   * §5.3 — the colon is excluded because `04` §4.3 builds the selection channel
   * by concatenation, so an Operation id of `"op7:selection"` would collide with
   * `"op7"`'s selection channel.
   */
  it("INVALID_IDENTIFIER on a colon, which would collide with a channel string", () => {
    expect(codes(broken((f) => (f.config.operations[0].id = "op7:selection")))).toEqual([
      "INVALID_IDENTIFIER",
    ]);
  });

  it("DUPLICATE_ID across Tiles", () => {
    expect(codes(broken((f) => f.config.tiles.push({ ...leaf })))).toEqual(["DUPLICATE_ID"]);
  });

  it("DUPLICATE_ID across Operations — a correctness requirement, 02 §6.3", () => {
    expect(codes(broken((f) => f.config.operations.push({ ...paint })))).toEqual(["DUPLICATE_ID"]);
  });

  /** §6 — unique **within its Tile only**; global uniqueness is not required. */
  it("DUPLICATE_ID within a Tile's assets, and not across Tiles", () => {
    expect(
      codes(broken((f) => f.config.tiles[0].assets.push({ id: "a1", weight: 1 }))),
    ).toEqual(["DUPLICATE_ID"]);
    expect(
      validate(
        broken((f) =>
          f.config.tiles.push({ id: "stone", name: "stone", assets: [{ id: "a1", weight: 1 }] }),
        ),
      ),
    ).toEqual([]);
  });

  it("EMPTY_ASSET_LIST", () => {
    expect(codes(broken((f) => (f.config.tiles[0].assets = [])))).toEqual(["EMPTY_ASSET_LIST"]);
  });

  it("ZERO_WEIGHT_SUM on a Tile", () => {
    expect(codes(broken((f) => (f.config.tiles[0].assets[0].weight = 0)))).toEqual([
      "ZERO_WEIGHT_SUM",
    ]);
  });

  it("ZERO_WEIGHT_SUM on a palette", () => {
    expect(codes(broken((f) => (f.config.operations[0].mapping.palette[0].weight = 0)))).toEqual([
      "ZERO_WEIGHT_SUM",
    ]);
  });

  it("DANGLING_TILE_REF", () => {
    expect(codes(broken((f) => (f.config.operations[0].mapping.palette[0].tileId = "moss")))).toEqual(
      ["DANGLING_TILE_REF"],
    );
  });

  it("UNKNOWN_TYPE_NAME on a Selection and on a Source — 05 X7", () => {
    expect(codes(broken((f) => (f.config.operations[0].selection = { type: "spiral" })))).toEqual([
      "UNKNOWN_TYPE_NAME",
    ]);
    expect(codes(broken((f) => (f.config.operations[0].source = { type: "perlin" })))).toEqual([
      "UNKNOWN_TYPE_NAME",
    ]);
  });

  it("INVALID_TARGET_BLEND — 04 §7.2's vetoed pair", () => {
    const f = broken((f) => {
      f.config.operations[0].target = "rotation";
      f.config.operations[0].mapping = { range: [0, 90] };
      f.config.operations[0].blend = "multiply";
    });
    expect(codes(f)).toEqual(["INVALID_TARGET_BLEND"]);
  });

  /** ADR-005 — `multiply` on a uniform scale is the case the veto is not for. */
  it("accepts multiply on scale, which rotation vetoes", () => {
    const f = broken((f) => {
      f.config.operations[0].target = "scale";
      f.config.operations[0].mapping = { range: [0.9, 1.1] };
      f.config.operations[0].blend = "multiply";
    });
    expect(validate(f)).toEqual([]);
  });

  it("INVALID_TARGET_BLEND on a numeric Blend applied to tileId", () => {
    expect(codes(broken((f) => (f.config.operations[0].blend = "add")))).toEqual([
      "INVALID_TARGET_BLEND",
    ]);
  });
});

describe("strictness — 06 §9.1, C4", () => {
  /**
   * The failure the whole rule exists to prevent: under a permissive schema this
   * loads cleanly, the key is discarded, opacity stays at its default, and the
   * author is looking at a picture that does not match the file they just wrote.
   */
  it("rejects an unknown key at every depth, with a pointer to it", () => {
    const f = broken((f) => {
      f.config.operations[0].target = "opacity";
      f.config.operations[0].mapping = { range: [0, 1], opactiy: 0.5 };
    });
    expect(codes(f)).toEqual(["UNKNOWN_KEY"]);
    expect(paths(f)).toEqual(["/config/operations/0/mapping/opactiy"]);
  });

  it("rejects an unknown parameter on a registered type", () => {
    expect(
      codes(broken((f) => (f.config.operations[0].selection = { type: "all", density: 0.5 }))),
    ).toEqual(["UNKNOWN_KEY"]);
  });

  /**
   * **C4**'s sole exception. `07` gets a namespace it can fill without touching
   * this schema, and `weight` cannot be shadowed because it is not in the same
   * object.
   */
  it("validates meta as an object and inspects nothing inside it", () => {
    expect(
      validate(broken((f) => (f.config.tiles[0].assets[0].meta = { src: "x.png", anything: [1, 2] }))),
    ).toEqual([]);
    expect(codes(broken((f) => (f.config.tiles[0].assets[0].meta = "x.png")))).toEqual([
      "TYPE_MISMATCH",
    ]);
  });

  it("escapes a JSON Pointer token — RFC 6901", () => {
    expect(paths(broken((f) => (f.config["a/b~c"] = 1)))).toEqual(["/config/a~1b~0c"]);
  });
});

describe("parameters — 06 §7.4", () => {
  it("checks a number parameter's bounds", () => {
    const f = broken((f) => (f.config.operations[0].selection = { type: "random", density: 1.5 }));
    expect(codes(f)).toEqual(["OUT_OF_RANGE"]);
    expect(paths(f)).toEqual(["/config/operations/0/selection/density"]);
  });

  it("checks an enum parameter's admissible set", () => {
    expect(
      codes(broken((f) => (f.config.operations[0].selection = { type: "checkerboard", parity: 2 }))),
    ).toEqual(["OUT_OF_RANGE"]);
  });

  it("checks an integer parameter", () => {
    expect(
      codes(
        broken(
          (f) => (f.config.operations[0].selection = { type: "everyNth", axis: "row", n: 2.5 }),
        ),
      ),
    ).toEqual(["NOT_AN_INTEGER"]);
  });

  /** §5.1's last row — absent with a registry default is absent, not wrong. */
  it("accepts a parameter absent where the registry declares a default", () => {
    expect(
      validate(
        broken((f) => (f.config.operations[0].selection = { type: "everyNth", axis: "row", n: 2 })),
      ),
    ).toEqual([]);
  });

  it("requires a parameter with no declared default", () => {
    expect(
      codes(broken((f) => (f.config.operations[0].selection = { type: "checkerboard" }))),
    ).toEqual(["MISSING_KEY"]);
  });

  it("checks a cellList's pairs", () => {
    expect(
      validate(
        broken(
          (f) =>
            (f.config.operations[0].selection = {
              type: "cellList",
              cells: [
                [0, 0],
                [3, 2],
              ],
            }),
        ),
      ),
    ).toEqual([]);
    expect(
      codes(broken((f) => (f.config.operations[0].selection = { type: "cellList", cells: [[0]] }))),
    ).toEqual(["TYPE_MISMATCH"]);
  });
});

describe("the mapping's kind comes from the target — 06 §7.3, C8", () => {
  /**
   * §7.3's own worked case: "a numeric mapping carrying `palette` is not a
   * 'wrong kind' error; it is an unknown key at `/mapping/palette` and a missing
   * key at `/mapping/range`, which between them say precisely what is wrong."
   */
  it("says unknown key and missing key rather than wrong kind", () => {
    const f = broken((f) => (f.config.operations[0].target = "opacity"));
    expect(codes(f).sort()).toEqual(["MISSING_KEY", "UNKNOWN_KEY"]);
    expect(paths(f).sort()).toEqual([
      "/config/operations/0/mapping/palette",
      "/config/operations/0/mapping/range",
    ]);
  });

  it("rejects steps below 2 — the formula divides by steps - 1", () => {
    const f = broken((f) => {
      f.config.operations[0].target = "opacity";
      f.config.operations[0].mapping = { range: [0, 1], steps: 1 };
    });
    expect(codes(f)).toEqual(["OUT_OF_RANGE"]);
  });

  it("rejects an empty palette", () => {
    expect(codes(broken((f) => (f.config.operations[0].mapping.palette = [])))).toEqual([
      "OUT_OF_RANGE",
    ]);
  });

  it("rejects an unknown target", () => {
    expect(codes(broken((f) => (f.config.operations[0].target = "blur")))).toContain("OUT_OF_RANGE");
  });
});

describe("salts — 06 §5.2, C9", () => {
  /**
   * "`salt: 0` and `salt: 0.5` are the same input" to every consumer, so the
   * reroll button visibly changes the file and does not change the picture.
   * Rejecting at load is the only place this is catchable.
   */
  it("rejects a fractional salt rather than truncating it", () => {
    expect(codes(broken((f) => (f.config.operations[0].salt = 0.5)))).toEqual(["NOT_AN_INTEGER"]);
  });

  it("rejects a salt outside [0, 2^32)", () => {
    expect(codes(broken((f) => (f.config.operations[0].salt = -1)))).toEqual(["OUT_OF_RANGE"]);
    expect(codes(broken((f) => (f.config.assetSalt = 2 ** 32)))).toEqual(["OUT_OF_RANGE"]);
    expect(validate(broken((f) => (f.config.assetSalt = 2 ** 32 - 1)))).toEqual([]);
  });
});

describe("layout — 06 §8", () => {
  /**
   * §8 — `02` §7.4's "it is clamped" is the constraint the editor imposes on
   * input, not something the loader does. A loader that silently rewrote this
   * would produce a picture the file does not describe.
   */
  it("rejects yOffset outside [0, 1) rather than clamping it", () => {
    expect(codes(broken((f) => (f.layout.yOffset = 1.4)))).toEqual(["OUT_OF_RANGE"]);
    expect(codes(broken((f) => (f.layout.yOffset = 1)))).toEqual(["OUT_OF_RANGE"]);
    expect(validate(broken((f) => (f.layout.yOffset = 0)))).toEqual([]);
  });

  it("requires all four fields", () => {
    expect(codes(broken((f) => (f.layout = {})))).toEqual([
      "MISSING_KEY",
      "MISSING_KEY",
      "MISSING_KEY",
      "MISSING_KEY",
    ]);
  });

  it("rejects an unknown horizontalAlignment", () => {
    expect(codes(broken((f) => (f.layout.horizontalAlignment = "centre")))).toEqual([
      "OUT_OF_RANGE",
    ]);
  });

  /**
   * §10.4's fourth non-error — the grid narrower than the render box is legal
   * and drawn exactly as described. §8 has no cross-field rule and adding one
   * would reject a file that renders correctly.
   */
  it("does not check columns x cellSize against referenceWidth", () => {
    expect(validate(broken((f) => (f.layout.referenceWidth = 99999)))).toEqual([]);
  });
});

describe("what is not an error — 06 §10.4", () => {
  /** `04` §8.4 — inert on a non-stochastic Source. An advisory, in `09`. */
  it("accepts reseedOnLoad on a constant Source", () => {
    expect(validate(broken((f) => (f.config.operations[0].reseedOnLoad = true)))).toEqual([]);
  });

  /** `04` §4.2 — a rect may deliberately extend past the grid. */
  it("accepts a rect wholly outside the grid", () => {
    expect(
      validate(
        broken(
          (f) =>
            (f.config.operations[0].selection = {
              type: "rect",
              x: 500,
              y: 500,
              width: 2,
              height: 2,
            }),
        ),
      ),
    ).toEqual([]);
  });

  /** **C3** — required, advisory, never validated against anything. */
  it("accepts any engineVersion string", () => {
    expect(validate(broken((f) => (f.engineVersion = "not a version")))).toEqual([]);
    expect(codes(broken((f) => (f.engineVersion = 3)))).toEqual(["TYPE_MISMATCH"]);
  });
});

describe("collecting rather than throwing", () => {
  /** `09` highlights every offending field at once. */
  it("reports every problem, not the first", () => {
    const f = broken((f) => {
      f.config.rows = 0;
      f.config.columns = -1;
      f.layout.yOffset = 2;
    });
    expect(codes(f)).toEqual(["OUT_OF_RANGE", "OUT_OF_RANGE", "OUT_OF_RANGE"]);
  });

  it("survives a value that is not an object at all", () => {
    expect(codes(null)).toEqual(["TYPE_MISMATCH"]);
    expect(codes([])).toEqual(["TYPE_MISMATCH"]);
    expect(codes("{}")).toEqual(["TYPE_MISMATCH"]);
  });
});
