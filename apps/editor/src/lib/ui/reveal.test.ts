import { describe, expect, it } from "vitest";
import { revealDelta, scrollParent, type ScrollNode } from "./reveal.js";

const view = { top: 100, bottom: 600 };

describe("revealDelta", () => {
  it("does not scroll when the target is fully visible", () => {
    expect(revealDelta(view, { top: 150, bottom: 600 })).toBe(0);
    expect(revealDelta(view, { top: 100, bottom: 300 })).toBe(0);
  });

  it("scrolls the hidden bottom into view", () => {
    expect(revealDelta(view, { top: 400, bottom: 700 })).toBe(100);
  });

  it("stops with the top at the top of the view when the target is taller than the view", () => {
    expect(revealDelta(view, { top: 400, bottom: 1400 })).toBe(300);
  });

  it("keeps the top below a stuck header covering the view's top", () => {
    expect(revealDelta(view, { top: 400, bottom: 1400 }, 50)).toBe(250);
    expect(revealDelta(view, { top: 400, bottom: 700 }, 50)).toBe(100);
  });

  it("never scrolls up, and never scrolls a target whose top is already at or above the top", () => {
    expect(revealDelta(view, { top: 100, bottom: 900 })).toBe(0);
    expect(revealDelta(view, { top: 50, bottom: 900 })).toBe(0);
    expect(revealDelta(view, { top: 140, bottom: 900 }, 40)).toBe(0);
  });

  it("ignores subpixel overflow", () => {
    expect(revealDelta(view, { top: 300, bottom: 600.6 })).toBe(0);
  });
});

function node(overflow: string, scrollHeight: number, clientHeight: number, parent: ScrollNode | null = null) {
  return { parentElement: parent, scrollHeight, clientHeight, overflow };
}

const overflowOf = (n: ScrollNode) => (n as ReturnType<typeof node>).overflow;

describe("scrollParent", () => {
  it("finds the nearest ancestor that scrolls and has something to scroll", () => {
    const outer = node("auto", 2000, 500);
    const inner = node("scroll", 900, 300, outer);
    const plain = node("visible", 900, 900, inner);
    const leaf = node("visible", 100, 100, plain);
    expect(scrollParent(leaf, overflowOf)).toBe(inner);
  });

  it("skips a scroller with nothing to scroll and a clipping box", () => {
    const outer = node("auto", 2000, 500);
    const full = node("auto", 400, 400, outer);
    const clip = node("hidden", 900, 300, full);
    const leaf = node("visible", 100, 100, clip);
    expect(scrollParent(leaf, overflowOf)).toBe(outer);
  });

  it("never returns the element itself, and is null outside any scroller", () => {
    const self = node("auto", 900, 300, node("visible", 900, 900));
    expect(scrollParent(self, overflowOf)).toBeNull();
    expect(scrollParent(null, overflowOf)).toBeNull();
  });
});
