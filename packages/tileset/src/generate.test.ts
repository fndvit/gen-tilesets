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
        scale: 1,
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

  /**
   * ADR-005. The point of a fifth attribute rather than two Operations: **G3**
   * keys randomness to `operationId`, so one Operation is the only way one
   * sampled number reaches both axes. Under a stochastic Source, two Operations
   * targeting `scaleX` and `scaleY` hash on different channels and disagree cell
   * by cell — which is what this asserts, in both directions.
   */
  it("scales uniformly from one number, where two Operations cannot — ADR-005", () => {
    const varying = (id: string, target: "scale" | "scaleX" | "scaleY"): Operation => ({
      id,
      selection: { type: "all" },
      source: { type: "random" },
      target,
      mapping: { range: [0.5, 1.5] },
      blend: "set",
    });

    const uniform = generate(baseConfig({ operations: [varying("op1", "scale")] }), "sunset-3");
    for (const cell of uniform.cells) {
      expect(cell.scale).toBeGreaterThanOrEqual(0.5);
      expect(cell.scale).toBeLessThan(1.5);
      // The axes are untouched: `scale` composes with them at render, it does
      // not write them.
      expect(cell.scaleX).toBe(1);
      expect(cell.scaleY).toBe(1);
    }

    const paired = generate(
      baseConfig({ operations: [varying("op1", "scaleX"), varying("op2", "scaleY")] }),
      "sunset-3",
    );
    expect(paired.cells.some((cell) => cell.scaleX !== cell.scaleY)).toBe(true);
  });

  /** Nothing already drawn moves — the claim the `schemaVersion` bump rests on. */
  it("leaves a config that never targets scale at the default — ADR-005", () => {
    const c = baseConfig({ operations: [paintAll("op1", "leaf")] });
    for (const cell of generate(c, "sunset-3").cells) expect(cell.scale).toBe(1);
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

describe("gradient Operations reach both ends of their range", () => {
  // The demo fixture's own shape, which is where the defect was found: a ten-row
  // grid with a vertical `scale` gradient over the whole of it, and a seven-row
  // opacity band inside it.
  const gradientConfig = (ops: Operation[]): TilesetConfig =>
    baseConfig({ rows: 10, columns: 8, operations: [paintAll("paint", "leaf"), ...ops] });

  const column = (g: ReturnType<typeof generate>, attr: "scale" | "opacity", x = 3) =>
    Array.from({ length: g.rows }, (_, y) => tileStateAt(g, x, y)![attr]);

  it("a continuous scale gradient over the grid runs 0 to 1 exactly", () => {
    const g = generate(
      gradientConfig([
        {
          id: "grad",
          selection: { type: "all" },
          source: { type: "gradient", angle: 90 },
          target: "scale",
          mapping: { range: [0, 1] },
          blend: "set",
        },
      ]),
      "sunset-3",
    );
    const scales = column(g, "scale");
    // Exactly, not nearly: R7 makes scale 1 occupy exactly the cell box, so at 1
    // adjacent tiles touch and at 0.95 they miss by five percent of a cell --
    // which is precisely what the old half-cell inset produced.
    expect(scales[0]).toBe(0);
    expect(scales[9]).toBe(1);
    expect(scales).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => k / 9));
  });

  it("a stepped opacity gradient over a rect fills its own range, one band per row", () => {
    const g = generate(
      gradientConfig([
        {
          id: "band",
          selection: { type: "rect", x: 0, y: 0, width: 8, height: 7 },
          source: { type: "gradient", angle: 90 },
          target: "opacity",
          mapping: { range: [0.3, 1], steps: 7 },
          blend: "set",
        },
      ]),
      "sunset-3",
    );
    const inBand = column(g, "opacity").slice(0, 7);
    // Was 0.3, 0.417, 0.417, 0.533, 0.65, 0.65, 0.767 -- five distinct values
    // with two duplicated bands, topping out well short of 1, because the sweep
    // was normalized over ten rows and only seven of them were selected.
    expect(new Set(inBand).size).toBe(7);
    expect(inBand[0]).toBe(0.3);
    expect(inBand[6]).toBe(1);
    // Rows below the rect are untouched, at the attribute default.
    expect(column(g, "opacity").slice(7)).toEqual([1, 1, 1]);
  });

  it("a diagonal gradient reaches both ends too, at the extent's corners", () => {
    const g = generate(
      gradientConfig([
        {
          id: "diag",
          selection: { type: "all" },
          source: { type: "gradient", angle: 45 },
          target: "scale",
          mapping: { range: [0, 1] },
          blend: "set",
        },
      ]),
      "sunset-3",
    );
    // The corner cells are lattice points of the projection's domain box, which
    // is why this holds off-axis and not only at multiples of 90.
    expect(tileStateAt(g, 0, 0)!.scale).toBe(0);
    expect(tileStateAt(g, 7, 9)!.scale).toBe(1);
  });

  it("a palette gradient takes its last entry at the far corner, not null", () => {
    // t = 1 used to fall out of the palette walk and clear the cell.
    const g = generate(
      baseConfig({
        rows: 4,
        columns: 4,
        operations: [
          {
            id: "terrain",
            selection: { type: "all" },
            source: { type: "gradient", angle: 90 },
            target: "tileId",
            mapping: {
              palette: [{ tileId: "leaf", weight: 1 }, { tileId: "stone", weight: 1 }],
            },
            blend: "set",
          },
        ],
      }),
      "sunset-3",
    );
    for (let x = 0; x < 4; x++) {
      expect(tileStateAt(g, x, 3)!.tileId, `column ${x}`).toBe("stone");
      // And an asset really resolved, which a cleared cell would not have.
      expect(tileStateAt(g, x, 3)!.assetId).not.toBeNull();
    }
  });

  it("a gradient over a cellList sweeps the brush's bounding box", () => {
    const cells: [number, number][] = [[1, 1], [1, 2], [2, 2], [3, 2], [3, 3]];
    const g = generate(
      baseConfig({
        rows: 8,
        columns: 8,
        operations: [
          paintAll("paint", "leaf"),
          {
            id: "brush",
            selection: { type: "cellList", cells },
            source: { type: "gradient", angle: 90 },
            target: "scale",
            mapping: { range: [0, 1] },
            blend: "set",
          },
        ],
      }),
      "sunset-3",
    );
    // The box spans rows 1..3, so those are the three stops of the sweep.
    expect(tileStateAt(g, 1, 1)!.scale).toBe(0);
    expect(tileStateAt(g, 2, 2)!.scale).toBe(0.5);
    expect(tileStateAt(g, 3, 3)!.scale).toBe(1);
    // A cell inside the box but outside the brush is never selected.
    expect(tileStateAt(g, 2, 1)!.scale).toBe(1);
  });

  it("a rect past the grid edge keeps its midpoint where the author put it — G2", () => {
    // G2 is about clipped cells and it is untouched. The rect is 20 wide over an
    // 8-column grid, so the visible columns get columns 0..7 of a 20-wide sweep
    // and deliberately do NOT reach the ends.
    const g = generate(
      gradientConfig([
        {
          id: "bleed",
          selection: { type: "rect", x: 0, y: 0, width: 20, height: 10 },
          source: { type: "gradient", angle: 0 },
          target: "scale",
          mapping: { range: [0, 1] },
          blend: "set",
        },
      ]),
      "sunset-3",
    );
    expect(tileStateAt(g, 0, 0)!.scale).toBe(0);
    expect(tileStateAt(g, 7, 0)!.scale).toBeCloseTo(7 / 19, 12);
    expect(tileStateAt(g, 7, 0)!.scale).toBeLessThan(1);
  });
});
