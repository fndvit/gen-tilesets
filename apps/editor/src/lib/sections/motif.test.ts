import { reshapeErrors, validate } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { MOTIF_CELL, MOTIF_COLOUR, MOTIF_MIN_ROWS, motifShape, motifStyle, squareSrc } from "./motif.js";

describe("motifStyle", () => {
  it("is a valid file", () => {
    expect(validate(motifStyle())).toEqual([]);
  });

  it("can be placed at any size, as a decoration must", () => {
    const style = motifStyle();
    for (const [rows, columns] of [[2, 1], [3, 17], [40, 23]] as const) {
      expect(reshapeErrors(style, { rows, columns })).toEqual([]);
    }
  });

  it("is one flat square in the motif colour, on a checkerboard", () => {
    const { config } = motifStyle();
    expect(config.tiles).toHaveLength(1);
    expect(config.tiles[0]!.assets[0]!.meta!.src).toBe(squareSrc(MOTIF_COLOUR));
    expect(decodeURIComponent(squareSrc("#123456"))).toContain('fill="#123456"');
    expect(config.operations.map((op) => op.selection.type)).toEqual(["checkerboard"]);
  });
});

describe("motifShape", () => {
  it("fits whole tiles only", () => {
    expect(motifShape(10 * MOTIF_CELL + 5, 3 * MOTIF_CELL + 23)).toEqual({ rows: 3, columns: 10 });
  });

  it("draws nothing under the minimum rows, or with no width", () => {
    expect(motifShape(400, MOTIF_MIN_ROWS * MOTIF_CELL - 1)).toBeNull();
    expect(motifShape(400, 0)).toBeNull();
    expect(motifShape(MOTIF_CELL - 1, 400)).toBeNull();
    expect(motifShape(400, MOTIF_MIN_ROWS * MOTIF_CELL)).toEqual({ rows: MOTIF_MIN_ROWS, columns: Math.floor(400 / MOTIF_CELL) });
  });
});
