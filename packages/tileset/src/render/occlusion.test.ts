import { describe, expect, it } from "vitest";
import type { Lattice } from "./geometry.js";
import { occlusionMask, sameMask, stableMask } from "./occlusion.js";
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
