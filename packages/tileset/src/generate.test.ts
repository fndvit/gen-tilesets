import { describe, expect, it } from "vitest";
import { generate } from "./generate.js";
import { tileStateAt, type Operation, type TilesetConfig } from "./types.js";

const baseConfig = (over: Partial<TilesetConfig> = {}): TilesetConfig => ({
  rows: 6,
  columns: 8,
  defaultSeed: "sunset-3",
  tiles: [
    { id: "leaf", name: "leaf", assets: [{ id: "a1", weight: 1 }, { id: "a2", weight: 1 }] },
    { id: "stone", name: "stone", assets: [{ id: "s1", weight: 1 }] },
  ],
  operations: [],
  ...over,
});

const paintAll = (id: string, tileId: string | null): Operation => ({
  id,
  selection: { type: "all" },
  source: { type: "constant" },
  target: "tileId",
  mapping: { palette: [{ tileId, weight: 1 }] },
  blend: "set",
});

describe("generate — 02 §4, §9", () => {
  it("returns rows x columns cells — every cell exists, G2", () => {
    const g = generate(baseConfig(), "sunset-3");
    expect(g.rows).toBe(6);
    expect(g.columns).toBe(8);
    expect(g.cells).toHaveLength(48);
  });

  it("generates a grid of nulls from an empty config — 06 §5, 08 §3.4", () => {
    // An empty file is the state a fresh editor document is in. It is legal and
    // renders nothing (G4); rejecting it would mean the editor cannot save a
    // document until it is finished.
    const g = generate(baseConfig({ tiles: [], operations: [] }), "sunset-3");
    for (const cell of g.cells) {
      expect(cell.tileId).toBeNull();
      expect(cell.assetId).toBeNull();
    }
  });

  it("initializes every cell to defaults before any Operation runs — 02 §9 step 1", () => {
    const g = generate(baseConfig(), "sunset-3");
    for (const cell of g.cells) {
      expect(cell).toEqual({
        tileId: null,
        assetId: null,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
      });
    }
  });

  it("is deterministic for a repeated triple — G1", () => {
    const c = baseConfig({ operations: [paintAll("op1", "leaf")] });
    expect(generate(c, "sunset-3", 0)).toEqual(generate(c, "sunset-3", 0));
    expect(generate(c, "sunset-3", 999)).toEqual(generate(c, "sunset-3", 999));
  });

  it("moves everything when the seed moves — 02 §4.1", () => {
    const c = baseConfig({
      operations: [
        paintAll("op1", "leaf"),
        {
          id: "op2",
          selection: { type: "all" },
          source: { type: "random" },
          target: "rotation",
          mapping: { range: [0, 360] },
          blend: "set",
        },
      ],
    });
    const a = generate(c, "sunset-3");
    const b = generate(c, "draft-b");
    let moved = 0;
    for (let i = 0; i < a.cells.length; i++) {
      if (a.cells[i]!.rotation !== b.cells[i]!.rotation) moved++;
    }
    expect(moved).toBe(a.cells.length);
  });

  it("emits only finite attribute values — D6", () => {
    const c = baseConfig({
      operations: [
        paintAll("op1", "leaf"),
        {
          id: "op2",
          selection: { type: "all" },
          source: { type: "constant" },
          target: "scaleX",
          mapping: { range: [0, 0] },
          blend: "set",
        },
        {
          id: "op3",
          selection: { type: "all" },
          source: { type: "constant" },
          target: "scaleX",
          // 1 / 0 is unreachable through a mapping, but a multiply chain can
          // overflow; assert the emitted grid is serializable regardless.
          mapping: { range: [1e308, 1e308] },
          blend: "multiply",
        },
      ],
    });
    for (const cell of generate(c, "sunset-3").cells) {
      expect(Number.isFinite(cell.scaleX)).toBe(true);
      expect(JSON.parse(JSON.stringify(cell))).toEqual(cell);
    }
  });
});

describe("stack composition — 02 §6.3, G3", () => {
  const jitter = (id: string, salt: number): Operation => ({
    id,
    salt,
    selection: { type: "all" },
    source: { type: "random" },
    target: "rotation",
    mapping: { range: [0, 360] },
    blend: "set",
  });

  it("keeps an Operation's own randomness when it moves in the stack — G3", () => {
    // "Reordering the operation stack changes composition only. Each operation
    // retains its own randomness as it moves."
    const c1 = baseConfig({ operations: [jitter("opA", 1)] });
    const c2 = baseConfig({ operations: [paintAll("opZ", "leaf"), jitter("opA", 1)] });
    const a = generate(c1, "sunset-3");
    const b = generate(c2, "sunset-3");
    for (let i = 0; i < a.cells.length; i++) {
      expect(b.cells[i]!.rotation).toBe(a.cells[i]!.rotation);
    }
  });

  it("applies operations in stack order — later wins under set", () => {
    const c = baseConfig({ operations: [paintAll("op1", "leaf"), paintAll("op2", "stone")] });
    for (const cell of generate(c, "sunset-3").cells) expect(cell.tileId).toBe("stone");
  });

  it("clears a cell through a null palette entry, needing no sentinel Tile", () => {
    const c = baseConfig({ operations: [paintAll("op1", "leaf"), paintAll("op2", null)] });
    for (const cell of generate(c, "sunset-3").cells) {
      expect(cell.tileId).toBeNull();
      expect(cell.assetId).toBeNull();
    }
  });

  it("re-rolls one Operation on a salt change and nothing else — 02 §6.4", () => {
    const other = paintAll("opB", "leaf");
    const a = generate(baseConfig({ operations: [jitter("opA", 0), other] }), "sunset-3");
    const b = generate(baseConfig({ operations: [jitter("opA", 1), other] }), "sunset-3");
    let moved = 0;
    for (let i = 0; i < a.cells.length; i++) {
      if (a.cells[i]!.rotation !== b.cells[i]!.rotation) moved++;
      expect(b.cells[i]!.tileId).toBe(a.cells[i]!.tileId);
    }
    expect(moved).toBeGreaterThan(0);
  });
});

describe("Selections restrict where an Operation writes", () => {
  it("leaves unselected cells at their defaults", () => {
    const c = baseConfig({
      operations: [
        {
          id: "op1",
          selection: { type: "rect", x: 1, y: 1, width: 2, height: 2 },
          source: { type: "constant" },
          target: "tileId",
          mapping: { palette: [{ tileId: "leaf", weight: 1 }] },
          blend: "set",
        },
      ],
    });
    const g = generate(c, "sunset-3");
    expect(tileStateAt(g, 1, 1)!.tileId).toBe("leaf");
    expect(tileStateAt(g, 2, 2)!.tileId).toBe("leaf");
    expect(tileStateAt(g, 0, 0)!.tileId).toBeNull();
    expect(tileStateAt(g, 3, 1)!.tileId).toBeNull();
  });

  it("tests every cell including ones the renderer will clip — G2", () => {
    // A checkerboard over the whole grid, with no notion of a visible region.
    const c = baseConfig({
      operations: [
        {
          id: "op1",
          selection: { type: "checkerboard", parity: 0 },
          source: { type: "constant" },
          target: "tileId",
          mapping: { palette: [{ tileId: "leaf", weight: 1 }] },
          blend: "set",
        },
      ],
    });
    const g = generate(c, "sunset-3");
    let painted = 0;
    for (const cell of g.cells) if (cell.tileId !== null) painted++;
    expect(painted).toBe(g.cells.length / 2);
  });
});

describe("asset resolution — 02 §9 step 3, 02 §10", () => {
  it("resolves an assetId for every painted cell", () => {
    const g = generate(baseConfig({ operations: [paintAll("op1", "leaf")] }), "sunset-3");
    for (const cell of g.cells) {
      expect(cell.tileId).toBe("leaf");
      expect(["a1", "a2"]).toContain(cell.assetId);
    }
  });

  it("leaves assetId null where tileId is null — G4, 03 §6.4", () => {
    const g = generate(baseConfig(), "sunset-3");
    for (const cell of g.cells) expect(cell.assetId).toBeNull();
  });

  it("resolves an asset even at opacity 0 — 03 §6.4's distinction", () => {
    // The cell holds a real Tile, an asset IS resolved, and the drawable is
    // merely transparent. Distinct from tileId null, which has nothing to raise.
    const c = baseConfig({
      operations: [
        paintAll("op1", "leaf"),
        {
          id: "op2",
          selection: { type: "all" },
          source: { type: "constant" },
          target: "opacity",
          mapping: { range: [0, 0] },
          blend: "set",
        },
      ],
    });
    for (const cell of generate(c, "sunset-3").cells) {
      expect(cell.opacity).toBe(0);
      expect(cell.assetId).not.toBeNull();
    }
  });

  it("distributes assets by weight", () => {
    const c = baseConfig({
      rows: 40,
      columns: 40,
      tiles: [
        { id: "leaf", name: "leaf", assets: [{ id: "a1", weight: 3 }, { id: "a2", weight: 1 }] },
      ],
      operations: [paintAll("op1", "leaf")],
    });
    const g = generate(c, "sunset-3");
    const a1 = g.cells.filter((c2) => c2.assetId === "a1").length;
    expect(a1 / g.cells.length).toBeCloseTo(0.75, 1);
  });

  it("re-rolls variants on assetSalt without disturbing any Operation — 02 §6.4", () => {
    const ops = [paintAll("op1", "leaf")];
    const a = generate(baseConfig({ operations: ops, assetSalt: 0 }), "sunset-3");
    const b = generate(baseConfig({ operations: ops, assetSalt: 1 }), "sunset-3");
    let moved = 0;
    for (let i = 0; i < a.cells.length; i++) {
      if (a.cells[i]!.assetId !== b.cells[i]!.assetId) moved++;
      expect(b.cells[i]!.tileId).toBe(a.cells[i]!.tileId);
    }
    expect(moved).toBeGreaterThan(0);
  });
});

describe("loadSalt and the effective seed — 02 §6.7, 04 §8", () => {
  const flagged: Operation = {
    id: "op2",
    salt: 0,
    reseedOnLoad: true,
    selection: { type: "all" },
    source: { type: "random" },
    target: "rotation",
    mapping: { range: [0, 360] },
    blend: "set",
  };
  const pinned: Operation = {
    id: "op3",
    salt: 7,
    selection: { type: "all" },
    source: { type: "random" },
    target: "scaleX",
    mapping: { range: [0.5, 1.5] },
    blend: "set",
  };

  it("reproduces 02 §6.7's worked example: loads differ in the flagged Op only", () => {
    // seed "sunset-3". Op 2 flagged, Op 3 unflagged.
    // Load A (loadSalt 82931) and load B (15044) differ in Op 2 and nothing else.
    const c = baseConfig({ operations: [paintAll("op1", "leaf"), flagged, pinned] });
    const a = generate(c, "sunset-3", 82931);
    const b = generate(c, "sunset-3", 15044);

    let rotationMoved = 0;
    for (let i = 0; i < a.cells.length; i++) {
      if (a.cells[i]!.rotation !== b.cells[i]!.rotation) rotationMoved++;
      expect(b.cells[i]!.scaleX).toBe(a.cells[i]!.scaleX); // Op 3 held still
      expect(b.cells[i]!.tileId).toBe(a.cells[i]!.tileId);
    }
    expect(rotationMoved).toBe(a.cells.length);
  });

  it("is byte-identical on every load when no flag is set — 04 §8.3", () => {
    const c = baseConfig({ operations: [paintAll("op1", "leaf"), pinned] });
    expect(generate(c, "sunset-3", 0)).toEqual(generate(c, "sunset-3", 999999));
  });

  it("treats loadSalt 0 as an ordinary value, not an identity — 02 §6.7", () => {
    const c = baseConfig({ operations: [flagged] });
    expect(generate(c, "sunset-3", 0)).not.toEqual(generate(c, "sunset-3", 1));
  });

  it("moves flagged channels together but keeps their values uncorrelated", () => {
    const second: Operation = { ...flagged, id: "op5", target: "opacity", mapping: { range: [0, 1] } };
    const c = baseConfig({ operations: [paintAll("op1", "leaf"), flagged, second] });
    const g = generate(c, "sunset-3", 82931);
    // Namespaced by operationId (O3): moving together is not the same as agreeing.
    let identical = 0;
    for (const cell of g.cells) if (cell.rotation / 360 === cell.opacity) identical++;
    expect(identical).toBe(0);
  });

  it("re-rolls the asset channel only when reseedAssetsOnLoad is set", () => {
    // The regression Conflict 1 would have hidden: 03 §4.3's pseudocode writes
    // `hash(seed, ...)`, which ignores this flag entirely. 02 §6.3 is implemented.
    const ops = [paintAll("op1", "leaf")];
    const off = baseConfig({ operations: ops });
    expect(generate(off, "sunset-3", 1)).toEqual(generate(off, "sunset-3", 2));

    const on = baseConfig({ operations: ops, reseedAssetsOnLoad: true });
    const a = generate(on, "sunset-3", 1);
    const b = generate(on, "sunset-3", 2);
    let moved = 0;
    for (let i = 0; i < a.cells.length; i++) {
      if (a.cells[i]!.assetId !== b.cells[i]!.assetId) moved++;
    }
    expect(moved).toBeGreaterThan(0);
  });
});

describe("a config that draws — the end-to-end shape", () => {
  it("bands a noise field through a palette — 04 §6.3's lakes and shorelines", () => {
    const c = baseConfig({
      rows: 30,
      columns: 30,
      tiles: [
        { id: "water", name: "water", assets: [{ id: "w", weight: 1 }] },
        { id: "sand", name: "sand", assets: [{ id: "s", weight: 1 }] },
        { id: "grass", name: "grass", assets: [{ id: "g", weight: 1 }] },
      ],
      operations: [
        {
          id: "terrain",
          selection: { type: "all" },
          source: { type: "valueNoise", cellsPerFeature: 8, octaves: 2 },
          target: "tileId",
          mapping: {
            palette: [
              { tileId: "water", weight: 1 },
              { tileId: "sand", weight: 1 },
              { tileId: "grass", weight: 3 },
            ],
          },
          blend: "set",
        },
      ],
    });
    const g = generate(c, "sunset-3");
    const seen = new Set(g.cells.map((cell) => cell.tileId));
    expect(seen.size).toBeGreaterThan(1);
    for (const cell of g.cells) {
      expect(cell.tileId).not.toBeNull();
      expect(cell.assetId).not.toBeNull();
    }
  });

  it("is O(rows x columns x operations) and completes a realistic grid quickly", () => {
    const c = baseConfig({
      rows: 40,
      columns: 40,
      operations: [
        paintAll("op1", "leaf"),
        {
          id: "op2",
          selection: { type: "random", density: 0.3 },
          source: { type: "random" },
          target: "rotation",
          mapping: { range: [-5, 5] },
          blend: "add",
        },
      ],
    });
    const start = performance.now();
    generate(c, "sunset-3");
    expect(performance.now() - start).toBeLessThan(500);
  });
});
