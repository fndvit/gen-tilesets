import type { Operation, Tile, TilesetFile } from "@tileset/core";
import { describe, expect, it } from "vitest";
import { exportPath, extensionOf, tileNameOf } from "./assets.js";
import {
  addAssets,
  addOperation,
  addTiles,
  deleteAsset,
  deleteTile,
  newDocument,
  removeOperation,
  renameTile,
  replaceOperation,
  setAssetWeight,
  tileReferences,
  type Transition,
} from "./document.js";
import { IDENTIFIER, nextAssetId, nextIds, nextOperationId, nextTileId } from "./ids.js";

const tile = (id: string, name: string, weights: number[]): Tile => ({
  id,
  name,
  assets: weights.map((weight, i) => ({ id: `a${i + 1}`, weight, meta: {} })),
});

const withTiles = (...tiles: Tile[]): TilesetFile => {
  const file = newDocument();
  return { ...file, config: { ...file.config, tiles } };
};

const run = (file: TilesetFile, ...ts: Transition[]) => ts.reduce((f, t) => t(f), file);

/** An Operation whose palette names `tileId` — the only thing that can (C8). */
const paletteOp = (id: string, tileIds: (string | null)[]): Operation => ({
  id,
  selection: { type: "all" },
  source: { type: "constant" },
  target: "tileId",
  mapping: { palette: tileIds.map((t) => ({ tileId: t, weight: 1 })) },
  blend: "set",
});

describe("generated ids — 09 §4.3, 06 C10", () => {
  it("matches the identifier charset and excludes the colon", () => {
    for (const id of [nextTileId([]), nextAssetId([]), nextOperationId([])]) {
      expect(id).toMatch(IDENTIFIER);
      expect(id).not.toContain(":");
    }
  });

  it("does not collide with what is already taken", () => {
    expect(nextTileId(["t1", "t2"])).toBe("t3");
    expect(nextAssetId(["a1", "a4"])).toBe("a5");
    expect(nextOperationId(["op7"])).toBe("op8");
  });

  it("ignores ids that do not fit the pattern — an imported file may carry any", () => {
    expect(nextTileId(["grass", "water-2", "t3"])).toBe("t4");
    expect(nextTileId(["grass", "water"])).toBe("t1");
  });

  it("allocates a batch without handing out the same id twice", () => {
    const ids = nextIds(4, ["t1"], nextTileId);
    expect(ids).toEqual(["t2", "t3", "t4", "t5"]);
    expect(new Set(ids).size).toBe(4);
  });

  it("never reuses an id after a deletion — §4.3, ids are never reassigned", () => {
    // Deleting t2 leaves t1 and t3; the next id must not be t2, because an id
    // "is assigned at creation and never reassigned".
    expect(nextTileId(["t1", "t3"])).toBe("t4");
  });
});

describe("attach paths — 09 §10.3, §11.1", () => {
  it("mirrors the AssetRef key, so two Tiles holding `a1` cannot collide", () => {
    // "Not a flat folder. Two Tiles both holding `a1` would export two files
    // called `a1`, and one would overwrite the other silently."
    expect(exportPath("t1", "a1", "svg")).toBe("tiles/t1/a1.svg");
    expect(exportPath("t2", "a1", "svg")).toBe("tiles/t2/a1.svg");
  });

  it("takes the extension from the dropped file", () => {
    expect(extensionOf("grass-a.svg")).toBe("svg");
    expect(extensionOf("Grass.PNG")).toBe("png");
    expect(extensionOf("archive.tar.gz")).toBe("gz");
    expect(extensionOf("noext")).toBe("bin");
    expect(extensionOf(".hidden")).toBe("bin");
  });

  it("names a new Tile from the file, which affects no output — D1", () => {
    expect(tileNameOf("grass-a.svg")).toBe("grass-a");
    expect(tileNameOf("noext")).toBe("noext");
  });
});

describe("the library — 09 §10", () => {
  it("appends Tiles and assets", () => {
    const file = run(newDocument(), addTiles([tile("t1", "grass", [1])]));
    expect(file.config.tiles).toHaveLength(1);

    const more = run(file, addAssets("t1", [{ id: "a2", weight: 2, meta: {} }]));
    expect(more.config.tiles[0]!.assets).toHaveLength(2);
  });

  it("never blocks a rename, including to a duplicate or the empty string — §10.1", () => {
    // `Tile.name` is "not unique, not charset-limited, possibly empty" (06 C10),
    // because D1 guarantees a name collision cannot reach output.
    const file = withTiles(tile("t1", "grass", [1]), tile("t2", "sand", [1]));
    expect(run(file, renameTile("t2", "grass")).config.tiles[1]!.name).toBe("grass");
    expect(run(file, renameTile("t1", "")).config.tiles[0]!.name).toBe("");
    expect(run(file, renameTile("t1", "a:b/c")).config.tiles[0]!.name).toBe("a:b/c");
  });
});

describe("refusals — E5, and never a dangling reference", () => {
  const referenced = (): TilesetFile => {
    const file = withTiles(tile("t1", "water", [1]), tile("t2", "sand", [1]));
    return {
      ...file,
      config: { ...file.config, operations: [paletteOp("op1", ["t1", null, "t1"])] },
    };
  };

  it("finds every palette entry naming a Tile", () => {
    expect(tileReferences(referenced(), "t1")).toEqual([
      { operationId: "op1", entry: 0 },
      { operationId: "op1", entry: 2 },
    ]);
    expect(tileReferences(referenced(), "t2")).toEqual([]);
  });

  it("ignores a numeric Target's mapping — C8 discriminates by `target`", () => {
    const file = withTiles(tile("t1", "water", [1]));
    const numeric: Operation = {
      id: "op1",
      selection: { type: "all" },
      source: { type: "random" },
      target: "rotation",
      mapping: { range: [0, 90] },
      blend: "set",
    };
    const withNumeric = { ...file, config: { ...file.config, operations: [numeric] } };
    expect(tileReferences(withNumeric, "t1")).toEqual([]);
  });

  it("refuses to delete a referenced Tile — §4.2, DECISIONS.md D15", () => {
    // What §4.2 forbids either way is the deletion landing "as a dangling
    // `tileId` and waiting for validation to notice".
    const file = referenced();
    expect(deleteTile("t1")(file)).toBe(file);
    expect(run(file, deleteTile("t2")).config.tiles).toHaveLength(1);
  });

  it("refuses to delete a Tile's last asset — 03 §4.1", () => {
    const file = withTiles(tile("t1", "grass", [1]));
    expect(deleteAsset("t1", "a1")(file)).toBe(file);

    const two = withTiles(tile("t1", "grass", [1, 1]));
    expect(run(two, deleteAsset("t1", "a1")).config.tiles[0]!.assets).toHaveLength(1);
  });

  it("refuses to zero the last non-zero weight — §10.2, 06 §6", () => {
    // An all-zero Tile has no selectable asset: 04 §6.3's walk is strict, so
    // nothing can ever win it. ZERO_WEIGHT_SUM is an import-time code, and E5
    // makes this an editing rule instead.
    const file = withTiles(tile("t1", "grass", [1, 0]));
    expect(setAssetWeight("t1", "a1", "0")(file)).toBe(file);
  });

  it("allows zeroing a weight while another remains non-zero — 03 §4.1", () => {
    // Zero is legal and means "listed but never chosen" -- how an author turns a
    // variant off without deleting it.
    const file = withTiles(tile("t1", "grass", [1, 1]));
    const after = run(file, setAssetWeight("t1", "a2", "0"));
    expect(after.config.tiles[0]!.assets.map((a) => a.weight)).toEqual([1, 0]);
  });

  it("refuses a weight 06 §6 rejects, and never coerces one", () => {
    const file = withTiles(tile("t1", "grass", [1, 1]));
    for (const bad of ["-1", "", "abc", "Infinity"]) {
      expect(setAssetWeight("t1", "a1", bad)(file)).toBe(file);
    }
  });

  it("leaves every refusal as an exact identity, so undo has nothing to undo", () => {
    const file = referenced();
    for (const t of [
      deleteTile("t1"),
      deleteAsset("t1", "a1"),
      setAssetWeight("t1", "a1", "0"),
      setAssetWeight("nope", "a1", "5"),
      addTiles([]),
      addAssets("t1", []),
    ]) {
      expect(t(file)).toBe(file);
    }
  });
});

describe("the operation stack — 09 §4.1, 02 §9, 06 §7", () => {
  const op = (id: string): Operation => paletteOp(id, ["t1"]);

  it("appends, so a new Operation runs last", () => {
    const file = run(newDocument(), addOperation(op("op1")), addOperation(op("op2")));
    expect(file.config.operations.map((o) => o.id)).toEqual(["op1", "op2"]);
  });

  it("preserves stack order, which is never canonicalized — 06 §7", () => {
    // The opposite rule to a Tile's asset list (D3), and the same as a palette
    // (O6): reordering changes output for a reason the author can see.
    const file = run(newDocument(), addOperation(op("opB")), addOperation(op("opA")));
    expect(file.config.operations.map((o) => o.id)).toEqual(["opB", "opA"]);
  });

  it("removes by id and closes the gap", () => {
    const file = run(
      newDocument(),
      addOperation(op("op1")),
      addOperation(op("op2")),
      addOperation(op("op3")),
      removeOperation("op2"),
    );
    expect(file.config.operations.map((o) => o.id)).toEqual(["op1", "op3"]);
  });

  it("returns the file unchanged when nothing matches", () => {
    const file = run(newDocument(), addOperation(op("op1")));
    expect(removeOperation("nope")(file)).toBe(file);
  });

  it("replaces in place, keeping the index and the id — §4.3", () => {
    // An id is never reassigned, so editing an Operation's parameters keeps its
    // hash channels and the picture moves only as much as the edit implies.
    const file = run(newDocument(), addOperation(op("op1")), addOperation(op("op2")));
    const edited: Operation = { ...op("op1"), blend: "set", salt: 4 };
    const after = run(file, replaceOperation(edited));
    expect(after.config.operations.map((o) => o.id)).toEqual(["op1", "op2"]);
    expect(after.config.operations[0]!.salt).toBe(4);
  });

  it("has no `disabled` field to set — §4.1", () => {
    // "There is no disabled flag, because there is no field for one and adding
    // one is a bump." Muting is removal held in session state.
    const file = run(newDocument(), addOperation(op("op1")));
    expect(Object.keys(file.config.operations[0]!)).not.toContain("disabled");
  });
});
