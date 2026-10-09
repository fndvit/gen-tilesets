/**
 * The asset store — `09-editor.md` §10.3, §10.4.
 *
 * `measure` needs a DOM `Image`, which Node does not have, so a minimal one is
 * stubbed: it "decodes" any URL at 10 × 10. What is tested is the store's
 * lifetime, which is where undo and id allocation meet it.
 */

import type { Drawable } from "@fndvit/gen-tilesets/render";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attach, editorProvider, heldAssetIds, heldTileIds, replaceAll } from "./assets.js";
import { nextAssetId, nextTileId } from "./ids.js";

class FakeImage {
  naturalWidth = 10;
  naturalHeight = 10;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_url: string) {
    queueMicrotask(() => this.onload?.());
  }
}

const file = (name: string) => new File(["x"], name, { type: "image/png" });
const ref = (tileId: string, assetId: string) => ({ tileId, assetId, meta: {} });
/** `editorProvider` is synchronous; the cast only narrows `AssetProvider`'s return type. */
const srcOf = (tileId: string, assetId: string) => (editorProvider(ref(tileId, assetId)) as Drawable).src;

beforeAll(() => {
  (globalThis as { Image?: unknown }).Image = FakeImage;
});
afterAll(() => {
  delete (globalThis as { Image?: unknown }).Image;
});

describe("the store outlives a delete — undo needs the bytes", () => {
  it("still resolves an asset the document no longer holds", async () => {
    await replaceAll([]);
    await attach("t1", "a1", file("grass.png"));
    // Nothing on delete touches the store, so undoing the delete finds it here.
    expect(() => editorProvider(ref("t1", "a1"))).not.toThrow();
  });

  it("keeps a new Tile's id clear of a deleted Tile's bytes", async () => {
    await replaceAll([]);
    const kept = await attach("t1", "a1", file("grass.png"));
    // The document is now empty (t1 deleted); its bytes are still held.
    const id = nextTileId(heldTileIds());
    expect(id).toBe("t2");
    await attach(id, "a1", file("water.png"));
    expect(srcOf("t1", "a1")).toBe(kept.url);
  });

  it("keeps a new asset's id clear of a deleted asset's bytes", async () => {
    await replaceAll([]);
    await attach("t1", "a1", file("grass.png"));
    await attach("t1", "a2", file("grass-2.png"));
    // a2 deleted from the document: only a1 is left there.
    expect(nextAssetId(["a1", ...heldAssetIds("t1")])).toBe("a3");
    expect(heldAssetIds("t2")).toEqual([]);
  });

  it("is emptied by replaceAll, which is where the session's bytes are reclaimed", async () => {
    await attach("t9", "a1", file("grass.png"));
    await replaceAll([]);
    expect(heldTileIds()).toEqual([]);
    expect(() => editorProvider(ref("t9", "a1"))).toThrow(/no attached file/);
  });
});
