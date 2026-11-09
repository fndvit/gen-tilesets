import { describe, expect, it } from "vitest";
import { fileOf, idOf, memoryShelf, newestFirst, openShelf, upload, type MyTile } from "./my-tiles.js";

const png = (name: string, bytes: number[]) => new File([new Uint8Array(bytes)], name, { type: "image/png" });
const ok = async () => {};

describe("idOf", () => {
  it("is the SHA-256 of the bytes, so the same picture gets the same id", async () => {
    const empty = await idOf(new ArrayBuffer(0));
    expect(empty).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(await idOf(new Uint8Array([1, 2]).buffer)).toBe(await idOf(new Uint8Array([1, 2]).buffer));
    expect(await idOf(new Uint8Array([1, 2]).buffer)).not.toBe(await idOf(new Uint8Array([2, 1]).buffer));
  });
});

describe("newestFirst", () => {
  it("orders by upload time, newest first, and by id when times are equal", () => {
    const tile = (id: string, added: number): MyTile => ({ id, name: id, type: "", blob: new Blob(), added });
    expect(newestFirst([tile("b", 1), tile("c", 3), tile("a", 1)]).map((t) => t.id)).toEqual(["c", "a", "b"]);
  });
});

describe("upload", () => {
  it("puts each file on the shelf and returns the ids in file order", async () => {
    const shelf = memoryShelf();
    const { ids, failures } = await upload(shelf, [png("a.png", [1]), png("b.png", [2])], ok, () => 100);
    expect(failures).toEqual([]);
    expect(ids).toHaveLength(2);
    // A batch reads newest first in the order it was chosen.
    expect((await shelf.list()).map((t) => t.name)).toEqual(["a.png", "b.png"]);
  });

  it("shows a later batch before an earlier one", async () => {
    const shelf = memoryShelf();
    await upload(shelf, [png("old.png", [1])], ok, () => 100);
    await upload(shelf, [png("new.png", [2])], ok, () => 200);
    expect((await shelf.list()).map((t) => t.name)).toEqual(["new.png", "old.png"]);
  });

  it("keeps one copy of a picture uploaded twice, keeps its first name, and still returns its id", async () => {
    const shelf = memoryShelf();
    const first = await upload(shelf, [png("grass.png", [7, 7])], ok);
    const again = await upload(shelf, [png("copy.png", [7, 7]), png("copy.png", [7, 7])], ok);
    expect(again.ids).toEqual(first.ids);
    expect((await shelf.list()).map((t) => t.name)).toEqual(["grass.png"]);
  });

  it("refuses a file the check rejects, naming it, and keeps the rest", async () => {
    const shelf = memoryShelf();
    const check = async (file: File) => {
      if (file.name === "notes.txt") throw new Error("could not be decoded as an image");
    };
    const { ids, failures } = await upload(shelf, [png("notes.txt", [1]), png("b.png", [2])], check);
    expect(failures).toEqual(["notes.txt: could not be decoded as an image"]);
    expect(ids).toHaveLength(1);
    expect((await shelf.list()).map((t) => t.name)).toEqual(["b.png"]);
  });

  it("does not check a picture already on the shelf", async () => {
    const shelf = memoryShelf();
    await upload(shelf, [png("a.png", [1])], ok);
    let checked = 0;
    await upload(shelf, [png("a.png", [1])], async () => void checked++);
    expect(checked).toBe(0);
  });

  it("reports a refused write (a full quota) as a failure for that file", async () => {
    const shelf = memoryShelf();
    const full = {
      ...shelf,
      put: async () => {
        throw new Error("QuotaExceededError");
      },
    };
    const { ids, failures } = await upload(full, [png("a.png", [1])], ok);
    expect(ids).toEqual([]);
    expect(failures).toEqual(["a.png: QuotaExceededError"]);
  });
});

describe("memoryShelf", () => {
  it("removes by id and is not persistent", async () => {
    const shelf = memoryShelf();
    const { ids } = await upload(shelf, [png("a.png", [1]), png("b.png", [2])], ok);
    await shelf.remove([ids[0]!]);
    expect((await shelf.list()).map((t) => t.name)).toEqual(["b.png"]);
    expect(shelf.persistent).toBe(false);
  });
});

describe("openShelf", () => {
  it("falls back to memory when there is no IndexedDB", async () => {
    expect((await openShelf(() => undefined)).persistent).toBe(false);
  });

  it("falls back to memory when opening throws", async () => {
    const refusing = {
      open: () => {
        throw new Error("SecurityError");
      },
    } as unknown as IDBFactory;
    expect((await openShelf(() => refusing)).persistent).toBe(false);
  });

  it("falls back to memory when even reading indexedDB throws (blocked site data)", async () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    expect((await openShelf(blocked)).persistent).toBe(false);
  });
});

describe("fileOf", () => {
  it("rebuilds the uploaded file: same name, type and bytes", async () => {
    const shelf = memoryShelf();
    await upload(shelf, [png("grass.png", [1, 2, 3])], ok);
    const file = fileOf((await shelf.list())[0]!);
    expect([file.name, file.type]).toEqual(["grass.png", "image/png"]);
    expect(Array.from(new Uint8Array(await file.arrayBuffer()))).toEqual([1, 2, 3]);
  });
});
