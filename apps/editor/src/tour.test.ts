/**
 * The tour's model (B-017, O3a): which steps each run has, the count, the
 * buttons, and a seen flag that never throws.
 */

import { generate, type TilesetFile } from "@vit-foundation/gen-tilesets";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  back,
  count,
  current,
  end,
  isFirstVisit,
  isLast,
  mosaicOperations,
  next,
  plain,
  primaryLabel,
  runFor,
  SEEN_KEY,
  seenStore,
  showsSkip,
  showsSkipOperations,
  skipOperations,
  spans,
  stagedFile,
  INFO,
  start,
  stepsFor,
  type TourState,
} from "./tour.js";

/** Steps forward `n` times from Welcome. */
function at(run: "first" | "replay", n: number): TourState {
  let state = start(run);
  for (let i = 0; i < n; i++) state = next(state)!;
  return state;
}

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return { items, getItem: (k) => items.get(k) ?? null, setItem: (k, v) => void items.set(k, v) };
}

describe("stepsFor", () => {
  it("has fourteen steps on the first visit, rebuilding Mosaic in 5 to 11", () => {
    expect(stepsFor("first").map((s) => s.id)).toEqual([
      "welcome", "grid", "tiles", "tile-group",
      "operations", "op1-selection", "op1-pattern", "op1-attribute", "op1-blend", "op2", "op3",
      "breakpoints", "randomness", "own",
    ]);
  });

  it("has eight on a replay, with one short Operations step in place of the build", () => {
    expect(stepsFor("replay").map((s) => s.id)).toEqual([
      "welcome", "grid", "tiles", "tile-group", "operations", "breakpoints", "randomness", "own",
    ]);
  });

  it("ends on New, naming Mosaic only on the first visit", () => {
    const own = (run: "first" | "replay") => stepsFor(run).at(-1)!;
    expect(own("first").targets).toEqual(["new"]);
    expect(own("first").text[0]).toMatch(/keep exploring Mosaic\.$/);
    expect(own("first").text[0]).toContain("**New**");
    expect(own("replay").text[0]).not.toMatch(/Mosaic/);
  });

  it("gives Welcome the shared paragraphs and the run's own aside", () => {
    const [first] = stepsFor("first");
    const [replay] = stepsFor("replay");
    expect(first!.targets).toEqual([]);
    expect(first!.text).toEqual(replay!.text);
    expect(first!.aside).toMatch(/^This is Mosaic.*next thirteen steps/);
    expect(replay!.aside).toMatch(/^The next seven steps/);
  });

  it("marks only balanced terms, in every step of both runs", () => {
    for (const run of ["first", "replay"] as const) {
      for (const step of stepsFor(run)) {
        for (const p of [...step.text, ...(step.aside === undefined ? [] : [step.aside])]) {
          expect(spans(p).map((s) => s.text).join("")).not.toContain("*");
        }
      }
    }
  });

  it("says where each step falls back to", () => {
    const steps = stepsFor("first");
    expect(steps.find((s) => s.id === "tile-group")!.fallback).toBe("tiles-header");
    for (const step of steps.filter((s) => s.build)) expect(step.fallback).toBe("ops-add");
  });
});

describe("building Mosaic", () => {
  const build = () => stepsFor("first").filter((s) => s.build);

  it("is steps 5 to 11 of the first visit and nowhere in a replay", () => {
    expect(stepsFor("first").flatMap((s, i) => (s.build ? [i + 1] : []))).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(stepsFor("replay").some((s) => s.build)).toBe(false);
    const replayOps = stepsFor("replay").find((s) => s.id === "operations")!;
    expect(replayOps.targets).toEqual(["ops-add"]);
    expect(replayOps.ops).toBeUndefined();
  });

  it("empties the picture, then draws operation 1 at Attribute, 2 and 3 on their own steps", () => {
    expect(build().map((s) => s.ops)).toEqual([0, 0, 0, 1, 1, 2, 3]);
  });

  it("opens operation 1 at each of its four steps, in order, and no card otherwise", () => {
    expect(build().map((s) => s.open ?? null)).toEqual([
      null,
      { op: 0, stage: "selection" },
      { op: 0, stage: "source" },
      { op: 0, stage: "attribute" },
      { op: 0, stage: "blend" },
      null,
      null,
    ]);
  });

  it("cuts out what each step is about beside the picture, and the picture alone stacked", () => {
    expect(build().map((s) => s.targets)).toEqual([
      ["ops-add", "preview"],
      ...Array(4).fill(["op-1", "preview"]),
      ["op-2", "preview"],
      ["op-3", "preview"],
    ]);
    for (const step of build()) expect(step.alone).toBe("preview");
  });

  it("draws everything off the build", () => {
    for (const run of ["first", "replay"] as const) {
      for (const step of stepsFor(run).filter((s) => !s.build)) {
        expect(step.ops).toBeUndefined();
        expect(step.open).toBeUndefined();
      }
    }
  });
});

describe("Skip operations", () => {
  it("shows on the build steps only", () => {
    const shown = stepsFor("first").map((_, i) => showsSkipOperations(at("first", i)));
    expect(shown).toEqual([false, false, false, false, true, true, true, true, true, true, true, false, false, false]);
    for (let i = 0; i < 8; i++) expect(showsSkipOperations(at("replay", i))).toBe(false);
  });

  it("goes to Breakpoints from every build step, and Back from there goes to Operation 3", () => {
    for (let i = 4; i <= 10; i++) {
      const after = skipOperations(at("first", i));
      expect(current(after).id).toBe("breakpoints");
      expect(count(after)).toBe("12 of 14");
      expect(current(back(after)).id).toBe("op3");
    }
  });

  it("does nothing off the build", () => {
    const grid = at("first", 1);
    expect(skipOperations(grid)).toBe(grid);
    const replay = at("replay", 4);
    expect(skipOperations(replay)).toBe(replay);
  });
});

describe("moving through a tour", () => {
  it("counts Welcome, so Breakpoints is 12 of 14, or 6 of 8 on a replay", () => {
    expect(count(start("first"))).toBe("1 of 14");
    expect(current(at("first", 11)).id).toBe("breakpoints");
    expect(count(at("first", 11))).toBe("12 of 14");
    expect(current(at("replay", 5)).id).toBe("breakpoints");
    expect(count(at("replay", 5))).toBe("6 of 8");
  });

  it("goes back to Welcome from Grid & size, and nowhere from Welcome", () => {
    expect(current(back(at("first", 1))).id).toBe("welcome");
    expect(back(start("replay")).index).toBe(0);
  });

  it("labels the primary button Start tour, Next, then Done, and hides Skip on the last", () => {
    expect(primaryLabel(start("first"))).toBe("Start tour");
    expect(primaryLabel(at("first", 1))).toBe("Next");
    const last = at("first", 13);
    expect(current(last).id).toBe("own");
    expect(isLast(last)).toBe(true);
    expect(primaryLabel(last)).toBe("Done");
    expect(showsSkip(last)).toBe(false);
    expect(primaryLabel(at("first", 12))).toBe("Next");
    expect(showsSkip(at("first", 12))).toBe(true);
    expect(next(last)).toBeNull();
  });
});

describe("the seen flag", () => {
  it("is not seen until the tour ends, by Done or Skip alike", () => {
    const storage = memoryStorage();
    const seen = seenStore(() => storage);
    expect(seen.get()).toBe(false);
    expect(end(seen)).toBeNull();
    expect(seen.get()).toBe(true);
    expect(storage.items.get(SEEN_KEY)).toBe("1");
  });

  it("reads a blocked store as not seen, and never throws", () => {
    const blocked = seenStore(() => {
      throw new Error("SecurityError");
    });
    expect(blocked.get()).toBe(false);
    expect(() => blocked.set()).not.toThrow();
    const failing = seenStore(() => ({
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    }));
    expect(failing.get()).toBe(false);
    expect(() => end(failing)).not.toThrow();
  });
});

describe("isFirstVisit", () => {
  it("holds only with nothing kept and the tour not seen", () => {
    expect(isFirstVisit(false, false)).toBe(true);
    expect(isFirstVisit(true, false)).toBe(false);
    expect(isFirstVisit(false, true)).toBe(false);
    expect(isFirstVisit(true, true)).toBe(false);
  });
});

describe("mosaicOperations", () => {
  type Shape = Parameters<typeof mosaicOperations>[0][number];
  const op = (id: string, selection: string, source: string, target: string) =>
    ({ id, selection: [{ type: selection }], source: { type: source }, target }) as Shape;
  const mosaic = [
    op("op1", "all", "valueNoise", "tileId"),
    op("op4", "all", "random", "rotation"),
    op("op5", "random", "constant", "tileId"),
  ];

  it("is Mosaic's three ids, in order", () => {
    expect(mosaicOperations(mosaic)).toEqual(["op1", "op4", "op5"]);
  });

  it("is null when an operation is reordered, missing, added, or no longer what the text says", () => {
    expect(mosaicOperations([mosaic[1]!, mosaic[0]!, mosaic[2]!])).toBeNull();
    expect(mosaicOperations(mosaic.slice(0, 2))).toBeNull();
    expect(mosaicOperations([...mosaic, op("op6", "all", "random", "opacity")])).toBeNull();
    expect(mosaicOperations([op("op1", "all", "gradient", "tileId"), mosaic[1]!, mosaic[2]!])).toBeNull();
    expect(mosaicOperations([mosaic[0]!, op("op4", "all", "random", "scale"), mosaic[2]!])).toBeNull();
    expect(mosaicOperations([mosaic[0]!, mosaic[1]!, op("op5", "all", "constant", "tileId")])).toBeNull();
    const twoLayers = { ...mosaic[0]!, selection: [{ type: "all" }, { type: "all" }] } as Shape;
    expect(mosaicOperations([twoLayers, mosaic[1]!, mosaic[2]!])).toBeNull();
  });

  it("turns a first visit without Mosaic into a replay, and leaves a replay alone", () => {
    expect(runFor("first", mosaic)).toBe("first");
    expect(runFor("first", mosaic.slice(0, 2))).toBe("replay");
    expect(runFor("replay", mosaic)).toBe("replay");
  });
});

describe("stagedFile", () => {
  const file = { layout: "x", config: { rows: 10, operations: ["a", "b", "c"] } };

  it("keeps the first operations and nothing else changes", () => {
    expect(stagedFile(file, 0).config).toEqual({ rows: 10, operations: [] });
    expect(stagedFile(file, 2).config.operations).toEqual(["a", "b"]);
    expect(stagedFile(file, 2).layout).toBe("x");
    expect(file.config.operations).toEqual(["a", "b", "c"]);
  });

  it("is the same object when nothing is cut", () => {
    expect(stagedFile(file, 3)).toBe(file);
    expect(stagedFile(file, 5)).toBe(file);
  });

  /**
   * What the build steps' text promises: each step adds its operation to the
   * picture before it and changes nothing else. Checked on the real Mosaic,
   * over several seeds and load salts.
   */
  it("draws Mosaic's finished picture one operation at a time", () => {
    const mosaic = JSON.parse(
      readFileSync(new URL("../public/templates/mosaic/tileset.json", import.meta.url), "utf8"),
    ) as TilesetFile;
    expect(mosaicOperations(mosaic.config.operations)).not.toBeNull();
    for (const [seed, salt] of [[mosaic.config.defaultSeed, 0], ["a", 1], ["b", 77]] as const) {
      const at = (k: number) => generate(stagedFile(mosaic, k).config, seed, salt).cells;
      const [none, one, two, three] = [at(0), at(1), at(2), at(3)];
      expect(none.every((c) => c.tileId === null)).toBe(true);
      expect(one.every((c) => c.tileId !== null && c.rotation === 0)).toBe(true);
      // Operation 2 turns cells and leaves their tiles alone.
      expect(two.map((c) => c.tileId)).toEqual(one.map((c) => c.tileId));
      expect(two.some((c) => c.rotation !== 0)).toBe(true);
      // Operation 3 paints Special on a few cells and leaves every other one as it was.
      three.forEach((c, i) => {
        if (c.tileId !== "t5") expect(c).toEqual(two[i]);
        else expect(c.rotation).toBe(two[i]!.rotation);
      });
      expect(three.some((c) => c.tileId === "t5")).toBe(true);
    }
  });
});

describe("spans", () => {
  it("is one plain span without marks", () => {
    expect(spans("Add tile groups.")).toEqual([{ text: "Add tile groups.", strong: false }]);
  });

  it("cuts a term out of the middle of a sentence", () => {
    expect(spans("The **sliders** set it.")).toEqual([
      { text: "The ", strong: false },
      { text: "sliders", strong: true },
      { text: " set it.", strong: false },
    ]);
  });

  it("leaves out the empty part before a leading term", () => {
    expect(spans("**New seed** redraws.")).toEqual([
      { text: "New seed", strong: true },
      { text: " redraws.", strong: false },
    ]);
  });

  it("makes each info mark an icon span, spoken as \"information\"", () => {
    expect(spans(`Click the ${INFO} buttons.`)).toEqual([
      { text: "Click the ", strong: false },
      { text: "information", strong: false, icon: "info" },
      { text: " buttons.", strong: false },
    ]);
    expect(spans(INFO)).toEqual([{ text: "information", strong: false, icon: "info" }]);
  });

  it("throws on a term left open", () => {
    expect(() => spans("The **sliders set it.")).toThrow(/Unbalanced/);
  });
});

describe("plain", () => {
  it("drops the marks and ends with the aside", () => {
    const randomness = stepsFor("first").find((s) => s.id === "randomness")!;
    expect(plain(randomness)).toBe(
      "Everything random follows from the seed: the same seed always gives the same picture. New seed redraws every operation. Re-seed, on an operation's card, redraws only that one. Reroll assets only swaps pictures within each tile group. Click on the information buttons to know more info.",
    );
  });

  it("is the paragraphs alone on a step without an aside", () => {
    const tiles = stepsFor("first").find((s) => s.id === "tiles")!;
    expect(plain(tiles)).toBe("Add tile groups. Pick pictures from the gallery, or upload your own.");
  });
});
