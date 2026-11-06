import { describe, expect, it } from "vitest";
import { dismissalId, prune, upsert, visible, type Notice } from "./notices.js";

const advisory = (key: string, signature = ""): Notice => ({ key, signature, kind: "advisory", title: key });
const failure = (key: string): Notice => ({ key, kind: "failure", title: key });

describe("upsert", () => {
  it("adds a new key at the end", () => {
    expect(upsert([advisory("a")], advisory("b")).map((n) => n.key)).toEqual(["a", "b"]);
  });

  it("replaces a known key in place, so an event that happens twice shows once", () => {
    const next = upsert([advisory("a"), advisory("b")], { ...advisory("a"), title: "again" });
    expect(next.map((n) => [n.key, n.title])).toEqual([
      ["a", "again"],
      ["b", "b"],
    ]);
  });
});

describe("visible", () => {
  it("puts failures first, then advisories, each in the order given", () => {
    const shown = visible([advisory("a1"), failure("f1"), advisory("a2"), failure("f2")], new Set());
    expect(shown.map((n) => n.key)).toEqual(["f1", "f2", "a1", "a2"]);
  });

  it("shows one notice per key, the first", () => {
    const shown = visible([advisory("a", "1"), advisory("a", "2")], new Set());
    expect(shown.map((n) => n.signature)).toEqual(["1"]);
  });

  it("leaves out a dismissed notice while its signature is unchanged", () => {
    const n = advisory("orphan", "op-2:3");
    expect(visible([n], new Set([dismissalId(n)]))).toEqual([]);
  });

  it("brings a dismissed notice back when its details change", () => {
    const before = advisory("orphan", "op-2:3");
    const after = advisory("orphan", "op-2:4");
    expect(visible([after], new Set([dismissalId(before)]))).toEqual([after]);
  });

  it("treats a missing signature as empty", () => {
    expect(dismissalId({ key: "a", kind: "advisory", title: "a" })).toBe(dismissalId(advisory("a", "")));
  });
});

describe("prune", () => {
  it("forgets a dismissal once its condition goes away, so it shows again when it returns", () => {
    const n = advisory("square:road.png");
    const dismissed = prune([], new Set([dismissalId(n)]));
    expect(dismissed.size).toBe(0);
    expect(visible([n], dismissed)).toEqual([n]);
  });

  it("keeps a dismissal while its condition holds, and returns the same set", () => {
    const n = advisory("a");
    const dismissed = new Set([dismissalId(n)]);
    expect(prune([n], dismissed)).toBe(dismissed);
  });
});
