/**
 * The editor's notices — `09` §12.2 and §12.3. Each detection fires on its
 * condition and stays silent on a document the editor itself produced.
 */

import type { Operation, TilesetFile } from "@vit-foundation/gen-tilesets";
import { describe, expect, it } from "vitest";
import {
  assetFailures,
  documentNotices,
  importNotices,
  inertReseed,
  narrowGrid,
  nonSquare,
  MAX_OPEN_ACTIONS,
  orphanedNotice,
  parityMismatch,
} from "./advisories.js";
import { deriveColumns } from "./derive.js";
import { newDocument } from "./document.js";

const op = (over: Partial<Operation> = {}): Operation => ({
  id: "op1",
  salt: 0,
  reseedOnLoad: false,
  selection: { type: "all" },
  source: { type: "random" },
  target: "opacity",
  mapping: { range: [0, 1] },
  blend: "set",
  ...over,
});

/** A new document with its config and layout overridden. */
function doc(config: Partial<TilesetFile["config"]> = {}, layout: Partial<TilesetFile["layout"]> = {}): TilesetFile {
  const base = newDocument();
  return { ...base, config: { ...base.config, ...config }, layout: { ...base.layout, ...layout } };
}

describe("a document the editor made raises nothing", () => {
  it("is silent on a new document", () => {
    expect(documentNotices(newDocument(), [], [])).toEqual([]);
  });

  it("is silent on every derived column count", () => {
    for (const alignment of ["column", "gutter"] as const) {
      for (const referenceWidth of [300, 768, 1001]) {
        const columns = deriveColumns(referenceWidth, 54, alignment);
        const file = doc({ columns }, { cellSize: 54, referenceWidth, horizontalAlignment: alignment });
        expect(parityMismatch(file)).toBeNull();
        expect(narrowGrid(file)).toBeNull();
      }
    }
  });
});

describe("advisory 1 — parity against alignment", () => {
  it("fires for an even count aligned on a column, and an odd one on a gutter", () => {
    expect(parityMismatch(doc({ columns: 10 }, { horizontalAlignment: "column" }))?.kind).toBe("advisory");
    expect(parityMismatch(doc({ columns: 11 }, { horizontalAlignment: "gutter" }))).not.toBeNull();
  });

  it("is silent when they match", () => {
    expect(parityMismatch(doc({ columns: 11 }, { horizontalAlignment: "column" }))).toBeNull();
    expect(parityMismatch(doc({ columns: 10 }, { horizontalAlignment: "gutter" }))).toBeNull();
  });
});

describe("advisory 4 — a grid narrower than its design width", () => {
  it("fires below the reference width and names the numbers", () => {
    const notice = narrowGrid(doc({ columns: 10 }, { cellSize: 54, referenceWidth: 768 }));
    expect(notice?.data).toEqual(["10 × 54 px = 540 px, under 768 px"]);
  });

  it("is silent at exactly the reference width", () => {
    expect(narrowGrid(doc({ columns: 10 }, { cellSize: 50, referenceWidth: 500 }))).toBeNull();
  });
});

describe("advisory 2 — reseed on load over a non-random source", () => {
  it("names each flagged operation over a constant source", () => {
    const file = doc({ operations: [op({ id: "a", reseedOnLoad: true, source: { type: "constant" } })] });
    expect(inertReseed(file)?.data).toEqual(["a · constant"]);
  });

  it("is silent over a random source, or without the flag", () => {
    expect(inertReseed(doc({ operations: [op({ reseedOnLoad: true })] }))).toBeNull();
    expect(inertReseed(doc({ operations: [op({ source: { type: "constant" } })] }))).toBeNull();
  });
});

describe("advisory 7 — non-square assets", () => {
  const tile = (meta: Record<string, unknown> | undefined) => ({
    id: "t1",
    name: "grass",
    assets: [{ id: "a1", weight: 1, ...(meta ? { meta } : {}) }],
  });

  it("fires for a measured non-square asset", () => {
    const notice = nonSquare(doc({ tiles: [tile({ width: 64, height: 48 })] }));
    expect(notice?.title).toBe("A picture isn't square");
    expect(notice?.data).toEqual(["grass · a1 · 64 × 48"]);
  });

  it("is silent for a square one, and never guesses an unmeasured one", () => {
    expect(nonSquare(doc({ tiles: [tile({ width: 64, height: 64 })] }))).toBeNull();
    expect(nonSquare(doc({ tiles: [tile(undefined)] }))).toBeNull();
    expect(nonSquare(doc({ tiles: [tile({ width: "64", height: 48 })] }))).toBeNull();
  });
});

describe("advisory 3 — orphans", () => {
  it("tells a painted list how many cells it lost, and an empty rect that it selects nothing", () => {
    const notice = orphanedNotice([
      { operationId: "op2", selectionType: "cellList", reachable: 8, authored: 11, empty: false },
      { operationId: "op4", selectionType: "rect", reachable: 0, empty: true },
    ]);
    expect(notice?.data).toEqual([
      "op2 · cellList: 3 of 11 painted cells outside the grid",
      "op4 · rect: wholly outside the grid, selects nothing",
    ]);
  });

  it("changes its signature when the details change, so a dismissal does not hide new losses", () => {
    const a = orphanedNotice([{ operationId: "op2", selectionType: "rect", reachable: 4, empty: false }]);
    const b = orphanedNotice([{ operationId: "op2", selectionType: "rect", reachable: 2, empty: false }]);
    expect(a?.signature).not.toBe(b?.signature);
  });

  it("offers no action without a way to open an operation", () => {
    const notice = orphanedNotice([{ operationId: "op2", selectionType: "rect", reachable: 0, empty: true }]);
    expect(notice?.actions).toBeUndefined();
  });

  it("opens each orphaned operation, at most three", () => {
    const opened: string[] = [];
    const orphans = ["op1", "op2", "op3", "op4"].map((operationId) => ({
      operationId,
      selectionType: "rect",
      reachable: 0,
      empty: true,
    }));
    const notice = orphanedNotice(orphans, (id) => opened.push(id));
    expect(notice?.actions?.map((a) => a.label)).toEqual(["Open op1", "Open op2", "Open op3"]);
    expect(MAX_OPEN_ACTIONS).toBe(3);
    notice?.actions?.[1]?.run();
    expect(opened).toEqual(["op2"]);
    expect(notice?.data).toHaveLength(4);
  });
});

describe("asset failures — §12.3", () => {
  it("collapses every failure into one failure notice", () => {
    const notice = assetFailures(["t1/a1: 404", "t1/a2: 404"]);
    expect(notice?.kind).toBe("failure");
    expect(notice?.title).toBe("2 pictures didn't load");
    expect(notice?.data).toHaveLength(2);
  });

  it("puts failures first among the conditions", () => {
    const file = doc({ columns: 10 }, { horizontalAlignment: "column" });
    const keys = documentNotices(file, [], ["t1/a1: 404"]).map((n) => n.key);
    expect(keys).toEqual(["asset-failures", "parity"]);
  });
});

describe("import notes — §12.4", () => {
  it("reports unreadable pictures as a failure, and an upgrade as an advisory", () => {
    const notices = importNotices({
      upgrades: [{ from: 1, note: "palette entries became objects" }],
      failed: [{ tileId: "t1", assetId: "a1", reason: "not an image" }],
    });
    expect(notices.map((n) => [n.key, n.kind])).toEqual([
      ["import-failed", "failure"],
      ["import-upgraded", "advisory"],
    ]);
  });

  it("pushes nothing for a clean import", () => {
    expect(importNotices({ upgrades: [], failed: [] })).toEqual([]);
  });
});
