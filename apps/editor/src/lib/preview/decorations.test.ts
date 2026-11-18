/**
 * The preview's Decorations mode: its shapes, its seeds, and the check that
 * stands in for `reshapeDecoration`'s development throw.
 */

import type { Operation, TilesetFile } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { newDocument } from "../../document.js";
import {
  boundOperations,
  CELL_SIZES,
  decorationErrors,
  DEFAULT_CELL,
  FIT,
  fitGallery,
  GALLERY,
  galleryHeight,
  MAX_FIT_CELL,
  MAX_SPAN,
  MIN_FIT_CELL,
  packRows,
  parseSpan,
  spanLabel,
  spotSeed,
} from "./decorations.js";

const op = (id: string, selection: unknown[]): Operation =>
  ({
    id,
    selection,
    source: { type: "constant", value: 1 },
    target: "opacity",
    blend: "replace",
  }) as unknown as Operation;

function fileWith(...ops: Operation[]): TilesetFile {
  const base = newDocument();
  return { ...base, config: { ...base.config, operations: ops } };
}

describe("GALLERY", () => {
  it("holds distinct shapes the Custom view would also accept", () => {
    const labels = GALLERY.map(spanLabel);
    expect(new Set(labels).size).toBe(GALLERY.length);
    for (const s of GALLERY) {
      expect(parseSpan(String(s.rows))).toBe(s.rows);
      expect(parseSpan(String(s.columns))).toBe(s.columns);
    }
  });

  it("defaults to Fit", () => {
    expect(DEFAULT_CELL).toBe(FIT);
  });
});

const metrics = { gap: 28, captionHeight: 16, captionGap: 8 };

function widest(rows: number[][], cell: number): number {
  return Math.max(
    ...rows.map((row) => row.reduce((sum, i) => sum + GALLERY[i]!.columns * cell, 0) + (row.length - 1) * metrics.gap),
  );
}

describe("packRows", () => {
  it("keeps the order and puts every spot in exactly one row", () => {
    const rows = packRows(GALLERY, 44, 400, metrics.gap);
    expect(rows.flat()).toEqual(GALLERY.map((_, i) => i));
  });

  it("puts everything on one row when the width allows", () => {
    expect(packRows(GALLERY, 10, 10_000, metrics.gap)).toHaveLength(1);
  });

  it("gives a spot wider than the width a row of its own", () => {
    expect(packRows([{ rows: 1, columns: 4 }], 100, 50, metrics.gap)).toEqual([[0]]);
  });
});

describe("fitGallery", () => {
  it("fits the area it returns, and fills it: one px more does not fit", () => {
    for (const area of [
      { width: 1000, height: 700 },
      { width: 1000, height: 260 },
      { width: 420, height: 1200 },
    ]) {
      const { cell, rows } = fitGallery(GALLERY, area, metrics);
      expect(widest(rows, cell)).toBeLessThanOrEqual(area.width);
      expect(galleryHeight(GALLERY, rows, cell, metrics)).toBeLessThanOrEqual(area.height);
      if (cell < MAX_FIT_CELL) {
        const bigger = packRows(GALLERY, cell + 1, area.width, metrics.gap);
        const fits =
          widest(bigger, cell + 1) <= area.width && galleryHeight(GALLERY, bigger, cell + 1, metrics) <= area.height;
        expect(fits).toBe(false);
      }
    }
  });

  it("wraps into more rows in a tall, narrow area than in a wide, short one", () => {
    const wide = fitGallery(GALLERY, { width: 1600, height: 300 }, metrics);
    const tall = fitGallery(GALLERY, { width: 400, height: 1600 }, metrics);
    expect(tall.rows.length).toBeGreaterThan(wide.rows.length);
  });

  it("grows past the largest fixed size in a roomy area, but not past MAX_FIT_CELL", () => {
    expect(fitGallery([{ rows: 1, columns: 1 }], { width: 4000, height: 4000 }, metrics).cell).toBe(MAX_FIT_CELL);
  });

  it("stops at MIN_FIT_CELL when nothing fits", () => {
    expect(fitGallery(GALLERY, { width: 0, height: 0 }, metrics).cell).toBe(MIN_FIT_CELL);
  });

  it("is a function of its inputs", () => {
    const area = { width: 900, height: 600 };
    expect(fitGallery(GALLERY, area, metrics)).toEqual(fitGallery(GALLERY, area, metrics));
  });
});

describe("parseSpan", () => {
  it("takes whole numbers from 1 to MAX_SPAN", () => {
    expect(parseSpan("1")).toBe(1);
    expect(parseSpan(" 4 ")).toBe(4);
    expect(parseSpan(String(MAX_SPAN))).toBe(MAX_SPAN);
  });

  it("refuses rather than clamps everything else", () => {
    for (const text of ["", "0", "-1", "2.5", "1e1", "abc", String(MAX_SPAN + 1)]) {
      expect(parseSpan(text)).toBeNull();
    }
  });
});

describe("spotSeed", () => {
  it("differs between spots and between rerolls", () => {
    const seeds = GALLERY.map((_, i) => spotSeed(i, 0));
    expect(new Set(seeds).size).toBe(GALLERY.length);
    expect(spotSeed(0, 1)).not.toBe(spotSeed(0, 0));
  });

  it("is the same on every call, so an edit redraws each spot with its own seed", () => {
    expect(spotSeed(3, 2)).toBe(spotSeed(3, 2));
  });
});

describe("decorationErrors", () => {
  it("is empty for a file of procedural operations, at every gallery shape", () => {
    const file = fileWith(op("op1", [{ type: "all" }]));
    for (const s of GALLERY) expect(decorationErrors(file, s, CELL_SIZES[1])).toEqual([]);
  });

  it("names a coordinate-bound operation, which a decoration cannot place", () => {
    const file = fileWith(op("op1", [{ type: "all" }]), op("op2", [{ type: "rect", x: 0, y: 0, width: 2, height: 2 }]));
    const errors = decorationErrors(file, { rows: 2, columns: 2 }, CELL_SIZES[1]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toContain("rect");
  });
});

describe("boundOperations", () => {
  it("names each coordinate-bound operation by its number and its pinning layers' labels", () => {
    const file = fileWith(
      op("op1", [{ type: "all" }]),
      op("op2", [{ type: "checkerboard" }, { type: "rect", x: 0, y: 0, width: 2, height: 2 }]),
      op("op3", [{ type: "cellList", cells: [] }]),
    );
    expect(boundOperations(file)).toEqual([
      { id: "op2", index: 2, labels: ["Drag"] },
      { id: "op3", index: 3, labels: ["Handpick"] },
    ]);
  });

  it("numbers by the stack the cards show, not the file drawn without hidden operations", () => {
    const all = [op("op1", [{ type: "all" }]), op("op2", [{ type: "rect", x: 0, y: 0, width: 2, height: 2 }])];
    const drawn = fileWith(all[1]!);
    expect(boundOperations(drawn, all)).toEqual([{ id: "op2", index: 2, labels: ["Drag"] }]);
  });

  it("is empty for a procedural file", () => {
    expect(boundOperations(fileWith(op("op1", [{ type: "all" }])))).toEqual([]);
  });
});

describe("spanLabel", () => {
  it("reads columns × rows", () => {
    expect(spanLabel({ rows: 3, columns: 2 })).toBe("2 × 3");
  });
});
