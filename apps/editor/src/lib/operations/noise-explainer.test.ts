import { describe, expect, it } from "vitest";
import { labelFor } from "./labels.js";
import { NOISE_EXPLAINER } from "./noise-explainer.js";

describe("NOISE_EXPLAINER", () => {
  it("has one bar row per Octaves value, three entries each, rounding to about 100%", () => {
    expect(NOISE_EXPLAINER.shares.map((r) => r.label)).toEqual(["1", "2", "3"]);
    for (const row of NOISE_EXPLAINER.shares) {
      expect(row.shares).toHaveLength(3);
      expect(Math.abs(row.shares.reduce((a, b) => a + b, 0) - 100)).toBeLessThanOrEqual(2);
    }
  });

  it("names the params by their labels, as the fields show them", () => {
    expect(NOISE_EXPLAINER.params.map((p) => p.name)).toEqual([labelFor("cellsPerFeature"), labelFor("octaves")]);
  });
});
