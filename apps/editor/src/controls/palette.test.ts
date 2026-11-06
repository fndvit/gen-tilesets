import { describe, expect, it } from "vitest";
import type { PaletteEntry } from "@vit-foundation/gen-tilesets";
import { add, move, nameOf, percents, remove, setTile, setWeight, sliderMax, thresholds } from "./palette.js";

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

describe("thresholds", () => {
  const labels = (p: PaletteEntry[], w: number) => thresholds(p, w).map((t) => t.label);

  it("labels 0, each band edge and 1; a zero weight adds no edge", () => {
    expect(labels(P, 380)).toEqual(["0", "0.40", "0.80", "1"]);
  });

  it("always keeps the ends and aligns them to the strip's edges", () => {
    const t = thresholds(P, 380);
    expect(t[0]).toMatchObject({ at: 0, align: "start" });
    expect(t.at(-1)).toMatchObject({ at: 1, align: "end" });
  });

  it("drops an inner label that would collide with the one before", () => {
    const p: PaletteEntry[] = [
      { tileId: "a", weight: 40 },
      { tileId: "b", weight: 3 },
      { tileId: "c", weight: 57 },
    ];
    expect(labels(p, 380)).toEqual(["0", "0.40", "1"]);
  });

  it("drops an inner label that would run into 1", () => {
    const p: PaletteEntry[] = [
      { tileId: "a", weight: 97 },
      { tileId: "b", weight: 3 },
    ];
    expect(labels(p, 300)).toEqual(["0", "1"]);
  });

  it("drops an inner label that would run into 0", () => {
    const p: PaletteEntry[] = [
      { tileId: "a", weight: 2 },
      { tileId: "b", weight: 98 },
    ];
    expect(labels(p, 300)).toEqual(["0", "1"]);
  });

  it("has no inner labels for a single entry", () => {
    expect(labels([{ tileId: "a", weight: 1 }], 300)).toEqual(["0", "1"]);
  });
});
