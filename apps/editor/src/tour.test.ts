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
  primaryLabel,
  SEEN_KEY,
  seenStore,
  showsSkip,
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
    expect(own("replay").text[0]).not.toMatch(/Collage/);
  });

  it("gives Welcome the shared paragraph and the run's own second one", () => {
    const [first] = stepsFor("first");
    const [replay] = stepsFor("replay");
    expect(first!.targets).toEqual([]);
    expect(first!.text[0]).toBe(replay!.text[0]);
    expect(first!.text[1]).toMatch(/^This is Collage.*next eight steps/);
    expect(replay!.text[1]).toMatch(/^The next seven steps/);
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
  const collage = [op("op1", "all"), op("op2", "all"), op("op5", "all"), op("op6", "rect"), op("op7", "cellList")];

  it("is Collage's operation 4, op6, a rectangle", () => {
    expect(exampleOperation(collage)).toBe("op6");
  });

  it("is null when the fourth operation is not op6, or not a rectangle, or missing", () => {
    expect(exampleOperation([collage[0]!, collage[1]!, collage[3]!, collage[2]!])).toBeNull();
    expect(exampleOperation([...collage.slice(0, 3), op("op6", "all")])).toBeNull();
    expect(exampleOperation(collage.slice(0, 3))).toBeNull();
  });
});
