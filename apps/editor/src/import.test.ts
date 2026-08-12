/**
 * Reading an exported archive back — `09` §11.1, §12.4.
 *
 * The property worth testing is the **round-trip**: what `entries()` writes,
 * `readArchive()` reads, with the same `(tileId, assetId)` pairs attached to the
 * same bytes. Anything less would leave the two halves free to drift, which is
 * exactly what reading `meta.src` back rather than rebuilding the path exists to
 * prevent.
 */

import { migrate, validate, type TilesetFile } from "@tileset/core";
import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { newDocument } from "./document.js";
import { entries, FILE_NAME, serialize } from "./export.js";
import { mimeOf, nameOf, readArchive, type Archive } from "./import.js";

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

const withAssets = (): TilesetFile => {
  const file = newDocument();
  return {
    ...file,
    config: {
      ...file.config,
      tiles: [
        {
          id: "t1",
          name: "leaf",
          assets: [
            { id: "a1", weight: 1, meta: { src: "tiles/t1/a1.png", width: 64, height: 64 } },
            { id: "a2", weight: 2, meta: { src: "tiles/t1/a2.png", width: 64, height: 64 } },
          ],
        },
        {
          id: "t2",
          name: "stone",
          // The same asset id in a different Tile — legal (`06` §6), and the
          // collision the pair-keyed store exists to keep apart.
          assets: [{ id: "a1", weight: 1, meta: { src: "tiles/t2/a1.svg", width: 32, height: 32 } }],
        },
      ],
    },
  };
};

/** The archive an export of `file` would produce. */
const archiveOf = (file: TilesetFile): Archive =>
  new Map(entries(file, (tileId, asset) => bytes(`${tileId}/${asset.id}`)).map((e) => [e.path, e.bytes]));

describe("readArchive — the round-trip", () => {
  it("reads back exactly what entries() wrote", () => {
    const file = withAssets();
    const { file: parsed, assets, missing } = readArchive(archiveOf(file));

    expect(parsed).toEqual(file);
    expect(missing).toEqual([]);
    expect(assets.map((a) => [a.tileId, a.assetId, a.path])).toEqual([
      ["t1", "a1", "tiles/t1/a1.png"],
      ["t1", "a2", "tiles/t1/a2.png"],
      ["t2", "a1", "tiles/t2/a1.svg"],
    ]);
  });

  /** The two Tiles sharing an asset id must not collapse into one entry. */
  it("keeps assets apart by pair, never by assetId", () => {
    const { assets } = readArchive(archiveOf(withAssets()));
    const t1 = assets.find((a) => a.tileId === "t1" && a.assetId === "a1")!;
    const t2 = assets.find((a) => a.tileId === "t2" && a.assetId === "a1")!;
    expect(new TextDecoder().decode(t1.bytes)).toBe("t1/a1");
    expect(new TextDecoder().decode(t2.bytes)).toBe("t2/a1");
  });

  /** The exported document validates — the two halves agree end to end. */
  it("produces a document that validates", () => {
    expect(validate(readArchive(archiveOf(withAssets())).file)).toEqual([]);
  });

  it("reads an empty document with no assets", () => {
    const { assets, missing } = readArchive(archiveOf(newDocument()));
    expect(assets).toEqual([]);
    expect(missing).toEqual([]);
  });
});

describe("readArchive — what it refuses and what it tolerates", () => {
  it("throws where the archive carries no tileset.json", () => {
    const archive = new Map([["tiles/t1/a1.png", bytes("x")]]);
    expect(() => readArchive(archive)).toThrow(/no tileset\.json/);
  });

  /**
   * `06` §10 — "JSON syntax errors belong to whoever called `JSON.parse`". They
   * are never dressed up as `ValidationError`s, which `09` renders against
   * fields.
   */
  it("throws on unparseable JSON rather than producing a ValidationError", () => {
    const archive = new Map([[FILE_NAME, bytes("{ not json")]]);
    expect(() => readArchive(archive)).toThrow(/not valid JSON/);
  });

  /**
   * A picture the archive does not carry is an **advisory**. The document is
   * still legal and the author can repair it; refusing would throw away the
   * operations, the seed and the layout over one missing file.
   */
  it("reports a missing asset without refusing the document", () => {
    const archive = new Map(archiveOf(withAssets()));
    archive.delete("tiles/t1/a2.png");
    const { assets, missing } = readArchive(archive);
    expect(missing).toEqual(["tiles/t1/a2.png"]);
    expect(assets).toHaveLength(2);
  });

  /**
   * The document drives the walk, not the folder — an image nobody references
   * is simply not read, rather than arriving as an asset of a Tile that does not
   * claim it.
   */
  it("ignores an archive entry the document does not name", () => {
    const archive = new Map(archiveOf(withAssets()));
    archive.set("tiles/t9/stale.png", bytes("orphan"));
    expect(readArchive(archive).assets).toHaveLength(3);
  });

  /**
   * It runs **before** validation, in order to report missing pictures alongside
   * it, so it must not assume the document it walks is well-formed.
   */
  it("survives a malformed document rather than throwing", () => {
    const archive = new Map([[FILE_NAME, bytes(JSON.stringify({ config: { tiles: "nope" } }))]]);
    expect(readArchive(archive).assets).toEqual([]);
    const partial = new Map([
      [FILE_NAME, bytes(JSON.stringify({ config: { tiles: [{ id: 7 }, null] } }))],
    ]);
    expect(readArchive(partial).assets).toEqual([]);
  });

  /** An asset with no `meta.src` cannot be pointed at, and is not missing either. */
  it("skips an asset with no meta.src", () => {
    const file = withAssets();
    file.config.tiles[0]!.assets[0]!.meta = {};
    const archive = new Map([[FILE_NAME, bytes(JSON.stringify(file))]]);
    const { assets, missing } = readArchive(archive);
    expect(assets).toEqual([]);
    expect(missing).toEqual(["tiles/t1/a2.png", "tiles/t2/a1.svg"]);
  });
});

/**
 * The panel's whole non-DOM path, through a real zip: unzip → `readArchive` →
 * `migrate` → `validate`. Everything `ImportPanel.svelte` does before it touches
 * the asset store or the session.
 */
describe("the import path, end to end through a zip", () => {
  const zipOf = (file: TilesetFile, version = file.schemaVersion): Archive => {
    const flat: Record<string, Uint8Array> = {};
    for (const entry of entries(file, (tileId, asset) => bytes(`${tileId}/${asset.id}`))) {
      flat[entry.path] = entry.bytes;
    }
    // Rewritten rather than passed through `entries`, so the document really
    // declares the version under test.
    flat[FILE_NAME] = bytes(serialize({ ...file, schemaVersion: version } as TilesetFile));
    const unzipped = unzipSync(zipSync(flat, { level: 6 }));
    return new Map(Object.entries(unzipped));
  };

  it("round-trips a current export", () => {
    const file = withAssets();
    const { file: read } = readArchive(zipOf(file));
    expect(migrate(read)).toEqual({ kind: "current" });
    expect(validate(read)).toEqual([]);
  });

  /**
   * **The reported case.** A document exported before ADR-005 declares
   * `schemaVersion: 1`, and until `migrate()` existed it was refused with
   * `SCHEMA_VERSION_UNKNOWN` — and told, wrongly, to update the editor. It now
   * opens, and the migration changes nothing but the number.
   */
  it("opens a v1 archive by migrating it", () => {
    const file = withAssets();
    const { file: read, assets, missing } = readArchive(zipOf(file, 1 as 2));

    const outcome = migrate(read);
    expect(outcome.kind).toBe("migrated");
    if (outcome.kind !== "migrated") return;
    expect(validate(outcome.file)).toEqual([]);
    expect(outcome.file).toEqual(file);

    // The pictures come across unchanged — the version was the only difference.
    expect(missing).toEqual([]);
    expect(assets).toHaveLength(3);
  });

  /** §12.4's case, and the only one that should say *update the editor*. */
  it("refuses a newer archive without migrating it", () => {
    const { file: read } = readArchive(zipOf(withAssets(), 3 as 2));
    expect(migrate(read)).toEqual({ kind: "newer", declared: 3 });
  });

  /**
   * Migration runs first and validation still does its job on the result —
   * a v1 file that is invalid for an unrelated reason fails at the real
   * problem's own path, not at `/schemaVersion`.
   */
  it("migrates a v1 archive and then reports its real problem", () => {
    const file = withAssets();
    const flat: Record<string, Uint8Array> = {
      [FILE_NAME]: bytes(JSON.stringify({ ...file, schemaVersion: 1, colour: "red" })),
    };
    const archive = new Map(Object.entries(unzipSync(zipSync(flat))));
    const outcome = migrate(readArchive(archive).file);
    expect(outcome.kind).toBe("migrated");
    if (outcome.kind !== "migrated") return;
    expect(validate(outcome.file).map((e) => [e.code, e.path])).toEqual([["UNKNOWN_KEY", "/colour"]]);
  });
});

describe("nameOf and mimeOf", () => {
  it("takes the basename of an export path", () => {
    expect(nameOf("tiles/t1/a1.png")).toBe("a1.png");
    expect(nameOf("tileset.json")).toBe("tileset.json");
  });

  it("maps the extensions a browser needs a type for", () => {
    expect(mimeOf("tiles/t1/a1.png")).toBe("image/png");
    expect(mimeOf("tiles/t1/a1.SVG")).toBe("image/svg+xml");
    expect(mimeOf("tiles/t1/a1.jpeg")).toBe("image/jpeg");
    // Left empty rather than guessed at — `measure()` decodes through an Image,
    // which sniffs content.
    expect(mimeOf("tiles/t1/a1.bin")).toBe("");
  });
});
