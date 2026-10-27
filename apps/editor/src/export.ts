/**
 * Export — `09-editor.md` §11.
 *
 * **Invariant E14** — *export produces a `TilesetFile` and an asset folder
 * together. Every `meta.src` in the file is a path relative to that folder's
 * root.*
 *
 * ## Why the editor bundles at all
 *
 * Not convenience. `07` §4.4 records `meta` as **the one place in the file where
 * a typo is silent** — `"scr"` validates cleanly under **C4** and surfaces later
 * as a missing asset rather than at load as an error — and the roadmap found no
 * good way to validate it.
 *
 * §11.1: "When the editor emits the folder alongside the file, `src` stops being
 * a string an author typed and becomes a string the editor wrote beside a file it
 * just copied. The hole closes without validating anything, which is a better
 * answer than the one B3 was looking for."
 *
 * That is why the two are one action here rather than two buttons: a file
 * exported without its folder reopens the hole the pairing closes.
 *
 * ## The layout mirrors the `AssetRef` key
 *
 *     tileset.json
 *     tiles/<tileId>/<assetId>.<ext>
 *
 * "Not a flat folder. `07` §4.1's objection to keying a provider on `assetId`
 * alone is a filename collision here — two Tiles both holding `a1` would export
 * two files called `a1`, and one would overwrite the other silently. The
 * directory structure is the pair, for the same reason the key is."
 */

import type { TileAsset, TilesetFile } from "@fndvit/gen-tilesets";
import { ENGINE_VERSION } from "./document.js";

/** One file in the zip. Bytes, so the writer needs no knowledge of where they came from. */
export interface ExportEntry {
  path: string;
  bytes: Uint8Array;
}

/** What an asset's bytes are looked up by — the `(tileId, assetId)` pair, never `assetId`. */
export type BytesFor = (tileId: string, asset: TileAsset) => Uint8Array | undefined;

export const FILE_NAME = "tileset.json";

/**
 * The document as the JSON that ships — §11.3.
 *
 * Everything §11.3 lists is already true of the in-memory file, and that is
 * **E3** paying off rather than a coincidence: "the editor's document state *is*
 * a `TilesetFile`", so there is no projection here that could disagree with what
 * previewed.
 *
 * - `schemaVersion: 2` — required, and the file is never written without it.
 * - `engineVersion` — the pinned package of **E2**, so it is truthful by
 *   construction rather than by being remembered. **Stamped here, at export**,
 *   because `newDocument()` is the only other place that writes it: an imported
 *   file keeps whatever version wrote it, so a 0.6.0 file exported from a later
 *   editor would otherwise go on claiming 0.6.0. Export is where the claim is
 *   made, so it is made true here; the in-memory document is left as imported.
 * - **Every field explicitly, except `steps`.** `06` §5.1: the schema's defaults
 *   "exist so hand-written fixtures stay short, not so saved files can be
 *   sparse". `steps` is the one exception because its *absence is a meaning* —
 *   continuous — rather than a default value, and the mapping control already
 *   omits the key rather than writing `null`.
 * - `null` nowhere except a palette entry's `tileId`.
 *
 * Two spaces, and a trailing newline: the artifact is a text file a human may
 * open, diff, and commit.
 */
export function serialize(file: TilesetFile): string {
  // Spread over the existing key, so it keeps its place in the output.
  return JSON.stringify({ ...file, engineVersion: ENGINE_VERSION }, null, 2) + "\n";
}

/**
 * Every file the export contains — the JSON and one entry per attached asset.
 *
 * **Paths come from `meta.src`, not from a second construction of the same
 * string.** E14 requires every `meta.src` to be "a path relative to that
 * folder's root", so reading it back is how the two are guaranteed to agree. A
 * path rebuilt here from `tileId`, `assetId` and an extension would be a second
 * implementation of §11.1's layout, and the failure mode is silent: the file
 * points at one path and the folder holds another, which surfaces as a missing
 * asset on the consuming site long after anyone is looking.
 *
 * **An asset with no bytes is an error, never an omission.** The store is
 * session-scoped (`09` §15 Q8), so this is reachable — and shipping a folder
 * that is quietly missing a file is `07` **R3**'s substitution problem moved into
 * the artifact, where no `onAssetError` will ever fire for it.
 */
export function entries(file: TilesetFile, bytesFor: BytesFor): ExportEntry[] {
  const out: ExportEntry[] = [
    { path: FILE_NAME, bytes: new TextEncoder().encode(serialize(file)) },
  ];

  const seen = new Set<string>();

  for (const tile of file.config.tiles) {
    for (const asset of tile.assets) {
      const src = (asset.meta as { src?: unknown } | undefined)?.src;
      if (typeof src !== "string" || src === "") {
        throw new Error(
          `${tile.id}/${asset.id} has no meta.src, so the file cannot point at its bytes ` +
            `(09 §11.1, E14). An attach writes it; this asset did not come from one.`,
        );
      }

      // Two assets writing one path would silently drop a picture -- the exact
      // collision §11.1's directory structure exists to prevent, arriving from a
      // hand-edited `src` instead of from a flat folder.
      if (seen.has(src)) {
        throw new Error(`two assets both export to "${src}". One would overwrite the other.`);
      }
      seen.add(src);

      const bytes = bytesFor(tile.id, asset);
      if (bytes === undefined) {
        throw new Error(
          `no attached bytes for ${tile.id}/${asset.id}. The editor's asset store is ` +
            `session-scoped and does not survive a reload (09 §15 Q8).`,
        );
      }

      out.push({ path: src, bytes });
    }
  }

  return out;
}

/**
 * Whether the document is worth exporting — §12.2's fifth advisory.
 *
 * `08` §3.4 "routes *whether it is worth exporting* here explicitly": a document
 * with no tiles, no operations, or every palette entry `null` is **legal** and
 * draws nothing (**G4**).
 *
 * **E16** — this never blocks the export. An empty document is a legal file and
 * the author may well want it; the advisory exists because the author is present
 * and can act on it, not because the artifact is wrong.
 */
export function drawsNothing(file: TilesetFile): boolean {
  const { tiles, operations } = file.config;
  if (tiles.length === 0 || operations.length === 0) return true;

  // Every palette entry `null` — a tile Target that only ever clears cells.
  const tileOps = operations.filter((op) => op.target === "tileId");
  if (tileOps.length === 0) return true;

  return tileOps.every((op) => {
    const palette = (op.mapping as { palette?: { tileId: string | null }[] }).palette ?? [];
    return palette.every((entry) => entry.tileId === null);
  });
}
