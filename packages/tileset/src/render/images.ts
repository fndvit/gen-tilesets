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

export class ImageBank {
  /** Decoded and ready to draw. A missing key is not-yet-loaded or failed. */
  readonly ready = new Map<string, HTMLImageElement>();

  /** key -> the src loaded or in flight for it, so a changed src reloads. */
  #current = new Map<string, string>();
  /** key -> the src that failed, so a permanent failure is not retried forever. */
  #failed = new Map<string, string>();

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
