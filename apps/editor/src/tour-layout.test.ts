/**
 * The tour's geometry (B-017, O3b): targets with their fallbacks, the
 * cut-outs, scrolling to a target, and the bubble's three placements.
 */

import { describe, expect, it } from "vitest";
import { aboveOrBelow, clip, cutout, oneWindow, placeBubble, reach, resolveTargets, scrollDelta, type BubbleInput } from "./tour-layout.js";
import type { TargetKey } from "./tour.js";

const box = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h });

describe("resolveTargets", () => {
  const present = (...keys: TargetKey[]) => (key: TargetKey) => (keys.includes(key) ? key : undefined);

  it("finds nothing for Welcome", () => {
    expect(resolveTargets({ targets: [] }, present("grid"))).toEqual([]);
  });

  it("finds every target that is there", () => {
    expect(resolveTargets({ targets: ["op-1", "preview"], fallback: "ops-add" }, present("op-1", "preview", "ops-add"))).toEqual([
      "op-1",
      "preview",
    ]);
  });

  it("uses the fallback alone when the first target is missing", () => {
    expect(resolveTargets({ targets: ["op-1", "preview"], fallback: "ops-add" }, present("preview", "ops-add"))).toEqual(["ops-add"]);
    expect(resolveTargets({ targets: ["tile-group"], fallback: "tiles-header" }, present("tiles-header"))).toEqual(["tiles-header"]);
  });

  it("finds nothing when neither the target nor its fallback is there", () => {
    expect(resolveTargets({ targets: ["tile-group"], fallback: "tiles-header" }, present())).toEqual([]);
    expect(resolveTargets({ targets: ["grid"] }, present())).toEqual([]);
  });
});

describe("oneWindow", () => {
  const view = { width: 375, height: 812 };

  it("is true for one box, or none", () => {
    expect(oneWindow([], view)).toBe(true);
    expect(oneWindow([box(24, 104, 327, 2000)], view)).toBe(true);
  });

  it("is true when every box is inside the window: step 6 in two columns", () => {
    expect(oneWindow([box(16, 60, 400, 780), box(460, 120, 900, 500)], { width: 1440, height: 900 })).toBe(true);
  });

  it("is false when a box runs past the window: step 6 stacked", () => {
    // The open card's visible part, then the picture a window's height down (measured at 375 × 812).
    expect(oneWindow([box(24, 104, 327, 708), box(36, 1161, 303, 212)], view)).toBe(false);
  });

  it("is false when a box is wider than the window", () => {
    expect(oneWindow([box(0, 0, 200, 100), box(300, 0, 200, 100)], view)).toBe(false);
  });

  it("is false when a target's visible part is empty: clipped out of its scroller", () => {
    expect(oneWindow([box(340, 638, 28, 28), box(16, 700, 358, 0)], view)).toBe(false);
  });

  it("is false when the span would fit but a box lies below the window: step 5 at 390 × 844", () => {
    // The "+" in view; the picture whole (`reach`), 770px from the "+"'s top, under the window's 844.
    expect(oneWindow([box(312, 638, 28, 28), box(36, 1222, 318, 186)], { width: 390, height: 844 })).toBe(false);
  });

  it("is false when a box starts in the window and ends past it: step 11 stacked", () => {
    expect(oneWindow([box(24, 640, 342, 110), box(16, 790, 358, 186)], { width: 390, height: 844 })).toBe(false);
  });
});

describe("cutout", () => {
  it("grows the box by the pad on every side", () => {
    expect(cutout(box(10, 20, 100, 50), 4)).toEqual({ left: 6, top: 16, right: 114, bottom: 74 });
  });
});

describe("clip", () => {
  it("keeps the part inside, and collapses a box wholly outside to an empty one", () => {
    const sidebar = box(0, 60, 432, 600);
    expect(clip(box(24, 100, 384, 900), sidebar)).toEqual({ left: 24, top: 100, right: 408, bottom: 660 });
    expect(clip(box(24, 700, 384, 50), sidebar)).toEqual({ left: 24, top: 700, right: 408, bottom: 700 });
  });
});

describe("reach", () => {
  it("clips a target to its scroller, and keeps a page-scrolled one whole", () => {
    const sidebar = box(0, 60, 432, 600);
    expect(reach(box(24, 100, 384, 900), sidebar)).toEqual(clip(box(24, 100, 384, 900), sidebar));
    expect(reach(box(16, 800, 358, 500), null)).toEqual(box(16, 800, 358, 500));
  });

  it("keeps a page-scrolled target's part past the window: step 11 stacked", () => {
    // 390 × 844: operation 3's card at the window's bottom, the picture starting under it.
    // Clipped to the window, the picture would read as 54px tall and the pair as fitting.
    const card = box(24, 640, 342, 110);
    const picture = box(16, 790, 358, 186);
    expect(oneWindow([card, reach(picture, null)], { width: 390, height: 844 })).toBe(false);
  });
});

describe("scrollDelta", () => {
  const view = { top: 100, bottom: 700 };

  it("is 0 for a target in view", () => {
    expect(scrollDelta(view, { top: 200, bottom: 300 })).toBe(0);
  });

  it("scrolls down until the bottom shows, never past the top", () => {
    expect(scrollDelta(view, { top: 600, bottom: 800 })).toBe(100);
    expect(scrollDelta(view, { top: 650, bottom: 1500 })).toBe(550);
  });

  it("scrolls up to a target above the view, under a stuck header", () => {
    expect(scrollDelta(view, { top: 40, bottom: 90 })).toBe(-60);
    expect(scrollDelta(view, { top: 120, bottom: 160 }, 52)).toBe(-32);
  });
});

describe("aboveOrBelow", () => {
  const viewport = { width: 400, height: 800 };

  it("goes below when it fits", () => {
    expect(aboveOrBelow(box(0, 100, 100, 100), 200, viewport, 8)).toBe(208);
  });

  it("goes above when it doesn't fit below", () => {
    expect(aboveOrBelow(box(0, 600, 100, 100), 200, viewport, 8)).toBe(392);
  });

  it("fits on neither side: the window's bottom, covering the cut-out's end, not its head", () => {
    expect(aboveOrBelow(box(0, 300, 100, 400), 500, viewport, 8)).toBe(800 - 8 - 500);
    expect(aboveOrBelow(box(0, 60, 100, 900), 200, viewport, 8)).toBe(800 - 8 - 200);
  });

  it("never leaves the window's top for a bubble taller than the window", () => {
    expect(aboveOrBelow(box(0, 100, 100, 100), 900, viewport, 8)).toBe(8);
  });
});

describe("placeBubble", () => {
  const base: Omit<BubbleInput, "holes" | "inSidebar"> = {
    viewport: { width: 1440, height: 900 },
    sidebar: box(0, 0, 432, 900),
    width: 340,
    margin: 8,
    gutter: 16,
    heightAt: () => 160,
  };

  it("in two columns, sits beside the sidebar, level with the cut-out", () => {
    expect(placeBubble({ ...base, holes: [box(20, 200, 392, 300)], inSidebar: false })).toEqual({ top: 200, left: 440, width: 340 });
  });

  it("in two columns, moves up to stay inside the window", () => {
    expect(placeBubble({ ...base, holes: [box(20, 850, 392, 40)], inSidebar: false }).top).toBe(900 - 8 - 160);
  });

  it("on step 6 in two columns, stays in the sidebar column, below the card, left-aligned with it", () => {
    const card = box(24, 300, 384, 200);
    expect(placeBubble({ ...base, holes: [card, box(500, 100, 800, 500)], inSidebar: true })).toEqual({ top: 508, left: 24, width: 340 });
  });

  it("in the sidebar column, moves left of a small cut-out at the sidebar's right to keep its width", () => {
    const plus = box(368, 700, 28, 28);
    expect(placeBubble({ ...base, holes: [plus, box(500, 100, 800, 500)], inSidebar: true })).toEqual({ top: 700 - 8 - 160, left: 84, width: 340 });
  });

  it("on step 6, goes above the card when it doesn't fit below", () => {
    const card = box(24, 500, 384, 300);
    expect(placeBubble({ ...base, holes: [card], inSidebar: true }).top).toBe(500 - 8 - 160);
  });

  it("stacked, spans the window less the gutters and hangs below the cut-out, measured at that width", () => {
    const widths: number[] = [];
    const stacked = { ...base, viewport: { width: 375, height: 800 }, sidebar: box(0, 0, 375, 2000) };
    const placed = placeBubble({ ...stacked, holes: [box(16, 100, 343, 52)], inSidebar: false, heightAt: (w) => (widths.push(w), 200) });
    expect(placed).toEqual({ top: 160, left: 16, width: 343 });
    expect(widths).toEqual([343]);
  });

  it("stacked, step 6 too: the sidebar column is the window", () => {
    const stacked = { ...base, viewport: { width: 375, height: 800 }, sidebar: box(0, 0, 375, 2000) };
    expect(placeBubble({ ...stacked, holes: [box(16, 500, 343, 250)], inSidebar: true })).toEqual({ top: 500 - 8 - 160, left: 16, width: 343 });
  });

  it("falls back to stacked where the preview column is narrower than the bubble", () => {
    const narrow = { ...base, viewport: { width: 700, height: 800 }, sidebar: box(0, 0, 400, 800) };
    expect(placeBubble({ ...narrow, holes: [box(20, 100, 360, 52)], inSidebar: false })).toEqual({ top: 160, left: 16, width: 668 });
  });
});
