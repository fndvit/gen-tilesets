/**
 * Reading an exported archive back — `09-editor.md` §11.1, §12.4; **E14**'s
 * inverse.
 *
 * Export writes `tileset.json` beside `tiles/<tileId>/<assetId>.<ext>`, and this
 * reads that pair back. It is the pure half, mirroring `export.ts`: it takes a
 * map of path → bytes and knows nothing about zips, drag events, or the DOM.
 * `ImportPanel.svelte` supplies the map, from an archive or from a dropped
 * folder, and only the reader differs.
 *
 * ## Assets are matched by `meta.src`, never by re-parsing the path
 *
 * `export.ts` writes each entry at the path it read out of `meta.src`, on the
 * grounds that a path rebuilt from `tileId`, `assetId` and an extension would be
 * a second implementation of §11.1's layout. The same argument applies in
 * reverse and with more force: parsing `tiles/leaf/a1.png` back into a pair
 * would be a *third* implementation, and it would be wrong for any file whose
 * `src` a human has edited — which is precisely the file where being wrong is
 * hardest to see. The document says where its bytes are; this believes it.
 *
 * ## A missing asset is an advisory, not a refusal
 *
 * `06` §10.4's principle applied to the archive rather than to the file: a
 * document whose asset bytes are absent is still a **legal** `TilesetFile`, and
 * it is one the author can repair by dropping the image back in. Refusing the
 * import would throw away the operations, the seed and the layout over a picture.
 * The empty cell it draws is `07` **R3**'s honest hole, and §12.3 already has a
 * place to report it.
 *
 * Validation is a separate concern and runs on the parsed document — `06`
 * **C5**, and §12.4's rule that a non-empty `ValidationError[]` opens nothing.
 */

import type { TileAsset, TilesetFile } from "@tileset/core";
import { FILE_NAME } from "./export.js";

/** What an archive reader hands over: every file it found, keyed by path. */
export type Archive = ReadonlyMap<string, Uint8Array>;

/** One asset's bytes, already paired with the ids they belong under. */
export interface AssetBytes {
  tileId: string;
  assetId: string;
  /** The path `meta.src` named, kept for the failure message. */
  path: string;
  bytes: Uint8Array;
}

export interface ArchiveContents {
  /** Parsed, **not** validated. The caller validates before opening anything. */
  file: unknown;
  assets: AssetBytes[];
  /** `meta.src` paths the document names and the archive does not carry. */
  missing: string[];
}

/**
 * The archive's `tileset.json`, parsed.
 *
 * Throws where the archive has no document at all or the JSON does not parse —
 * both of which are *the caller gave us the wrong thing*, not *the document is
 * invalid*. `06` §10 keeps them apart on purpose: "JSON syntax errors belong to
 * whoever called `JSON.parse`", so they are never dressed up as
 * `ValidationError`s, which would put a syntax problem into a list `09` renders
 * against fields.
 */
function documentOf(archive: Archive): unknown {
  const bytes = archive.get(FILE_NAME);
  if (bytes === undefined) {
    throw new Error(
      `no ${FILE_NAME} in the archive. An export writes it at the root, beside a ` +
        `tiles/ folder (09 §11.1).`,
    );
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (cause) {
    throw new Error(`${FILE_NAME} is not valid JSON: ${cause instanceof Error ? cause.message : cause}`);
  }
}

/** `meta.src`, or `undefined` where the asset does not name one. */
function srcOf(asset: TileAsset): string | undefined {
  const src = (asset.meta as { src?: unknown } | undefined)?.src;
  return typeof src === "string" && src !== "" ? src : undefined;
}

/**
 * Split an archive into its document and its assets.
 *
 * **The document drives the walk, not the folder.** Iterating `tiles/` instead
 * would attach files the document does not reference — a stale image left in a
 * hand-assembled folder would arrive as an asset of a Tile that does not claim
 * it, or as nothing at all with no way to say which. Walking `config.tiles`
 * gives every entry its `(tileId, assetId)` pair by construction, and anything
 * in the archive nobody points at is simply not read.
 *
 * The document is returned **unvalidated** — this cannot know whether it is a
 * legal `TilesetFile`, and `06` **C5** puts that in `validate()`. The walk is
 * defensive about shape for exactly that reason: it runs before validation in
 * order to report missing pictures alongside it, so it must not assume the
 * document it is walking is well-formed.
 */
export function readArchive(archive: Archive): ArchiveContents {
  const file = documentOf(archive);
  const assets: AssetBytes[] = [];
  const missing: string[] = [];

  const tiles = (file as Partial<TilesetFile>)?.config?.tiles;
  if (!Array.isArray(tiles)) return { file, assets, missing };

  for (const tile of tiles) {
    if (typeof tile?.id !== "string" || !Array.isArray(tile.assets)) continue;
    for (const asset of tile.assets) {
      if (typeof asset?.id !== "string") continue;
      const src = srcOf(asset);
      // No `src` at all is a document problem, and `validate()` does not raise
      // one for it either -- `meta` is opaque (`06` **C4**). It surfaces at
      // export, which refuses a file that cannot point at its own bytes.
      if (src === undefined) continue;
      const bytes = archive.get(src);
      if (bytes === undefined) missing.push(src);
      else assets.push({ tileId: tile.id, assetId: asset.id, path: src, bytes });
    }
  }

  return { file, assets, missing };
}

/**
 * A file name for an entry, so `attach` can measure it and a re-export can read
 * its extension back.
 *
 * The basename of the path it came from, which is what `exportPath` wrote and
 * therefore what `extensionOf` will produce the same answer for on a round-trip.
 */
export function nameOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? path : path.slice(slash + 1);
}

/**
 * A guessed MIME type for a `File` wrapper, from the extension.
 *
 * Advisory only. **S5** makes a raster image and an SVG "the same thing to the
 * renderer: a sealed picture at a URL", and `measure()` decodes through an
 * `Image` which sniffs content rather than trusting a type. It is set because an
 * empty `type` on an object URL makes some browsers refuse an SVG, and left
 * empty where the extension is unknown rather than guessed at.
 */
export function mimeOf(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "svg":
      return "image/svg+xml";
    default:
      return "";
  }
}
