/**
 * The browser half of export — `09-editor.md` §11.1.
 *
 * Separate from `export.ts` for the reason every split in this app takes: that
 * one is a pure function of a `TilesetFile` and is unit-tested; this one reads
 * `Blob`s, zips, and clicks an anchor, and can only be tested by running the app.
 * The rule is in the testable half.
 *
 * ## Why a zip
 *
 * **E14** requires the file and the folder *together*, and a browser cannot write
 * a folder unaided. Recorded in `DECISIONS.md` D9, with the two rejected
 * alternatives:
 *
 * - **The File System Access API** — Chromium only, so a Chrome-only editor.
 * - **N separate downloads** — the author reassembles the folder by hand, which
 *   reopens the exact hole §11.1 exists to close.
 */

import { zipSync } from "fflate";
import { assetKey } from "@fndvit/gen-tilesets/render";
import type { TileAsset, TilesetFile } from "@fndvit/gen-tilesets";
import { entries, type ExportEntry } from "./export.js";
import { stored } from "./assets.js";

/**
 * The original bytes of every attached asset, keyed on the **pair**.
 *
 * `06` §6 makes `TileAsset.id` unique within its Tile only, so a map keyed on
 * `assetId` alone would resolve one Tile's asset to another's — "correctly and
 * silently, for as long as the config lives" (`07` §4.1). `assetKey` is the
 * package's own key, reused rather than rewritten.
 *
 * **The original file, not the object URL.** The bytes that ship are the bytes
 * the author dropped: re-encoding through a canvas would change the picture the
 * preview approved, and `roadmap` §4.4 keeps optimization in the pipeline.
 */
async function bytesByKey(file: TilesetFile): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();

  for (const tile of file.config.tiles) {
    for (const asset of tile.assets) {
      const found = stored(tile.id, asset.id);
      if (found === undefined) continue; // `entries()` reports it, with the citation.
      out.set(assetKey(tile.id, asset.id), new Uint8Array(await found.file.arrayBuffer()));
    }
  }

  return out;
}

/** `fflate` takes a flat map whose slashes are the directories of §11.1's layout. */
export function zipOf(list: ExportEntry[]): Uint8Array {
  const flat: Record<string, Uint8Array> = {};
  for (const entry of list) flat[entry.path] = entry.bytes;
  return zipSync(flat, { level: 6 });
}

/**
 * The whole export — §11.1's file and folder, as one download.
 *
 * Throws with a cited message where an asset's bytes are missing or two assets
 * claim one path; the caller surfaces it beside the preview rather than shipping
 * a folder that is quietly incomplete.
 */
export async function exportZip(file: TilesetFile, name = "tileset"): Promise<void> {
  const bytes = await bytesByKey(file);
  const list = entries(file, (tileId: string, asset: TileAsset) =>
    bytes.get(assetKey(tileId, asset.id)),
  );

  const blob = new Blob([zipOf(list) as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.zip`;
    anchor.click();
  } finally {
    // The click is synchronous and the browser has taken the URL by the time it
    // returns; revoking on a timer would be a guess about how long it needs.
    URL.revokeObjectURL(url);
  }
}
