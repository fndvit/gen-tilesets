/**
 * The tour's model (B-017, O3a): which steps each run has, the count, the
 * buttons, and a seen flag that never throws.
 */

import { describe, expect, it } from "vitest";
import {
  back,
  count,
  current,
  end,
  exampleOperation,
  isFirstVisit,
  isLast,
  next,
  plain,
  primaryLabel,
  SEEN_KEY,
  seenStore,
  showsSkip,
  spans,
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
  it("has nine steps on the first visit, An operation among them", () => {
    expect(stepsFor("first").map((s) => s.id)).toEqual([
      "welcome", "grid", "tiles", "tile-group", "operations", "operation", "breakpoints", "randomness", "own",
    ]);
  });

  it("has eight on a replay, without the step that describes Collage", () => {
    expect(stepsFor("replay").map((s) => s.id)).toEqual([
      "welcome", "grid", "tiles", "tile-group", "operations", "breakpoints", "randomness", "own",
    ]);
  });

  it("ends on New, naming Collage only on the first visit", () => {
    const own = (run: "first" | "replay") => stepsFor(run).at(-1)!;
    expect(own("first").targets).toEqual(["new"]);
    expect(own("first").text[0]).toMatch(/keep exploring Collage\.$/);
    expect(own("first").text[0]).toContain("**New**");
    expect(own("replay").text[0]).not.toMatch(/Collage/);
  });

  it("gives Welcome the shared paragraphs and the run's own aside", () => {
    const [first] = stepsFor("first");
    const [replay] = stepsFor("replay");
    expect(first!.targets).toEqual([]);
    expect(first!.text).toEqual(replay!.text);
    expect(first!.aside).toMatch(/^This is Collage.*next eight steps/);
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

  it("cuts out the card and the picture on An operation, and says where each step falls back to", () => {
    const steps = stepsFor("first");
    expect(steps.find((s) => s.id === "operation")!.targets).toEqual(["op-example", "preview"]);
    expect(steps.find((s) => s.id === "operation")!.fallback).toBe("ops-add");
    expect(steps.find((s) => s.id === "tile-group")!.fallback).toBe("tiles-header");
  });
});

describe("moving through a tour", () => {
  it("counts Welcome, so Breakpoints is 7 of 9, or 6 of 8 on a replay", () => {
    expect(count(start("first"))).toBe("1 of 9");
    expect(current(at("first", 6)).id).toBe("breakpoints");
    expect(count(at("first", 6))).toBe("7 of 9");
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
    const last = at("first", 8);
    expect(current(last).id).toBe("own");
    expect(isLast(last)).toBe(true);
    expect(primaryLabel(last)).toBe("Done");
    expect(showsSkip(last)).toBe(false);
    expect(primaryLabel(at("first", 7))).toBe("Next");
    expect(showsSkip(at("first", 7))).toBe(true);
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

describe("exampleOperation", () => {
  const op = (id: string, type: string) => ({ id, selection: { type } }) as Parameters<typeof exampleOperation>[0][number];
  const collage = [op("op2", "all"), op("op5", "all"), op("op6", "rect"), op("op7", "cellList")];

  it("is Collage's operation 3, op6, a rectangle", () => {
    expect(exampleOperation(collage)).toBe("op6");
  });

  it("is null when the third operation is not op6, or not a rectangle, or missing", () => {
    expect(exampleOperation([collage[0]!, collage[2]!, collage[1]!, collage[3]!])).toBeNull();
    expect(exampleOperation([...collage.slice(0, 2), op("op6", "all")])).toBeNull();
    expect(exampleOperation(collage.slice(0, 2))).toBeNull();
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

  it("throws on a term left open", () => {
    expect(() => spans("The **sliders set it.")).toThrow(/Unbalanced/);
  });
});

describe("plain", () => {
  it("drops the marks and ends with the aside", () => {
    const randomness = stepsFor("first").find((s) => s.id === "randomness")!;
    expect(plain(randomness)).toBe(
      "Everything random follows from the seed: the same seed always gives the same picture. New seed redraws every operation. Re-seed, on an operation's card, redraws only that one. Reroll assets only swaps pictures within each tile group. ⓘ How randomness works has the rest.",
    );
  });

  it("is the paragraphs alone on a step without an aside", () => {
    const tiles = stepsFor("first").find((s) => s.id === "tiles")!;
    expect(plain(tiles)).toBe("Add tile groups. Pick pictures from the gallery, or upload your own.");
  });
});
