import { describe, expect, it } from "vitest";
import {
  closeDrop,
  cubicBezier,
  moved,
  parseEase,
  revealDelta,
  scrollParent,
  tweenScroll,
  type Frames,
  type ScrollNode,
} from "./reveal.js";

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

describe("closeDrop", () => {
  it("is 0 when the scroller is far enough from its bottom to absorb the body", () => {
    // 2000 tall, 500 shown, at 0: 1500 below the view; a 400 px body leaves 1100.
    expect(closeDrop({ scrollTop: 0, clientHeight: 500, scrollHeight: 2000 }, 400)).toBe(0);
    expect(closeDrop({ scrollTop: 1100, clientHeight: 500, scrollHeight: 2000 }, 400)).toBe(0);
  });

  it("is the body less the distance to the bottom when the body is nearer", () => {
    // At the bottom: the whole body would clamp.
    expect(closeDrop({ scrollTop: 1500, clientHeight: 500, scrollHeight: 2000 }, 400)).toBe(400);
    // 100 px from the bottom: 300 of the body would clamp.
    expect(closeDrop({ scrollTop: 1400, clientHeight: 500, scrollHeight: 2000 }, 400)).toBe(300);
  });

  it("never asks to scroll past the top", () => {
    // A body taller than everything above the view: the drop is what is there.
    expect(closeDrop({ scrollTop: 200, clientHeight: 500, scrollHeight: 700 }, 600)).toBe(200);
  });

  it("keeps the scroll at or under its maximum for every frame of an eased fold", () => {
    const start = { scrollTop: 1400, clientHeight: 500, scrollHeight: 2000 };
    const body = 400;
    const drop = closeDrop(start, body);
    const ease = cubicBezier(0.2, 0, 0, 1);
    for (let i = 0; i <= 20; i++) {
      const e = ease(i / 20);
      const top = start.scrollTop - drop * e;
      const max = start.scrollHeight - body * e - start.clientHeight;
      expect(top).toBeLessThanOrEqual(max + 1e-9);
    }
  });
});

describe("cubicBezier and parseEase", () => {
  it("runs from 0 to 1 exactly", () => {
    const ease = cubicBezier(0.2, 0, 0, 1);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(-1)).toBe(0);
    expect(ease(2)).toBe(1);
  });

  it("is the identity on the straight curve, and front-loads --ease", () => {
    const line = cubicBezier(0, 0, 1, 1);
    for (const t of [0.1, 0.25, 0.5, 0.9]) expect(line(t)).toBeCloseTo(t, 6);
    const ease = cubicBezier(0.2, 0, 0, 1);
    expect(ease(0.5)).toBeGreaterThan(0.8);
  });

  it("parses the token's text", () => {
    expect(parseEase(" cubic-bezier(0.2, 0, 0, 1)")(0.5)).toBeCloseTo(cubicBezier(0.2, 0, 0, 1)(0.5), 9);
    expect(parseEase("linear")(0.3)).toBe(0.3);
    // Anything else is CSS's `ease`, not an error.
    expect(parseEase("")(0.5)).toBeCloseTo(cubicBezier(0.25, 0.1, 0.25, 1)(0.5), 9);
  });
});

/** A frame clock the test advances by hand. */
function fakeFrames() {
  let time = 1000;
  let next = 1;
  const queue = new Map<number, (time: number) => void>();
  const frames: Frames = {
    now: () => time,
    request: (callback) => {
      queue.set(next, callback);
      return next++;
    },
    cancel: (id) => void queue.delete(id),
  };
  const advance = (ms: number) => {
    time += ms;
    const due = [...queue.values()];
    queue.clear();
    for (const callback of due) callback(time);
  };
  return { frames, advance, pending: () => queue.size };
}

const line = (t: number) => t;

describe("tweenScroll", () => {
  it("starts where the scroller is and ends exactly at start + delta", () => {
    const { frames, advance, pending } = fakeFrames();
    const scroller = { scrollTop: 100 };
    tweenScroll(scroller, 200, 300, line, frames);
    expect(scroller.scrollTop).toBe(100);
    advance(0);
    expect(scroller.scrollTop).toBe(100);
    advance(150);
    expect(scroller.scrollTop).toBe(200);
    advance(150);
    expect(scroller.scrollTop).toBe(300);
    expect(pending()).toBe(0);
  });

  it("scrolls up for a negative delta, along the curve it is given", () => {
    const { frames, advance } = fakeFrames();
    const scroller = { scrollTop: 500 };
    const ease = cubicBezier(0.2, 0, 0, 1);
    tweenScroll(scroller, -220, 220, ease, frames);
    advance(110);
    expect(scroller.scrollTop).toBeCloseTo(500 - 220 * ease(0.5), 9);
    advance(500);
    expect(scroller.scrollTop).toBe(280);
  });

  it("jumps at once with no duration (reduced motion)", () => {
    const { frames, pending } = fakeFrames();
    const scroller = { scrollTop: 40 };
    tweenScroll(scroller, 60, 0, line, frames);
    expect(scroller.scrollTop).toBe(100);
    expect(pending()).toBe(0);
  });

  it("stops when something else moves the scroller", () => {
    const { frames, advance, pending } = fakeFrames();
    const scroller = { scrollTop: 0 };
    tweenScroll(scroller, 300, 300, line, frames);
    advance(100);
    expect(scroller.scrollTop).toBe(100);
    scroller.scrollTop = 40; // a wheel
    advance(100);
    expect(scroller.scrollTop).toBe(40);
    expect(pending()).toBe(0);
  });

  it("keeps going when the browser clamps it further along its own way", () => {
    const { frames, advance, pending } = fakeFrames();
    const scroller = { scrollTop: 500 };
    tweenScroll(scroller, -300, 300, line, frames);
    advance(100);
    expect(scroller.scrollTop).toBe(400);
    scroller.scrollTop = 380; // the fold got a frame ahead and the browser clamped
    advance(100);
    expect(scroller.scrollTop).toBe(300);
    expect(pending()).toBe(1);
  });

  it("tolerates the browser rounding what it wrote", () => {
    const { frames, advance } = fakeFrames();
    let stored = 0;
    // A scroller that keeps scrollTop on whole pixels, as a browser does at 1x.
    const scroller = {
      get scrollTop() {
        return stored;
      },
      set scrollTop(v: number) {
        stored = Math.round(v);
      },
    };
    tweenScroll(scroller, 100, 300, line, frames);
    advance(100);
    advance(100);
    advance(100);
    expect(scroller.scrollTop).toBe(100);
  });

  it("replaces a tween already running on the same scroller", () => {
    const { frames, advance, pending } = fakeFrames();
    const scroller = { scrollTop: 0 };
    tweenScroll(scroller, 300, 300, line, frames);
    advance(150);
    tweenScroll(scroller, -150, 100, line, frames);
    expect(pending()).toBe(1);
    advance(100);
    expect(scroller.scrollTop).toBe(0);
  });

  it("can be stopped where it is", () => {
    const { frames, advance, pending } = fakeFrames();
    const scroller = { scrollTop: 0 };
    const stop = tweenScroll(scroller, 300, 300, line, frames);
    advance(100);
    stop();
    expect(pending()).toBe(0);
    expect(scroller.scrollTop).toBe(100);
  });
});

describe("moved", () => {
  it("ignores subpixel differences", () => {
    expect(moved(100.6, 100, 300)).toBe(false);
    expect(moved(99.4, 100, 300)).toBe(false);
  });

  it("is a move against the tween's way, or past its end", () => {
    expect(moved(90, 100, 300)).toBe(true);
    expect(moved(310, 100, 300)).toBe(true);
    expect(moved(410, 400, 200)).toBe(true);
  });

  it("is not a move along the tween's way, up to its end", () => {
    expect(moved(150, 100, 300)).toBe(false);
    expect(moved(250, 400, 200)).toBe(false);
  });
});
