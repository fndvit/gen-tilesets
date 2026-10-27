import { describe, expect, it } from "vitest";
import { coverRect, snap } from "./edges.js";
import { sincos } from "./transform.js";

/**
 * What is left after the per-edge snapping went to `uniform.ts`.
 *
 * The edge arrays, `drawList` and `blitRect`'s quarter-turn transpose are gone,
 * and so are their assertions — including the one that found a snapped cell which
 * was non-square by exactly one device pixel and checked the transpose mapped it
 * back. `uniform.test.ts` asserts the property that made that test unnecessary:
 * there is no non-square cell to find.
 */
const DPRS = [1, 1.5, 2, 3];

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

describe("sincos — exact on the axes, Math elsewhere", () => {
  it("is exact at every multiple of 90, including negative and wrapped", () => {
    expect(sincos(0)).toEqual({ sin: 0, cos: 1 });
    expect(sincos(90)).toEqual({ sin: 1, cos: 0 });
    expect(sincos(180)).toEqual({ sin: 0, cos: -1 });
    expect(sincos(270)).toEqual({ sin: -1, cos: 0 });
    expect(sincos(360)).toEqual({ sin: 0, cos: 1 });
    expect(sincos(-90)).toEqual({ sin: -1, cos: 0 });
    expect(sincos(-270)).toEqual({ sin: 1, cos: 0 });
    expect(sincos(450)).toEqual({ sin: 1, cos: 0 });
  });

  it("hands everything else to Math unchanged, to the ulp", () => {
    for (const d of [45, 1, -12.5, 359.9, 89.999]) {
      expect(sincos(d).sin).toBe(Math.sin((d * Math.PI) / 180));
      expect(sincos(d).cos).toBe(Math.cos((d * Math.PI) / 180));
    }
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
    // A browser may report 0 for an SVG with no intrinsic dimensions. Chrome
    // reports 150 instead, which `images.ts` `requireNaturalSize` refuses before
    // anything is drawn, so this is a last guard: better a no-op than a rect
    // full of NaN reaching drawImage.
    expect(coverRect(0, 0, 50, 50)).toEqual({ sx: 0, sy: 0, sw: 0, sh: 0 });
  });
});
