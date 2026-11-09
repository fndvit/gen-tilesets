import { describe, expect, it } from "vitest";
import { keepInside, placeAt, placeBeside, placeOnLargerSide, pressedOutside } from "./popover.js";

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

describe("placeOnLargerSide", () => {
  it("opens below when the panel fits there", () => {
    expect(placeOnLargerSide(anchor, viewport, 600)).toEqual({ top: 130, left: 40, right: 860, up: false });
  });

  it("opens above when it does not fit below and above has more room", () => {
    const low = { ...anchor, top: 500, bottom: 530 };
    expect(placeOnLargerSide(low, viewport, 300).up).toBe(true);
  });

  it("stays below when it fits on neither side but below has more room", () => {
    const high = { ...anchor, top: 300, bottom: 330 };
    expect(placeOnLargerSide(high, viewport, 700).up).toBe(false);
  });

  it("stays below on a tie", () => {
    const middle = { ...anchor, top: 385, bottom: 415 };
    expect(placeOnLargerSide(middle, viewport, 500).up).toBe(false);
  });
});

describe("placeBeside", () => {
  const sidebar = { top: 0, bottom: 800, left: 0, right: 400 };
  const size = { width: 340, height: 300 };

  it("sits right of the sidebar, level with the trigger", () => {
    expect(placeBeside(sidebar, anchor, viewport, size, 8)).toEqual({ top: 100, left: 408, maxHeight: 784 });
  });

  it("moves up just enough to keep the whole panel inside the window", () => {
    const low = { ...anchor, top: 700, bottom: 730 };
    expect(placeBeside(sidebar, low, viewport, size, 8)?.top).toBe(492);
  });

  it("sits at the top margin and scrolls when taller than the window", () => {
    const tall = { width: 340, height: 1200 };
    expect(placeBeside(sidebar, anchor, viewport, tall, 8)).toEqual({ top: 8, left: 408, maxHeight: 784 });
  });

  it("gives up when the panel does not fit beside the sidebar", () => {
    // The stacked layout: the sidebar spans the window.
    expect(placeBeside({ ...sidebar, right: 320 }, anchor, { width: 320, height: 800 }, size, 8)).toBeUndefined();
    // A preview column narrower than the panel.
    expect(placeBeside(sidebar, anchor, { width: 700, height: 800 }, size, 8)).toBeUndefined();
    expect(placeBeside(sidebar, anchor, { width: 756, height: 800 }, size, 8)).toBeDefined();
  });
});
