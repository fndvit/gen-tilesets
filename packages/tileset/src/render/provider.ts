/**
 * The asset provider — `07-render-contract.md` §4, `08-renderer-svelte.md` §4.2, §4.3.
 *
 * `02` §8.2 says `TileState` carries identifiers only and that resolution happens
 * "in the renderer, through an asset provider supplied alongside the config".
 */

/**
 * **Invariant S5** — `Drawable` is `{ src: string }`, drawn as an `<img>`. A
 * raster image and an SVG file are the same thing to the renderer: a sealed
 * picture at a URL.
 *
 * An object rather than a bare string so the DPR-aware extension point (`07` §13)
 * can arrive as an additional key rather than a breaking change to every
 * provider — the same additive discipline **R4** applies to `meta`.
 */
export interface Drawable {
  src: string;
}

/**
 * `07` §4.1.
 *
 * **The key is the pair, not `assetId` alone.** `06` §6 makes `TileAsset.id`
 * unique *within its Tile only*, so two Tiles may legitimately both hold an asset
 * called `a1`. A provider keyed on `assetId` would resolve one of them to the
 * other's drawable, correctly and silently, for as long as the config lives.
 */
export interface AssetRef {
  tileId: string;
  assetId: string;
  /** That TileAsset's `meta` block, **verbatim**. The renderer never reads it. */
  meta: Record<string, unknown>;
}

export type AssetProvider = (ref: AssetRef) => Drawable | Promise<Drawable>;

/**
 * The one place `meta.src` is read, and the one place its absence throws.
 *
 * Factored out so {@link defaultProvider} and {@link prefixedProvider} cannot
 * drift: they differ only in what they do with the string, and a second copy of
 * this check would be a second thing to keep true. Kept **synchronous** — an
 * `AssetProvider` may return a promise, so composing the two through the public
 * type would force `prefixedProvider` to await a value that is already in hand.
 *
 * **It throws on an absent or non-string `src` rather than passing `undefined` to
 * the substrate.** `06` **C4** validates `meta` as an object and inspects nothing
 * inside it, so `"scr"` instead of `"src"` loads cleanly — `07` §4.4 records this
 * as the one place in the file where a typo is silent. Passing `undefined`
 * through would render as a broken image and read as a *missing file* rather than
 * a *malformed one*.
 */
function readSrc(ref: AssetRef): string {
  const src = ref.meta.src;
  if (typeof src !== "string" || src.length === 0) {
    throw new Error(
      `Asset ${ref.tileId}/${ref.assetId} has no string \`meta.src\`. ` +
        `06 C4 does not validate inside \`meta\`, so a misspelled key (e.g. "scr") ` +
        `reaches here rather than failing at load (07 §4.4).`,
    );
  }
  return src;
}

/**
 * `08` §4.3. Trivial by design: it fetches nothing, measures nothing, and caches
 * nothing — it renames one field. `07` **R2** holds vacuously.
 *
 * This is `<Tileset>`'s default `provider`, so a host whose assets are served at
 * the paths `meta.src` already names passes no provider at all (`apps/demo` does
 * exactly that). Off the site root, see {@link prefixedProvider}.
 */
export const defaultProvider: AssetProvider = (ref) => ({ src: readSrc(ref) });

/**
 * {@link defaultProvider} with a base path in front of every `src` — the answer
 * to `07` §4.4's *relative paths resolve against the current page URL* trap.
 *
 * The export writes `meta.src` relative to the archive root and with no leading
 * slash, so the browser resolves it against the page it is on: correct at `/`,
 * a 404 at `/deep/page`, with no build error and no type error because nothing
 * is wrong at compile time. A prefix anchors it.
 *
 * **The join is normalised here on purpose.** SvelteKit's `base` carries **no**
 * trailing slash; Vite's `import.meta.env.BASE_URL` **always** does (`"/"` by
 * default). Left to the caller that difference is a one-character bug that
 * produces `//tiles/…` or `/deeptiles/…` and shows up as a 404 rather than as a
 * mistake — so both forms are accepted and the same call is right for either
 * host.
 *
 * **An empty prefix still emits the separator**, so `prefixedProvider("")` gives
 * `/tiles/…` and not `tiles/…`. That is not an edge case to tidy away: at the
 * site root SvelteKit's `base` is `""` and Vite's `BASE_URL` is `"/"`, and both
 * must anchor at the root. Treating an empty prefix as *no* prefix would hand
 * back the relative path this function exists to replace — the 404 above,
 * reintroduced precisely in the default configuration.
 *
 * Rejected: a `basePath` prop on `<Tileset>`. It reads shorter, but it overlaps
 * `provider` and would need a precedence rule for when both are given. The
 * component's prop surface is deliberately narrow — no `width`, no `config`/
 * `layout` split — and one extension point that composes beats two that
 * interact.
 */
export function prefixedProvider(prefix: string): AssetProvider {
  // One trailing slash is trimmed, not all of them: `"//host"` is a
  // protocol-relative URL and a caller who writes one means it. `meta.src` never
  // carries a leading slash (the export writes it relative to the archive root),
  // so exactly one separator is added back below — unconditionally, including
  // when `base` is empty.
  const base = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return (ref) => ({ src: `${base}/${readSrc(ref)}` });
}

/**
 * The cache key for a resolved drawable — the `(tileId, assetId)` pair, per §4.1.
 *
 * **The separator is `\0`**, which cannot appear in an identifier (`06` **C10**
 * limits them to `[A-Za-z0-9_-]+`), so the join is unambiguous and reversible.
 */
export function assetKey(tileId: string, assetId: string): string {
  return `${tileId}\0${assetId}`;
}

/**
 * {@link assetKey}'s inverse, and the reason it exists rather than every caller
 * writing `key.split(...)`.
 *
 * It exists because the open-coded version was **wrong and silent**. Two call
 * sites split on `" "` — a space, which this key has never contained — so they got
 * back one element, `assetId` was `undefined`, and the guard that followed
 * returned early. The effect was that a failed image decode reported *nothing*
 * through `onAssetError`, in a package whose stated posture is that failure is
 * loud. Nothing typechecked wrong and nothing threw.
 *
 * Returns `null` for a string that is not an `assetKey`, so a caller cannot
 * accidentally proceed with half a pair.
 */
export function parseAssetKey(key: string): { tileId: string; assetId: string } | null {
  const at = key.indexOf("\0");
  if (at < 0) return null;
  return { tileId: key.slice(0, at), assetId: key.slice(at + 1) };
}

/**
 * Calls `provider` once for `ref` and makes **every** failure reach `report`,
 * whichever way it arrives. `TilesetOptions.onAssetError` promises it "fires for
 * a resolution failure and a load failure alike", and `AssetProvider` may fail
 * in two shapes:
 *
 * - **It throws.** Reported on a microtask, not now: this runs inside the
 *   component's `$derived`, and a host whose `onAssetError` writes `$state` (the
 *   editor's does) then died with Svelte's `state_unsafe_mutation` instead of
 *   showing the failure. Every other failure already arrived asynchronously, so
 *   this makes the one timing a host has to allow for. The throw is stored as a
 *   rejected promise so the DOM
 *   substrate's `{#await}` still takes its `{:catch}` branch. That promise is
 *   marked handled: a key whose cells are all culled has no `{#await}` mounted
 *   to handle it, and an unhandled rejection is a second, misleading report of
 *   the same failure, in the console instead of through `onAssetError`.
 * - **It returns a promise that rejects.** Reported when it rejects. Before
 *   this, only the synchronous throw was reported: the canvas substrate
 *   swallowed the rejection with `.catch(() => {})` and the DOM one rendered it
 *   as `{:catch}`'s nothing, so a lazy provider's failure was silent.
 *
 * The promise handed back is the provider's own, not the reporting chain, so
 * consumers still see the rejection and take the R3 path: the cell draws nothing.
 */
export function resolveDrawable(
  provider: AssetProvider,
  ref: AssetRef,
  report: (ref: AssetRef, cause: unknown) => void,
): Drawable | Promise<Drawable> {
  let value: Drawable | Promise<Drawable>;
  try {
    value = provider(ref);
  } catch (cause) {
    queueMicrotask(() => report(ref, cause));
    value = Promise.reject(cause);
    value.catch(() => {});
    return value;
  }
  if (value instanceof Promise) value.catch((cause: unknown) => report(ref, cause));
  return value;
}

/**
 * The DOM substrate's record of `<img>` load failures: `(tileId, assetId)` key
 * to the `src` that failed.
 *
 * **Keyed by `src` as well as by key, as canvas's `ImageBank` is.** It used to
 * be a set of keys, only ever added to, so an asset whose `<img>` failed once
 * stayed unmounted for the life of the component, even after the host changed
 * `provider` or `file` and the key now resolved somewhere that would load. A
 * failure is a fact about one `src`; a new `src` for the key is a new attempt.
 *
 * Returns the next map, or `null` when this `src` has already failed for this
 * key, so the caller reports each failure once and does not churn `$state`.
 */
export function recordLoadFailure(
  failed: ReadonlyMap<string, string>,
  key: string,
  src: string,
): Map<string, string> | null {
  if (failed.get(key) === src) return null;
  return new Map(failed).set(key, src);
}

/**
 * Whether a key's drawable is one whose `src` already failed to load, so the
 * cell is not mounted at all (`08` **S6**: a broken `<img>` renders the
 * browser's placeholder glyph, a drawable the renderer did not choose).
 *
 * A pending promise's `src` is not known yet, so it is never blocked here; the
 * template checks again once it settles, with `drawable.src` in hand.
 */
export function loadBlocked(
  failed: ReadonlyMap<string, string>,
  key: string,
  value: Drawable | Promise<Drawable> | undefined,
): boolean {
  if (value === undefined || value instanceof Promise) return false;
  return failed.get(key) === value.src;
}
