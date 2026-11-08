import { describe, expect, it } from "vitest";
import { marqueeDuration } from "./marquee.js";

describe("marqueeDuration", () => {
  it("is distance over speed, so longer text takes longer", () => {
    expect(marqueeDuration(400, 40)).toBe(10);
    expect(marqueeDuration(80, 40)).toBe(2);
  });

  it("is 0, meaning no animation, when nothing overflows or the speed is unusable", () => {
    expect(marqueeDuration(0, 40)).toBe(0);
    expect(marqueeDuration(-5, 40)).toBe(0);
    expect(marqueeDuration(100, 0)).toBe(0);
    expect(marqueeDuration(100, Number.NaN)).toBe(0);
  });
});
