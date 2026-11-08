import { describe, expect, it } from "vitest";
import { RANDOMNESS_EXPLAINER } from "./randomness-explainer.js";

describe("RANDOMNESS_EXPLAINER", () => {
  it("names each way to draw again, as the editor labels it", () => {
    expect(RANDOMNESS_EXPLAINER.params.map((p) => p.name)).toEqual([
      "Seed",
      "Re-seed (on an operation's card)",
      "Reroll assets",
      "Assets on load / Reseed on load",
    ]);
  });

  it("has no measured figures, so the popover draws no bars", () => {
    expect(RANDOMNESS_EXPLAINER.shares).toEqual([]);
  });
});
