import { describe, expect, it } from "vitest";
import type { EvalCtx } from "../ctx.js";
import { DEV } from "../dev.js";
import { stage1 } from "../hash.js";
import { Registry } from "./registry.js";
import { selections } from "./selections.js";
import { evalSource, sources } from "./sources.js";

// `extent` defaults to the grid, derived from whatever `rows`/`columns` end up
// being, so an override of the grid moves the extent with it -- the same default
// `operationCtx` applies for a Selection that declares no extent. Pass `extent`
// explicitly to test a Selection-confined sweep.
const ctx = (over: Partial<EvalCtx> = {}): EvalCtx => {
  const rows = over.rows ?? 12;
  const columns = over.columns ?? 16;
  return {
    rows,
    columns,
    extent: { x: 0, y: 0, width: columns, height: rows },
    effectiveSeed: stage1("sunset-3"),
    operationId: "op1",
    salt: 0,
    ...over,
  };
};

describe("the registry — 05 §5", () => {
  it("errors rather than silently overwriting an occupied name — X4", () => {
    const r = new Registry<{ name: string }>("source");
    r.register({ name: "a" });
    expect(() => r.register({ name: "a" })).toThrow(/already registered/);
  });

  it("fails on an unknown name and never substitutes a default — X7", () => {
    expect(() => sources.get("simplexNoise")).toThrow(/Unknown source/);
    expect(() => selections.get("and")).toThrow(/Unknown selection/);
  });

  it("namespaces names by kind, so `random` can be both — 01 §10.3", () => {
    expect(selections.has("random")).toBe(true);
    expect(sources.has("random")).toBe(true);
  });
});

describe("Selection presets — 04 §4.2", () => {
  it("registers exactly the six V1 presets", () => {
    expect(selections.names().sort()).toEqual(
      ["all", "cellList", "checkerboard", "everyNth", "random", "rect"].sort(),
    );
  });

  it("all: always", () => {
    expect(selections.get("all").impl({}, 0, 0, ctx())).toBe(true);
    expect(selections.get("all").impl({}, 99, 99, ctx())).toBe(true);
  });

  it("rect: half-open on both axes", () => {
    const p = { x: 2, y: 3, width: 4, height: 2 };
    const test = (x: number, y: number) => selections.get("rect").impl(p, x, y, ctx());
    expect(test(2, 3)).toBe(true);
    expect(test(5, 4)).toBe(true);
    expect(test(6, 3)).toBe(false); // x + width is excluded
    expect(test(2, 5)).toBe(false); // y + height is excluded
    expect(test(1, 3)).toBe(false);
  });

  it("rect: may extend beyond the grid without being resized — 04 §4.2", () => {
    const p = { x: -5, y: -5, width: 100, height: 100 };
    expect(selections.get("rect").impl(p, 0, 0, ctx())).toBe(true);
    // A rect lying wholly outside is legal and simply never tests true (06 §10.4).
    const away = { x: 500, y: 500, width: 2, height: 2 };
    expect(selections.get("rect").impl(away, 3, 3, ctx())).toBe(false);
  });

  it("checkerboard: (cx + cy) mod 2 == parity", () => {
    const even = selections.get("checkerboard");
    expect(even.impl({ parity: 0 }, 0, 0, ctx())).toBe(true);
    expect(even.impl({ parity: 0 }, 1, 0, ctx())).toBe(false);
    expect(even.impl({ parity: 1 }, 1, 0, ctx())).toBe(true);
    expect(even.impl({ parity: 1 }, 1, 1, ctx())).toBe(false);
  });

  it("checkerboard: safe only because cx and cy are non-negative — 04 §4.2", () => {
    // The residual `%` hazard. Documented here so the guarantee stays visible:
    // 02 §5 makes coordinates non-negative, so (cx + cy) never is.
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++) expect((x + y) % 2).toBeGreaterThanOrEqual(0);
  });

  it("everyNth: (coord - offset) mod n == 0, on either axis", () => {
    const n = selections.get("everyNth");
    const col = { axis: "column", n: 3, offset: 0 };
    expect(n.impl(col, 0, 5, ctx())).toBe(true);
    expect(n.impl(col, 3, 5, ctx())).toBe(true);
    expect(n.impl(col, 4, 5, ctx())).toBe(false);
    const row = { axis: "row", n: 2, offset: 1 };
    expect(n.impl(row, 5, 1, ctx())).toBe(true);
    expect(n.impl(row, 5, 3, ctx())).toBe(true);
    expect(n.impl(row, 5, 2, ctx())).toBe(false);
  });

  it("everyNth: a positive offset making the operand negative is fine — 06 Q11", () => {
    // JS `%` is a remainder, but a remainder is zero exactly when the divisor
    // divides the dividend, so `a % n === 0` and `a mod n === 0` agree for every
    // integer a — including where coord - offset is negative, since -0 === 0.
    const n = selections.get("everyNth");
    const p = { axis: "column", n: 4, offset: 8 };
    expect(n.impl(p, 0, 0, ctx())).toBe(true); // (0 - 8) % 4 === -0
    expect(n.impl(p, 4, 0, ctx())).toBe(true);
    expect(n.impl(p, 2, 0, ctx())).toBe(false);
  });

  it("everyNth: defaults offset to 0 when absent — 06 §5.1", () => {
    const n = selections.get("everyNth");
    expect(n.impl({ axis: "column", n: 2 }, 0, 0, ctx())).toBe(true);
    expect(n.impl({ axis: "column", n: 2 }, 1, 0, ctx())).toBe(false);
  });

  it("random: draws from the selection channel, not the source channel — O3", () => {
    // The correlation bug 04 §4.3 exists to prevent: at density 0.5 the selected
    // set must not be exactly the cells whose Source value is below 0.5.
    const c = ctx();
    const sel = selections.get("random");
    const src = sources.get("random");
    let agreements = 0;
    let n = 0;
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const selected = sel.impl({ density: 0.5 }, x, y, c);
        const low = src.impl({}, x, y, c) < 0.5;
        if (selected === low) agreements++;
        n++;
      }
    }
    expect(agreements / n).toBeGreaterThan(0.4);
    expect(agreements / n).toBeLessThan(0.6);
  });

  it("random: honours density", () => {
    const c = ctx();
    const sel = selections.get("random");
    for (const density of [0, 0.3, 0.75, 1]) {
      let hits = 0;
      let n = 0;
      for (let y = 0; y < 60; y++)
        for (let x = 0; x < 60; x++) {
          if (sel.impl({ density }, x, y, c)) hits++;
          n++;
        }
      expect(hits / n).toBeCloseTo(density, 1);
    }
  });

  it("random: density 0 selects nothing and density 1 selects everything", () => {
    const c = ctx();
    const sel = selections.get("random");
    // h < density, and h < 1 strictly by X6, so density 1 is total.
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++) {
        expect(sel.impl({ density: 0 }, x, y, c)).toBe(false);
        expect(sel.impl({ density: 1 }, x, y, c)).toBe(true);
      }
  });

  it("cellList: the pair is present in the list", () => {
    const p = { cells: [[1, 2], [5, 5]] };
    const l = selections.get("cellList");
    expect(l.impl(p, 1, 2, ctx())).toBe(true);
    expect(l.impl(p, 5, 5, ctx())).toBe(true);
    expect(l.impl(p, 2, 1, ctx())).toBe(false);
  });

  it("is pure in (x, y) and its parameters — O2", () => {
    // Never reads accumulated TileState: the impl signature has no slot for one.
    for (const s of selections.all()) {
      expect(s.impl.length).toBeLessThanOrEqual(4);
    }
  });

  it("rect: declares its own four numbers as its extent, verbatim", () => {
    const p = { x: 2, y: 3, width: 4, height: 2 };
    expect(selections.get("rect").extent!(p)).toEqual(p);
  });

  it("rect: does not clamp its extent to the grid — 04 §4.2, G2", () => {
    // An author dragging a rectangle past the edge should not have it silently
    // resized, and the extent is where resizing it would be invisible.
    const p = { x: -5, y: -2, width: 100, height: 100 };
    expect(selections.get("rect").extent!(p)).toEqual(p);
  });

  it("cellList: declares the bounding box of the painted cells", () => {
    const e = selections.get("cellList").extent!;
    // An L, so the box is strictly larger than the cells -- what a spanning
    // Source projects a direction onto is the hull, not the set.
    expect(e({ cells: [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3]] })).toEqual({
      x: 1,
      y: 1,
      width: 3,
      height: 3,
    });
    // A single cell is a 1x1 extent, not a zero one.
    expect(e({ cells: [[4, 7]] })).toEqual({ x: 4, y: 7, width: 1, height: 1 });
    // Order-independent, and negative coordinates survive.
    expect(e({ cells: [[5, 5], [-1, 2]] })).toEqual({ x: -1, y: 2, width: 7, height: 4 });
  });

  it("cellList: an empty list is a zero-area extent, not the grid", () => {
    // Returning the grid would make a gradient over an empty brush sweep the
    // whole canvas -- a wrong picture rather than a missing one.
    expect(selections.get("cellList").extent!({ cells: [] })).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  it("the procedural Selections declare no extent, so they get the grid", () => {
    // This is the claim that their output moves only by the endpoint fix, never
    // by the selection-relative domain. A Selection defined by a rule has no
    // bounds to declare.
    for (const name of ["all", "checkerboard", "everyNth", "random"]) {
      expect(selections.get(name).extent, name).toBeUndefined();
    }
    // And the coordinate-bound ones do declare one -- the same split 04 §4.4's
    // table draws, arrived at independently.
    for (const name of ["rect", "cellList"]) {
      expect(selections.get(name).extent, name).toBeTypeOf("function");
    }
  });
});

describe("Source presets — 04 §5.2", () => {
  it("registers four, with vignette deliberately absent", () => {
    expect(sources.names().sort()).toEqual(["constant", "gradient", "random", "valueNoise"]);
    expect(sources.has("vignette")).toBe(false);
  });

  it("declares stochastic correctly — X5, and 04 §8.4 depends on it", () => {
    expect(sources.get("random").stochastic).toBe(true);
    expect(sources.get("valueNoise").stochastic).toBe(true);
    expect(sources.get("constant").stochastic).toBe(false);
    expect(sources.get("gradient").stochastic).toBe(false);
  });

  it("constant emits 0 always — 04 §5.2", () => {
    for (let i = 0; i < 20; i++) expect(sources.get("constant").impl({}, i, i, ctx())).toBe(0);
  });

  it("gradient: angle 0 sweeps left to right", () => {
    const g = sources.get("gradient");
    const c = ctx();
    const left = g.impl({ angle: 0 }, 0, 5, c);
    const right = g.impl({ angle: 0 }, c.columns - 1, 5, c);
    expect(right).toBeGreaterThan(left);
  });

  it("gradient: angle 90 sweeps top to bottom, because y increases downward", () => {
    const g = sources.get("gradient");
    const c = ctx();
    const top = g.impl({ angle: 90 }, 5, 0, c);
    const bottom = g.impl({ angle: 90 }, 5, c.rows - 1, c);
    expect(bottom).toBeGreaterThan(top);
  });

  it("gradient: reaches both ends of the range, at every angle", () => {
    // The defect this replaced: the domain was the grid's outer *edges* while the
    // sample was a cell *centre*, so t ran 0.5/N .. 1 - 0.5/N and a continuous
    // `range: [0, 1]` reached neither end. Strict equality, not toBeCloseTo --
    // `sincos` exists so the axis-aligned cases are exact rather than near.
    const g = sources.get("gradient");
    const c = ctx();
    for (const angle of [0, 0.5, 17, 37, 45, 89.999, 90, 133, 180, 225, 270, 315, 360, -450, 1e6]) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let y = 0; y < c.rows; y++) {
        for (let x = 0; x < c.columns; x++) {
          const t = g.impl({ angle }, x, y, c);
          if (t < lo) lo = t;
          if (t > hi) hi = t;
        }
      }
      expect(lo, `angle ${angle} never reaches 0`).toBe(0);
      expect(hi, `angle ${angle} never reaches 1`).toBe(1);
    }
  });

  it("gradient: normalizes over the Selection extent, not the grid", () => {
    // The second half of the same defect: a seven-row band of a ten-row grid
    // received only the slice of a grid-wide sweep that fell across it, so
    // `range: [0.3, 1]` topped out at 0.767 and `steps: 7` collapsed to five
    // distinct bands.
    const g = sources.get("gradient");
    const c = ctx({ rows: 10, columns: 76, extent: { x: 0, y: 0, width: 76, height: 7 } });
    const p = { angle: 90 };
    expect(g.impl(p, 3, 0, c)).toBe(0);
    expect(g.impl(p, 3, 6, c)).toBe(1);
    // Rows below the extent are never selected, so a Source is never asked for
    // them -- but were it asked, the value runs past the end rather than
    // clamping, which is what the dev X6 assertion is there to catch.
    expect(g.impl(p, 3, 9, c)).toBeGreaterThan(1);
  });

  it("gradient: an extent past the grid edge still sweeps its whole width — G2", () => {
    // G2's argument is about *clipped* cells, and it is untouched: a rect the
    // author dragged past the edge is not trimmed, so its midpoint stays where
    // they put it and the clipped columns still consume their share of the range.
    // The visible part therefore does NOT reach the ends, and that is correct.
    const g = sources.get("gradient");
    const c = ctx({ rows: 4, columns: 10, extent: { x: -5, y: 0, width: 20, height: 4 } });
    const p = { angle: 0 };
    // Column 0 sits 5 cells into a 20-wide sweep; column 9 sits 14 in.
    expect(g.impl(p, 0, 0, c)).toBeCloseTo(5 / 19, 12);
    expect(g.impl(p, 9, 0, c)).toBeCloseTo(14 / 19, 12);
  });

  it("gradient: guards every zero-span extent", () => {
    const g = sources.get("gradient");
    const p = { angle: 0 };
    // A degenerate grid.
    expect(g.impl(p, 0, 0, ctx({ columns: 0, rows: 0 }))).toBe(0);
    // An empty cellList's extent -- zero area, so there is no last cell to
    // project and `ex + ew - 1` would fall behind `ex`.
    expect(g.impl(p, 0, 0, ctx({ extent: { x: 0, y: 0, width: 0, height: 0 } }))).toBe(0);
    // A single cell, and a single column swept across it: first cell and last
    // cell are the same cell, so the span is genuinely zero.
    expect(g.impl(p, 4, 4, ctx({ extent: { x: 4, y: 4, width: 1, height: 1 } }))).toBe(0);
    expect(g.impl(p, 4, 4, ctx({ extent: { x: 4, y: 0, width: 1, height: 9 } }))).toBe(0);
    // The same, vertically -- this one needs `sincos`: with Math.cos(90deg) the
    // stray column term gives the row a spurious non-zero span.
    expect(
      g.impl({ angle: 90 }, 4, 4, ctx({ extent: { x: 0, y: 4, width: 9, height: 1 } })),
    ).toBe(0);
  });

  it("valueNoise: nearby cells receive nearby values", () => {
    // The property that produces regions, bands and waves rather than static.
    const vn = sources.get("valueNoise");
    const c = ctx();
    const p = { cellsPerFeature: 8, octaves: 1 };
    let neighbourDelta = 0;
    let distantDelta = 0;
    let n = 0;
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++) {
        neighbourDelta += Math.abs(vn.impl(p, x, y, c) - vn.impl(p, x + 1, y, c));
        distantDelta += Math.abs(vn.impl(p, x, y, c) - vn.impl(p, x + 40, y, c));
        n++;
      }
    expect(neighbourDelta / n).toBeLessThan(distantDelta / n);
  });

  it("valueNoise: does NOT degenerate to random at cellsPerFeature 1 — spec discrepancy", () => {
    // 04 §5.4 reads:
    //
    //   "At cellsPerFeature = 1, valueNoise lattice points fall on every cell,
    //    interpolation never runs between distinct corners, and the output
    //    degenerates to random."
    //
    // This does not follow from 04 §5.2's own pseudocode. That pseudocode uses a
    // cell-CENTRE offset -- `u = (x + 0.5) * frequency / cellsPerFeature` -- so at
    // cellsPerFeature = 1 every cell lands at u = x + 0.5, giving fx = fy = 0.5 at
    // every cell. Interpolation therefore runs between four *distinct* corners at
    // equal weight, and the result is their mean, not a lattice point.
    //
    // Two consequences, both measurable below: the mean of four uniforms has half
    // the standard deviation of one, and adjacent cells share a column of corners
    // so they stay correlated.
    //
    // The claim would hold without the `+ 0.5`. But that offset is deliberate and
    // consistent -- `gradient` projects `(x + 0.5, y + 0.5)` in the same section,
    // and 07 §5.4 centres cells the same way -- so the pseudocode is right and the
    // prose claim about it is wrong.
    //
    // §5.4's *conclusion* is untouched: both Sources are kept, and its stated
    // reasons (random is cheaper, its intent is legible at a glance, it takes no
    // parameters) never depended on the degeneracy. Pinned, not amended.
    const vn = sources.get("valueNoise");
    const c = ctx();
    const p = { cellsPerFeature: 1, octaves: 1 };
    const rnd = sources.get("random");

    let noiseDelta = 0;
    let randomDelta = 0;
    let n = 0;
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 30; x++) {
        noiseDelta += Math.abs(vn.impl(p, x, y, c) - vn.impl(p, x + 1, y, c));
        randomDelta += Math.abs(rnd.impl({}, x, y, c) - rnd.impl({}, x + 1, y, c));
        n++;
      }
    // If it had degenerated to `random` these would be equal. They are not:
    // averaging four corners roughly halves the cell-to-cell gap.
    expect(noiseDelta / n).toBeLessThan((randomDelta / n) * 0.75);
  });

  it("valueNoise: DOES approach random as cellsPerFeature approaches 0", () => {
    // Where the two Sources actually do coincide at the edge of a parameter
    // domain -- which is the fact 05 §11 needed to know about (04 §5.4).
    const vn = sources.get("valueNoise");
    const c = ctx();
    const p = { cellsPerFeature: 0.001, octaves: 1 };
    let delta = 0;
    let n = 0;
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 30; x++) {
        delta += Math.abs(vn.impl(p, x, y, c) - vn.impl(p, x + 1, y, c));
        n++;
      }
    // Adjacent cells land on distant lattice points, so the mean gap approaches
    // the 1/3 of two independent uniforms.
    expect(delta / n).toBeGreaterThan(0.25);
  });

  it("valueNoise: octaves are decorrelated by the per-octave salt — 04 §5.2", () => {
    const vn = sources.get("valueNoise");
    const c = ctx();
    const one = vn.impl({ cellsPerFeature: 4, octaves: 1 }, 3, 4, c);
    const two = vn.impl({ cellsPerFeature: 4, octaves: 2 }, 3, 4, c);
    expect(one).not.toBe(two);
  });

  it("valueNoise: an author's salt++ does not collide with an octave offset", () => {
    // The reason the derivation mixes through imul rather than adding o.
    const vn = sources.get("valueNoise");
    const p = { cellsPerFeature: 4, octaves: 3 };
    const a = vn.impl(p, 3, 4, ctx({ salt: 0 }));
    const b = vn.impl(p, 3, 4, ctx({ salt: 1 }));
    expect(a).not.toBe(b);
  });

  it("every Source is total over its admissible parameter space — 05 §6.3, X6", () => {
    // The test obligation 05 §6.3 states in place of a production clamp:
    // "The test suite evaluates every registered Source across a grid sample and
    // the extremes of its admissible parameter space, asserting the same."
    const paramSets: Record<string, Record<string, unknown>[]> = {
      constant: [{}],
      random: [{}],
      valueNoise: [
        { cellsPerFeature: 0.001, octaves: 1 },
        { cellsPerFeature: 1, octaves: 3 },
        { cellsPerFeature: 1e6, octaves: 3 },
        { cellsPerFeature: 7.5, octaves: 2 },
      ],
      gradient: [{ angle: 0 }, { angle: 90 }, { angle: 37 }, { angle: -450 }, { angle: 1e6 }],
    };

    for (const registration of sources.all()) {
      for (const params of paramSets[registration.name]!) {
        for (const c of [ctx(), ctx({ rows: 1, columns: 1 }), ctx({ rows: 40, columns: 3 })]) {
          for (let y = 0; y < c.rows; y++) {
            for (let x = 0; x < c.columns; x++) {
              const t = registration.impl(params, x, y, c);
              expect(Number.isFinite(t)).toBe(true);
              expect(t).toBeGreaterThanOrEqual(0);
              // X6 is closed: `gradient` attains 1 at the far corner of its
              // extent, by design. Every other Source stays strictly under.
              expect(t).toBeLessThanOrEqual(1);
              if (registration.name !== "gradient") expect(t).toBeLessThan(1);
            }
          }
        }
      }
    }
  });

  it("evalSource throws on an X6 violation in dev builds — 05 §6.3", () => {
    // Just past the closed bound, on both sides, plus non-finite.
    for (const value of [1.0000000000000002, -1e-9, NaN, Infinity]) {
      const bad = { name: "bad", params: {}, stochastic: false, impl: () => value };
      // Only asserted when DEV; the production posture is deliberately silent.
      if (DEV) {
        expect(() => evalSource(bad, {}, 0, 0, ctx())).toThrow(/X6/);
      } else {
        expect(evalSource(bad, {}, 0, 0, ctx())).toBe(value);
      }
    }
  });

  it("evalSource admits exactly 1, because gradient reaches it — X6 closed", () => {
    // The bound was `[0, 1)` and this threw. `gradient` was changed to reach both
    // ends of its extent, which makes 1 a legal return value; `mapping.ts` clamps
    // the stepped index and falls back in the palette walk to cope with it.
    const edge = { name: "edge", params: {}, stochastic: false, impl: () => 1 };
    expect(evalSource(edge, {}, 0, 0, ctx())).toBe(1);
  });
});
