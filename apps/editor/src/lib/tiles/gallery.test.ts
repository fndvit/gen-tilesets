import { describe, expect, it } from "vitest";
import { addTiles, newDocument } from "../../document.js";
import { checkName, countOf, filesOf, galleryKey, mineKey, pickAll, sourceOf, togglePick, verbOf } from "./gallery.js";

describe("pick keys", () => {
  it("keep the two sources apart and split back", () => {
    expect(galleryKey("t1-a1")).toBe("gallery:t1-a1");
    expect(sourceOf(mineKey("ab:cd"))).toEqual({ source: "mine", id: "ab:cd" });
    expect(sourceOf(galleryKey("t1-a1"))).toEqual({ source: "gallery", id: "t1-a1" });
  });
});

describe("togglePick", () => {
  it("keeps pick order, which is the variant order", () => {
    let picked = togglePick([], galleryKey("b"));
    picked = togglePick(picked, mineKey("x"));
    picked = togglePick(picked, galleryKey("a"));
    expect(picked).toEqual(["gallery:b", "mine:x", "gallery:a"]);
  });

  it("unpicks a picked key, and picking it again puts it last", () => {
    let picked = togglePick([galleryKey("a"), galleryKey("b")], galleryKey("a"));
    expect(picked).toEqual(["gallery:b"]);
    picked = togglePick(picked, galleryKey("a"));
    expect(picked).toEqual(["gallery:b", "gallery:a"]);
  });
});

describe("pickAll", () => {
  it("appends the keys not yet picked, in order, once each", () => {
    expect(pickAll([mineKey("a")], [mineKey("b"), mineKey("a"), mineKey("c"), mineKey("b")])).toEqual([
      "mine:a",
      "mine:b",
      "mine:c",
    ]);
  });
});

describe("verbOf and countOf", () => {
  const group = { kind: "group" } as const;
  const variants = { kind: "variants", tileName: "Blue" } as const;

  it("name the action and the number", () => {
    expect([verbOf(group, 0), verbOf(group, 1), verbOf(group, 3)]).toEqual(["Add tiles", "Add 1 tile", "Add 3 tiles"]);
    expect([verbOf(variants, 0), verbOf(variants, 1), verbOf(variants, 2)]).toEqual([
      "Add variants",
      "Add 1 variant",
      "Add 2 variants",
    ]);
    expect([countOf(0), countOf(1), countOf(12)]).toEqual(["None picked", "1 picked", "12 picked"]);
  });
});

describe("checkName", () => {
  const file = addTiles([
    { id: "t1", name: "Blue", assets: [{ id: "a1", weight: 1, meta: { src: "tiles/t1/a1.svg", width: 1, height: 1 } }] },
  ])(newDocument());

  it("refuses an empty name", () => {
    expect(checkName(file, "")).toBe("Give the new group a name.");
    expect(checkName(file, "   ")).toBe("Give the new group a name.");
  });

  it("refuses a taken name, ignoring case and outer spaces, as a rename does", () => {
    expect(checkName(file, " blue ")).toBe('Another group is already called "blue". Choose a different name.');
  });

  it("accepts a free name", () => {
    expect(checkName(file, "Mix")).toBeNull();
  });
});

describe("filesOf", () => {
  const file = (name: string) => new File([], name);

  it("lays the files out in pick order, mixing both sources, and gathers the failures", async () => {
    const slow = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const picked = [galleryKey("a"), mineKey("x"), galleryKey("gone"), galleryKey("b")];
    const { files, failures } = await filesOf(picked, async (key) => {
      const { id } = sourceOf(key);
      if (id === "gone") return { files: [], failures: ["Gone 1: HTTP 404"] };
      // The first pick finishes last; order is still pick order.
      if (id === "a") await slow(5);
      return { files: [file(id)], failures: [] };
    });
    expect(files.map((f) => f.name)).toEqual(["a", "x", "b"]);
    expect(failures).toEqual(["Gone 1: HTTP 404"]);
  });
});
