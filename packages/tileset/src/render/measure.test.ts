/**
 * The shared scheduler, against fake observers. Nothing here is a browser: the
 * elements are plain objects answering the four questions the scheduler asks
 * (`getBoundingClientRect`, `parentElement`, `contains`, `querySelectorAll`), and
 * the observers record what they were told and let a test fire them.
 */

import { describe, expect, it } from "vitest";
import { Scheduler, scopeOf, WRAPPER_ATTRIBUTE, type Measurement, type MeasureEnv } from "./measure.js";
import { normalizeTargets } from "./options.js";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The event log, shared by every fake so a test can check ordering. */
type Log = string[];

class FakeElement {
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  attributes = new Set<string>();
  constructor(
    readonly name: string,
    public rect: Rect,
    readonly log: Log,
    public tag = "div",
  ) {}
  append(child: FakeElement): FakeElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }
  getBoundingClientRect() {
    this.log.push(`read:${this.name}`);
    const r = this.rect;
    return { left: r.left, top: r.top, right: r.left + r.width, bottom: r.top + r.height, width: r.width, height: r.height };
  }
  contains(node: unknown): boolean {
    if (node === this) return true;
    return this.children.some((c) => c.contains(node));
  }
  querySelectorAll(selector: string): FakeElement[] {
    const out: FakeElement[] = [];
    const walk = (e: FakeElement) => {
      for (const c of e.children) {
        if (selector.split(",").map((s) => s.trim()).includes(c.tag)) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
}

function fakeEnv(log: Log) {
  const state = {
    ro: null as null | { cb: (e: never[]) => void; observed: Set<unknown> },
    roCount: 0,
    mo: null as null | { cb: (r: never[]) => void; observed: Set<unknown> },
    io: null as null | { cb: (e: never[]) => void; observed: Set<unknown> },
    frames: [] as Array<() => void>,
    fonts: new Map<string, () => void>(),
  };
  const env: MeasureEnv = {
    ResizeObserver: class {
      constructor(cb: (e: never[]) => void) {
        state.roCount++;
        state.ro = { cb, observed: new Set() };
      }
      observe(el: Element) {
        state.ro!.observed.add(el);
      }
      unobserve(el: Element) {
        state.ro!.observed.delete(el);
      }
      disconnect() {}
    } as unknown as NonNullable<MeasureEnv["ResizeObserver"]>,
    MutationObserver: class {
      constructor(cb: (r: never[]) => void) {
        state.mo = { cb, observed: new Set() };
      }
      observe(el: Node) {
        state.mo!.observed.add(el);
      }
      disconnect() {
        state.mo!.observed.clear();
      }
      takeRecords() {
        return [];
      }
    } as unknown as NonNullable<MeasureEnv["MutationObserver"]>,
    IntersectionObserver: class {
      constructor(cb: (e: never[]) => void) {
        state.io = { cb, observed: new Set() };
      }
      observe(el: Element) {
        state.io!.observed.add(el);
      }
      unobserve(el: Element) {
        state.io!.observed.delete(el);
      }
      disconnect() {}
    } as unknown as NonNullable<MeasureEnv["IntersectionObserver"]>,
    requestAnimationFrame: (cb) => state.frames.push(cb),
    fonts: {
      addEventListener: (type, cb) => state.fonts.set(type, cb),
      removeEventListener: (type) => state.fonts.delete(type),
    },
  };
  const runFrames = () => {
    const frames = state.frames.splice(0);
    for (const f of frames) f();
  };
  const resize = (target: FakeElement, width: number, height: number) =>
    state.ro!.cb([
      { target, borderBoxSize: [{ inlineSize: width, blockSize: height }], contentRect: { width, height } },
    ] as never[]);
  return { env, state, runFrames, resize };
}

/** A section holding a tileset box and a heading, 400 x 200 at (0, 100). */
function page(log: Log) {
  const section = new FakeElement("section", { left: 0, top: 100, width: 400, height: 200 }, log, "section");
  const box = section.append(new FakeElement("box", { left: 0, top: 100, width: 400, height: 200 }, log));
  const h1 = section.append(new FakeElement("h1", { left: 50, top: 150, width: 100, height: 30 }, log, "h1"));
  return { section, box, h1 };
}

const asEl = (e: FakeElement) => e as unknown as HTMLElement;

describe("Scheduler", () => {
  it("measures synchronously on track, in render space", () => {
    const log: Log = [];
    const { env } = fakeEnv(log);
    const { box, h1 } = page(log);
    const s = new Scheduler(env);
    const seen: Measurement[] = [];
    s.track(asEl(box), normalizeTargets([asEl(h1)]), (m) => seen.push(m));
    expect(seen).toHaveLength(1);
    expect(seen[0]!.width).toBe(400);
    expect(seen[0]!.rects).toEqual([{ left: 50, top: 50, right: 150, bottom: 80 }]);
  });

  it("measures only the box without targets — no mutation or intersection observers", () => {
    const log: Log = [];
    const { env, state } = fakeEnv(log);
    const { box } = page(log);
    const seen: Measurement[] = [];
    new Scheduler(env).track(asEl(box), null, (m) => seen.push(m));
    expect(seen[0]!.rects).toBeNull();
    expect(state.mo).toBeNull();
    expect(state.io).toBeNull();
    expect(state.fonts.size).toBe(0);
    expect([...state.ro!.observed]).toEqual([box]);
  });

  it("shares one ResizeObserver across every tileset on the page", () => {
    const log: Log = [];
    const { env, state } = fakeEnv(log);
    const s = new Scheduler(env);
    for (let i = 0; i < 5; i++) {
      const { box, h1 } = page(log);
      s.track(asEl(box), normalizeTargets([asEl(h1)]), () => {});
    }
    expect(state.roCount).toBe(1);
  });

  it("reads every tracker before calling any of them back", () => {
    const log: Log = [];
    const { env, state } = fakeEnv(log);
    const s = new Scheduler(env);
    const a = page(log);
    const b = page(log);
    s.track(asEl(a.box), normalizeTargets([asEl(a.h1)]), () => log.push("write:a"));
    s.track(asEl(b.box), normalizeTargets([asEl(b.h1)]), () => log.push("write:b"));
    log.length = 0;
    a.h1.rect = { ...a.h1.rect, width: 120 };
    b.h1.rect = { ...b.h1.rect, width: 130 };
    // One ResizeObserver delivery carrying both — one flush.
    state.ro!.cb([
      { target: a.h1, contentRect: { width: 120, height: 30 } },
      { target: b.h1, contentRect: { width: 130, height: 30 } },
    ] as never[]);
    const firstWrite = log.findIndex((e) => e.startsWith("write:"));
    expect(log.filter((e) => e.startsWith("write:"))).toEqual(["write:a", "write:b"]);
    expect(log.slice(firstWrite).some((e) => e.startsWith("read:"))).toBe(false);
    expect(log.slice(0, firstWrite)).toEqual(["read:box", "read:h1", "read:box", "read:h1"]);
  });

  it("takes the box width from the ResizeObserver, un-rounded", () => {
    const log: Log = [];
    const { env, resize } = fakeEnv(log);
    const { box } = page(log);
    const seen: Measurement[] = [];
    new Scheduler(env).track(asEl(box), null, (m) => seen.push(m));
    resize(box, 375.5, 180.25);
    expect(seen.at(-1)).toEqual({ width: 375.5, height: 180.25, rects: null });
  });

  it("does not call back when nothing measured changed", () => {
    const log: Log = [];
    const { env, resize } = fakeEnv(log);
    const { box, h1 } = page(log);
    const seen: Measurement[] = [];
    new Scheduler(env).track(asEl(box), normalizeTargets([asEl(h1)]), (m) => seen.push(m));
    resize(h1, 100, 30);
    resize(box, 400, 200);
    expect(seen).toHaveLength(1);
  });

  it("re-resolves a selector when the section's children change", () => {
    const log: Log = [];
    const { env, state, runFrames } = fakeEnv(log);
    const { section, box } = page(log);
    const seen: Measurement[] = [];
    new Scheduler(env).track(asEl(box), normalizeTargets("h1, p"), (m) => seen.push(m));
    expect(seen[0]!.rects).toHaveLength(1);

    const p = section.append(new FakeElement("p", { left: 0, top: 200, width: 50, height: 20 }, log, "p"));
    state.mo!.cb([{ type: "childList", target: section }] as never[]);
    expect(state.frames).toHaveLength(1);
    runFrames();
    expect(seen.at(-1)!.rects).toHaveLength(2);
    // The new element is now watched for size changes too.
    expect(state.ro!.observed.has(p)).toBe(true);
  });

  /**
   * `RESPONSIVE-HOSTING.md` §8.2, fixed. Inside `<TileDecoration>` — and inside
   * `<Tileset>`'s container wrapper when it has responsive rules — the box's
   * parent is a wrapper the package added, holding nothing but the box. Resolving
   * a selector there matched nothing, silently.
   */
  it("resolves a selector in the host's section, past the package's own wrappers", () => {
    const log: Log = [];
    const { env, state } = fakeEnv(log);
    const section = new FakeElement("section", { left: 0, top: 100, width: 400, height: 200 }, log, "section");
    const outer = section.append(new FakeElement("decoration", { left: 0, top: 100, width: 400, height: 200 }, log));
    const inner = outer.append(new FakeElement("container", { left: 0, top: 100, width: 400, height: 200 }, log));
    outer.attributes.add(WRAPPER_ATTRIBUTE);
    inner.attributes.add(WRAPPER_ATTRIBUTE);
    const box = inner.append(new FakeElement("box", { left: 0, top: 100, width: 400, height: 200 }, log));
    section.append(new FakeElement("h1", { left: 50, top: 150, width: 100, height: 30 }, log, "h1"));

    expect(scopeOf(asEl(box))).toBe(section);
    const seen: Measurement[] = [];
    new Scheduler(env).track(asEl(box), normalizeTargets("h1"), (m) => seen.push(m));
    expect(seen[0]!.rects).toHaveLength(1);
    expect(state.mo!.observed.has(section)).toBe(true);
  });

  it("keeps the box's parent as the scope when the host wrote it", () => {
    const log: Log = [];
    const { section, box } = page(log);
    expect(scopeOf(asEl(box))).toBe(section);
  });

  it("never matches its own cells with a selector, and ignores its own mutations", () => {
    const log: Log = [];
    const { env, state } = fakeEnv(log);
    const { box } = page(log);
    box.append(new FakeElement("cell", { left: 0, top: 100, width: 10, height: 10 }, log, "div"));
    const seen: Measurement[] = [];
    new Scheduler(env).track(asEl(box), normalizeTargets("div"), (m) => seen.push(m));
    expect(seen[0]!.rects).toEqual([]);
    state.mo!.cb([{ type: "attributes", target: box.children[0] }] as never[]);
    expect(state.frames).toHaveLength(0);
  });

  it("skips keep-out reads off screen and catches up when it comes back", () => {
    const log: Log = [];
    const { env, state, runFrames } = fakeEnv(log);
    const { box, h1 } = page(log);
    const seen: Measurement[] = [];
    const s = new Scheduler(env);
    s.track(asEl(box), normalizeTargets([asEl(h1)]), (m) => seen.push(m));
    state.io!.cb([{ target: box, isIntersecting: false }] as never[]);

    h1.rect = { ...h1.rect, left: 200 };
    log.length = 0;
    s.refresh();
    runFrames();
    expect(log.filter((e) => e === "read:h1")).toHaveLength(0);
    expect(seen).toHaveLength(1);

    state.io!.cb([{ target: box, isIntersecting: true }] as never[]);
    runFrames();
    expect(seen.at(-1)!.rects![0]!.left).toBe(200);
  });

  it("batches many signals in one frame into one flush", () => {
    const log: Log = [];
    const { env, state } = fakeEnv(log);
    const { section, box, h1 } = page(log);
    new Scheduler(env).track(asEl(box), normalizeTargets([asEl(h1)]), () => {});
    for (let i = 0; i < 10; i++) state.mo!.cb([{ type: "attributes", target: section }] as never[]);
    state.fonts.get("loadingdone")!();
    expect(state.frames).toHaveLength(1);
  });

  it("unobserves everything at teardown, and only what no other tracker still needs", () => {
    const log: Log = [];
    const { env, state } = fakeEnv(log);
    const { box, h1 } = page(log);
    const other = page(log);
    const s = new Scheduler(env);
    const stopA = s.track(asEl(box), normalizeTargets([asEl(h1)]), () => {});
    // A second tileset that also keeps clear of the first page's heading.
    const stopB = s.track(asEl(other.box), normalizeTargets([asEl(h1)]), () => {});
    stopA();
    expect(state.ro!.observed.has(box)).toBe(false);
    expect(state.ro!.observed.has(h1)).toBe(true);
    stopB();
    expect(state.ro!.observed.size).toBe(0);
    expect(state.io!.observed.size).toBe(0);
    expect(state.mo!.observed.size).toBe(0);
    expect(state.fonts.size).toBe(0);
  });
});
