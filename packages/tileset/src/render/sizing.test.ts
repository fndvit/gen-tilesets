/**
 * Sizing and alignment — `sizing`, `alignX`, `alignY` on `GridGeometry`.
 *
 * Properties, not fixed values (`ARCHITECTURE.md` *Testing*). The first block is
 * the one that matters most: **an unchanged host draws exactly what 0.5.0 drew**,
 * checked against the 0.5.0 expressions restated here, bit for bit, over random
 * layouts and widths.
 */

import { describe, expect, it } from "vitest";
import type { Grid, Layout, TileState } from "../types.js";
import {
  cellAt,
  cellBox,
  cellPlacementAffine,
  cellPlacementPercent,
  cssLength,
  latticeRange,
  naturalHeight,
  originX,
  originY,
  scaleFactor,
  visibleColumns,
  type AlignX,
  type AlignY,
  type GridGeometry,
} from "./geometry.js";
import { drawnHalfExtents, maxSpill, translationDev } from "./transform.js";
import {
  canvasPresentation,
  domGeometry,
  domLattice,
  uniformDrawList,
  uniformGeometry,
} from "./uniform.js";

/** A small deterministic PRNG, so a failure names a reproducible case. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

function randomGeometry(r: () => number): GridGeometry {
  const cellSize = 8 + Math.floor(r() * 180);
  const columns = 1 + Math.floor(r() * 80);
  const rows = 1 + Math.floor(r() * 12);
  // Bleed of up to one cell, which is what the editor's derivation produces.
  const referenceWidth = columns * cellSize - Math.floor(r() * cellSize);
  const layout: Layout = {
    cellSize,
    referenceWidth,
    yOffset: Math.floor(r() * 10) / 10,
    horizontalAlignment: "column",
  };
  return { layout, rows, columns, Wpx: 200 + r() * 2000 };
}

const DPRS = [1, 1.25, 1.5, 2, 3];

describe("fluid with no alignment is 0.5.0, bit for bit", () => {
  // The 0.5.0 expressions, restated. They are the contract being kept.
  const s0 = (g: GridGeometry) => g.Wpx / g.layout.referenceWidth;
  // `s * (columns * cellSize)`, associated exactly as 0.5.0 wrote it — `s * columns
  // * cellSize` differs in the last bit, which is precisely what this block checks.
  const ox0 = (g: GridGeometry) => (g.Wpx - s0(g) * (g.columns * g.layout.cellSize)) / 2;
  const oy0 = (g: GridGeometry) => -s0(g) * g.layout.yOffset * g.layout.cellSize;

  it("keeps scaleFactor, originX, originY and cellBox identical", () => {
    const r = rng(1);
    for (let n = 0; n < 500; n++) {
      const g = randomGeometry(r);
      // Every alignment is inert under fluid, horizontally.
      for (const alignX of [undefined, "left", "center", "right"] as const) {
        const ga = { ...g, alignX, sizing: "fluid" as const };
        expect(scaleFactor(ga)).toBe(s0(g));
        expect(originX(ga)).toBe(ox0(g));
        expect(originY(ga)).toBe(oy0(g));
      }
    }
  });

  it("keeps the DOM origin identical, whatever alignX says", () => {
    const r = rng(2);
    for (let n = 0; n < 300; n++) {
      const g = randomGeometry(r);
      for (const dpr of DPRS) {
        const cellDev = Math.max(1, Math.ceil(s0(g) * g.layout.cellSize * dpr));
        const before = Math.round((g.Wpx * dpr - g.columns * cellDev) / 2);
        for (const alignX of [undefined, "left", "right"] as const) {
          expect(domGeometry({ ...g, alignX }, dpr).originXDev).toBe(before);
        }
      }
    }
  });

  it("writes the same placement strings 0.5.0 wrote", () => {
    const r = rng(3);
    for (let n = 0; n < 200; n++) {
      const g = randomGeometry(r);
      const x = Math.floor(r() * g.columns);
      const y = Math.floor(r() * g.rows);
      const p = cellPlacementPercent(g.layout, g.columns, x, y);
      const a = cellPlacementAffine(g, x, y);
      expect(cssLength(a.side)).toBe(`${p.sidePercent}%`);
      expect(cssLength(a.left)).toBe(`${p.leftPercent}%`);
      expect(cssLength(a.marginTop)).toBe(`${p.topPercent}%`);
      expect(a.topPct).toBe(0);
    }
  });

  it("presents the canvas exactly as 0.5.0 did when every column is visible", () => {
    const r = rng(4);
    for (let n = 0; n < 200; n++) {
      const g = randomGeometry(r);
      const u = uniformGeometry(g, 2);
      const p = canvasPresentation(g, u, 2, { x0: 0, x1: g.columns });
      expect(p.rasterWidthDev).toBe(Math.max(1, u.gridWidthDev));
      expect(p.widthCss).toBe(u.presentedWidthCss);
      expect(p.leftCss).toBe(u.originXCss);
      expect(p.topCss).toBe(0);
    }
  });
});

describe('sizing: "fixed" — cells keep their size', () => {
  it("has s = 1 and a cell side of cellSize at every width", () => {
    const r = rng(5);
    for (let n = 0; n < 200; n++) {
      const g = { ...randomGeometry(r), sizing: "fixed" as const };
      expect(scaleFactor(g)).toBe(1);
      const b = cellBox(g, 0, 0);
      expect(b.right - b.left).toBeCloseTo(g.layout.cellSize, 9);
      expect(naturalHeight(g)).toBeCloseTo((g.rows - g.layout.yOffset) * g.layout.cellSize, 9);
    }
  });

  it("is an exact integer cell at integer DPR, where ceil and round agree", () => {
    const r = rng(6);
    for (let n = 0; n < 100; n++) {
      const g = { ...randomGeometry(r), sizing: "fixed" as const };
      for (const dpr of [1, 2, 3]) {
        const u = uniformGeometry(g, dpr);
        expect(u.cellDev).toBe(g.layout.cellSize * dpr);
        expect(u.presentScale).toBe(1);
        expect(domGeometry(g, dpr).cellDev).toBe(u.cellDev);
      }
    }
  });

  const fixedAt = (g: GridGeometry, Wpx: number, alignX: AlignX): GridGeometry => ({
    ...g,
    Wpx,
    sizing: "fixed",
    alignX,
  });

  it('"left" pins the design box\'s left edge: cell x never moves as the box narrows', () => {
    const r = rng(7);
    for (let n = 0; n < 100; n++) {
      const g = randomGeometry(r);
      const x = Math.floor(r() * g.columns);
      const a = cellBox(fixedAt(g, 1400, "left"), x, 0).left;
      const b = cellBox(fixedAt(g, 360, "left"), x, 0).left;
      expect(b).toBeCloseTo(a, 9);
      // …and the left edge is the designed bleed, exactly as at the reference width.
      expect(originX(fixedAt(g, 360, "left"))).toBeCloseTo(
        (g.layout.referenceWidth - g.columns * g.layout.cellSize) / 2,
        9,
      );
    }
  });

  it('"right" pins the right edge: the distance to the box\'s right edge never moves', () => {
    const r = rng(8);
    for (let n = 0; n < 100; n++) {
      const g = randomGeometry(r);
      const x = Math.floor(r() * g.columns);
      const d = (W: number) => W - cellBox(fixedAt(g, W, "right"), x, 0).right;
      expect(d(360)).toBeCloseTo(d(1400), 9);
    }
  });

  it('"center" crops both sides equally', () => {
    const r = rng(9);
    for (let n = 0; n < 100; n++) {
      const g = randomGeometry(r);
      const W = 200 + r() * 2000;
      const gg = fixedAt(g, W, "center");
      const left = cellBox(gg, 0, 0).left;
      const right = cellBox(gg, g.columns - 1, 0).right;
      expect(left + right).toBeCloseTo(W, 9);
    }
  });

  it("at the reference width, all three pins are the fluid picture at s = 1", () => {
    const r = rng(10);
    for (let n = 0; n < 100; n++) {
      const g = randomGeometry(r);
      const W = g.layout.referenceWidth;
      const fluid = originX({ ...g, Wpx: W });
      for (const a of ["left", "center", "right"] as const) {
        expect(originX(fixedAt(g, W, a))).toBeCloseTo(fluid, 9);
      }
    }
  });

  it("pins the DOM grid the same way, to within a device pixel", () => {
    const r = rng(11);
    for (let n = 0; n < 100; n++) {
      const g = randomGeometry(r);
      for (const a of ["left", "center", "right"] as const) {
        for (const dpr of [1, 2]) {
          const gg = fixedAt(g, 200 + r() * 1500, a);
          const d = domGeometry(gg, dpr);
          expect(Math.abs(d.originXDev / dpr - originX(gg))).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe("alignY — which rows a host-imposed height crops", () => {
  const vertical = (g: GridGeometry, Hpx: number, alignY: AlignY): GridGeometry => ({
    ...g,
    Hpx,
    alignY,
  });

  it("does nothing when the box is its natural height, or without Hpx", () => {
    const r = rng(12);
    for (let n = 0; n < 100; n++) {
      const g = randomGeometry(r);
      const top = originY(g);
      for (const a of ["top", "center", "bottom"] as const) {
        expect(originY({ ...g, alignY: a })).toBe(top);
        expect(originY(vertical(g, naturalHeight(g), a))).toBeCloseTo(top, 9);
      }
    }
  });

  it('"bottom" puts the last row flush with the box, "center" splits the crop', () => {
    const r = rng(13);
    for (let n = 0; n < 100; n++) {
      const g = randomGeometry(r);
      const H = naturalHeight(g) * (0.3 + r());
      const bottom = cellBox(vertical(g, H, "bottom"), 0, g.rows - 1).bottom;
      expect(bottom).toBeCloseTo(H, 9);
      const c = vertical(g, H, "center");
      const topCut = -cellBox(c, 0, 0).top - g.layout.yOffset * scaleFactor(c) * g.layout.cellSize;
      const bottomCut = cellBox(c, 0, g.rows - 1).bottom - H;
      expect(topCut).toBeCloseTo(bottomCut, 9);
    }
  });

  it("keeps cellAt the inverse of cellBox under every mode", () => {
    const r = rng(14);
    for (let n = 0; n < 200; n++) {
      const g: GridGeometry = {
        ...randomGeometry(r),
        sizing: r() < 0.5 ? "fixed" : "fluid",
        alignX: (["left", "center", "right"] as const)[Math.floor(r() * 3)],
        alignY: (["top", "center", "bottom"] as const)[Math.floor(r() * 3)],
        Hpx: 100 + r() * 800,
      };
      const x = Math.floor(r() * g.columns);
      const y = Math.floor(r() * g.rows);
      const b = cellBox(g, x, y);
      expect(cellAt(g, (b.left + b.right) / 2, (b.top + b.bottom) / 2)).toEqual({ x, y });
    }
  });

  it("the DOM box height ignores alignment, so the shift cannot feed back into it", () => {
    const r = rng(15);
    for (let n = 0; n < 100; n++) {
      const g = randomGeometry(r);
      const top = domGeometry(g, 2);
      for (const a of ["center", "bottom"] as const) {
        const d = domGeometry(vertical(g, top.gridHeightDev / 2, a), 2);
        expect(d.gridHeightDev).toBe(top.gridHeightDev);
        // At exactly its own height the shift is exactly zero.
        expect(domGeometry(vertical(g, top.gridHeightDev / 2, a), 2).originYDev).toBe(
          top.originYDev,
        );
      }
    }
  });
});

describe("cellPlacementAffine — CSS before measurement, in every mode", () => {
  /** Evaluate the CSS the way a browser resolves it: width-relative, then `top` height-relative. */
  function evaluate(g: GridGeometry, x: number, y: number, Hpx: number) {
    const a = cellPlacementAffine(g, x, y);
    const at = (v: { pct: number; px: number }) => (v.pct / 100) * g.Wpx + v.px;
    return {
      left: at(a.left),
      top: (a.topPct / 100) * Hpx + at(a.marginTop),
      side: at(a.side),
    };
  }

  it("resolves to cellBox at the measured width and height", () => {
    const r = rng(16);
    for (let n = 0; n < 300; n++) {
      const Hpx = 100 + r() * 900;
      const g: GridGeometry = {
        ...randomGeometry(r),
        sizing: r() < 0.5 ? "fixed" : "fluid",
        alignX: (["left", "center", "right"] as const)[Math.floor(r() * 3)],
        alignY: (["top", "center", "bottom"] as const)[Math.floor(r() * 3)],
        Hpx,
      };
      const x = Math.floor(r() * g.columns);
      const y = Math.floor(r() * g.rows);
      const b = cellBox(g, x, y);
      const e = evaluate(g, x, y, Hpx);
      expect(e.left).toBeCloseTo(b.left, 6);
      expect(e.top).toBeCloseTo(b.top, 6);
      expect(e.side).toBeCloseTo(b.right - b.left, 6);
    }
  });

  it("places a translated cell as if it sat t cells over — 0.8.0", () => {
    const r = rng(23);
    for (let n = 0; n < 200; n++) {
      const g: GridGeometry = {
        ...randomGeometry(r),
        sizing: r() < 0.5 ? "fixed" : "fluid",
        alignX: (["left", "center", "right"] as const)[Math.floor(r() * 3)],
        alignY: (["top", "center", "bottom"] as const)[Math.floor(r() * 3)],
      };
      const x = Math.floor(r() * g.columns);
      const y = Math.floor(r() * g.rows);
      const t = { translateX: (r() - 0.5) * 6, translateY: (r() - 0.5) * 6 };
      const plain = cellPlacementAffine(g, x, y);
      const moved = cellPlacementAffine(g, x, y, t);
      const at = (v: { pct: number; px: number }) => (v.pct / 100) * g.Wpx + v.px;
      const side = at(plain.side);
      expect(at(moved.side)).toBeCloseTo(side, 9);
      expect(at(moved.left) - at(plain.left)).toBeCloseTo(t.translateX * side, 6);
      expect(at(moved.marginTop) - at(plain.marginTop)).toBeCloseTo(t.translateY * side, 6);
      expect(moved.topPct).toBe(plain.topPct);
    }
  });

  it("is byte-identical at t = 0 to the call without a translation", () => {
    const r = rng(24);
    for (let n = 0; n < 50; n++) {
      const g = { ...randomGeometry(r), sizing: r() < 0.5 ? ("fixed" as const) : ("fluid" as const) };
      expect(cellPlacementAffine(g, 3, 2, { translateX: 0, translateY: 0 })).toEqual(
        cellPlacementAffine(g, 3, 2),
      );
    }
  });

  it("writes calc() only when both terms are present", () => {
    expect(cssLength({ pct: 12.5, px: 0 })).toBe("12.5%");
    expect(cssLength({ pct: 0, px: -4 })).toBe("-4px");
    expect(cssLength({ pct: 50, px: -4 })).toBe("calc(50% + -4px)");
  });
});

describe("latticeRange and visibleColumns", () => {
  const lattice = { originX: -10, originY: 5, pitch: 20 };

  it("claims only cells met with positive area — touching an edge claims nothing", () => {
    // Cell 1 spans [10, 30). A rect ending exactly at 10 does not reach it.
    const r = latticeRange(lattice, 10, 10, { left: -10, right: 10, top: 5, bottom: 25 });
    expect(r).toEqual({ x0: 0, x1: 1, y0: 0, y1: 1 });
    const r2 = latticeRange(lattice, 10, 10, { left: -10, right: 10.001, top: 5, bottom: 25 });
    expect(r2.x1).toBe(2);
  });

  it("clamps to the grid", () => {
    const r = latticeRange(lattice, 4, 3, { left: -1e6, right: 1e6, top: -1e6, bottom: 1e6 });
    expect(r).toEqual({ x0: 0, x1: 4, y0: 0, y1: 3 });
  });

  it("culls fixed-mode columns to the box, widened by the spill margin", () => {
    const layout: Layout = { cellSize: 48, referenceWidth: 76 * 48, yOffset: 0, horizontalAlignment: "column" };
    const g: GridGeometry = { layout, rows: 10, columns: 76, Wpx: 375, sizing: "fixed", alignX: "left" };
    const u = domGeometry(g, 2);
    const vis = visibleColumns(domLattice(u, 2), 76, 375, 0);
    expect(vis).toEqual({ x0: 0, x1: 8 }); // 375 / 48 = 7.8 -> 8 columns
    expect(visibleColumns(domLattice(u, 2), 76, 375, 1)).toEqual({ x0: 0, x1: 9 });
  });

  it("is every column under fluid for an ordinary design", () => {
    const r = rng(17);
    for (let n = 0; n < 100; n++) {
      const g = randomGeometry(r);
      const lat = { originX: originX(g), originY: 0, pitch: scaleFactor(g) * g.layout.cellSize };
      expect(visibleColumns(lat, g.columns, g.Wpx, 0)).toEqual({ x0: 0, x1: g.columns });
    }
  });
});

describe("the culled canvas draw list", () => {
  const layout: Layout = { cellSize: 40, referenceWidth: 400, yOffset: 0, horizontalAlignment: "column" };
  const cell = (over: Partial<TileState> = {}): TileState => ({
    tileId: "t",
    assetId: "a",
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    translateX: 0,
    translateY: 0,
    ...over,
  });
  const grid: Grid<TileState> = { rows: 2, columns: 10, cells: Array.from({ length: 20 }, () => cell()) };
  const g: GridGeometry = { layout, rows: 2, columns: 10, Wpx: 130, sizing: "fixed", alignX: "left" };

  it("is the full list filtered to the range, drawn from the raster's left edge", () => {
    const full = uniformDrawList(g, grid, 1, 0, (t, a) => `${t}/${a}`);
    const part = uniformDrawList(g, grid, 1, 0, (t, a) => `${t}/${a}`, { x0: 2, x1: 5 });
    const expected = full.filter((i) => i.x >= 2 && i.x < 5);
    expect(part.map((i) => i.index)).toEqual(expected.map((i) => i.index));
    for (const [k, item] of part.entries()) {
      expect(item.dx).toBe(expected[k]!.dx - 2 * 40);
    }
  });

  it("indexes each item by its cell, for the mask", () => {
    for (const item of uniformDrawList(g, grid, 1, 0, () => "k")) {
      expect(item.index).toBe(item.y * 10 + item.x);
    }
  });

  it("presents the culled raster where those columns sit in the ideal grid", () => {
    const u = uniformGeometry(g, 2);
    const p = canvasPresentation(g, u, 2, { x0: 3, x1: 7 });
    expect(p.rasterWidthDev).toBe(4 * u.cellDev);
    expect(p.leftCss).toBeCloseTo(cellBox(g, 3, 0).left, 9);
    expect(p.widthCss).toBeCloseTo(4 * 40, 9);
    expect(p.lattice.originX).toBeCloseTo(originX(g), 9);
  });
});

describe("maxSpill", () => {
  const cell = (over: Partial<TileState>): TileState => ({
    tileId: "t",
    assetId: "a",
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    translateX: 0,
    translateY: 0,
    ...over,
  });

  it("is 0 for an untransformed grid, and for quarter turns", () => {
    expect(maxSpill({ cells: [cell({}), cell({ rotation: 90 }), cell({ rotation: 180 })] })).toBe(0);
  });

  it("is 0 for a shrunk tile, 1 for anything that reaches a neighbour", () => {
    expect(maxSpill({ cells: [cell({ scale: 0.5 })] })).toBe(0);
    expect(maxSpill({ cells: [cell({ scale: 1.2 })] })).toBe(1);
    // A 45-degree square reaches sqrt(2)/2 of a cell from its centre: into the neighbour.
    expect(maxSpill({ cells: [cell({ rotation: 45 })] })).toBe(1);
    // Scale 4 reaches 1.5 cells past its own.
    expect(maxSpill({ cells: [cell({ scale: 4 })] })).toBe(2);
  });

  it("counts translation, in either direction, on top of scale and rotation — 0.8.0", () => {
    // A translate-only cell is an identity *transform* and still spills.
    expect(maxSpill({ cells: [cell({ translateX: 0.3 })] })).toBe(1);
    expect(maxSpill({ cells: [cell({ translateY: -2.5 })] })).toBe(3);
    expect(maxSpill({ cells: [cell({ translateX: 40 })] })).toBe(40);
    // Scale 2 reaches 0.5 past its cell; translated 1 more, 1.5 -> 2.
    expect(maxSpill({ cells: [cell({ scale: 2, translateX: -1 })] })).toBe(2);
    // A shrunk tile moved inside its own square spills nothing.
    expect(maxSpill({ cells: [cell({ scale: 0.5, translateX: 0.2 })] })).toBe(0);
  });

  it("agrees with drawnHalfExtents, which it is computed from", () => {
    expect(drawnHalfExtents(cell({}))).toEqual({ halfW: 0.5, halfH: 0.5 });
    const h = drawnHalfExtents(cell({ rotation: 45 }));
    expect(h.halfW).toBeCloseTo(Math.SQRT1_2, 12);
    expect(h.halfH).toBeCloseTo(Math.SQRT1_2, 12);
    expect(drawnHalfExtents(cell({ scaleX: -2, scaleY: 1 }))).toEqual({ halfW: 1, halfH: 0.5 });
    // Quarter turns transpose exactly, thanks to sincos.
    expect(drawnHalfExtents(cell({ scaleX: 2, rotation: 90 }))).toEqual({ halfW: 0.5, halfH: 1 });
  });
});

describe("translationDev", () => {
  it("is cells times the device cell, rounded to a whole device pixel", () => {
    expect(translationDev({ translateX: 0.5, translateY: -0.25 }, 40)).toEqual({ tx: 20, ty: -10 });
    expect(translationDev({ translateX: 0.33, translateY: 1 }, 37)).toEqual({ tx: 12, ty: 37 });
  });

  it("is exactly 0, never -0, for a zero or tiny translation", () => {
    const { tx, ty } = translationDev({ translateX: 0, translateY: -0.001 }, 40);
    expect(Object.is(tx, 0)).toBe(true);
    expect(Object.is(ty, 0)).toBe(true);
  });
});
