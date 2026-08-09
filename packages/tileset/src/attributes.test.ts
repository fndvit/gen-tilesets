import { describe, expect, it } from "vitest";
import { ATTRIBUTES, bound, initialTileState, writeAttribute } from "./attributes.js";

describe("the V1 attribute set — 03 §5.4", () => {
  it("declares a domain, a default, and a bounding for every attribute — D4", () => {
    for (const spec of Object.values(ATTRIBUTES)) {
      expect(typeof spec.default).toBe("number");
      expect(["clamp", "wrap", "none"]).toContain(spec.bounding);
    }
  });

  it("defaults opacity to 1 so painting a Tile makes it visible — 03 §5.4", () => {
    // A default of 0 would make every stack begin with a redundant step.
    expect(initialTileState().opacity).toBe(1);
  });

  it("initializes every cell to tileId null — 02 §8.1, G4", () => {
    const s = initialTileState();
    expect(s.tileId).toBeNull();
    expect(s.assetId).toBeNull();
    expect(s.scaleX).toBe(1);
    expect(s.scaleY).toBe(1);
    expect(s.rotation).toBe(0);
  });
});

describe("bounding", () => {
  it("leaves scale unbounded — 03 §5.4", () => {
    expect(bound(ATTRIBUTES.scaleX, 1e6)).toBe(1e6);
    expect(bound(ATTRIBUTES.scaleX, -3)).toBe(-3); // a flip
  });

  it("clamps opacity to [0, 1]", () => {
    expect(bound(ATTRIBUTES.opacity, 1.5)).toBe(1);
    expect(bound(ATTRIBUTES.opacity, -0.2)).toBe(0);
    expect(bound(ATTRIBUTES.opacity, 0.4)).toBe(0.4);
  });

  it("wraps rotation over [0, 360) with a true modulo, not JS %", () => {
    // JS `%` is a remainder and takes the sign of its left operand, so -10 % 360
    // is -10. A rotation reached by `add` with a negative range is the ordinary
    // case, not an edge one (04 §6.1's jitter example uses [-5, 5]).
    expect(bound(ATTRIBUTES.rotation, -10)).toBe(350);
    expect(bound(ATTRIBUTES.rotation, 370)).toBe(10);
    expect(bound(ATTRIBUTES.rotation, -370)).toBe(350);
    expect(bound(ATTRIBUTES.rotation, 90)).toBe(90);
  });

  it("wraps 360 to 0 — 04 §6.2's duplicate-endpoint gotcha", () => {
    expect(bound(ATTRIBUTES.rotation, 360)).toBe(0);
  });
});

describe("writeAttribute", () => {
  it("discards a non-finite result and keeps the previous value — D6", () => {
    const s = initialTileState();
    s.scaleX = 2;
    writeAttribute(s, "scaleX", Number.NaN);
    expect(s.scaleX).toBe(2);
    writeAttribute(s, "scaleX", Number.POSITIVE_INFINITY);
    expect(s.scaleX).toBe(2);
    writeAttribute(s, "scaleX", Number.NEGATIVE_INFINITY);
    expect(s.scaleX).toBe(2);
  });

  it("emits only finite values — D6", () => {
    const s = initialTileState();
    writeAttribute(s, "scaleY", 1 / 0);
    expect(Number.isFinite(s.scaleY)).toBe(true);
  });

  it("bounds after every write, never at emit — 03 §5.2's worked example, D5", () => {
    // opacity starts at 1. Operation A adds 0.5; Operation B multiplies by 0.5.
    //   per-write bounding: 1 -> clamp(1.5) = 1 -> 0.5   <- correct
    //   bounding at emit:   1 -> 1.5 -> 0.75
    const s = initialTileState();
    writeAttribute(s, "opacity", s.opacity + 0.5);
    expect(s.opacity).toBe(1); // clamped immediately, and the 1.5 is gone
    writeAttribute(s, "opacity", s.opacity * 0.5);
    expect(s.opacity).toBe(0.5);
  });

  it("keeps the accumulated value in-domain at every point in the stack — D5", () => {
    const s = initialTileState();
    for (const v of [5, -3, 0.7, 99]) {
      writeAttribute(s, "opacity", v);
      expect(s.opacity).toBeGreaterThanOrEqual(0);
      expect(s.opacity).toBeLessThanOrEqual(1);
    }
  });
});
