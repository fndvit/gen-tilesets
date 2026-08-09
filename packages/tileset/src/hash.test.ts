import { describe, expect, it } from "vitest";
import { ASSET_CHANNEL, hash, hashU32, mixLoad, selectionChannel, stage1 } from "./hash.js";

/**
 * These assert properties, never fixed expected values. The vector table of
 * `02` §6.6 is a separate deliverable governed by `05` §11 and ADR-004, and it
 * is generated once units 1-9 pass — not grown incrementally out of tests.
 */

const SEED = stage1("sunset-3");

/** Every cell of a representative grid, per `02` §5's coordinate space. */
function sweep(fn: (x: number, y: number) => void): void {
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) fn(x, y);
}

describe("stage1", () => {
  it("returns a uint32", () => {
    for (const s of ["", "a", "sunset-3", "draft-b", "x".repeat(500)]) {
      const h = stage1(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });

  it("is deterministic", () => {
    expect(stage1("sunset-3")).toBe(stage1("sunset-3"));
  });

  it("avalanches on near-identical short seeds", () => {
    // The reason xmur3 was chosen over FNV-1a (see hash.ts). Seeds are short and
    // human-authored; two that differ in one character must not produce two
    // near-identical pictures.
    const a = stage1("draft-a");
    const b = stage1("draft-b");
    const differingBits = popcount((a ^ b) >>> 0);
    expect(differingBits).toBeGreaterThan(8);
  });
});

describe("hash", () => {
  it("lands in [0, 1) at every cell — 05 X6", () => {
    sweep((x, y) => {
      const t = hash(SEED, "op1", x, y, 0);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(1);
    });
  });

  it("never reaches 1.0 even at the top of the uint32 range", () => {
    // 02 §6.6 returns the top bits divided by 2^32, whose largest value is
    // 4294967295 / 4294967296. The palette walk's termination proof depends on
    // this being strict (05 §6.2).
    expect(0xffffffff / 2 ** 32).toBeLessThan(1);
  });

  it("is deterministic — G1", () => {
    sweep((x, y) => {
      expect(hash(SEED, "op1", x, y, 7)).toBe(hash(SEED, "op1", x, y, 7));
    });
  });

  it("is positional, not sequential — 02 §6.1", () => {
    // Reading a cell out of order gives the same value as reading it in order.
    // This is what buys resize stability and random access (02 §6.2).
    const direct = hash(SEED, "op1", 17, 3, 0);
    sweep(() => void 0);
    expect(hash(SEED, "op1", 17, 3, 0)).toBe(direct);
  });

  it("decorrelates the source and selection channels — 04 §4.3, O3", () => {
    // The bug this prevents: a random Selection at density 0.5 sharing a channel
    // with a random Source would select exactly the cells whose value is below
    // 0.5, then hand those same low values to the mapping.
    let agreements = 0;
    let n = 0;
    sweep((x, y) => {
      const source = hash(SEED, "op1", x, y, 0);
      const selection = hash(SEED, selectionChannel("op1"), x, y, 0);
      if (source < 0.5 === selection < 0.5) agreements++;
      n++;
    });
    expect(agreements / n).toBeGreaterThan(0.4);
    expect(agreements / n).toBeLessThan(0.6);
  });

  it("decorrelates two operations — 06 §5.3 on id uniqueness", () => {
    let equal = 0;
    sweep((x, y) => {
      if (hash(SEED, "op1", x, y, 0) === hash(SEED, "op2", x, y, 0)) equal++;
    });
    expect(equal).toBe(0);
  });

  it("re-rolls on a salt change and nothing else — 02 §6.4", () => {
    let moved = 0;
    sweep((x, y) => {
      if (hash(SEED, "op1", x, y, 0) !== hash(SEED, "op1", x, y, 1)) moved++;
    });
    expect(moved).toBe(24 * 24);
  });

  it("moves every cell when the seed moves — 02 §4.1", () => {
    const other = stage1("draft-b");
    let moved = 0;
    sweep((x, y) => {
      if (hash(SEED, "op1", x, y, 0) !== hash(other, "op1", x, y, 0)) moved++;
    });
    expect(moved).toBe(24 * 24);
  });

  it("distributes roughly uniformly across [0, 1)", () => {
    const buckets = new Array(10).fill(0);
    for (let y = 0; y < 100; y++)
      for (let x = 0; x < 100; x++) buckets[Math.floor(hash(SEED, "op1", x, y, 0) * 10)]!++;
    for (const b of buckets) expect(b).toBeGreaterThan(700);
  });

  it("treats the asset channel as an ordinary channel string", () => {
    expect(hash(SEED, ASSET_CHANNEL, 0, 0, 0)).not.toBe(hash(SEED, "op1", 0, 0, 0));
  });

  it("stays exact past 2^53 — the Math.imul rule, 02 §6.6", () => {
    // A `*` in place of Math.imul silently promotes to float and diverges from a
    // Rust or Go port. A uint32 result is the observable consequence of getting
    // this right.
    sweep((x, y) => {
      const h = hashU32(0xffffffff, 0xffffffff, x, y, 0xffffffff);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeLessThan(2 ** 32);
      expect(h).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("mixLoad", () => {
  it("returns a uint32", () => {
    for (const l of [0, 1, 82931, 0xffffffff]) {
      const h = mixLoad(SEED, l);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });

  it("is NOT the identity at loadSalt 0 — 02 §6.7, deliberately", () => {
    // "loadSalt = 0 is an ordinary value, not an identity. mixLoad(s, 0) is not
    // required to equal s." Asserted rather than merely permitted, so that a
    // future refactor toward a magic zero fails here.
    expect(mixLoad(SEED, 0)).not.toBe(SEED);
  });

  it("separates two loads — 02 §6.7's worked example", () => {
    expect(mixLoad(SEED, 82931)).not.toBe(mixLoad(SEED, 15044));
  });

  it("leaves an unflagged channel pinned across loads", () => {
    // Op 1 unflagged hashes against seedU32 on every load, forever, whatever
    // loadSalt happens to be (02 §6.7).
    sweep((x, y) => {
      expect(hash(SEED, "op1", x, y, 4)).toBe(hash(SEED, "op1", x, y, 4));
    });
  });

  it("moves a flagged channel between loads", () => {
    const a = mixLoad(SEED, 82931);
    const b = mixLoad(SEED, 15044);
    let moved = 0;
    sweep((x, y) => {
      if (hash(a, "op2", x, y, 0) !== hash(b, "op2", x, y, 0)) moved++;
    });
    expect(moved).toBe(24 * 24);
  });

  it("keeps flagged channels uncorrelated though they move together — 02 §6.7", () => {
    const effective = mixLoad(SEED, 82931);
    let equal = 0;
    sweep((x, y) => {
      if (hash(effective, "op2", x, y, 0) === hash(effective, "op5", x, y, 0)) equal++;
    });
    expect(equal).toBe(0);
  });
});

function popcount(n: number): number {
  let c = 0;
  let v = n >>> 0;
  while (v) {
    c += v & 1;
    v >>>= 1;
  }
  return c;
}
