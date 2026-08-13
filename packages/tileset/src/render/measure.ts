/**
 * Measurement — ADR-006, `08` §13.
 *
 * `07` **R5** and §5.3 say the renderer never measures, and §5.3 lists what that
 * bought: no measurement, no layout shift, complete geometry under SSR. ADR-006
 * gives up the letter of that and keeps most of the substance — the ratio is
 * still declared, so space is still reserved before anything is drawn, and
 * `cellBox` is still a pure function of `(Layout, rows, columns, Wpx)`.
 *
 * What is measured is only the two numbers a substrate needs in order to land on
 * the device pixel grid: how wide the box actually is, and how many device pixels
 * a CSS pixel is worth. Neither is derivable, and without them there is no seam
 * fix — `edges.ts` says why.
 *
 * **Callbacks rather than runes.** The package has no Svelte dependency of its
 * own; only `Tileset.svelte` does. Keeping these plain means they typecheck with
 * the rest of the package and stay usable from a non-Svelte substrate, and it
 * keeps reactive state in the one file that already owns it.
 */

/**
 * Reports an element's border-box width in CSS px, now and on every change.
 *
 * `ResizeObserver` rather than `getBoundingClientRect`: it reports the **layout**
 * width, unaffected by an ancestor `transform`. That is the right number here.
 * The component's own coordinate space is pre-transform, and a host that scales
 * the whole thing is scaling a picture that is already seamless.
 *
 * Returns its own teardown. A no-op teardown on a server, where there is no
 * `ResizeObserver` and no width to have.
 */
export function observeWidth(el: Element, onWidth: (width: number) => void): () => void {
  if (typeof ResizeObserver === "undefined") return () => {};

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry === undefined) return;
    // `borderBoxSize` is the un-rounded used width. **S9** makes the border box
    // and the content box coincide, so this is `Wpx` with nothing to qualify.
    const box = entry.borderBoxSize?.[0];
    onWidth(box ? box.inlineSize : entry.contentRect.width);
  });
  observer.observe(el);
  onWidth(el.getBoundingClientRect().width);

  return () => observer.disconnect();
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
