/**
 * Hidden operations — batch 02 T-02, D-02 A. The filter the preview and Export
 * image draw through, the open-operation exception, and pruning.
 */

import type { Operation, TilesetFile } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import { newDocument } from "../../document.js";
import { nextOperationId } from "../../ids.js";
import { pruned, toggled, withoutHidden } from "./visibility.js";

const op = (id: string): Operation =>
  ({
    id,
    selection: [{ type: "all" }],
    source: { type: "constant", value: 1 },
    target: "opacity",
    blend: "replace",
  }) as unknown as Operation;

function fileWith(...ids: string[]): TilesetFile {
  const base = newDocument();
  return { ...base, config: { ...base.config, operations: ids.map(op) } };
}

const ids = (f: TilesetFile) => f.config.operations.map((o) => o.id);

describe("withoutHidden", () => {
  it("leaves out the hidden operations and keeps the rest in stack order", () => {
    const file = fileWith("op1", "op2", "op3");
    expect(ids(withoutHidden(file, new Set(["op2"])))).toEqual(["op1", "op3"]);
  });

  it("returns the file itself when nothing is hidden, so the preview does not redraw", () => {
    const file = fileWith("op1", "op2");
    expect(withoutHidden(file, new Set())).toBe(file);
    expect(withoutHidden(file, new Set(["op9"]))).toBe(file);
  });

  it("draws the operation open for editing even when it is hidden", () => {
    const file = fileWith("op1", "op2", "op3");
    const hidden = new Set(["op1", "op2"]);
    expect(ids(withoutHidden(file, hidden, "op2"))).toEqual(["op2", "op3"]);
    // Closed again: hidden again, because opening never touched the set.
    expect(ids(withoutHidden(file, hidden, null))).toEqual(["op3"]);
  });

  it("never touches the file it was given — the saved file keeps every operation", () => {
    const file = fileWith("op1", "op2");
    const before = structuredClone(file);
    const shown = withoutHidden(file, new Set(["op1"]));
    expect(file).toEqual(before);
    expect(shown.layout).toBe(file.layout);
    expect(shown.config.tiles).toBe(file.config.tiles);
  });
});

describe("toggled", () => {
  it("hides a shown operation and shows a hidden one, as a new set", () => {
    const empty: ReadonlySet<string> = new Set();
    const once = toggled(empty, "op1");
    expect([...once]).toEqual(["op1"]);
    expect(empty.size).toBe(0);
    expect([...toggled(once, "op1")]).toEqual([]);
  });
});

describe("pruned", () => {
  it("drops ids no longer in the file", () => {
    expect([...pruned(new Set(["op1", "op3"]), [op("op1"), op("op2")])]).toEqual(["op1"]);
  });

  it("returns the set itself when nothing was pruned, so writing it back is a no-op", () => {
    const hidden = new Set(["op1"]);
    expect(pruned(hidden, [op("op1"), op("op2")])).toBe(hidden);
  });

  it("lets a new operation that is given a deleted operation's id start visible", () => {
    // Hide the newest, delete it: its id is free again.
    let hidden = toggled(new Set(), "op2");
    const after = [op("op1")];
    hidden = pruned(hidden, after);
    const reused = nextOperationId(after.map((o) => o.id));
    expect(reused).toBe("op2");
    expect(hidden.has(reused)).toBe(false);
  });
});
