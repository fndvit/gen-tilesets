import { describe, expect, it } from "vitest";
import { ICONS } from "./icons.js";

describe("ICONS", () => {
  it("gives every stroke icon a width, and no fill icon one", () => {
    for (const [name, icon] of Object.entries(ICONS)) {
      if (icon.mode === "stroke") expect(icon, name).toHaveProperty("strokeWidth");
      else expect(icon, name).not.toHaveProperty("strokeWidth");
    }
  });

  it("holds path data only: no colour baked in, so Icon can draw with currentColor", () => {
    for (const [name, icon] of Object.entries(ICONS)) {
      expect(icon.d, name).toMatch(/^M[\d\s.,MLHVCZmlhvcz-]+$/);
      expect(icon.w, name).toBeGreaterThan(0);
      expect(icon.h, name).toBeGreaterThan(0);
    }
  });
});
