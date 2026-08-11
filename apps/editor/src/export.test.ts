/**
 * Export — `09-editor.md` §11; **E14**.
 *
 * **Invariant E14** — *export produces a `TilesetFile` and an asset folder
 * together. Every `meta.src` in the file is a path relative to that folder's
 * root.*
 *
 * The zipping and the download are `download.ts`'s and are not tested — they read
 * `Blob`s and click an anchor. What is tested is the part that decides *what goes
 * in*, because that is where E14 is either held or quietly broken.
 */

import type { Operation, Tile, TilesetFile } from "@tileset/core";
import { describe, expect, it } from "vitest";
import { newDocument } from "./document.js";
import { drawsNothing, entries, FILE_NAME, serialize } from "./export.js";

const asset = (id: string, src: string | undefined) => ({
  id,
  weight: 1,
  meta: src === undefined ? {} : { src, width: 10, height: 10 },
});

const tile = (id: string, assets: Tile["assets"]): Tile => ({ id, name: id, assets });

const paletteOp = (id: string, tileIds: (string | null)[]): Operation => ({
  id,
  salt: 0,
  reseedOnLoad: false,
  selection: { type: "all" },
  source: { type: "random" },
  target: "tileId",
  mapping: { palette: tileIds.map((tileId) => ({ tileId, weight: 1 })) },
  blend: "set",
});

const docWith = (tiles: Tile[], operations: Operation[] = []): TilesetFile => {
  const file = newDocument();
  file.config.tiles = tiles;
  file.config.operations = operations;
  return file;
};

const bytes = () => new Uint8Array([1, 2, 3]);

describe("the file — 09 §11.3", () => {
  it("carries schemaVersion and engineVersion, always", () => {
    const parsed = JSON.parse(serialize(newDocument()));
    expect(parsed.schemaVersion).toBe(1);
    expect(typeof parsed.engineVersion).toBe("string");
  });

  it("writes the optional fields explicitly — 06 §5.1", () => {
    // "The defaults exist so hand-written fixtures stay short, not so saved
    // files can be sparse."
    const parsed = JSON.parse(serialize(newDocument()));
    expect(parsed.config.assetSalt).toBe(0);
    expect(parsed.config.reseedAssetsOnLoad).toBe(false);
    expect(parsed.layout.yOffset).toBe(0);
  });

  it("omits `steps` rather than writing null — its absence is a meaning", () => {
    // `06` §5.1's one exception: `steps` absent reads as *continuous*, not as a
    // number with a blank default.
    const file = docWith([], [
      {
        id: "op1",
        salt: 0,
        reseedOnLoad: false,
        selection: { type: "all" },
        source: { type: "random" },
        target: "opacity",
        mapping: { range: [0, 1] },
        blend: "set",
      },
    ]);
    const text = serialize(file);
    expect(text).not.toContain("steps");
    expect(text).not.toContain("null");
  });

  it("ends with a newline, because it is a text file a human may commit", () => {
    expect(serialize(newDocument()).endsWith("}\n")).toBe(true);
  });
});

describe("the folder — 09 §11.1", () => {
  it("holds the JSON plus one file per asset", () => {
    const file = docWith([
      tile("t1", [asset("a1", "tiles/t1/a1.png")]),
      tile("t2", [asset("a1", "tiles/t2/a1.png"), asset("a2", "tiles/t2/a2.svg")]),
    ]);
    const list = entries(file, bytes);
    expect(list.map((e) => e.path)).toEqual([
      FILE_NAME,
      "tiles/t1/a1.png",
      "tiles/t2/a1.png",
      "tiles/t2/a2.svg",
    ]);
  });

  it("keeps two Tiles' identically-named assets apart — 07 §4.1", () => {
    // The collision §11.1's directory structure exists to prevent: a flat folder
    // would write two files called `a1` and lose one silently.
    const file = docWith([
      tile("t1", [asset("a1", "tiles/t1/a1.png")]),
      tile("t2", [asset("a1", "tiles/t2/a1.png")]),
    ]);
    const paths = entries(file, bytes).map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("takes the path from meta.src, so the file and the folder cannot disagree", () => {
    // E14: every `meta.src` is a path relative to the folder's root. Rebuilding
    // the path here would be a second implementation of §11.1's layout.
    const file = docWith([tile("t1", [asset("a1", "tiles/t1/a1.png")])]);
    const paths = entries(file, bytes).map((e) => e.path);
    expect(paths).toContain("tiles/t1/a1.png");
  });

  it("refuses an asset with no meta.src rather than shipping an unreachable file", () => {
    const file = docWith([tile("t1", [asset("a1", undefined)])]);
    expect(() => entries(file, bytes)).toThrow(/no meta\.src/);
  });

  it("refuses two assets claiming one path", () => {
    // Reachable only by a hand-edited `src`, and it would drop a picture.
    const file = docWith([
      tile("t1", [asset("a1", "tiles/t1/a1.png")]),
      tile("t2", [asset("a1", "tiles/t1/a1.png")]),
    ]);
    expect(() => entries(file, bytes)).toThrow(/would overwrite/);
  });

  it("refuses to ship a folder missing an asset's bytes", () => {
    // The store is session-scoped, so this is reachable. A quietly incomplete
    // folder is R3's substitution problem moved into the artifact, where no
    // `onAssetError` ever fires for it.
    const file = docWith([tile("t1", [asset("a1", "tiles/t1/a1.png")])]);
    expect(() => entries(file, () => undefined)).toThrow(/no attached bytes/);
  });

  it("exports a document with no tiles — an empty file is legal", () => {
    expect(entries(newDocument(), bytes).map((e) => e.path)).toEqual([FILE_NAME]);
  });
});

describe("§12.2's fifth advisory — the document draws nothing", () => {
  it("is raised for an empty document", () => {
    expect(drawsNothing(newDocument())).toBe(true);
  });

  it("is raised where there are tiles but no operations", () => {
    expect(drawsNothing(docWith([tile("t1", [asset("a1", "tiles/t1/a1.png")])]))).toBe(true);
  });

  it("is raised where every palette entry is null — 02 §8.1", () => {
    const file = docWith(
      [tile("t1", [asset("a1", "tiles/t1/a1.png")])],
      [paletteOp("op1", [null, null])],
    );
    expect(drawsNothing(file)).toBe(true);
  });

  it("is silent once a palette names a Tile", () => {
    const file = docWith(
      [tile("t1", [asset("a1", "tiles/t1/a1.png")])],
      [paletteOp("op1", [null, "t1"])],
    );
    expect(drawsNothing(file)).toBe(false);
  });

  it("is raised where no Operation targets tileId at all", () => {
    // Rotating cells that were never filled draws nothing (**G4**).
    const file = docWith([tile("t1", [asset("a1", "tiles/t1/a1.png")])], [
      {
        id: "op1",
        salt: 0,
        reseedOnLoad: false,
        selection: { type: "all" },
        source: { type: "random" },
        target: "rotation",
        mapping: { range: [0, 90] },
        blend: "set",
      },
    ]);
    expect(drawsNothing(file)).toBe(true);
  });
});
