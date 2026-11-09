/**
 * Keeping the open tileset across reloads (B-016 S4a).
 *
 * Two properties matter. A save writes only what changed, so a picture is not
 * rewritten on every edit. And what was kept reopens through `prepareArchive`
 * exactly as an export of it would, including the migration of an older file
 * and the refusal of a newer or invalid one.
 */

import { SCHEMA_VERSION, type TilesetFile } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { newDocument } from "./document.js";
import { prepareArchive } from "./import.js";
import {
  afterSave,
  archiveOf,
  isNoop,
  memoryStore,
  notKeptNotice,
  openStore,
  picturesOf,
  refusedNotice,
  savePlan,
  type BlobFor,
} from "./keep.js";

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
      ],
    },
  };
};

const blobs = new Map([
  ["t1/a1", new Blob([new Uint8Array([1, 1])], { type: "image/png" })],
  ["t1/a2", new Blob([new Uint8Array([2, 2])], { type: "image/png" })],
]);
const blobFor: BlobFor = (tileId, asset) => blobs.get(`${tileId}/${asset.id}`);

describe("savePlan", () => {
  it("puts every picture the first time, and the document", () => {
    const file = withAssets();
    const plan = savePlan(file, blobFor, new Map());
    expect(plan.file).toBe(file);
    expect(plan.put.map((p) => p.src)).toEqual(["tiles/t1/a1.png", "tiles/t1/a2.png"]);
    expect(plan.remove).toEqual([]);
  });

  it("puts nothing a second time, and is then a no-op for the same document", () => {
    const file = withAssets();
    const first = savePlan(file, blobFor, new Map());
    const saved = afterSave(new Map(), first);
    const second = savePlan(file, blobFor, saved);
    expect(second.put).toEqual([]);
    expect(isNoop(second, file)).toBe(true);
    // A changed document is still written, even with no picture to put.
    expect(isNoop(savePlan({ ...file }, blobFor, saved), file)).toBe(false);
  });

  it("rewrites a path whose bytes are a different object (a store replaced by New or Import)", () => {
    const file = withAssets();
    const saved = afterSave(new Map(), savePlan(file, blobFor, new Map()));
    const replaced: BlobFor = (tileId, asset) =>
      asset.id === "a1" ? new Blob([new Uint8Array([9])]) : blobFor(tileId, asset);
    expect(savePlan(file, replaced, saved).put.map((p) => p.src)).toEqual(["tiles/t1/a1.png"]);
  });

  it("removes pictures the document no longer names", () => {
    const file = withAssets();
    const saved = afterSave(new Map(), savePlan(file, blobFor, new Map()));
    const fewer: TilesetFile = {
      ...file,
      config: { ...file.config, tiles: [{ ...file.config.tiles[0]!, assets: [file.config.tiles[0]!.assets[0]!] }] },
    };
    const plan = savePlan(fewer, blobFor, saved);
    expect(plan.remove).toEqual(["tiles/t1/a2.png"]);
    expect([...afterSave(saved, plan).keys()]).toEqual(["tiles/t1/a1.png"]);
  });

  it("keeps the kept bytes of a picture the store has none for", () => {
    const file = withAssets();
    const saved = afterSave(new Map(), savePlan(file, blobFor, new Map()));
    const lost: BlobFor = (tileId, asset) => (asset.id === "a2" ? undefined : blobFor(tileId, asset));
    const plan = savePlan(file, lost, saved);
    expect(plan.put).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it("skips an asset that names no src", () => {
    const file = withAssets();
    const bare: TilesetFile = {
      ...file,
      config: { ...file.config, tiles: [{ id: "t9", name: "bare", assets: [{ id: "a1", weight: 1 }] }] },
    };
    expect([...picturesOf(bare, blobFor).keys()]).toEqual([]);
  });
});

describe("restoring through prepareArchive", () => {
  it("round-trips a kept document with its pictures", async () => {
    const store = memoryStore();
    const file = withAssets();
    await store.write(savePlan(file, blobFor, new Map()));
    const prepared = prepareArchive(await archiveOf((await store.read())!));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.file).toEqual(file);
    expect(prepared.upgrades).toEqual([]);
    expect(prepared.incoming.map((i) => [i.tileId, i.assetId])).toEqual([
      ["t1", "a1"],
      ["t1", "a2"],
    ]);
    expect(new Uint8Array(await prepared.incoming[1]!.file.arrayBuffer())).toEqual(new Uint8Array([2, 2]));
  });

  it("keeps the document's own engineVersion: a reload is not an export", async () => {
    const file = { ...withAssets(), engineVersion: "0.0.1" };
    const archive = await archiveOf({ file, pictures: new Map() });
    expect(JSON.parse(new TextDecoder().decode(archive.get("tileset.json")!)).engineVersion).toBe("0.0.1");
  });

  it("migrates a document kept by an older editor", async () => {
    const file = { ...withAssets(), schemaVersion: 2 } as unknown as TilesetFile;
    const prepared = prepareArchive(await archiveOf({ file, pictures: new Map() }));
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.file.schemaVersion).toBe(SCHEMA_VERSION);
    expect(prepared.upgrades.length).toBeGreaterThan(0);
  });

  it("refuses one kept by a newer editor, and one that no longer validates", async () => {
    const newer = { ...withAssets(), schemaVersion: SCHEMA_VERSION + 1 } as unknown as TilesetFile;
    expect(prepareArchive(await archiveOf({ file: newer, pictures: new Map() })).kind).toBe("newer");
    const invalid = { ...withAssets(), config: { ...withAssets().config, tiles: "no" } } as unknown as TilesetFile;
    expect(prepareArchive(await archiveOf({ file: invalid, pictures: new Map() })).kind).toBe("invalid");
  });
});

describe("notices", () => {
  it("says why a kept tileset did not reopen", () => {
    expect(refusedNotice({ kind: "newer", declared: 99 }).data).toEqual([
      "It was saved by a newer build (schemaVersion 99). Update the editor.",
    ]);
    const invalid = refusedNotice({
      kind: "invalid",
      errors: [{ path: "/config/tiles", code: "E_TYPE", message: "must be an array" }],
    } as never);
    expect(invalid.kind).toBe("failure");
    expect(invalid.data).toEqual(["/config/tiles: must be an array"]);
    expect(refusedNotice({ kind: "unreadable", reason: "boom" }).data).toEqual(["boom"]);
  });

  it("names the refused save, and changes signature with the reason", () => {
    expect(notKeptNotice(null).data).toBeUndefined();
    expect(notKeptNotice("QuotaExceededError").data).toEqual(["QuotaExceededError"]);
    expect(notKeptNotice("a").signature).not.toBe(notKeptNotice("b").signature);
  });
});

describe("openStore", () => {
  it("falls back to memory when there is no IndexedDB, or it is blocked", async () => {
    expect((await openStore(() => undefined)).persistent).toBe(false);
    const blocked = () => {
      throw new Error("SecurityError");
    };
    expect((await openStore(blocked)).persistent).toBe(false);
  });

  it("reads nothing before the first write", async () => {
    expect(await memoryStore().read()).toBeNull();
  });
});
