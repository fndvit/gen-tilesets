/**
 * How far to scroll so that something the user just opened can be seen
 * (B-020, batch 01 T-09). `Collapsible` calls it when its body has finished
 * sliding open.
 *
 * The rule: scroll down until the opened thing's bottom is in view, **but
 * never so far that its top leaves the top of the view**. A section taller
 * than the view ends with its header at the top instead, so the user still
 * sees what they opened and can read down from there. Nothing ever scrolls
 * up: the user just clicked the header, so it is already on screen.
 *
 * It scrolls with `tweenScroll` over `--dur-slow` (batch 03 T-05), and closing
 * uses `closeDrop` with it so the fold never clamps the scroll (see there).
 *
 * Rejected: `scrollIntoView({ block: "nearest" })`. It does the first half of
 * the rule, but for an element taller than the view it aligns the *bottom*
 * when it was below, so the header the user clicked leaves the screen. It also
 * cannot know that a stuck section header (T-08) covers the top of the view.
 */

/** A vertical span in one coordinate space (client px). */
export interface Span {
  top: number;
  bottom: number;
}

/**
 * The px to scroll down so `target` is revealed in `view`; 0 for none.
 *
 * `topInset` is how much of the view's top is covered by something stuck
 * there (an enclosing section's sticky header), which the target's top must
 * stay below. Less than a pixel of overflow is subpixel rounding, not hidden
 * content, and does not scroll.
 */
export function revealDelta(view: Span, target: Span, topInset = 0): number {
  const hidden = target.bottom - view.bottom;
  if (hidden < 1) return 0;
  const room = target.top - (view.top + topInset);
  if (room <= 0) return 0;
  return Math.min(hidden, room);
}

/** The parts of an element `scrollParent` reads, so a test can pass a plain object. */
export interface ScrollNode {
  parentElement: ScrollNode | null;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * The nearest ancestor of `node` that scrolls vertically and has something to
 * scroll, or null.
 *
 * Null means `Collapsible` is not inside a scroll container (a story page, a
 * dialog), and then nothing scrolls: the page itself is never scrolled from
 * here. The root element's computed `overflow-y` is `visible`, so it is never
 * returned, even in the narrow layout where the page scrolls; the sidebar has
 * its own scroller there too.
 */
export function scrollParent(
  node: ScrollNode | null,
  overflowY: (element: ScrollNode) => string = (element) =>
    getComputedStyle(element as unknown as Element).overflowY,
): ScrollNode | null {
  for (let at = node?.parentElement ?? null; at; at = at.parentElement) {
    const overflow = overflowY(at);
    if ((overflow === "auto" || overflow === "scroll") && at.scrollHeight > at.clientHeight) return at;
  }
  return null;
}

/**
 * Scroll `element`'s scroll container so `element` is revealed (see the
 * module comment), over `duration` ms (0: at once). Does nothing outside a
 * scroll container.
 */
export function revealInScroller(element: HTMLElement, topInset: number, duration: number): void {
  const scroller = scrollParent(element) as HTMLElement | null;
  if (!scroller) return;
  // The visible part of the scroller: its padding box, inside any border.
  const box = scroller.getBoundingClientRect();
  const top = box.top + scroller.clientTop;
  const view = { top, bottom: top + scroller.clientHeight };
  const delta = revealDelta(view, element.getBoundingClientRect(), topInset);
  if (delta > 0) tweenScroll(scroller, delta, duration, cssEase(scroller));
}

/**
 * Closing (B-028, batch 03 T-05): how far the scroller has to move **up** so
 * that removing `bodyHeight` px of content never clamps it; 0 for none.
 *
 * Why this exists. A section's body slides shut while the scroller is near
 * its bottom; the content gets shorter, and the browser clamps `scrollTop`
 * to the new maximum instead of scrolling. Measured before this change
 * (closing Operations scrolled to the bottom, `status-B.md` T-05): the clamp
 * dropped 210 px in one frame, then nothing moved for the rest of the fold,
 * then the last 494 px dropped in one frame when the body was removed. The
 * pause is OperationCard's visually hidden "Operation N:": absolutely
 * positioned against `ScrollArea`'s viewport, it escapes the fold's
 * `overflow: hidden` and holds the scroll height at the old bottom.
 * Scrolling up by exactly this amount, on the same curve and over the same
 * time as the fold, keeps `scrollTop` at or below the maximum on every frame,
 * whatever holds the height, so the browser never clamps and the move is ours.
 *
 * Why that holds: with `gap` the distance to the bottom now, this is
 * `bodyHeight − gap`; at fold progress `e` the scroll has moved
 * `(bodyHeight − gap)·e` while the maximum fell by `bodyHeight·e`, which
 * leaves `gap·e ≥ 0` of room.
 */
export function closeDrop(
  scroller: { scrollTop: number; clientHeight: number; scrollHeight: number },
  bodyHeight: number,
): number {
  const drop = scroller.scrollTop + scroller.clientHeight - (scroller.scrollHeight - bodyHeight);
  // Never past the top. Then what is left is shorter than the view, and the
  // browser's clamp to 0 is the only place the fold can end anyway.
  return Math.max(0, Math.min(scroller.scrollTop, drop));
}

/** An easing curve: progress in [0, 1] → eased progress, 0 → 0 and 1 → 1. */
export type Ease = (t: number) => number;

/**
 * CSS `cubic-bezier(x1, y1, x2, y2)` as a function, so a scroll driven from
 * JavaScript follows the same `--ease` the CSS transitions use, and the fold
 * (`Collapsible`) and the scroll that leads it share one curve.
 *
 * Solves x(s) = t for the curve parameter by bisection: 30 halvings put s
 * within 1e-9, far below a pixel, and bisection cannot diverge where the
 * curve is steep (Newton's method can, at `--ease`'s start).
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < t) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}

/**
 * A CSS easing value as a function: `cubic-bezier(…)`, `linear`, or CSS's own
 * `ease` for anything else. Only what `tokens.css` writes is parsed; the
 * fallback is the browser's default curve, so a token this does not read
 * still eases instead of throwing in the middle of a click.
 */
export function parseEase(value: string): Ease {
  const v = value.trim();
  if (v === "linear") return (t) => Math.min(1, Math.max(0, t));
  const n = /^cubic-bezier\(([^)]*)\)$/.exec(v)?.[1]?.split(",").map(Number);
  if (n && n.length === 4 && n.every(Number.isFinite)) return cubicBezier(n[0]!, n[1]!, n[2]!, n[3]!);
  return cubicBezier(0.25, 0.1, 0.25, 1);
}

/** The `--ease` token on `element`, as a function. */
export function cssEase(element: Element, name = "--ease"): Ease {
  return parseEase(getComputedStyle(element).getPropertyValue(name));
}

/** What `tweenScroll` writes to: an `HTMLElement` in the editor, a plain object in a test. */
export interface Scrollable {
  scrollTop: number;
}

/** The frame clock `tweenScroll` runs on: `requestAnimationFrame` in a browser. */
export interface Frames {
  now(): number;
  request(callback: (time: number) => void): number;
  cancel(id: number): void;
}

/**
 * The document timeline's time, not `performance.now()`: it is the clock the
 * fold's Web Animation and every `requestAnimationFrame` timestamp read, and
 * it is the start of the current frame, earlier than `performance.now()`. A
 * tween timed from `performance.now()` ran up to a frame behind the fold it
 * leads, and the browser clamped the scroll on that frame (seen in T-05).
 */
const browserFrames: Frames = {
  now: () => Number(document.timeline?.currentTime ?? performance.now()),
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

/**
 * Whether someone else moved the scroller since the last step left it at
 * `left`, on its way to `end`. Less than a pixel is the browser keeping
 * `scrollTop` on device pixels. A move further along the tween's own way, no
 * further than its end, is the browser clamping as content shrinks under it
 * (a close that has got a frame ahead): the tween keeps going, or it would
 * hand the rest of the drop back to the clamp it exists to prevent.
 */
export function moved(now: number, left: number, end: number): boolean {
  if (Math.abs(now - left) <= 1) return false;
  const lo = Math.min(left, end);
  const hi = Math.max(left, end);
  return now < lo - 1 || now > hi + 1;
}

/** The tween running on each scroller, so a new one replaces it instead of fighting it. */
const running = new WeakMap<Scrollable, () => void>();

/**
 * Scroll `scroller` by `delta` px over `duration` ms along `ease`, one step
 * per frame. Returns a function that stops it where it is.
 *
 * Replaces `scrollBy({ behavior: "smooth" })`, whose duration and curve are
 * the browser's and cannot be set (B-028): closing has to move on exactly the
 * fold's clock, and opening is given `--dur-slow`. `duration` 0 (reduced
 * motion, through `motionDuration`) jumps at once.
 *
 * The last step writes the end value exactly, not eased to within a rounding.
 * A wheel or drag during the tween stops it, as it stops a native smooth
 * scroll (see `moved`).
 * The clock starts at the call, not at the first frame, so a tween started
 * with a fold is never behind it.
 */
export function tweenScroll(
  scroller: Scrollable,
  delta: number,
  duration: number,
  ease: Ease,
  frames: Frames = browserFrames,
): () => void {
  running.get(scroller)?.();
  const start = scroller.scrollTop;
  if (duration <= 0 || delta === 0) {
    scroller.scrollTop = start + delta;
    return () => {};
  }
  const begun = frames.now();
  let left = start;
  let id = 0;
  const stop = () => {
    frames.cancel(id);
    if (running.get(scroller) === stop) running.delete(scroller);
  };
  const end = start + delta;
  const step = (time: number) => {
    if (moved(scroller.scrollTop, left, end)) return stop();
    const t = Math.min(1, Math.max(0, (time - begun) / duration));
    scroller.scrollTop = start + delta * ease(t);
    // Read back: the browser keeps scrollTop on device pixels and in range.
    left = scroller.scrollTop;
    if (t < 1) id = frames.request(step);
    else stop();
  };
  id = frames.request(step);
  running.set(scroller, stop);
  return stop;
}
