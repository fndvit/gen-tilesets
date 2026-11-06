import { describe, expect, it } from "vitest";
import { applyTileMapping, type Operation, type PaletteEntry, type TilesetConfig } from "@vit-foundation/gen-tilesets";
import { newDocument } from "../document.js";
import {
  add,
  constantEntry,
  coverage,
  entryIndex,
  fieldOf,
  keptText,
  move,
  nameOf,
  percents,
  remove,
  setTile,
  setWeight,
  sliderMax,
} from "./palette.js";

const P: PaletteEntry[] = [
  { tileId: "t2", weight: 1 },
  { tileId: "t3", weight: 1 },
  { tileId: null, weight: 0 },
  { tileId: "t1", weight: 0.5 },
];

describe("palette edits", () => {
  it("moves an entry and leaves the others in order", () => {
    expect(move(P, 3, 1).map((e) => e.tileId)).toEqual(["t2", "t1", "t3", null]);
    expect(move(P, 0, 3).map((e) => e.tileId)).toEqual(["t3", null, "t1", "t2"]);
  });

  it("ignores a move off either end or onto itself", () => {
    expect(move(P, 0, -1)).toBe(P);
    expect(move(P, 3, 4)).toBe(P);
    expect(move(P, 2, 2)).toBe(P);
  });

  it("adds at the end with weight 1, clear included", () => {
    expect(add(P, null).at(-1)).toEqual({ tileId: null, weight: 1 });
    expect(add(P, "t5")).toHaveLength(5);
  });

  it("refuses to remove the last entry — 06 §7.3", () => {
    expect(remove([{ tileId: "t1", weight: 1 }], 0)).toEqual({ ok: false, reason: "last-entry" });
  });

  it("refuses to remove the last non-zero weight", () => {
    const p: PaletteEntry[] = [{ tileId: "t1", weight: 1 }, { tileId: null, weight: 0 }];
    expect(remove(p, 0)).toEqual({ ok: false, reason: "last-weight" });
    expect(remove(p, 1)).toEqual({ ok: true, palette: [{ tileId: "t1", weight: 1 }] });
  });

  it("refuses a weight that leaves every weight zero", () => {
    const p: PaletteEntry[] = [{ tileId: "t1", weight: 1 }, { tileId: null, weight: 0 }];
    expect(setWeight(p, 0, 0)).toEqual({ ok: false, reason: "last-weight" });
  });

  it("allows a zero weight while another entry carries weight", () => {
    const r = setWeight(P, 0, 0);
    expect(r.ok && r.palette[0]!.weight).toBe(0);
  });

  it("ignores a negative or non-finite weight", () => {
    expect(setWeight(P, 0, -1)).toEqual({ ok: true, palette: P });
    expect(setWeight(P, 0, Number.NaN)).toEqual({ ok: true, palette: P });
  });

  it("changes an entry's tile, to clear as well", () => {
    expect(setTile(P, 0, null)[0]).toEqual({ tileId: null, weight: 1 });
  });
});

describe("palette display", () => {
  it("gives each entry its share as a percentage", () => {
    expect(percents(P)).toEqual([40, 40, 0, 20]);
  });

  it("tops the slider at 2, or at a larger imported weight", () => {
    expect(sliderMax(P)).toBe(2);
    expect(sliderMax([{ tileId: "t1", weight: 5 }])).toBe(5);
  });

  it("names clear, a tile, and an unknown id", () => {
    const tiles = [{ id: "t1", name: "Pink", assets: [] }];
    expect(nameOf(tiles, null)).toBe("clear");
    expect(nameOf(tiles, "t1")).toBe("Pink");
    expect(nameOf(tiles, "t9")).toBe("t9");
  });
});

describe("constantEntry", () => {
  it("is the first entry with a weight, which is what t = 0 paints", () => {
    expect(constantEntry(P)).toBe(0);
    expect(
      constantEntry([
        { tileId: "a", weight: 0 },
        { tileId: "b", weight: 2 },
      ]),
    ).toBe(1);
  });
});

describe("keptText", () => {
  const tiles = [
    { id: "t1", name: "Pink", assets: [] },
    { id: "t2", name: "Blue", assets: [] },
  ];

  it("names every entry but the shown one, clear included", () => {
    const palette: PaletteEntry[] = [
      { tileId: "t1", weight: 1 },
      { tileId: "t2", weight: 1 },
      { tileId: null, weight: 1 },
    ];
    expect(keptText(palette, tiles, 0)).toBe(
      "Blue and clear are kept until you save, in case you switch back to a pattern that uses a palette.",
    );
    expect(keptText(palette, tiles, 2)).toMatch(/^Pink and Blue are kept/);
    expect(keptText(palette.slice(0, 2), tiles, 1)).toMatch(/^Pink is kept/);
  });

  it("is null for a one-entry palette, so the line does not show", () => {
    expect(keptText([{ tileId: "t1", weight: 1 }], tiles, 0)).toBeNull();
  });
});

describe("coverage", () => {
  const SEED = "fixed-seed-1";
  const op = (source: Operation["source"], palette: PaletteEntry[], selection: Operation["selection"] = { type: "all" }): Operation => ({
    id: "op1",
    salt: 0,
    reseedOnLoad: false,
    selection,
    source,
    target: "tileId",
    mapping: { palette },
    blend: "set",
  });
  const config = (operation: Operation, rows = 14, columns = 29): TilesetConfig => ({
    ...newDocument().config,
    rows,
    columns,
    operations: [operation],
  });
  const three: PaletteEntry[] = [
    { tileId: "a", weight: 1 },
    { tileId: "b", weight: 1 },
    { tileId: "c", weight: 1 },
  ];
  const NOISE = { type: "valueNoise", cellsPerFeature: 5, octaves: 2 };

  it("walks to the same entry as the engine, cell by cell (parity with applyTileMapping)", () => {
    // Distinct ids per entry, so an index and a tile id say the same thing.
    const palettes: PaletteEntry[][] = [
      three,
      [
        { tileId: "a", weight: 0 },
        { tileId: "b", weight: 0.3 },
        { tileId: "c", weight: 2 },
        { tileId: "d", weight: 0 },
      ],
      [{ tileId: "a", weight: 1 }],
    ];
    const sourcesUnderTest: Operation["source"][] = [
      { type: "random" },
      NOISE,
      { type: "gradient", angle: 45 },
      { type: "constant" },
    ];
    for (const palette of palettes) {
      for (const source of sourcesUnderTest) {
        const field = fieldOf(config(op(source, palette)), "op1", SEED, 0);
        for (const t of [...field, 0, 1]) {
          expect(palette[entryIndex(palette, t)]?.tileId).toBe(applyTileMapping({ palette }, t));
        }
      }
    }
  });

  it("counts by entry, so two entries naming one tile keep their own shares", () => {
    const palette: PaletteEntry[] = [
      { tileId: "a", weight: 1 },
      { tileId: "a", weight: 3 },
    ];
    const shares = coverage(config(op({ type: "gradient", angle: 0 }, palette)), "op1", SEED, 0);
    expect(shares[0]).toBeGreaterThan(0);
    expect(shares[1]).toBeGreaterThan(shares[0]!);
  });

  it("under Random, lands near the weight shares on a large grid", () => {
    const shares = coverage(config(op({ type: "random" }, three), 60, 60), "op1", SEED, 0);
    for (const share of shares) expect(share).toBeCloseTo(1 / 3, 1);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it("under Noise, sums to 1 and gives the middle entry the most (the reason it is measured)", () => {
    const shares = coverage(config(op(NOISE, three)), "op1", SEED, 0);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(shares[1]).toBeGreaterThan(shares[0]!);
    expect(shares[1]).toBeGreaterThan(shares[2]!);
  });

  it("under Constant, gives every cell to the first non-zero entry", () => {
    const palette: PaletteEntry[] = [{ tileId: "a", weight: 0 }, ...three];
    expect(coverage(config(op({ type: "constant" }, palette)), "op1", SEED, 0)).toEqual([0, 1, 0, 0]);
  });

  it("gives a zero weight nothing", () => {
    const palette: PaletteEntry[] = [three[0]!, { tileId: "z", weight: 0 }, three[1]!];
    expect(coverage(config(op(NOISE, palette)), "op1", SEED, 0)[1]).toBe(0);
  });

  it("gives all zeros when nothing is selected", () => {
    const empty = op(NOISE, three, { type: "cellList", cells: [] });
    expect(fieldOf(config(empty), "op1", SEED, 0)).toEqual([]);
    expect(coverage(config(empty), "op1", SEED, 0)).toEqual([0, 0, 0]);
  });

  it("only counts selected cells", () => {
    const checkered = op({ type: "random" }, three, { type: "checkerboard", parity: 0 });
    expect(fieldOf(config(checkered, 4, 4), "op1", SEED, 0)).toHaveLength(8);
  });
});
