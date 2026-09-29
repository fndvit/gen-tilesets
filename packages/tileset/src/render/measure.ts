/**
 * Measurement — ADR-006, `08` §13, and since 0.6.0 the keep-out tracker.
 *
 * `07` **R5** and §5.3 say the renderer never measures, and §5.3 lists what that
 * bought: no measurement, no layout shift, complete geometry under SSR. ADR-006
 * gave up the letter of that and kept most of the substance — the ratio is still
 * declared, so space is still reserved before anything is drawn, and `cellBox` is
 * still a pure function of its inputs.
 *
 * **0.6.0 extends the concession, and only when asked.** With `options.avoid`
 * set, the renderer also measures *other* elements — the ones it must keep clear
 * of — because that is the only way to know where text is after it has wrapped.
 * Without it, what is measured is what always was: the box's size and the DPR.
 * The measurement still never reaches `generate()`: it reaches the keep-out mask
 * (`occlusion.ts`), which is render space.
 *
 * ## One scheduler for the page
 *
 * Every `<Tileset>` on a page registers with one `Scheduler`, which owns **one**
 * `ResizeObserver`, one `MutationObserver` and one `IntersectionObserver`. What
 * that buys, and why each piece is where it is:
 *
 * - **Reads before writes, across every tileset.** A flush reads every dirty
 *   tracker's rects first and only then calls any of them back, so ten tilesets
 *   cost one layout, not ten interleaved read-write-read layouts.
 * - **Flushed inside the `ResizeObserver` callback.** That callback runs after
 *   layout and before paint, so reading `getBoundingClientRect` there forces no
 *   reflow, and the geometry and the mask it produces are painted in the *same*
 *   frame as the resize that caused them. Deferring to `requestAnimationFrame`
 *   would show one frame of tiles over the text on every resize step — the
 *   failure this feature exists to prevent, and on canvas it would read as
 *   jitter.
 * - **`requestAnimationFrame` for everything else.** A mutation or a font load
 *   arrives when layout is not known to be clean, so it only marks trackers dirty
 *   and schedules one frame; many signals in one frame are one flush.
 * - **`IntersectionObserver` for tilesets off screen.** A tracker far from the
 *   viewport skips its keep-out reads and is flushed when it comes near. The
 *   margin is a whole viewport, because its notification lands after the frame
 *   is painted and the refresh must be done before the tileset is visible.
 * - **Width and rects in one callback.** The box's size and the keep-out rects
 *   reach the component together, so the geometry and the mask are derived from
 *   one consistent measurement rather than from two that raced.
 *
 * **What is not tracked** is a keep-out element moved by a CSS animation or
 * transition: that changes no size and mutates nothing. `refresh()` is the
 * host's handle for it.
 *
 * **Callbacks rather than runes.** The package has no Svelte dependency outside
 * its components. Keeping this plain means it typechecks with the rest, it can be
 * tested with fake observers (`measure.test.ts`), and reactive state stays in the
 * one file that already owns it.
 */

import type { NormalizedTargets } from "./options.js";
import { rectToRenderSpace, type RenderRect } from "./space.js";

/** What a tracker reports: the box's layout size, and the keep-out rects in render space. */
export interface Measurement {
  /** The box's un-rounded layout width in CSS px — `Wpx`. */
  width: number;
  /** The box's un-rounded layout height in CSS px. */
  height: number;
  /** Keep-out rects in render space, or `null` when the tracker has no targets. */
  rects: RenderRect[] | null;
}

// The slices of the browser API the scheduler uses, typed structurally so a test
// can hand in fakes. The real constructors satisfy these as they are.

interface SizeLike {
  inlineSize: number;
  blockSize: number;
}
interface ResizeEntryLike {
  target: Element;
  borderBoxSize?: readonly SizeLike[];
  contentRect: { width: number; height: number };
}
interface ResizeObserverLike {
  observe(el: Element): void;
  unobserve(el: Element): void;
  disconnect(): void;
}
interface MutationRecordLike {
  type: string;
  target: Node;
}
interface MutationObserverLike {
  observe(target: Node, init: MutationObserverInit): void;
  disconnect(): void;
  takeRecords(): MutationRecordLike[];
}
interface IntersectionEntryLike {
  target: Element;
  isIntersecting: boolean;
}
interface IntersectionObserverLike {
  observe(el: Element): void;
  unobserve(el: Element): void;
  disconnect(): void;
}
interface EventSourceLike {
  addEventListener(type: string, cb: () => void): void;
  removeEventListener(type: string, cb: () => void): void;
}

export interface MeasureEnv {
  ResizeObserver?: new (cb: (entries: readonly ResizeEntryLike[]) => void) => ResizeObserverLike;
  MutationObserver?: new (cb: (records: readonly MutationRecordLike[]) => void) => MutationObserverLike;
  IntersectionObserver?: new (
    cb: (entries: readonly IntersectionEntryLike[]) => void,
    init: { rootMargin: string },
  ) => IntersectionObserverLike;
  requestAnimationFrame?: (cb: () => void) => unknown;
  /** `document.fonts`, whose `loadingdone` means text may have rewrapped. */
  fonts?: EventSourceLike;
}

/** The real browser, or an empty environment on a server. */
export function browserEnv(): MeasureEnv {
  if (typeof window === "undefined") return {};
  const env: MeasureEnv = {};
  if (typeof ResizeObserver !== "undefined") env.ResizeObserver = ResizeObserver;
  if (typeof MutationObserver !== "undefined") env.MutationObserver = MutationObserver;
  if (typeof IntersectionObserver !== "undefined") {
    env.IntersectionObserver = IntersectionObserver as unknown as NonNullable<
      MeasureEnv["IntersectionObserver"]
    >;
  }
  if (typeof requestAnimationFrame === "function") {
    env.requestAnimationFrame = (cb) => requestAnimationFrame(cb);
  }
  if (typeof document !== "undefined" && document.fonts !== undefined) {
    env.fonts = document.fonts as unknown as EventSourceLike;
  }
  return env;
}

/**
 * A subtree mutation that can move keep-out content. Attribute changes are
 * filtered to the three that commonly move or hide an element without resizing
 * the section; `characterData` covers text edited in place.
 */
const MUTATIONS: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["class", "style", "hidden"],
};

interface Tracker {
  box: HTMLElement;
  /** Where a selector resolves and what is watched for mutations: the box's parent. */
  scope: Element | null;
  targets: NormalizedTargets | null;
  elements: Element[];
  /** Every element this tracker has the ResizeObserver watching, in any role. */
  watched: Set<Element>;
  width: number;
  height: number;
  onscreen: boolean;
  dirty: boolean;
  requery: boolean;
  last: Measurement | null;
  onMeasure: (m: Measurement) => void;
}

export class Scheduler {
  readonly #env: MeasureEnv;
  readonly #trackers = new Set<Tracker>();
  /** Element -> the trackers watching it with the ResizeObserver. Reference counting, in effect. */
  readonly #watchers = new Map<Element, Set<Tracker>>();
  readonly #byBox = new Map<Element, Tracker>();
  #ro: ResizeObserverLike | null = null;
  #mo: MutationObserverLike | null = null;
  #io: IntersectionObserverLike | null = null;
  #frame = false;
  #fontsBound = false;

  constructor(env: MeasureEnv) {
    this.#env = env;
  }

  /**
   * Start measuring `box` — and, with `targets`, keeping clear of them. Calls
   * `onMeasure` synchronously once before returning, so the first paint already
   * has a width (and a mask), and again whenever either changes. Returns the
   * teardown.
   */
  track(
    box: HTMLElement,
    targets: NormalizedTargets | null,
    onMeasure: (m: Measurement) => void,
  ): () => void {
    const rect = box.getBoundingClientRect();
    const t: Tracker = {
      box,
      scope: box.parentElement,
      targets,
      elements: [],
      watched: new Set(),
      width: rect.width,
      height: rect.height,
      onscreen: true,
      dirty: true,
      requery: targets !== null,
      last: null,
      onMeasure,
    };
    this.#trackers.add(t);
    this.#byBox.set(box, t);

    this.#watch(t, box);
    if (targets !== null) {
      if (t.scope !== null) this.#watch(t, t.scope);
      this.#rebuildMutations();
      this.#intersections()?.observe(box);
      this.#bindFonts();
    }

    this.flush();
    return () => this.#untrack(t);
  }

  /** Re-measure every tracker on the next frame. The host's handle for animation. */
  refresh(): void {
    for (const t of this.#trackers) t.dirty = true;
    this.#schedule();
  }

  /**
   * Read every dirty tracker, then call every changed one back.
   *
   * Public so the ResizeObserver path and a test can both run it synchronously;
   * everything else reaches it through `#schedule`.
   */
  flush(): void {
    const batch: Array<[Tracker, Measurement]> = [];

    // Read phase. Nothing here writes to the DOM, so the whole loop costs at most
    // one layout, however many tilesets are dirty.
    for (const t of this.#trackers) {
      if (!t.dirty) continue;
      let rects: RenderRect[] | null = null;
      if (t.targets !== null) {
        if (t.onscreen) {
          if (t.requery) this.#resolve(t);
          const r = t.box.getBoundingClientRect();
          const metrics = {
            clientLeft: r.left,
            clientTop: r.top,
            clientWidth: r.width,
            // The un-rounded layout width from the ResizeObserver, not
            // `offsetWidth` — see `BoxMetrics.layoutWidth`.
            layoutWidth: t.width,
          };
          rects = t.elements.map((el) => rectToRenderSpace(metrics, el.getBoundingClientRect()));
          t.dirty = false;
        } else {
          // Off screen: keep the last rects and stay dirty, so the tracker is
          // flushed when the IntersectionObserver brings it back.
          rects = t.last?.rects ?? [];
        }
      } else {
        t.dirty = false;
      }
      batch.push([t, { width: t.width, height: t.height, rects }]);
    }

    // Write phase.
    for (const [t, m] of batch) {
      if (sameMeasurement(t.last, m)) continue;
      t.last = m;
      t.onMeasure(m);
    }
  }

  #schedule(): void {
    if (this.#frame) return;
    const raf = this.#env.requestAnimationFrame;
    if (raf === undefined) return;
    this.#frame = true;
    raf(() => {
      this.#frame = false;
      this.flush();
    });
  }

  #resizes(): ResizeObserverLike | null {
    if (this.#ro === null && this.#env.ResizeObserver !== undefined) {
      this.#ro = new this.#env.ResizeObserver((entries) => {
        for (const entry of entries) {
          const set = this.#watchers.get(entry.target);
          if (set === undefined) continue;
          for (const t of set) t.dirty = true;
          const own = this.#byBox.get(entry.target);
          if (own !== undefined) {
            // `borderBoxSize` is the un-rounded used size. **S9** makes the border
            // box and the content box coincide, so this is `Wpx` with nothing to
            // qualify.
            const size = entry.borderBoxSize?.[0];
            own.width = size ? size.inlineSize : entry.contentRect.width;
            own.height = size ? size.blockSize : entry.contentRect.height;
          }
        }
        this.flush();
      });
    }
    return this.#ro;
  }

  #intersections(): IntersectionObserverLike | null {
    if (this.#io === null && this.#env.IntersectionObserver !== undefined) {
      this.#io = new this.#env.IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const t = this.#byBox.get(entry.target);
            if (t === undefined) continue;
            t.onscreen = entry.isIntersecting;
            if (t.onscreen && t.dirty) this.#schedule();
          }
        },
        { rootMargin: "100%" },
      );
    }
    return this.#io;
  }

  #watch(t: Tracker, el: Element): void {
    if (t.watched.has(el)) return;
    t.watched.add(el);
    let set = this.#watchers.get(el);
    if (set === undefined) {
      set = new Set();
      this.#watchers.set(el, set);
      this.#resizes()?.observe(el);
    }
    set.add(t);
  }

  #unwatch(t: Tracker, el: Element): void {
    if (!t.watched.delete(el)) return;
    const set = this.#watchers.get(el);
    if (set === undefined) return;
    set.delete(t);
    if (set.size === 0) {
      this.#watchers.delete(el);
      this.#ro?.unobserve(el);
    }
  }

  /**
   * Resolve a tracker's targets and bring the ResizeObserver's view of them up to
   * date. A selector is re-run inside the scope and **never matches inside the
   * box**: `"div"` would otherwise select every cell of a DOM-substrate tileset,
   * which would then hide itself.
   */
  #resolve(t: Tracker): void {
    t.requery = false;
    const targets = t.targets;
    if (targets === null) return;
    let next: Element[];
    if (targets.kind === "selector") {
      next =
        t.scope === null
          ? []
          : Array.from(t.scope.querySelectorAll(targets.selector)).filter(
              (el) => el !== t.box && !t.box.contains(el),
            );
    } else {
      next = [...targets.elements];
    }
    const keep = new Set<Element>([t.box, ...next]);
    if (t.scope !== null) keep.add(t.scope);
    for (const el of [...t.watched]) if (!keep.has(el)) this.#unwatch(t, el);
    for (const el of next) this.#watch(t, el);
    t.elements = next;
  }

  /**
   * One MutationObserver over every scope. It has no per-target `unobserve`, so a
   * change in the set of scopes disconnects and re-observes the survivors.
   */
  #rebuildMutations(): void {
    const scopes = new Set<Element>();
    for (const t of this.#trackers) if (t.targets !== null && t.scope !== null) scopes.add(t.scope);

    if (this.#mo !== null) {
      this.#onMutations(this.#mo.takeRecords());
      this.#mo.disconnect();
    }
    if (scopes.size === 0) return;
    if (this.#mo === null) {
      if (this.#env.MutationObserver === undefined) return;
      this.#mo = new this.#env.MutationObserver((records) => this.#onMutations(records));
    }
    for (const scope of scopes) this.#mo.observe(scope, MUTATIONS);
  }

  #onMutations(records: readonly MutationRecordLike[]): void {
    let any = false;
    for (const record of records) {
      // A tileset's own rendering — cells mounted by culling, `data-masked`
      // toggled, the box's style — is a mutation inside its scope too. Reacting to
      // it would re-measure on every frame of every resize for nothing.
      if (this.#insideABox(record.target)) continue;
      for (const t of this.#trackers) {
        if (t.targets === null || t.scope === null || !t.scope.contains(record.target)) continue;
        t.dirty = true;
        if (record.type === "childList" && t.targets.kind === "selector") t.requery = true;
        any = true;
      }
    }
    if (any) this.#schedule();
  }

  #insideABox(node: Node): boolean {
    for (const box of this.#byBox.keys()) if (box.contains(node)) return true;
    return false;
  }

  readonly #onFonts = (): void => {
    for (const t of this.#trackers) if (t.targets !== null) t.dirty = true;
    this.#schedule();
  };

  #bindFonts(): void {
    if (this.#fontsBound || this.#env.fonts === undefined) return;
    this.#env.fonts.addEventListener("loadingdone", this.#onFonts);
    this.#fontsBound = true;
  }

  #untrack(t: Tracker): void {
    if (!this.#trackers.delete(t)) return;
    this.#byBox.delete(t.box);
    for (const el of [...t.watched]) this.#unwatch(t, el);
    if (t.targets !== null) {
      this.#io?.unobserve(t.box);
      this.#rebuildMutations();
      if (![...this.#trackers].some((o) => o.targets !== null) && this.#fontsBound) {
        this.#env.fonts?.removeEventListener("loadingdone", this.#onFonts);
        this.#fontsBound = false;
      }
    }
  }
}

function sameMeasurement(a: Measurement | null, b: Measurement): boolean {
  if (a === null || a.width !== b.width || a.height !== b.height) return false;
  if (a.rects === b.rects) return true;
  if (a.rects === null || b.rects === null || a.rects.length !== b.rects.length) return false;
  return a.rects.every((r, i) => {
    const o = b.rects![i]!;
    return r.left === o.left && r.top === o.top && r.right === o.right && r.bottom === o.bottom;
  });
}

let shared: Scheduler | null = null;

/** The page's scheduler, created on first use against the real browser. */
function scheduler(): Scheduler {
  shared ??= new Scheduler(browserEnv());
  return shared;
}

/**
 * Measure `box`, and with `targets` keep clear of them, on the page's shared
 * scheduler. See `Scheduler.track`.
 */
export function track(
  box: HTMLElement,
  targets: NormalizedTargets | null,
  onMeasure: (m: Measurement) => void,
): () => void {
  return scheduler().track(box, targets, onMeasure);
}

/**
 * Re-measure every tileset on the page on the next frame.
 *
 * For the one case the tracker cannot see: a keep-out element moved by a CSS
 * animation or transition, which resizes nothing and mutates nothing. Call it
 * when the motion settles (`transitionend`, `animationend`).
 */
export function refresh(): void {
  shared?.refresh();
}

/** `devicePixelRatio`, or 1 where there is no window. */
export function currentDpr(): number {
  return typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
}

/**
 * Reports `devicePixelRatio` on every change.
 *
 * There is no event for it. The standard construction is a `matchMedia` query
 * pinned to the *current* ratio, which stops matching the moment the ratio
 * changes — so the listener is re-armed against the new value each time. This
 * fires on browser zoom and on a window moving between monitors, both of which
 * change what "a whole device pixel" means and so invalidate every snapped edge.
 */
export function observeDpr(onDpr: (dpr: number) => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  let query: MediaQueryList | null = null;
  let stopped = false;

  const onChange = (): void => arm();

  function arm(): void {
    if (stopped) return;
    query?.removeEventListener("change", onChange);
    const dpr = currentDpr();
    query = window.matchMedia(`(resolution: ${dpr}dppx)`);
    query.addEventListener("change", onChange);
    onDpr(dpr);
  }

  arm();

  return () => {
    stopped = true;
    query?.removeEventListener("change", onChange);
    query = null;
  };
}
