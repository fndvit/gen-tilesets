import { describe, expect, it } from "vitest";
import { applyNumericMapping, applyTileMapping, isTileMapping } from "./mapping.js";
import { acceptedBlends, blends, isAccepted, TARGETS } from "./registry/blends.js";
import type { TargetName } from "./types.js";

describe("numeric mapping — 04 §6.2", () => {
  it("is linear and continuous when steps is absent", () => {
    const m = { range: [0, 100] as [number, number] };
    expect(applyNumericMapping(m, 0)).toBe(0);
    expect(applyNumericMapping(m, 0.5)).toBe(50);
    expect(applyNumericMapping(m, 0.25)).toBe(25);
  });

  it("never attains max when continuous, because t < 1 strictly", () => {
    const m = { range: [0, 100] as [number, number] };
    expect(applyNumericMapping(m, 0xffffffff / 2 ** 32)).toBeLessThan(100);
  });

  it("reverses when min > max, so no Source needs an inversion flag", () => {
    const m = { range: [100, 0] as [number, number] };
    expect(applyNumericMapping(m, 0)).toBe(100);
    expect(applyNumericMapping(m, 0.5)).toBe(50);
  });

  it("expresses a fixed value as min === max — 04 §5.2 on `constant`", () => {
    const m = { range: [45, 45] as [number, number] };
    for (const t of [0, 0.3, 0.99]) expect(applyNumericMapping(m, t)).toBe(45);
  });

  it("reproduces 04 §6.2's flip example exactly", () => {
    // range [-1, 1], steps 2. t < 0.5 -> index 0 -> -1. t >= 0.5 -> index 1 -> +1.
    // Exactly two values, each on half the cells, both attained exactly.
    const m = { range: [-1, 1] as [number, number], steps: 2 };
    expect(applyNumericMapping(m, 0)).toBe(-1);
    expect(applyNumericMapping(m, 0.49)).toBe(-1);
    expect(applyNumericMapping(m, 0.5)).toBe(1);
    expect(applyNumericMapping(m, 0.99)).toBe(1);
    const values = new Set([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((t) => applyNumericMapping(m, t)));
    expect([...values].sort()).toEqual([-1, 1]);
  });

  it("shows why flip needs steps — continuous [-1, 1] scales tiles to invisibility", () => {
    const continuous = { range: [-1, 1] as [number, number] };
    expect(Math.abs(applyNumericMapping(continuous, 0.5))).toBeLessThan(0.001);
  });

  it("reproduces 04 §6.1's quarter turns", () => {
    // range [0, 270], steps 4 -> 0, 90, 180, 270.
    const m = { range: [0, 270] as [number, number], steps: 4 };
    expect(applyNumericMapping(m, 0.0)).toBe(0);
    expect(applyNumericMapping(m, 0.3)).toBe(90);
    expect(applyNumericMapping(m, 0.55)).toBe(180);
    expect(applyNumericMapping(m, 0.99)).toBe(270);
  });

  it("keeps index <= steps - 1, which depends on t < 1 strictly — X6", () => {
    const m = { range: [0, 270] as [number, number], steps: 4 };
    // 05 §6.2: t = 1.0 would give index 4 -> 360deg, wrapping to 0deg -- a fifth
    // outcome the author's steps: 4 said would not exist.
    expect(applyNumericMapping(m, 0xffffffff / 2 ** 32)).toBe(270);
    expect(applyNumericMapping(m, 1.0)).toBe(360); // why X6 forbids 1.0
  });

  it("attains max when stepped, unlike continuous", () => {
    const m = { range: [0, 10] as [number, number], steps: 5 };
    expect(applyNumericMapping(m, 0.999)).toBe(10);
  });
});

describe("tile mapping — 04 §6.3", () => {
  const palette = {
    palette: [
      { tileId: "water", weight: 1 },
      { tileId: "sand", weight: 1 },
      { tileId: "grass", weight: 3 },
    ],
  };

  it("discriminates its shape without a kind tag — C8", () => {
    expect(isTileMapping(palette)).toBe(true);
    expect(isTileMapping({ range: [0, 1] })).toBe(false);
  });

  it("bands by cumulative weight — 04 §6.3's worked thresholds", () => {
    // total 5, thresholds at 0.2 and 0.4.
    expect(applyTileMapping(palette, 0.1)).toBe("water");
    expect(applyTileMapping(palette, 0.3)).toBe("sand");
    expect(applyTileMapping(palette, 0.5)).toBe("grass");
    expect(applyTileMapping(palette, 0.99)).toBe("grass");
  });

  it("keeps authored order load-bearing — O6, the opposite rule to D3", () => {
    // Under a banded Source, threshold adjacency is spatial adjacency: water has
    // to sit next to sand and not next to grass.
    const reordered = {
      palette: [
        { tileId: "grass", weight: 3 },
        { tileId: "water", weight: 1 },
        { tileId: "sand", weight: 1 },
      ],
    };
    expect(applyTileMapping(reordered, 0.1)).toBe("grass");
    expect(applyTileMapping(reordered, 0.5)).toBe("grass");
    expect(applyTileMapping(reordered, 0.7)).toBe("water");
  });

  it("treats null as a legal entry meaning clear — 02 §8.1", () => {
    const withNull = { palette: [{ tileId: null, weight: 1 }, { tileId: "leaf", weight: 1 }] };
    expect(applyTileMapping(withNull, 0.1)).toBeNull();
    expect(applyTileMapping(withNull, 0.9)).toBe("leaf");
  });

  it("never selects a zero-weight entry", () => {
    const withZero = { palette: [{ tileId: "off", weight: 0 }, { tileId: "on", weight: 1 }] };
    for (let i = 0; i < 1000; i++) expect(applyTileMapping(withZero, i / 1000)).toBe("on");
  });

  it("is total for every t in [0, 1)", () => {
    for (let i = 0; i < 10000; i++) {
      expect(["water", "sand", "grass"]).toContain(applyTileMapping(palette, i / 10000));
    }
  });

  it("gives one weight two readings that are the same reading — 04 §6.3", () => {
    // Under `random` it is how often; under `valueNoise` how wide a band. Both
    // are proportion of area, which is why one number serves.
    //
    // True for a UNIFORMLY distributed t, which is what this asserts. See the
    // next test for where it stops being true.
    let grass = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) if (applyTileMapping(palette, i / n) === "grass") grass++;
    expect(grass / n).toBeCloseTo(0.6, 2);
  });

  it("a weight is NOT proportion of area under valueNoise — spec discrepancy", () => {
    // 04 §6.3 reads:
    //
    //   "A weight means two things, and they are the same thing. Under `random`
    //    it is how often; under `valueNoise` it is how wide a band. Both are
    //    proportion of area, which is why one number serves and no second
    //    parameter is needed."
    //
    // The first clause holds and the second does not. A weight is proportion of
    // area only where t is uniformly distributed. `random` is uniform by
    // construction and `gradient` is a linear ramp, so both match their weights
    // exactly. `valueNoise` is not: each octave bilinearly averages four uniform
    // corner values and the octaves are then averaged together, so the output is
    // bell-shaped -- and more sharply so with every added octave.
    //
    // Measured over a 200x200 grid with palette [water:1, sand:1, grass:3],
    // whose authored shares are 20% / 20% / 60%:
    //
    //   random               water 20.2%  sand 19.8%  grass 60.0%   <- matches
    //   gradient 90          water 20.0%  sand 20.0%  grass 60.0%   <- matches
    //   valueNoise octaves 1 water  9.9%  sand 24.6%  grass 65.5%
    //   valueNoise octaves 2 water  2.8%  sand 25.8%  grass 71.4%
    //   valueNoise octaves 3 water  1.1%  sand 24.7%  grass 74.1%
    //
    // This bites exactly where 04 §6.3's own worked example lives. That example
    // is about valueNoise -- "cells below 0.2 are contiguous. Lakes, then
    // shorelines, then grass" -- and at two octaves there are essentially no
    // lakes. An author writing [1, 1, 3] and expecting a fifth of the canvas
    // under water gets a thirty-fifth of it.
    //
    // Not an implementation defect: valueNoise is transcribed from 04 §5.2
    // without variation, its totality proof holds, and the palette walk is 04
    // §6.3's. Only the claim about what a weight means is wrong for one Source.
    // Pinned rather than worked around, and reported rather than amended.
    const bell = (t: number): number => {
      // A crude stand-in for valueNoise's shape: the mean of four uniforms.
      // Exercises the same property without depending on the hash.
      return t;
    };
    void bell;

    // Uniform t -- the claim holds.
    let uniformWater = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (applyTileMapping(palette, i / n) === "water") uniformWater++;
    expect(uniformWater / n).toBeCloseTo(0.2, 2);

    // Bell-shaped t -- the claim fails. Mean of four uniforms, matching the
    // bilinear average of one valueNoise octave.
    let bellWater = 0;
    for (let i = 0; i < n; i++) {
      const t = (((i * 2654435761) % 997) / 997 + ((i * 40503) % 991) / 991 +
        ((i * 2246822519) % 983) / 983 + ((i * 3266489917) % 977) / 977) / 4;
      if (applyTileMapping(palette, t) === "water") bellWater++;
    }
    expect(bellWater / n).toBeLessThan(0.15); // authored share is 0.2
  });
});

describe("Blends and Targets — 04 §7.2, ADR-001", () => {
  it("registers the three V1 Blends", () => {
    expect(blends.names().sort()).toEqual(["add", "multiply", "set"]);
  });

  it("has Blends declare accepted Target types, not the reverse — O7", () => {
    expect(blends.get("set").accepts).toEqual(["numeric", "tile"]);
    expect(blends.get("add").accepts).toEqual(["numeric"]);
    expect(blends.get("multiply").accepts).toEqual(["numeric"]);
  });

  it("derives 04 §7.2's accepted-set table, row by row", () => {
    const expected: Record<TargetName, string[]> = {
      tileId: ["set"],
      scaleX: ["set", "add", "multiply"],
      scaleY: ["set", "add", "multiply"],
      rotation: ["set", "add"],
      opacity: ["set", "add", "multiply"],
    };
    for (const [target, accepted] of Object.entries(expected)) {
      expect(acceptedBlends(target as TargetName).sort()).toEqual([...accepted].sort());
    }
  });

  it("vetoes multiply on rotation — no authoring meaning under a wrapping domain", () => {
    expect(isAccepted("rotation", "multiply")).toBe(false);
    expect(isAccepted("rotation", "add")).toBe(true);
  });

  it("accepts only set on tileId — add on a tile palette is meaningless", () => {
    expect(acceptedBlends("tileId")).toEqual(["set"]);
    expect(isAccepted("tileId", "add")).toBe(false);
  });

  it("gives every Target a default Blend of set", () => {
    for (const spec of Object.values(TARGETS)) expect(spec.default).toBe("set");
  });

  it("makes a newly registered numeric Blend available everywhere at once — X2", () => {
    // The property ADR-001 bought, and the obligation it carries: review the veto
    // column, or ship a control that produces nonsense.
    // Registers into the shared registry, so this test is deliberately last.
    const before = acceptedBlends("opacity").length;
    blends.register({
      name: "__test_min",
      params: {},
      accepts: ["numeric"],
      impl: (v, p) => Math.min(v as number, p as number),
    });
    expect(acceptedBlends("opacity")).toHaveLength(before + 1);
    expect(acceptedBlends("tileId")).toEqual(["set"]); // tile type unaffected
  });

  it("computes the V1 Blends correctly — 04 §7.1", () => {
    expect(blends.get("set").impl(5, 99)).toBe(5);
    expect(blends.get("add").impl(0.5, 1)).toBe(1.5);
    expect(blends.get("multiply").impl(0.5, 1)).toBe(0.5);
    // add with a negative range subtracts, which is why `subtract` is absent.
    expect(blends.get("add").impl(-5, 10)).toBe(5);
  });
});
