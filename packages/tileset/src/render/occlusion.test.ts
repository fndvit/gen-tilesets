import { describe, expect, it } from "vitest";
import { initialTileState } from "../attributes.js";
import type { Grid, TileState } from "../types.js";
import type { Lattice } from "./geometry.js";
import { drawnTiles, occlusionMask, sameMask, stableMask } from "./occlusion.js";
import { sincos, translationDev } from "./transform.js";
import { rectToRenderSpace, toRenderSpace, type RenderRect } from "./space.js";

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

/**
 * The definition, stated the slow way: a cell is hidden iff its lattice square
 * meets some non-empty rect, grown by `padding`, with positive area. O(N * K).
 */
function reference(
  lattice: Lattice,
  columns: number,
  rows: number,
  rects: readonly RenderRect[],
  padding: number,
): Uint8Array {
  const out = new Uint8Array(columns * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const l = lattice.originX + x * lattice.pitch;
      const t = lattice.originY + y * lattice.pitch;
      const r = l + lattice.pitch;
      const b = t + lattice.pitch;
      for (const q of rects) {
        if (!(q.right > q.left && q.bottom > q.top)) continue;
        const w = Math.min(r, q.right + padding) - Math.max(l, q.left - padding);
        const h = Math.min(b, q.bottom + padding) - Math.max(t, q.top - padding);
        if (w > 0 && h > 0) out[y * columns + x] = 1;
      }
    }
  }
  return out;
}

describe("occlusionMask", () => {
  it("equals the brute-force definition on random inputs", () => {
    const r = rng(1);
    for (let n = 0; n < 400; n++) {
      const columns = 1 + Math.floor(r() * 30);
      const rows = 1 + Math.floor(r() * 12);
      const lattice = { originX: -r() * 40, originY: -r() * 40, pitch: 5 + r() * 60 };
      const W = columns * lattice.pitch;
      const H = rows * lattice.pitch;
      const rects: RenderRect[] = Array.from({ length: Math.floor(r() * 5) }, () => {
        const left = -50 + r() * (W + 100);
        const top = -50 + r() * (H + 100);
        return { left, top, right: left + r() * 200, bottom: top + r() * 120 };
      });
      const padding = r() < 0.5 ? 0 : r() * 20;
      expect(occlusionMask(lattice, columns, rows, rects, padding)).toEqual(
        reference(lattice, columns, rows, rects, padding),
      );
    }
  });

  const lattice = { originX: 0, originY: 0, pitch: 10 };

  it("hides nothing for a rect that only touches a cell edge", () => {
    const m = occlusionMask(lattice, 4, 1, [{ left: 10, top: 0, right: 20, bottom: 10 }], 0);
    expect([...m]).toEqual([0, 1, 0, 0]);
  });

  it("ignores a zero-area rect even with padding — a display:none element", () => {
    const m = occlusionMask(lattice, 4, 4, [{ left: 0, top: 0, right: 0, bottom: 0 }], 25);
    expect(m.every((v) => v === 0)).toBe(true);
  });

  it("is the union over overlapping rects", () => {
    const a = { left: 0, top: 0, right: 15, bottom: 5 };
    const b = { left: 12, top: 0, right: 35, bottom: 5 };
    const both = occlusionMask(lattice, 5, 1, [a, b], 0);
    const ma = occlusionMask(lattice, 5, 1, [a], 0);
    const mb = occlusionMask(lattice, 5, 1, [b], 0);
    expect([...both]).toEqual([...ma].map((v, i) => v | mb[i]!));
  });

  it("clips a rect that runs past the grid, and ignores one wholly outside", () => {
    const m = occlusionMask(lattice, 3, 1, [{ left: 25, top: -100, right: 1000, bottom: 100 }], 0);
    expect([...m]).toEqual([0, 0, 1]);
    const out = occlusionMask(lattice, 3, 1, [{ left: 40, top: 0, right: 80, bottom: 10 }], 0);
    expect(out.every((v) => v === 0)).toBe(true);
  });

  it("only ever hides more as padding grows", () => {
    const r = rng(2);
    for (let n = 0; n < 100; n++) {
      const rects = [{ left: r() * 50, top: r() * 50, right: 50 + r() * 50, bottom: 50 + r() * 50 }];
      const small = occlusionMask(lattice, 12, 12, rects, r() * 5);
      const big = occlusionMask(lattice, 12, 12, rects, 5 + r() * 20);
      for (let i = 0; i < small.length; i++) expect(big[i]! >= small[i]!).toBe(true);
    }
  });
});

describe("occlusionMask — the drawn tile at rest, 0.8.0", () => {
  const tile = (over: Partial<TileState> = {}): TileState => ({
    ...initialTileState(),
    tileId: "t",
    assetId: "a",
    ...over,
  });
  const gridOf = (rows: number, columns: number, cell: (i: number) => TileState): Grid<TileState> => ({
    rows,
    columns,
    cells: Array.from({ length: rows * columns }, (_, i) => cell(i)),
  });

  /**
   * The definition the slow way, derived independently of `drawnHalfExtents`: map
   * the drawable square's four corners through `07` §6.2's linear part about the
   * centre, take their bounding box, move it by the translation the painter
   * rounds to, and test every cell against every rect. O(N * K).
   */
  function reference(
    lattice: Lattice,
    grid: Grid<TileState>,
    cellDev: number,
    rects: readonly RenderRect[],
    padding: number,
  ): Uint8Array {
    const out = new Uint8Array(grid.cells.length);
    for (let i = 0; i < grid.cells.length; i++) {
      const c = grid.cells[i]!;
      const x = i % grid.columns;
      const y = Math.floor(i / grid.columns);
      const { sin, cos } = sincos(c.rotation);
      const sx = c.scaleX * c.scale;
      const sy = c.scaleY * c.scale;
      const corners = [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [-0.5, 0.5],
      ].map(([u, v]) => [sx * cos * u! - sy * sin * v!, sx * sin * u! + sy * cos * v!]);
      const { tx, ty } = translationDev(c, cellDev);
      const cx = x + 0.5 + tx / cellDev;
      const cy = y + 0.5 + ty / cellDev;
      const l = lattice.originX + (cx + Math.min(...corners.map((k) => k[0]!))) * lattice.pitch;
      const r = lattice.originX + (cx + Math.max(...corners.map((k) => k[0]!))) * lattice.pitch;
      const t = lattice.originY + (cy + Math.min(...corners.map((k) => k[1]!))) * lattice.pitch;
      const b = lattice.originY + (cy + Math.max(...corners.map((k) => k[1]!))) * lattice.pitch;
      for (const q of rects) {
        if (!(q.right > q.left && q.bottom > q.top)) continue;
        const w = Math.min(r, q.right + padding) - Math.max(l, q.left - padding);
        const h = Math.min(b, q.bottom + padding) - Math.max(t, q.top - padding);
        if (w > 1e-9 && h > 1e-9) out[i] = 1;
      }
    }
    return out;
  }

  it("equals the brute-force definition on random transformed grids", () => {
    const r = rng(7);
    for (let n = 0; n < 300; n++) {
      const columns = 1 + Math.floor(r() * 20);
      const rows = 1 + Math.floor(r() * 10);
      const cellDev = 4 + Math.floor(r() * 60);
      const lattice = { originX: -r() * 40, originY: -r() * 40, pitch: cellDev / (1 + Math.floor(r() * 3)) };
      const grid = gridOf(rows, columns, () =>
        r() < 0.4
          ? tile()
          : tile({
              scale: 0.3 + r() * 2,
              scaleX: r() < 0.2 ? -1 : 1,
              rotation: r() < 0.5 ? 0 : Math.floor(r() * 8) * 45 + (r() < 0.3 ? 10 : 0),
              translateX: r() < 0.5 ? 0 : (r() - 0.5) * 8,
              translateY: r() < 0.5 ? 0 : (r() - 0.5) * 8,
            }),
      );
      const W = columns * lattice.pitch;
      const H = rows * lattice.pitch;
      const rects: RenderRect[] = Array.from({ length: 1 + Math.floor(r() * 3) }, () => {
        const left = -50 + r() * (W + 100);
        const top = -50 + r() * (H + 100);
        return { left, top, right: left + r() * 150, bottom: top + r() * 90 };
      });
      const padding = r() < 0.5 ? 0 : r() * 15;
      expect(
        occlusionMask(lattice, columns, rows, rects, padding, { tiles: drawnTiles(grid), cellDev }),
      ).toEqual(reference(lattice, grid, cellDev, rects, padding));
    }
  });

  it("is the lattice rule, byte for byte, for an untransformed grid", () => {
    const r = rng(8);
    for (let n = 0; n < 200; n++) {
      const columns = 1 + Math.floor(r() * 30);
      const rows = 1 + Math.floor(r() * 12);
      const lattice = { originX: -r() * 40, originY: -r() * 40, pitch: 5 + r() * 60 };
      const rects = [{ left: r() * 300, top: r() * 200, right: 300 + r() * 300, bottom: 200 + r() * 100 }];
      const tiles = drawnTiles(gridOf(rows, columns, () => tile()));
      expect(tiles.transformed).toBe(false);
      expect(occlusionMask(lattice, columns, rows, rects, 4, { tiles, cellDev: 17 })).toEqual(
        occlusionMask(lattice, columns, rows, rects, 4),
      );
    }
  });

  const lattice = { originX: 0, originY: 0, pitch: 10 };
  const heading = { left: 0, top: 0, right: 10, bottom: 10 }; // exactly cell (0, 0)

  it("hides a tile moved onto the rect from three cells away, and not its vacated home", () => {
    // Cell (3, 0) is moved three cells left, onto (0, 0). Cell (0, 0) itself is
    // moved one cell down, clear of the rect.
    const grid = gridOf(2, 4, (i) =>
      i === 3 ? tile({ translateX: -3 }) : i === 0 ? tile({ translateY: 1 }) : tile(),
    );
    const m = occlusionMask(lattice, 4, 2, [heading], 0, { tiles: drawnTiles(grid), cellDev: 10 });
    expect(m[3]).toBe(1);
    expect(m[0]).toBe(0);
    expect([...m].reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("hides a neighbour scaled over the rect — spill is covered too", () => {
    const grid = gridOf(1, 3, (i) => (i === 1 ? tile({ scale: 1.5 }) : tile()));
    const m = occlusionMask(lattice, 3, 1, [heading], 0, { tiles: drawnTiles(grid), cellDev: 10 });
    expect([...m]).toEqual([1, 1, 0]);
  });

  it("hides a 45-degree tile whose bounding box, not its diamond, meets the rect — the conservative case", () => {
    // The diamond of cell (1, 1) reaches its box corner only at the axes; a
    // sliver at the top-left of the box touches its empty corner.
    const grid = gridOf(3, 3, (i) => (i === 4 ? tile({ rotation: 45 }) : tile()));
    const corner = { left: 7, top: 7, right: 8.5, bottom: 8.5 };
    const m = occlusionMask(lattice, 3, 3, [corner], 0, { tiles: drawnTiles(grid), cellDev: 10 });
    expect(m[4]).toBe(1);
  });

  it("does not hide a shrunk tile whose square meets the rect but whose drawing does not", () => {
    const grid = gridOf(1, 2, (i) => (i === 1 ? tile({ scale: 0.5 }) : tile()));
    // Cell 1's square spans 10..20; scaled 0.5 it is drawn at 12.5..17.5.
    const m = occlusionMask(lattice, 2, 1, [{ left: 5, top: 0, right: 11, bottom: 10 }], 0, {
      tiles: drawnTiles(grid),
      cellDev: 10,
    });
    expect([...m]).toEqual([1, 0]);
  });

  it("rounds the translation the way the painter does", () => {
    // 0.04 cells at a 10 device-px cell rounds to 0 px: the tile is drawn on its
    // square, so a rect ending at its left edge does not reach it.
    const grid = gridOf(1, 2, (i) => (i === 1 ? tile({ translateX: -0.04 }) : tile()));
    const m = occlusionMask(lattice, 2, 1, [{ left: 0, top: 0, right: 10, bottom: 10 }], 0, {
      tiles: drawnTiles(grid),
      cellDev: 10,
    });
    expect([...m]).toEqual([1, 0]);
  });
});

describe("stableMask", () => {
  it("keeps the previous identity when nothing changed", () => {
    const a = Uint8Array.from([0, 1, 1, 0]);
    const b = Uint8Array.from([0, 1, 1, 0]);
    expect(stableMask(a, b)).toBe(a);
    expect(sameMask(a, b)).toBe(true);
  });

  it("takes the new mask when a cell flipped", () => {
    const a = Uint8Array.from([0, 1, 1, 0]);
    const b = Uint8Array.from([0, 1, 0, 0]);
    expect(stableMask(a, b)).toBe(b);
    expect(stableMask(null, b)).toBe(b);
  });
});

describe("client space to render space", () => {
  // A box at (100, 50) on screen, laid out 400 wide and displayed at 200: an
  // ancestor scaled it by 0.5.
  const box = { clientLeft: 100, clientTop: 50, clientWidth: 200, layoutWidth: 400 };

  it("undoes an ancestor's display zoom", () => {
    expect(toRenderSpace(box, 150, 75)).toEqual({ px: 100, py: 50 });
    expect(rectToRenderSpace(box, { left: 100, top: 50, right: 200, bottom: 100 })).toEqual({
      left: 0,
      top: 0,
      right: 200,
      bottom: 100,
    });
  });

  it("treats a box with no size yet as unzoomed rather than dividing by zero", () => {
    const empty = { clientLeft: 0, clientTop: 0, clientWidth: 0, layoutWidth: 0 };
    expect(toRenderSpace(empty, 3, 4)).toEqual({ px: 3, py: 4 });
  });
});
