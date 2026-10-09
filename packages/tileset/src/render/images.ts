/**
 * Decoded images for the canvas substrate — ADR-006, `08` §13.
 *
 * The DOM substrate hands a `src` to an `<img>` and the browser does the rest.
 * `drawImage` needs a **decoded** bitmap, so the canvas path has to do explicitly
 * what the DOM path got for free.
 *
 * **Keyed on `(tileId, assetId)`**, so this loads one image per distinct
 * `TileAsset`, not one per cell — a handful, however large the grid. That is also
 * why losing `loading="lazy"` costs little here: the set of distinct assets is
 * small, and nearly every member of it is on screen somewhere.
 *
 * Plain, callback-driven, and rune-free for the reason `measure.ts` gives.
 */

/**
 * The message for a picture with no natural size. Named so the DOM path and the
 * bank say the same thing, and so it says what to change.
 */
export const NO_NATURAL_SIZE =
  "has no natural size. An SVG needs `width` and `height` attributes, not only a `viewBox`.";

/**
 * Resolves when `img` has a natural size, and rejects with
 * {@link NO_NATURAL_SIZE} when it does not. Call it once `img` has loaded.
 *
 * ## Why such a picture is refused, on both substrates
 *
 * An SVG with a `viewBox` and no `width`/`height` has no natural size, and the
 * canvas substrate cannot draw it right. Measured in Chrome 154: such an SVG
 * reports `naturalWidth/Height` **150 × 150** (a default, not 0), but
 * `drawImage(img, sx, sy, sw, sh, …)` lays the art out at the *destination*
 * size and reads the source rect in those 150-unit coordinates. A 48 px cell
 * showed a 15 px tile; a non-square one, cover-cropped, drew nothing at all.
 * The DOM substrate drew both correctly, so the two disagreed silently.
 *
 * Refusing them on **both** substrates is one rule everywhere: the editor
 * already refuses them at attach (**E13**), and now a host gets a hole and an
 * `onAssetError` that names the fix, whichever substrate it chose.
 *
 * Rejected:
 * - Rasterising onto an offscreen canvas first. It works, but costs memory per
 *   asset and softens the tile in cells larger than the raster, to accept a file
 *   the editor will not.
 * - `createImageBitmap(img, { resizeWidth, resizeHeight })`: in Chrome 154 it
 *   produced a bitmap that drew nothing.
 * - Drawing without a source rect when the crop is the whole image. It fixes
 *   only a square SVG; a cropped one still drew nothing.
 *
 * ## How it is detected
 *
 * `naturalWidth` cannot tell, since Chrome reports 150. What can is
 * `createImageBitmap(img)`, which Chrome refuses with an `InvalidStateError`
 * for exactly this case ("an SVG image without natural dimensions"). A browser
 * that reports 0 instead is caught by the size check first. Any other failure of
 * the probe passes: it is a question about the probe, not about the picture, and
 * a working picture must not become a hole because of it.
 */
export async function requireNaturalSize(
  img: HTMLImageElement,
  probe: ((img: HTMLImageElement) => Promise<{ close(): void }>) | undefined =
    typeof createImageBitmap === "function" ? createImageBitmap : undefined,
): Promise<void> {
  if (img.naturalWidth === 0 || img.naturalHeight === 0) throw new Error(NO_NATURAL_SIZE);
  if (probe === undefined) return;
  let bitmap: { close(): void };
  try {
    bitmap = await probe(img);
  } catch (cause) {
    if (cause instanceof Error && cause.name === "InvalidStateError") {
      throw new Error(NO_NATURAL_SIZE, { cause });
    }
    return;
  }
  bitmap.close();
}

/**
 * {@link requireNaturalSize}, once per `src`. On the DOM substrate every cell's
 * `<img>` fires its own `load`, and a grid holds many cells per asset.
 */
export class NaturalSizeChecks {
  readonly #bySrc = new Map<string, Promise<void>>();
  readonly #require: (img: HTMLImageElement) => Promise<void>;

  constructor(require: (img: HTMLImageElement) => Promise<void> = requireNaturalSize) {
    this.#require = require;
  }

  check(src: string, img: HTMLImageElement): Promise<void> {
    let found = this.#bySrc.get(src);
    if (found === undefined) {
      found = this.#require(img);
      this.#bySrc.set(src, found);
    }
    return found;
  }
}

export class ImageBank {
  /** Decoded and ready to draw. A missing key is not-yet-loaded or failed. */
  readonly ready = new Map<string, HTMLImageElement>();

  /** key -> the src loaded or in flight for it, so a changed src reloads. */
  #current = new Map<string, string>();
  /** key -> the src that failed, so a permanent failure is not retried forever. */
  #failed = new Map<string, string>();

  readonly #checks: NaturalSizeChecks;

  constructor(checks = new NaturalSizeChecks()) {
    this.#checks = checks;
  }

  /**
   * Brings the bank in line with `wanted`, loading what is new and dropping what
   * is gone.
   *
   * Safe to call on every change: an already-loaded key whose src is unchanged is
   * left alone, so a re-render never re-decodes. `onChange` fires whenever
   * `ready` actually moved and is the repaint trigger.
   */
  sync(
    wanted: ReadonlyMap<string, string>,
    onChange: () => void,
    onError: (key: string, cause: unknown) => void,
  ): void {
    let changed = false;

    // Drop what is no longer referenced, or whose src changed under it. A Tile
    // deleted from the library should not pin its bitmap for the session, and an
    // asset replaced in place must not keep drawing the old picture.
    for (const key of [...this.ready.keys()]) {
      if (wanted.get(key) !== this.#current.get(key)) {
        this.ready.delete(key);
        changed = true;
      }
    }
    for (const key of [...this.#current.keys()]) {
      if (!wanted.has(key)) {
        this.#current.delete(key);
        this.#failed.delete(key);
      }
    }

    for (const [key, src] of wanted) {
      if (this.#current.get(key) === src) continue;
      if (this.#failed.get(key) === src) continue;
      this.#current.set(key, src);

      const img = new Image();
      // No `crossOrigin`. Nothing here ever reads the canvas back — no
      // `getImageData`, no `toDataURL` — so a tainted canvas costs nothing,
      // whereas requesting CORS would make every asset on a server that does not
      // send the header fail outright. The DOM substrate's `<img>` carries no
      // such requirement and this path must not be stricter than it.
      img.decoding = "async";
      img.src = src;

      img
        .decode()
        .then(() => this.#checks.check(src, img))
        .then(() => {
          // A later `sync` may have superseded this src.
          if (this.#current.get(key) !== src) return;
          this.ready.set(key, img);
          onChange();
        })
        .catch((cause: unknown) => {
          if (this.#current.get(key) !== src) return;
          this.#failed.set(key, src);
          // R3 / S6 — the cell draws nothing and the failure is reported. No
          // placeholder: on a canvas there is not even a broken-image glyph to
          // suppress, which is the one thing this substrate makes easier.
          onError(key, cause);
        });
    }

    if (changed) onChange();
  }
}
