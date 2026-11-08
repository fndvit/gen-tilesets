import { describe, expect, it } from "vitest";
import { ICONS } from "./icons.js";

describe("ICONS", () => {
  it("draws every icon at one size, on one grid, with one stroke", () => {
    for (const [name, icon] of Object.entries(ICONS)) {
      expect([icon.w, icon.h, icon.box, icon.strokeWidth], name).toEqual([16, 16, 24, 2.25]);
    }
  });

  it("holds path data only: no colour baked in, so Icon can draw with currentColor", () => {
    for (const [name, icon] of Object.entries(ICONS)) {
      expect(icon.d, name).toMatch(/^[Mm][\d\s.,MLHVCSAZmlhvcsaz-]+$/);
    }
  });
});
