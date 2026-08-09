import { describe, expect, it } from "vitest";
import { canonicalAssets, prepareTile, walkWeights } from "./assets.js";
import type { Tile } from "./types.js";

const tile = (assets: [string, number][]): Tile => ({
  id: "t1",
  name: "leaf",
  assets: assets.map(([id, weight]) => ({ id, weight })),
});

describe("canonical ordering — 03 §4.2, D3", () => {
  it("sorts by id ascending", () => {
    const t = tile([["C", 1], ["A", 1], ["B", 1]]);
    expect(canonicalAssets(t).map((a) => a.id)).toEqual(["A", "B", "C"]);
  });

  it("compares as UTF-16 code units, never by locale", () => {
    // localeCompare would sort these case-insensitively on many locales, giving
    // a different canvas on a different machine — the same class of portability
    // failure as `*` versus Math.imul (02 §6.6).
    const t = tile([["a", 1], ["B", 1]]);
    expect(canonicalAssets(t).map((a) => a.id)).toEqual(["B", "a"]);
  });

  it("makes the walk independent of config arrangement — D3", () => {
    const forward = prepareTile(tile([["A", 3], ["B", 1], ["C", 1]]));
    const shuffled = prepareTile(tile([["C", 1], ["A", 3], ["B", 1]]));
    for (let i = 0; i < 100; i++) {
      const h = i / 100;
      expect(walkWeights(shuffled, h)?.id).toBe(walkWeights(forward, h)?.id);
    }
  });
});

describe("the weight walk — 03 §4.3", () => {
  it("reproduces 03 §4.3's worked example", () => {
    // [A:3, B:1, C:1], total 5, h = 0.5 -> target 2.5.
    // A: cumulative 3 > 2.5 -> A.
    const t = prepareTile(tile([["A", 3], ["B", 1], ["C", 1]]));
    expect(t.total).toBe(5);
    expect(walkWeights(t, 0.5)?.id).toBe("A");

    // Raise B to 3: total 7, target 3.5. A: 3 > 3.5 false. B: 6 > 3.5 -> B.
    const raised = prepareTile(tile([["A", 3], ["B", 3], ["C", 1]]));
    expect(raised.total).toBe(7);
    expect(walkWeights(raised, 0.5)?.id).toBe("B");
  });

  it("moves a cell although another weight never changed — 02 §10.1's phenomenon", () => {
    // Recorded so it is not later filed as a bug: thresholds derive from all
    // weights collectively, so editing any one weight moves the boundaries under
    // every cell of that Tile. 03 §4.3's own example is the one that holds --
    // see the note below on 02 §10.1's arithmetic.
    const before = prepareTile(tile([["A", 3], ["B", 1], ["C", 1]]));
    expect(walkWeights(before, 0.5)?.id).toBe("A");
    const after = prepareTile(tile([["A", 3], ["B", 3], ["C", 1]]));
    expect(walkWeights(after, 0.5)?.id).toBe("B");
  });

  it("does NOT reproduce 02 §10.1's worked numbers — pinned as a spec discrepancy", () => {
    // 02 §10.1 reads:
    //
    //   "Assets [A:0.5, B:0.3, C:0.2] -> thresholds [0.5, 0.8, 1.0]. A cell with
    //    h = 0.6 shows B. Raise A to 0.7 -> thresholds [0.7, 0.9, 1.0]. That same
    //    cell now shows A, though B's weight never changed."
    //
    // The first half holds. The second does not, under 03 §4.3's walk: raising A
    // to 0.7 takes the total to 1.2, so target = 0.6 * 1.2 = 0.72, and A's
    // cumulative 0.7 does not exceed it. The cell stays B.
    //
    // The claimed thresholds [0.7, 0.9, 1.0] would require weights [0.7, 0.2,
    // 0.1] -- B and C changed too, which contradicts the sentence's own "though
    // B's weight never changed".
    //
    // The *phenomenon* 02 §10.1 describes is real and 03 §4.3 demonstrates it
    // correctly (the test above). Only the illustration's arithmetic is off.
    // Pinned here rather than silently worked around, and reported rather than
    // amended -- 02 is authoritative and this is not ours to rewrite.
    const before = prepareTile(tile([["A", 0.5], ["B", 0.3], ["C", 0.2]]));
    expect(walkWeights(before, 0.6)?.id).toBe("B"); // as documented
    const after = prepareTile(tile([["A", 0.7], ["B", 0.3], ["C", 0.2]]));
    expect(walkWeights(after, 0.6)?.id).toBe("B"); // documented as "A"
  });

  it("never selects a zero-weight asset — the strict comparison", () => {
    // A zero weight lists an asset without ever selecting it: "temporarily off"
    // without deleting it (03 §4.1).
    const t = prepareTile(tile([["A", 1], ["Z", 0]]));
    for (let i = 0; i < 1000; i++) {
      expect(walkWeights(t, i / 1000)?.id).toBe("A");
    }
  });

  it("never selects a zero-weight asset sitting first in canonical order", () => {
    const t = prepareTile(tile([["A", 0], ["B", 1]]));
    for (let i = 0; i < 1000; i++) {
      expect(walkWeights(t, i / 1000)?.id).toBe("B");
    }
  });

  it("is total for every h in [0, 1) — the termination proof, 05 X6", () => {
    const t = prepareTile(tile([["water", 1], ["sand", 1], ["grass", 3]]));
    for (let i = 0; i < 10000; i++) {
      expect(walkWeights(t, i / 10000)).toBeDefined();
    }
    // The largest value the hash can return, per 02 §6.6.
    expect(walkWeights(t, 0xffffffff / 2 ** 32)).toBeDefined();
  });

  it("falls off the end at h = 1.0, which is why X6 forbids it", () => {
    // 05 §6.2: "t = 1.0 -> target = 5. Nothing strictly exceeds 5. The walk falls
    // off the end of the list and selects nothing." Asserted so the reason the
    // interval is half-open stays visible.
    const t = prepareTile(tile([["water", 1], ["sand", 1], ["grass", 3]]));
    expect(walkWeights(t, 1.0)).toBeUndefined();
  });

  it("honours relative weights without requiring them to sum to anything", () => {
    // [A:3, B:1, C:1] -> A three times out of five (03 §4.1).
    const t = prepareTile(tile([["A", 3], ["B", 1], ["C", 1]]));
    let a = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) if (walkWeights(t, i / n)?.id === "A") a++;
    expect(a / n).toBeCloseTo(0.6, 2);
  });
});
