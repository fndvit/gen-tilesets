import { describe, expect, it } from "vitest";
import type { Grid, Layout, TileState } from "../types.js";
import { cellBox, type GridGeometry } from "./geometry.js";
import { coverRect, drawList, snap, snappedGrid, xEdges, yEdges } from "./edges.js";
import { assetKey } from "./provider.js";

/** The reported case: design width 1000, cell size 100, render box 827px. */
const layout: Layout = {
  cellSize: 100,
  referenceWidth: 1000,
  yOffset: 0,
  horizontalAlignment: "gutter",
};
const geo = (Wpx: number): GridGeometry => ({ layout, rows: 12, columns: 11, Wpx });

/** 07 §5.4's layout, which has a fractional yOffset and a bleed. */
const offsetLayout: Layout = {
  cellSize: 175,
  referenceWidth: 1280,
  yOffset: 0.3,
  horizontalAlignment: "gutter",
};
const offsetGeo = (Wpx: number): GridGeometry => ({
  layout: offsetLayout,
  rows: 5,
  columns: 8,
  Wpx,
});

/** Awkward on purpose. 827 is the reported width; 600 and 1000 divide evenly. */
const WIDTHS = [827, 615, 600, 768.4, 1000, 1237.3, 1920.5];
const DPRS = [1, 1.5, 2, 3];

const identity = (tileId: string | null): TileState => ({
  tileId,
  assetId: tileId === null ? null : "a1",
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
});

function gridOf(rows: number, columns: number, cell: (i: number) => TileState): Grid<TileState> {
  return { rows, columns, cells: Array.from({ length: rows * columns }, (_, i) => cell(i)) };
}

describe("snap — one coordinate onto the device pixel grid", () => {
  it("returns a whole device pixel, as an integer", () => {
    // Integral rather than `Math.round(v * dpr) / dpr`: at dpr 3 that quotient is
    // not exactly representable and the shared-edge identity below degrades from
    // *identical* to *very close*, which is the whole guarantee.
    for (const dpr of DPRS) {
      for (const v of [0, 82.7, -30.25, 1237.3, 0.4]) {
        expect(Number.isInteger(snap(v, dpr))).toBe(true);
      }
    }
  });

  it("never moves a coordinate by more than half a device pixel", () => {
    for (const dpr of DPRS) {
      for (const v of [82.7, -30.25, 1237.3, 0.4, 413.5]) {
        expect(Math.abs(snap(v, dpr) / dpr - v)).toBeLessThanOrEqual(0.5 / dpr + 1e-12);
      }
    }
  });
});

describe("the shared edge — R6, the whole point", () => {
  it("gives cell x's right edge and cell x+1's left edge as ONE value", () => {
    // Not "two expressions that agree" -- the same array element. A gap here is
    // unrepresentable rather than unlikely.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const ex = xEdges(geo(Wpx), dpr);
        for (let x = 0; x + 1 < ex.length; x++) {
          const left = ex[x]!;
          const width = ex[x + 1]! - left;
          expect(left + width).toBe(ex[x + 1]!);
        }
      }
    }
  });

  it("leaves no gap and no overlap on either axis, at any width and any DPR", () => {
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const { x: ex, y: ey } = snappedGrid(offsetGeo(Wpx), dpr);
        for (let i = 0; i + 1 < ex.length; i++) {
          expect(ex[i + 1]! - ex[i]!).toBeGreaterThan(0);
        }
        for (let i = 0; i + 1 < ey.length; i++) {
          expect(ey[i + 1]! - ey[i]!).toBeGreaterThan(0);
        }
      }
    }
  });

  it("puts every edge on a whole device pixel, which is what fixes the asset's own edge", () => {
    // An asset whose background rect is exactly its viewBox antialiases its outer
    // edge into transparency at a fractional size. Land the box on the device grid
    // and that edge lands on it too, fully covered.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        for (const e of [...xEdges(geo(Wpx), dpr), ...yEdges(geo(Wpx), dpr)]) {
          expect(Number.isInteger(e)).toBe(true);
        }
      }
    }
  });

  it("has length columns+1 and rows+1, so the last cell has an edge to read", () => {
    const g = geo(827);
    expect(xEdges(g, 2)).toHaveLength(g.columns + 1);
    expect(yEdges(g, 2)).toHaveLength(g.rows + 1);
  });
});

describe("the snapped grid does not drift from cellBox", () => {
  it("stays within half a device pixel of the ideal geometry", () => {
    // The snap is per edge, not accumulated, so error does not build across a row.
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const g = geo(Wpx);
        const { x: ex, y: ey } = snappedGrid(g, dpr);
        for (let x = 0; x < g.columns; x++) {
          expect(Math.abs(ex[x]! / dpr - cellBox(g, x, 0).left)).toBeLessThanOrEqual(
            0.5 / dpr + 1e-12,
          );
        }
        for (let y = 0; y < g.rows; y++) {
          expect(Math.abs(ey[y]! / dpr - cellBox(g, 0, y).top)).toBeLessThanOrEqual(
            0.5 / dpr + 1e-12,
          );
        }
      }
    }
  });

  it("keeps every cell within one device pixel of the same width", () => {
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const ex = xEdges(geo(Wpx), dpr);
        const widths = ex.slice(1).map((e, i) => e - ex[i]!);
        expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("is exactly cellBox when the geometry already lands on device pixels", () => {
    // Wpx 1000 with cellSize 100 / referenceWidth 1000 gives s = 1 and a 100px
    // side: nothing to snap, so the snap must be a no-op.
    const g = geo(1000);
    const ex = xEdges(g, 2);
    for (let x = 0; x <= g.columns; x++) {
      expect(ex[x]! / 2).toBe(cellBox(g, x, 0).left);
    }
  });
});

describe("drawList — 07 R10, R5, G4", () => {
  const grid = gridOf(12, 11, (i) => identity(i % 3 === 0 ? null : `t${i % 4}`));

  it("emits in row-major order, so later rows paint over earlier ones", () => {
    const list = drawList(geo(827), grid, 2, assetKey);
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1]!;
      const b = list[i]!;
      expect(b.y > a.y || (b.y === a.y && b.x > a.x)).toBe(true);
    }
  });

  it("omits empty cells rather than emitting a null key — G4", () => {
    const list = drawList(geo(827), grid, 2, assetKey);
    expect(list).toHaveLength(grid.cells.filter((c) => c.tileId !== null).length);
    expect(list.every((item) => item.key.length > 0)).toBe(true);
  });

  it("gives adjacent cells edges that meet exactly", () => {
    const full = gridOf(6, 6, () => identity("t1"));
    for (const Wpx of WIDTHS) {
      for (const dpr of DPRS) {
        const list = drawList({ layout, rows: 6, columns: 6, Wpx }, full, dpr, assetKey);
        const at = (x: number, y: number) => list.find((i) => i.x === x && i.y === y)!;
        for (let y = 0; y < 6; y++) {
          for (let x = 0; x + 1 < 6; x++) {
            expect(at(x, y).dx + at(x, y).dw).toBe(at(x + 1, y).dx);
          }
        }
        for (let y = 0; y + 1 < 6; y++) {
          for (let x = 0; x < 6; x++) {
            expect(at(x, y).dy + at(x, y).dh).toBe(at(x, y + 1).dy);
          }
        }
      }
    }
  });

  it("carries no matrix for an identity cell, and one for anything else", () => {
    const cells = gridOf(1, 3, (i) => {
      const c = identity("t1");
      if (i === 1) c.rotation = 45;
      if (i === 2) c.scale = 2;
      return c;
    });
    const list = drawList({ layout, rows: 1, columns: 3, Wpx: 827 }, cells, 2, assetKey);
    expect(list[0]!.matrix).toBeNull();
    expect(list[1]!.matrix).not.toBeNull();
    expect(list[2]!.matrix).not.toBeNull();
  });

  it("sees ADR-005's uniform factor cancelling an axis", () => {
    const cells = gridOf(1, 1, () => ({ ...identity("t1"), scale: 2, scaleX: 0.5, scaleY: 0.5 }));
    const list = drawList({ layout, rows: 1, columns: 1, Wpx: 827 }, cells, 2, assetKey);
    expect(list[0]!.matrix).toBeNull();
  });

  it("takes the transform about the SNAPPED cell centre — D11, R7", () => {
    // A transform taken about a centre half a device pixel from the box it is
    // applied to would shear the drawable off its own cell.
    const cells = gridOf(1, 2, () => ({ ...identity("t1"), rotation: 90 }));
    const list = drawList({ layout, rows: 1, columns: 2, Wpx: 827 }, cells, 2, assetKey);
    for (const item of list) {
      expect(item.cx).toBe(item.dx + item.dw / 2);
      expect(item.cy).toBe(item.dy + item.dh / 2);
      // A 90deg rotation about (cx, cy) fixes that point: e = cx - (a*cx + c*cy).
      const m = item.matrix!;
      expect(m[0] * item.cx + m[2] * item.cy + m[4]).toBeCloseTo(item.cx, 9);
      expect(m[1] * item.cx + m[3] * item.cy + m[5]).toBeCloseTo(item.cy, 9);
    }
  });

  it("reads no asset — the list is complete before any image exists — R5", () => {
    // Geometry is committed before resolution is attempted and never revised as a
    // result of it, which is why a missing asset leaves a hole in a laid-out grid.
    const list = drawList(geo(827), grid, 2, assetKey);
    expect(list.every((i) => Number.isFinite(i.dw) && i.dw > 0)).toBe(true);
  });

  it("carries opacity verbatim", () => {
    const cells = gridOf(1, 1, () => ({ ...identity("t1"), opacity: 0.25 }));
    const list = drawList({ layout, rows: 1, columns: 1, Wpx: 827 }, cells, 2, assetKey);
    expect(list[0]!.alpha).toBe(0.25);
  });
});

describe("coverRect — R8's centre-crop, computed rather than declared", () => {
  it("is the whole source when the ratios match", () => {
    expect(coverRect(100, 100, 82.5, 82.5)).toEqual({ sx: 0, sy: 0, sw: 100, sh: 100 });
  });

  it("crops the sides of a source that is too wide, centred", () => {
    const r = coverRect(200, 100, 50, 50);
    expect(r).toEqual({ sx: 50, sy: 0, sw: 100, sh: 100 });
    // Centred: what is cropped from the left equals what is cropped from the right.
    expect(r.sx).toBe(200 - (r.sx + r.sw));
  });

  it("crops the top and bottom of a source that is too tall, centred", () => {
    const r = coverRect(100, 200, 50, 50);
    expect(r).toEqual({ sx: 0, sy: 50, sw: 100, sh: 100 });
    expect(r.sy).toBe(200 - (r.sy + r.sh));
  });

  it("never scales the source up to fill — cover crops, it does not letterbox", () => {
    const r = coverRect(300, 100, 40, 80);
    expect(r.sw / r.sh).toBeCloseTo(40 / 80, 12);
    expect(r.sw).toBeLessThanOrEqual(300);
    expect(r.sh).toBeLessThanOrEqual(100);
  });

  it("survives a degenerate intrinsic size rather than emitting NaN", () => {
    // An SVG with no intrinsic dimensions reports 0. Better a no-op than a rect
    // full of NaN reaching drawImage.
    expect(coverRect(0, 0, 50, 50)).toEqual({ sx: 0, sy: 0, sw: 0, sh: 0 });
  });
});
