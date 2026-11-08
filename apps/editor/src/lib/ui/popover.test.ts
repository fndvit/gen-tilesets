import { describe, expect, it } from "vitest";
import { keepInside, placeAt, pressedOutside } from "./popover.js";

const viewport = { width: 1000, height: 800 };
const anchor = { top: 100, bottom: 130, left: 40, right: 140 };

describe("placeAt", () => {
  it("hangs under the trigger, with both of its side edges as offsets", () => {
    expect(placeAt(anchor, viewport, 200)).toEqual({ top: 130, left: 40, right: 860, up: false });
  });

  it("opens upward when less than `room` is left below", () => {
    const low = { ...anchor, top: 650, bottom: 680 };
    expect(placeAt(low, viewport, 200)).toEqual({ top: 650, left: 40, right: 860, up: true });
    expect(placeAt(low, viewport, 100).up).toBe(false);
  });
});

describe("keepInside", () => {
  it("leaves an offset that already fits", () => {
    expect(keepInside(40, 200, 1000, 8)).toBe(40);
  });

  it("pulls a panel back from the far edge", () => {
    expect(keepInside(162, 208, 320, 8)).toBe(104);
  });

  it("keeps the near margin when the panel is wider than the room", () => {
    expect(keepInside(162, 400, 320, 8)).toBe(8);
    expect(keepInside(-20, 100, 320, 8)).toBe(8);
  });
});

describe("pressedOutside", () => {
  const node = {} as Node;
  const holds = { contains: (n: Node) => n === node };
  const lacks = { contains: () => false };

  it("is false when the press is inside the panel or its trigger", () => {
    expect(pressedOutside(node, [lacks, holds])).toBe(false);
  });

  it("is true when nothing holds it, an unmounted panel included", () => {
    expect(pressedOutside(node, [lacks, undefined])).toBe(true);
  });
});
