/**
 * The editor's asset store and provider — `09-editor.md` §10.3, §10.4, §11.2.
 *
 * ## Why the editor supplies its own provider
 *
 * §10.4: "`meta.src` in an unexported document is a path into the editor's own
 * asset store rather than a URL the browser can fetch." The default provider
 * (`08` §4.3) reads `meta.src` verbatim, which is right for a host serving an
 * exported folder and wrong here, where nothing has been exported yet.
 *
 * §11.2 names the tension and accepts it: "the editor must be able to load
 * `meta.src` itself in order to measure (**E13**) and to preview, and the export
 * path is not that path. The editor's provider bridges them."
 *
 * ## Keyed on the pair, never on `assetId`
 *
 * **§10.4, `07` §4.1.** `06` §6 makes `TileAsset.id` unique *within its Tile
 * only*, so two Tiles may both hold `a1`. "A provider keyed on `assetId`
 * resolves one to the other's drawable, correctly and silently, for as long as
 * the config lives." `assetKey()` from the package is that key, reused rather
 * than rewritten.
 *
 * ## Where the bytes live
 *
 * In memory, for the session, as a `Blob` behind an object URL. `09` §15 Q8
 * leaves this **open** — "IndexedDB, the file system, a server" — and it is
 * recorded in `DECISIONS.md` D2. Nothing survives a reload, which is consistent
 * with everything else in this build.
 *
 * **Invariant R2** — for the duration of a render session the same `AssetRef`
 * resolves to the same `Drawable`. It holds structurally here: one object URL is
 * created per attach and handed back on every call, so the provider is a lookup
 * rather than a source of variation.
 */

import { assetKey, parseAssetKey, type AssetProvider, type AssetRef, type Drawable } from "@fndvit/gen-tilesets/render";

/** What one attach produced. `width`/`height` are E13's frozen measurement. */
export interface StoredAsset {
  /** The object URL the preview draws. Not `meta.src` — see §11.2. */
  url: string;
  /** The original bytes, kept for the Step 11 export. */
  file: File;
  /** Intrinsic, design px, measured once at attach and frozen (`07` §4.4). */
  width: number;
  height: number;
}

const store = new Map<string, StoredAsset>();

/**
 * The file extension for the `tiles/<tileId>/<assetId>.<ext>` export path of
 * §11.1, taken from the dropped file's own name.
 *
 * Lowercased, and stripped to the charset a path can carry without escaping. An
 * extensionless file gets `bin`, which is honest rather than a guess — nothing
 * in `07` or `08` inspects the extension, since **S5** makes a raster image and
 * an SVG "the same thing to the renderer: a sealed picture at a URL".
 */
export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return "bin";
  const ext = fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext === "" ? "bin" : ext;
}

/** The name a new Tile starts with. Authoring only; **D1** keeps it out of output. */
export function tileNameOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot <= 0 ? fileName : fileName.slice(0, dot);
}

/**
 * `09` §11.1's export path, written into `meta.src` at attach time (§10.3).
 *
 * "Not a flat folder. `07` §4.1's objection to keying a provider on `assetId`
 * alone is a filename collision here — two Tiles both holding `a1` would export
 * two files called `a1`, and one would overwrite the other silently. The
 * directory structure is the pair, for the same reason the key is."
 */
export function exportPath(tileId: string, assetId: string, ext: string): string {
  return `tiles/${tileId}/${assetId}.${ext}`;
}

/**
 * Measures a file's intrinsic dimensions, or rejects — **E13**.
 *
 * *"An asset attach measures the asset's intrinsic dimensions and writes all
 * three keys, or it fails. A `meta` block missing `width` or `height` is never
 * written."*
 *
 * `07` §4.4 gives the reasoning, which is `06` **C3**'s: "a measurement that is
 * only taken when someone thinks to take it is missing precisely from the old
 * files that will need it." Nothing in V1 reads these numbers except §12.2's
 * seventh advisory; cropping will, and by then the editor may not be open and
 * the asset may be gone.
 *
 * **A zero dimension is a failed attach.** An SVG carrying only a `viewBox` and
 * no `width`/`height` decodes but has no intrinsic size in some browsers, and
 * writing `0` would satisfy E13's letter while producing exactly the missing
 * measurement it exists to prevent.
 */
export function measure(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (width > 0 && height > 0) resolve({ width, height });
      else
        reject(
          new Error(
            "decoded with no intrinsic size. An SVG needs `width` and `height` " +
              "attributes, not only a `viewBox` — E13 writes all three meta keys or fails.",
          ),
        );
    };
    image.onerror = () => reject(new Error("could not be decoded as an image"));
    image.src = url;
  });
}

/**
 * Attaches one file under an already-allocated `(tileId, assetId)` pair.
 *
 * Throws if the measurement fails, so the caller commits **no transition** and
 * the file never gains an asset whose `meta` is incomplete. §11.2: "a hand-edited
 * `src` that the editor cannot resolve is a failed attach rather than a silent
 * hole."
 */
export async function attach(tileId: string, assetId: string, file: File): Promise<StoredAsset> {
  const url = URL.createObjectURL(file);
  try {
    const { width, height } = await measure(url);
    const stored: StoredAsset = { url, file, width, height };
    store.set(assetKey(tileId, assetId), stored);
    return stored;
  } catch (cause) {
    // Nothing was written to the document, so nothing has to be unwound -- but
    // the object URL would leak.
    URL.revokeObjectURL(url);
    throw cause;
  }
}

/*
 * There is deliberately no `release()`. Deleting a Tile or an asset from the
 * document leaves its bytes here, because the delete is undoable: a release
 * before `deleteTile` / `deleteAsset` meant undo brought the Tile back with no
 * bytes, so `editorProvider` threw, the preview drew a hole and export failed
 * with "no attached file".
 *
 * The cost is a leak bounded by the session: every picture dropped since the
 * last import or new document stays in memory until `replaceAll` swaps the
 * whole store out. That is what the author dropped, and no more.
 *
 * Rejected: releasing only the entries no undo or redo state still references.
 * It needs this module to read `session`'s history, and a release then has to be
 * re-run on every transition that drops a state off the end of the history. That
 * is a second owner for the store's lifetime, in exchange for memory that
 * `replaceAll` already reclaims.
 */

/**
 * Tile ids the store still holds bytes for, including deleted Tiles'.
 *
 * `ids.ts` allocates from what the *document* holds, so after a delete it can
 * hand the deleted Tile's id to a new one. With the bytes kept for undo, the
 * new attach would then overwrite them, and undoing back past the add would
 * restore the old Tile showing the new picture, silently. Id allocation passes
 * these alongside the document's ids so that cannot happen.
 */
export function heldTileIds(): string[] {
  const ids = new Set<string>();
  for (const key of store.keys()) {
    const pair = parseAssetKey(key);
    if (pair !== null) ids.add(pair.tileId);
  }
  return [...ids];
}

/** Asset ids the store holds bytes for under `tileId`, for the same reason. */
export function heldAssetIds(tileId: string): string[] {
  const ids: string[] = [];
  for (const key of store.keys()) {
    const pair = parseAssetKey(key);
    if (pair !== null && pair.tileId === tileId) ids.push(pair.assetId);
  }
  return ids;
}

/** One asset an import wants attached, under ids the incoming document owns. */
export interface Incoming {
  tileId: string;
  assetId: string;
  file: File;
}

/** An attach that failed, so the panel can say which picture is missing. */
export interface AttachFailure {
  tileId: string;
  assetId: string;
  reason: string;
}

/**
 * Replaces the whole store — every attach for a document that is itself being
 * replaced.
 *
 * ## Why this is one call and not `clearAll()` plus `attach()`
 *
 * The store is keyed on the `(tileId, assetId)` pair, and an incoming document
 * may legitimately reuse the ids of the outgoing one — `ids.ts` allocates
 * `t1`, `t2`, … in every session, so two documents built independently collide
 * almost by construction. Clearing *after* attaching would therefore revoke the
 * URLs that were just created; clearing *before* would empty the store behind a
 * preview that is still mounted, and leave the author with a blank document if
 * the incoming assets then failed to decode.
 *
 * So the new attaches are built to the side and swapped in, and the old URLs are
 * revoked only once the swap has happened. Until that moment the outgoing
 * document is intact and drawing, which is what makes attempting an import safe.
 *
 * ## A failure is skipped, not fatal
 *
 * One undecodable picture does not cost the author their operations, their seed
 * and their layout. The pair is reported and the cell draws nothing — `07`
 * **R3**'s honest hole — and §12.3 already surfaces it.
 */
export async function replaceAll(incoming: readonly Incoming[]): Promise<AttachFailure[]> {
  const staged = new Map<string, StoredAsset>();
  const failures: AttachFailure[] = [];

  for (const { tileId, assetId, file } of incoming) {
    const url = URL.createObjectURL(file);
    try {
      const { width, height } = await measure(url);
      staged.set(assetKey(tileId, assetId), { url, file, width, height });
    } catch (cause) {
      URL.revokeObjectURL(url);
      failures.push({
        tileId,
        assetId,
        reason: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  const outgoing = [...store.values()];
  store.clear();
  for (const [key, asset] of staged) store.set(key, asset);
  // Revoked last, and only URLs the staged set did not just create.
  for (const asset of outgoing) URL.revokeObjectURL(asset.url);

  return failures;
}

export function stored(tileId: string, assetId: string): StoredAsset | undefined {
  return store.get(assetKey(tileId, assetId));
}

/**
 * The provider `<Tileset>` is given — §10.4.
 *
 * **It throws rather than returning a broken `src`.** `07` §4.3: "there is no
 * `null` return", and a failure "never substitutes" a drawable. The component
 * turns the throw into one `onAssetError` call and an empty cell (**S6**,
 * **R3**), which §12.3 surfaces beside the preview.
 *
 * It ignores `ref.meta` entirely, which is the whole difference from the default
 * provider: `meta.src` here is the export path of §11.1, and the export has not
 * happened.
 */
export const editorProvider: AssetProvider = (ref: AssetRef): Drawable => {
  const found = store.get(assetKey(ref.tileId, ref.assetId));
  if (found === undefined) {
    throw new Error(
      `no attached file for ${ref.tileId}/${ref.assetId}. The editor's store is ` +
        `session-scoped (09 §15 Q8) and does not survive a reload.`,
    );
  }
  return { src: found.url };
};
